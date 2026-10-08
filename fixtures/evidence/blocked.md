# Synthetic ReleaseGate demonstration — noncompliant candidate

This is a synthetic fixture for protocol evaluation. These are invented
test scenarios, not executed tests of a real product and not a security audit.

## Authentication regression report

Expired sessions: an expired session was rejected with HTTP 401.
Synthetic case AUTH-EXPIRED: PASS.
Cross-tenant access: a tenant A session incorrectly received tenant B data
with HTTP 200. Synthetic case AUTH-TENANT: FAIL. One failing regression
remains unresolved, so this candidate does not meet the locked auth policy.

## Database migration guide

Breaking change: users.tenant_id becomes NOT NULL. Take and verify a full
backup. Backfill tenant_id from each user's organization before applying
the NOT NULL constraint and confirm that no NULL values remain.
Rollback: stop writes, remove the constraint, restore the verified backup
if needed, then restart the previous application.

## Release and compatibility notes

/v1/session is removed; /v2/session replaces it. The minimum compatible
client version is 2.0. Upgrade clients before enabling this release.
