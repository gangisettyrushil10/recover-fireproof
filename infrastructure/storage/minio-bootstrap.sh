#!/bin/sh
# Bootstrap MinIO buckets for local dev.
# Invoked by the `createbuckets` service in docker-compose.yml.
# Idempotent: safe to re-run.

set -eu

: "${MINIO_ENDPOINT:?MINIO_ENDPOINT is required}"
: "${MINIO_ROOT_USER:?MINIO_ROOT_USER is required}"
: "${MINIO_ROOT_PASSWORD:?MINIO_ROOT_PASSWORD is required}"
: "${ORIGINALS_BUCKET:=fireproof-originals}"
: "${DERIVATIVES_BUCKET:=fireproof-derivatives}"

ALIAS="local"

echo "[bootstrap] Configuring mc alias '${ALIAS}' -> ${MINIO_ENDPOINT}"
mc alias set "${ALIAS}" "${MINIO_ENDPOINT}" "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}"

# Originals bucket: Object Lock enabled at creation time (required for WORM).
if mc ls "${ALIAS}/${ORIGINALS_BUCKET}" >/dev/null 2>&1; then
  echo "[bootstrap] Originals bucket '${ORIGINALS_BUCKET}' already exists"
else
  echo "[bootstrap] Creating originals bucket '${ORIGINALS_BUCKET}' WITH OBJECT LOCK"
  mc mb --with-lock "${ALIAS}/${ORIGINALS_BUCKET}"
fi

# Versioning is required for Object Lock and is enabled implicitly by --with-lock,
# but we re-assert it for clarity.
mc version enable "${ALIAS}/${ORIGINALS_BUCKET}" || true

# Default compliance retention for originals is intentionally NOT set in MVP.
# Uncomment when ready to enforce 365d compliance retention by default:
# mc retention set --default compliance 365d "${ALIAS}/${ORIGINALS_BUCKET}"

# Derivatives bucket: mutable, versioned for safety, NO object lock.
if mc ls "${ALIAS}/${DERIVATIVES_BUCKET}" >/dev/null 2>&1; then
  echo "[bootstrap] Derivatives bucket '${DERIVATIVES_BUCKET}' already exists"
else
  echo "[bootstrap] Creating derivatives bucket '${DERIVATIVES_BUCKET}'"
  mc mb "${ALIAS}/${DERIVATIVES_BUCKET}"
fi
mc version enable "${ALIAS}/${DERIVATIVES_BUCKET}" || true

echo "[bootstrap] Done."
