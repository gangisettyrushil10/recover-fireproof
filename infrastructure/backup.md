# Fireproof — Backup and restore

Backups exist for two distinct reasons:

1. **Operational recovery** — restore a working system after data loss.
2. **Record integrity** — guarantee that originals and the audit trail
   survive any single-region or single-account compromise.

The originals bucket (`fireproof-originals`) is the system's hard
constraint. It MUST satisfy a 3-2-1 rule: 3 copies, 2 storage media or
regions, 1 offline / off-account.

## Postgres

| Mechanism | Cadence | Retention | Owner |
|---|---|---|---|
| RDS automated snapshots | daily | 35 days | infra |
| RDS PITR | continuous WAL | 35 days | infra |
| Logical `pg_dump` to S3 (`fireproof-backups`) | daily 02:00 UTC | 90 days | infra |
| Cross-region snapshot copy | daily | 35 days | infra |
| Off-account snapshot export | weekly Sunday | 365 days | infra + security |

Logical dump command (run from a hardened bastion or scheduled task):

```sh
pg_dump \
  --format=custom \
  --no-owner \
  --no-privileges \
  --jobs=4 \
  --file="fireproof-$(date -u +%Y%m%dT%H%M%SZ).dump" \
  "$DATABASE_URL"

aws s3 cp fireproof-*.dump s3://fireproof-backups/postgres/ \
  --sse aws:kms \
  --sse-kms-key-id "$BACKUPS_KMS_KEY"
```

Restore (test environment):

```sh
pg_restore --clean --if-exists --no-owner --jobs=4 \
  --dbname="$RESTORE_DATABASE_URL" \
  fireproof-YYYYMMDDTHHMMSSZ.dump
```

## Redis

Redis holds queue state and ephemeral caches; it is NOT a system of
record. RDB snapshots every 6h with 7-day retention is sufficient. Loss
of Redis is recovered by reprocessing from Postgres.

## S3 (originals)

Originals MUST never be lost. Layered protections:

1. **Object Lock (compliance mode)** prevents overwrite/delete within
   retention window.
2. **Versioning + MFA Delete** prevents accidental version deletion.
3. **Cross-region replication** (`fireproof-originals` →
   `fireproof-originals-dr`) keeps a second region copy.
4. **Weekly mirror to a separate AWS account** for blast-radius
   isolation:

```sh
aws s3 sync \
  s3://fireproof-originals \
  s3://fireproof-originals-archive \
  --source-region us-east-1 \
  --region us-west-2 \
  --sse aws:kms \
  --sse-kms-key-id "$ARCHIVE_KMS_KEY"
```

5. **Local MinIO mirror for dev** (engineers may pull a sanitized subset
   to a developer machine; never push back):

```sh
mc mirror local/fireproof-originals ./local-mirror/originals
```

## S3 (derivatives, exports)

Standard versioning + lifecycle to Glacier after 90 days. Loss is
recoverable by regenerating from originals.

## Audit events

`audit_events` is the legal trail. It is covered by Postgres backups
above AND by an append-only stream to `fireproof-audit-archive` (S3
Object Lock, governance mode, 7-year retention) emitted by the api.

## Monthly restore-drill checklist

Run on the first Tuesday of every month. Owner: infra on-call.

- [ ] Pick a random 24h window from the past 30 days.
- [ ] PITR-restore RDS into a `fireproof-restore-drill` instance.
- [ ] Confirm row counts on `exceptions`, `evidence_items`,
      `document_versions`, `legal_holds`, `audit_events` match within
      tolerance of the source at the chosen point in time.
- [ ] Restore one originals bucket prefix from the DR region into a
      scratch bucket; confirm SHA-256 of every restored object matches
      the SHA-256 stored in `document_versions`.
- [ ] Run the seed-driven smoke tests against the restored DB pointed at
      the scratch bucket.
- [ ] Tear down the drill resources.
- [ ] File a drill report in `docs/ops/restore-drills/YYYY-MM.md` with:
      duration, anomalies, follow-up tickets.

A failed drill is a P1 incident.
