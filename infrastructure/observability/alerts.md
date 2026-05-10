# Fireproof — Alerts and escalation

These alerts derive from the operational risks called out in the PRD. They
are intentionally tied to product-level invariants (originals immutability,
hold integrity, exception SLAs) and not just generic infra health.

## Severity ladder

| Severity | Channel | Response SLA |
|---|---|---|
| P0 — record integrity | PagerDuty + on-call SMS + #fireproof-incidents | 5 min ack, 30 min mitigation |
| P1 — degraded write path | PagerDuty + #fireproof-incidents | 15 min ack |
| P2 — degraded read or job lag | #fireproof-alerts | next business day |
| P3 — informational | weekly review | n/a |

## Alerts

### Record integrity (P0)

| Alert | Trigger | Source |
|---|---|---|
| `originals_overwrite_attempted` | any non-zero count of `STORAGE_OVERWRITE_FORBIDDEN` errors against the originals bucket within 1 minute | api logs / structured error counter |
| `legal_hold_bypass_attempt` | any non-zero count of `LEGAL_HOLD_ACTIVE` errors raised on a delete or supersede path | api logs |
| `object_lock_disabled` | bucket configuration check reports Object Lock OFF on `fireproof-originals` | hourly compliance probe |
| `audit_event_write_failure` | any failure to append to `audit_events` for a state change, hold change, or evidence change | api logs |
| `replication_lag_originals` | cross-region replication lag > 15 min on the originals bucket | S3 replication metrics |

### Exception correctness (P0/P1)

| Alert | Trigger | Severity |
|---|---|---|
| `closure_without_evidence` | any closure transition succeeded with one or more blocking requirements unmet | P0 |
| `state_machine_invalid_transition` | any `INVALID_STATE_TRANSITION` error in production | P1 |
| `rule_evaluation_stale` | rule evaluation older than 24h on an open exception | P2 |
| `ahj_notification_threshold_breach` | impairment crosses jurisdiction notification threshold without a recorded notification | P1 |

### Worker / job health (P1/P2)

| Alert | Trigger | Severity |
|---|---|---|
| `worker_queue_depth_high` | BullMQ active+waiting > 500 for 10 min | P1 |
| `worker_failed_job_burst` | failed jobs > 50 in 5 min on any queue | P1 |
| `packet_export_lag` | p95 export job latency > 60s for 10 min | P2 |
| `contradiction_engine_lag` | contradiction recompute > 5 min behind on a property | P2 |

### Infrastructure (P1/P2)

| Alert | Trigger | Severity |
|---|---|---|
| `postgres_replication_lag` | replica lag > 30s for 5 min | P1 |
| `postgres_connection_saturation` | open connections > 80% of max for 10 min | P2 |
| `redis_memory_pressure` | maxmemory > 85% for 10 min | P2 |
| `api_5xx_rate` | 5xx > 1% of requests over 5 min | P1 |
| `api_latency_p95` | p95 latency > 1s for 10 min on `/v1/exceptions/*` | P2 |
| `disk_space_low` | any volume > 85% used | P2 |

### Security (P0/P1)

| Alert | Trigger | Severity |
|---|---|---|
| `mfa_bypass_failure` | a privileged role action by a user with `mfa_required=true` and no recent MFA assertion | P0 |
| `unauthorized_role_change` | role change on `users.role` not performed by an org admin | P0 |
| `export_outside_packet_flow` | direct download of an original outside the packet/export endpoint | P1 |
| `unusual_export_volume` | exports from a single user > 5x baseline over 1h | P2 |

## Escalation

1. PagerDuty primary on-call (engineering)
2. Secondary on-call (engineering manager) if no ack in 10 min for P0
3. Compliance owner notified for any record-integrity P0 within 30 min
4. Counsel/E&O contact notified for any sustained record-integrity P0
   that touches a property under active legal hold
