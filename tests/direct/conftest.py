import hashlib
import json
import re
import pytest

REPO = "ANZA24k/ReleaseGate"
COMMIT = "a" * 40
BASE = f"https://raw.githubusercontent.com/{REPO}/{COMMIT}/fixtures/"
MANIFEST_URL = BASE + "manifest.json"
EVIDENCE_URL = BASE + "evidence.md"
NOW = 1893456000  # 2030-01-01T00:00:00Z
POLICY = {"criteria": [
    {"id": "auth", "name": "Auth regression", "requirement": "Evidence explicitly covers expired sessions and cross-tenant access regression tests.", "mandatory": True, "weight": 1},
    {"id": "migration", "name": "Migration notes", "requirement": "Instructions explain the breaking database changes, backup and rollback procedure.", "mandatory": True, "weight": 1},
    {"id": "docs", "name": "Compatibility", "requirement": "Documentation identifies breaking API changes and compatible client versions.", "mandatory": False, "weight": 3}
], "optional_threshold_bps": 10000}


def sha(body):
    return hashlib.sha256(body.encode()).hexdigest()


def manifest(entries=None, **changes):
    data = {"schema_version": 1, "repository": REPO, "commit": COMMIT, "version": "1.0-demo", "evidence": entries if entries is not None else [
        {"label": "review", "type": "release-review", "url": EVIDENCE_URL, "sha256": sha("Synthetic demonstration evidence."), "description": "Synthetic fixture, not an audit."}
    ]}
    data.update(changes)
    return json.dumps(data)


def answer(outcomes=("PASS", "PASS", "PASS"), reason="The committed synthetic review addresses this requirement."):
    return json.dumps({"criteria": [{"id": c["id"], "outcome": result, "reason": reason,
        "evidence_labels": ["review"] if result != "INCONCLUSIVE" else []} for c, result in zip(POLICY["criteria"], outcomes)]})


@pytest.fixture
def gate(direct_vm, direct_deploy, direct_alice):
    direct_vm.warp("2030-01-01T00:00:00Z")
    direct_vm.sender = direct_alice
    return direct_deploy("contracts/release_gate.py", sdk_version="v0.2.12")


@pytest.fixture
def project(gate):
    return gate.register_project("Synthetic demonstration", REPO, json.dumps(POLICY))


@pytest.fixture
def candidate(gate, project, direct_vm):
    raw = manifest()
    direct_vm.mock_web(re.escape(MANIFEST_URL) + "$", {"status": 200, "body": raw})
    direct_vm.mock_web(re.escape(EVIDENCE_URL) + "$", {"status": 200, "body": "Synthetic demonstration evidence."})
    direct_vm.mock_llm(r".*ReleaseGate:.*", answer())
    return gate.submit_release(project, "1.0-demo", COMMIT, MANIFEST_URL, sha(raw), NOW + 3600)


def set_sources(vm, raw, evidence="Synthetic demonstration evidence.", llm=None, status=200):
    vm.clear_mocks()
    vm.mock_web(re.escape(MANIFEST_URL) + "$", {"status": status, "body": raw})
    vm.mock_web(re.escape(EVIDENCE_URL) + "$", {"status": 200, "body": evidence})
    vm.mock_llm(r".*ReleaseGate:.*", llm or answer())


def add_recheck(vm, outcomes=("PASS", "PASS", "PASS")):
    vm.clear_mocks()
    raw = manifest()
    extra_body = "Additional verified compatibility review, synthetic."
    extra_url = BASE + "additional.md"
    extra = manifest([{"label": "additional", "type": "docs", "url": extra_url, "sha256": sha(extra_body), "description": "Supplemental demo review."}])
    vm.mock_web(re.escape(MANIFEST_URL) + "$", {"status": 200, "body": raw})
    vm.mock_web(re.escape(EVIDENCE_URL) + "$", {"status": 200, "body": "Synthetic demonstration evidence."})
    vm.mock_web(re.escape(BASE + "extra.json") + "$", {"status": 200, "body": extra})
    vm.mock_web(re.escape(extra_url) + "$", {"status": 200, "body": extra_body})
    vm.mock_llm(r".*ReleaseGate:.*", answer(outcomes))
    return BASE + "extra.json", sha(extra)
