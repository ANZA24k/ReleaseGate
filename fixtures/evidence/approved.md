# Synthetic ReleaseGate demonstration — compliant candidate

This is a synthetic fixture for protocol evaluation. These are invented
test scenarios, not executed tests of a real product and not a security audit.

## Authentication regression report

Expired sessions: a request with an expired signed session was rejected with
HTTP 401. Synthetic case AUTH-EXPIRED: PASS, zero failing cases.
Cross-tenant access: a tenant A session requesting tenant B data was rejected
with HTTP 403. Synthetic case AUTH-TENANT: PASS, zero failing cases.

## Database migration guide

Breaking change: users.tenant_id becomes NOT NULL.
1. Take a complete database backup and verify its restore procedure.
2. Backfill tenant_id for every existing user from its organization mapping.
3. Check that no tenant_id values remain NULL. Resolve orphan users first.
4. Apply the NOT NULL constraint only after the backfill and validation.
Rollback: stop writes, remove the NOT NULL constraint, restore the verified
backup if backfill values are incorrect, and restart the previous application.

## Release and compatibility notes

Breaking API change: /v1/session is removed. Migrate clients to /v2/session.
The minimum compatible client version is 2.0. Older clients must be upgraded
before the server release is enabled.
