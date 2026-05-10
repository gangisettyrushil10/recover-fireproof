# Fireproof — Infrastructure as Code (placeholder)

This directory will hold the Terraform / Pulumi modules that stand up the
production environment. No modules ship in MVP; this README enumerates the
required components and the constraints each must satisfy so that the
modules, when written, line up with the PRD's record-integrity guarantees.

## Layout (intended)

```
infrastructure/iac/
  modules/
    network/        # VPC, subnets, NAT, route tables
    data/           # RDS, ElastiCache
    storage/        # S3 buckets (originals + derivatives + exports)
    compute/        # ECS Fargate services or EKS workloads
    secrets/        # Secrets Manager + KMS keys
    observability/  # CloudWatch / Prometheus / Grafana stacks
  envs/
    staging/
    production/
```

## Required components

### Network

- VPC with private subnets across at least three AZs.
- NAT gateways for outbound from private subnets.
- VPC endpoints for S3, KMS, Secrets Manager, ECR.

### RDS Postgres

- Engine: Postgres 16.
- Multi-AZ.
- Point-in-time recovery (PITR) enabled with at least 35-day retention.
- Storage encryption with a customer-managed KMS key.
- Parameter group sets `log_min_duration_statement=1000` and forces
  `rds.force_ssl=1`.
- Automated daily snapshots replicated to a second region.

### ElastiCache Redis

- Cluster mode disabled is acceptable for MVP; failover-enabled
  replication group with at least one replica.
- Encryption in transit AND at rest.
- Auth token stored in Secrets Manager.

### S3

- `fireproof-originals`:
  - Object Lock enabled at creation (irrevocable).
  - Default retention: compliance mode 365d (toggle when ready, see
    `infrastructure/storage/s3-object-lock-policy.json`).
  - Versioning + MFA Delete.
  - Cross-region replication to `fireproof-originals-dr` with a
    replication-only IAM role.
  - SSE-KMS with a dedicated CMK; bucket policy denies non-TLS and
    unencrypted PUTs.
- `fireproof-derivatives`: versioned, SSE-KMS, no Object Lock.
- `fireproof-exports`: versioned, SSE-KMS, lifecycle to Glacier after 90d.

### Compute

ECS Fargate (preferred for MVP) OR Kubernetes (EKS). Either way:

- Three services: `fireproof-api`, `fireproof-worker`, `fireproof-web`.
- Images sourced from GHCR (see `.github/workflows/docker-build.yml`).
- Task roles scoped per-service; `worker` does NOT have legal-hold-admin
  permissions, only `api` does.
- `api` and `web` behind an ALB with WAF (AWS Managed Rules + custom
  rule denying common SSRF patterns).

### Secrets

- AWS Secrets Manager for: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`,
  S3 access keys (if used; prefer IAM roles), SMTP creds.
- KMS CMKs:
  - `fireproof/originals` — used by S3 and tightly scoped.
  - `fireproof/db` — used by RDS.
  - `fireproof/secrets` — used by Secrets Manager.

### Observability

- CloudWatch log groups per service with 90-day retention.
- Prometheus + Grafana (or AMP/AMG) for metrics; see
  `infrastructure/observability/prometheus.yml` for scrape targets.
- Alerts wired per `infrastructure/observability/alerts.md`.

## Out of scope for MVP

- Multi-region active-active.
- Customer-managed encryption keys per tenant.
- Dedicated isolated environments per AHJ.
