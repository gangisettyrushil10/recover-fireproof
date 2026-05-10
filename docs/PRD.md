# Fireproof PRD

## Executive Summary

Fireproof is a production-ready exception-operations system for fire and life safety inspection, testing, and maintenance teams. Its job is not to replace routine inspection software first. Its job is to own the high-liability moments that existing tools flatten into PDFs: impairments, unresolved deficiencies, carrier recommendations, asset-identity mismatches, post-incident packet assembly, and preservation-hold record custody.

The packet evidence is strong. The ninth-floor sprinkler-zone impairment ran for about 5 hours and 50 minutes, yet the surviving record is a handwritten log with "pressure good," an unresolved question about AHJ notification, and no completed fire-watch proof. A separate internal email thread shows the company knew about corrosion on a ninth-floor standpipe hose connection but chose not to amend the official report; instead it sent a service proposal and then let the issue sit when the customer did not respond. After the fire, the owner, AHJ, insurer, counsel, and Beacon's own E&O carrier all demanded records at once. The problem was not that the sprinklers failed. The problem was that the records system could not produce one coherent, defensible operational truth.

This PRD therefore specifies Fireproof as an "exception ledger" with five core capabilities: a rules-driven exception state machine, evidence gating before closure, contradiction detection across records, packet building for different stakeholders, and an immutable originals vault with preservation hold.

| Priority | MVP slice | Why it must ship first | Success condition |
|---|---|---|---|
| MVP 1 | Impairment Command Center | The Day -116 impairment is the clearest failure point and the strongest wedge | An impairment cannot be closed without required evidence and rule evaluation |
| MVP 2 | Contradiction Map + Packet Builder | The post-fire blast radius came from contradictory records and multi-party document demand | Fireproof can auto-build an AHJ/owner/insurer packet from the same exception data |
| MVP 3 | Immutable Originals Vault + Legal Hold | Marshal Reyes explicitly demanded originals, not reprinted or modified records | Every original upload is hashed, versioned, and protected from overwrite/delete under hold |

## Cedar Heights timeline

| Date | Event | Product implication |
|---|---|---|
| Day -416 | Insurer loss-control survey finds pump acceptable but aging, notes impairment records live in a handwritten contractor log, and recommends property management retain copies | Carrier recommendations must become trackable exceptions, not buried observations |
| Day -243 | AHJ routine inspection finds substantial compliance except pump certificate posting deficiency | Fireproof needs separate AHJ findings, not just contractor reports |
| Day -211 | Beacon quarterly ITM report marks wet sprinkler, fire pump, standpipe, FDC, and alarm valve satisfactory; no deficiencies noted | Official record can show "satisfactory" even when reality is more nuanced |
| Day -198 | Technician training transcript reveals actual field practice differs from report language, especially around main drain checks and impairment notifications | Fireproof must separate what was actually performed from what a template implies |
| Day -116 | Ninth-floor sprinkler zone out of service for frozen-pipe repair; started 7:40, restored around 1:30; fire watch noted; AHJ notification unclear; "pressure good" main drain note only | Impairment workflow requires timestamps, notification proof, fire-watch proof, actual test readings, and rule-based closure |
| Day -78 to -47 | Internal email thread flags standpipe corrosion but keeps it out of the original report; proposal goes unanswered; no closure decision is captured | Deficiencies need states for proposal sent, customer nonresponse, and risk acceptance/decline |
| Day 0 | Kitchen-related fire on ninth floor; sprinklers suppress fire before fire department arrival | Fireproof is not a fire-prevention root-cause tool; it is a record-integrity and exception-operations tool |
| Day +3 | Fire Marshal voicemail asks for "clean" originals, including impairment notifications that may not have been sent | Immutable storage and preservation hold become core, not optional |
| Day +4 | Owner demands all records, emails, texts, voicemails, impairment logs, fire-watch records, and photographs | Packet building must span structured records plus original supporting documents |
| Day +12 | Notice of Violation cites fire pump discrepancy, missing post-impairment main drain proof, standpipe corrosion, battery mismatch, and missing impairment notification | Fireproof must detect contradictions and generate corrective-action packets |

## Goals and metrics

| Priority | Goal | Metric | Launch target |
|---|---|---|---|
| P0 | Prevent invalid exception closure | Closed impairments missing any blocking evidence | 0 |
| P0 | Produce audit-ready exception records | Median time from "close requested" to "audit-ready close" for fully documented impairments | under 5 minutes |
| P1 | Reduce post-incident packet assembly time | Median time to build AHJ or insurer packet for one property | under 15 minutes |
| P1 | Surface contradictions before external review | Contradictions auto-detected on Cedar Heights seeded corpus | at least 90% of known contradictions |

## Personas

| Persona | Primary jobs-to-be-done | MVP permissions |
|---|---|---|
| Lead technician / field tech | Start impairment, log work, capture proof, restore system | Create/update own exceptions, upload evidence, request transitions |
| Office manager / compliance coordinator | Triage open exceptions, chase missing evidence, manage packets | Full exception management, packet generation, legal hold request |
| Property manager | Review deficiencies, approve/decline work, view status | Read-only dashboard, decision workflows, receipt acknowledgment |
| AHJ reviewer | Read packet, verify records, inspect chain of evidence | Read-only packet view or exports; no record mutation |
| Insurer / loss-control engineer | Review impairments, recommendations, evidence completeness | Read-only packet view or exports; no record mutation |
| Counsel / E&O / subrogation response team | Lock records, preserve originals, export packet | Legal-hold and export permissions, no business-data editing unless delegated |

## Feature map

| Epic | Must-have behavior | Why it matters |
|---|---|---|
| Exception Registry | One canonical record per impairment, deficiency, carrier recommendation, or asset-identity exception | Prevents split-reality records |
| Rules Engine | Evaluate jurisdiction + system + exception type + duration + policy version | Prevents humans from remembering thresholds from memory |
| Evidence Checklist | Required/optional evidence generated from rules | Makes missing proof visible before crisis |
| State Machine | Transition only through allowed states; block invalid closure | Solves "physically restored but administratively incomplete" |
| Contradiction Detection | Compare claim-vs-claim across reports, notes, emails, logs, and assets | Surfaces hidden discrepancies early |
| Packet Builder | One-click stakeholder-specific export sets | Turns internal work into external response quickly |
| Immutable Vault | Preserve originals; allow supplements without silent overwrite | Meets "give me originals" requirement |
| Offline Field UX | Capture fast in mechanical rooms and basements | Adoption depends on this |
| Customer Decision Flow | Approval, decline, nonresponse, risk acceptance | Solves "let it sit" ambiguity |

## State machines

### Impairment

States: Draft, Active, SafeguardsPending, RepairInProgress, RestorationTestingRequired, RestoredEvidenceIncomplete, ClosedAuditReady, Escalated, Voided.

Transitions:
- Draft → Active (actual_start_time saved)
- Active → SafeguardsPending (rule engine requires safeguards)
- Active → RepairInProgress (no safeguards required)
- SafeguardsPending → RepairInProgress (required safeguards recorded)
- RepairInProgress → RestorationTestingRequired (repair complete)
- RestorationTestingRequired → RestoredEvidenceIncomplete (physical restore confirmed)
- RestoredEvidenceIncomplete → ClosedAuditReady (all blocking evidence valid)
- Active/SafeguardsPending/RestorationTestingRequired/RestoredEvidenceIncomplete → Escalated (threshold/SLA breach)
- Escalated → ClosedAuditReady (all blockers resolved)
- Draft → Voided

| State | Blocking rules |
|---|---|
| Draft | propertyId, systemId, exception type |
| Active | affected area, reason, responsible tech |
| SafeguardsPending | cannot proceed if a required safeguard lacks status |
| RepairInProgress | work notes required |
| RestorationTestingRequired | required test template must exist |
| RestoredEvidenceIncomplete | close blocked until required evidence passes validation |
| ClosedAuditReady | immutable closure record |
| Escalated | notifications triggered automatically |
| Voided | reason required |

### Deficiency

States: Detected, ProposalPending, CustomerResponsePending, ApprovedForRepair, RepairInProgress, VerificationPending, ClosedVerified, DeclinedRiskAccepted, Escalated.

Transitions:
- Detected → ProposalPending
- ProposalPending → CustomerResponsePending
- CustomerResponsePending → ApprovedForRepair / DeclinedRiskAccepted / Escalated
- ApprovedForRepair → RepairInProgress
- RepairInProgress → VerificationPending
- VerificationPending → ClosedVerified
- Escalated → CustomerResponsePending / ApprovedForRepair

### Carrier recommendation

States: Imported, Acknowledged, Assigned, InProgress, EvidencePending, ClosedVerified, Overdue, Waived.

Transitions:
- Imported → Acknowledged
- Acknowledged → Assigned / Waived
- Assigned → InProgress / Overdue
- InProgress → EvidencePending / Overdue
- EvidencePending → ClosedVerified / Overdue
- Overdue → InProgress

### Asset identity exception

States: Detected, VerificationPending, Reconciled, ReplacementPending, RetestPending, ClosedVerified, Escalated.

Transitions:
- Detected → VerificationPending
- VerificationPending → Reconciled / ReplacementPending / Escalated
- ReplacementPending → RetestPending / Escalated
- RetestPending → ClosedVerified

## Required evidence types and validation rules

| Evidence type | Applies to | Required fields | Validation rule | Blocks close |
|---|---|---|---|---|
| Notification proof | impairment, critical deficiency | recipient role, channel, timestamp, outcome, actor, copy/attachment or logged call note | timestamp required; recipient must match rule target; "sent" and "not sent" are distinct states | Yes when rule requires notification |
| Fire-watch record | impairment | person, provider, start/end, area covered, round interval, signed log or invoice | end must be after start; if provider external, vendor reference required | Yes when rule requires fire watch |
| Restoration test record | impairment | test type, readings, units, performedBy, performedAt, outcome | numeric readings required for tests that require readings; free text alone invalid | Yes |
| Photo evidence | all types | capturedAtClient, receivedAtServer, linked system/asset, uploader | immutable original stored; metadata preserved | Conditional |
| Customer decision | deficiency, carrier recommendation | approved/declined/no response, decidedAt, who decided, signed proof if decline/acceptance | "declined" requires proof; otherwise remains pending | Yes for decline-close state |
| Proposal transmission proof | deficiency | sentAt, recipient, channel, proposalId | required before response timer starts | Yes |
| Asset identity proof | asset identity | manufacturer, model, serial/lot if available, install date if known, photo | at least one visual proof plus structured identity required | Yes |
| Original source document | all externally relevant exceptions | original file blob, checksum, uploader, receivedAtServer | original version immutable; supplements append-only | Yes for packet export |
| Counsel hold notice | vault/legal | scope, reason, requestedBy, effectiveAt | once active, deletion/overwrite disabled | Yes for record purge paths |

## Jurisdiction and rule-engine design

Rule-engine principles:
1. Local override beats generic template.
2. Effective-date versioning is mandatory.
3. Every automatic requirement must point to a rule version.
4. Human override is allowed only through signed/attributed exception handling.
5. Unspecified rules remain disabled until verified.

### Mocked jurisdiction seeds

| Jurisdiction | Confidence | Seeded rules in MVP |
|---|---|---|
| Hartwell | High | Quarterly main-drain expectation; impairment > 4 hours requires AHJ notification state and post-restoration main-drain evidence; local pump certificate posting rule tracked as documentation deficiency |
| Wessex | Medium | Annual main-drain expectation; impairment-notification rule **unspecified** until discovery; no automatic AHJ-notification hard block enabled by default |
| Dunmoor | Low / inferred | NFPA 25 (2020) **inferred**; all local amendments **unspecified** and disabled until verified |

### Example rule object

```json
{
  "id": "hartwell.impairment.gt4h.v1",
  "jurisdictionId": "jur_hartwell",
  "effectiveFrom": "2025-01-01",
  "exceptionType": "impairment",
  "when": {
    "systemClass": ["sprinkler", "standpipe", "fire_pump", "water_supply"],
    "durationMinutes": { "gte": 240 }
  },
  "requires": [
    "ahj_notification",
    "fire_watch_record",
    "restoration_test_record"
  ],
  "blocksClosureUntil": [
    "ahj_notification.valid",
    "fire_watch_record.valid",
    "restoration_test_record.valid"
  ],
  "sourceNote": "Mocked from Beacon packet; must be re-verified by compliance owner before production"
}
```

## Contradiction detection logic

Deterministic first, AI-assisted second. Every structured record and every manually tagged unstructured document creates claim objects:
- `system_status = satisfactory`
- `deficiency_exists = true`
- `manufacturer = Eagle-Picher Carefree CFM12V18`
- `notification_sent = true|false|unknown`
- `main_drain_performed = true`
- `main_drain_values = missing`
- `pump_variance_pct = 18`

| Contradiction class | Cedar Heights example | Detection strategy |
|---|---|---|
| Report vs internal note mismatch | Quarterly report says no deficiency; internal email says corrosion probably existed last quarter | same property + same component + conflicting status claims |
| Omitted known deficiency | Issue known operationally but absent from official report | internal deficiency claim exists after or before official satisfactory claim with overlapping period |
| Timing threshold breach | Impairment duration exceeds threshold but notification proof absent | duration calculation + rule evaluation + missing evidence |
| Missing corroboration | Log says test happened, but no readings or signed record exist | event exists without required evidence object |
| Asset identity mismatch | Battery manufacturer in report differs from installed battery plate | compare structured asset identity across sources |
| Performance variance | Prior "satisfactory" vs later measured out-of-tolerance result | compare test result claims over time against system tolerance rules |

## Packet builder

Packet types in MVP:
- AHJ NOV response: cover memo, exception timeline, corrective-action plan, supporting reports, deficiency correspondence, impairment evidence, discrepancy explanations
- Owner response: plain-language status summary, open risks, customer approvals/declines, originals index
- Insurer / loss control: ITM history, recommendation status, impairments, restoration tests, supporting photos, original-source index
- Counsel / E&O / subrogation: originals bundle, chain-of-custody manifest, legal-hold summary, contradiction log, export receipt

Export formats:
- PDF summary
- ZIP evidence bundle (originals + derivatives + manifests)
- `manifest.json` (machine-readable export index with hashes)
- `manifest.csv` (spreadsheet-friendly document inventory)
- signed export receipt PDF

## Preservation hold and immutable vault

Vault rules:
1. Each original upload gets a SHA-256 checksum at ingest.
2. Originals and derivatives are separate records.
3. A correction creates a supplemental version, not a replacement.
4. Legal hold freezes deletion and overwrite for all scoped original versions.
5. Every export records a manifest and custody event.
6. Redactions create derivative copies; originals stay preserved.

Use S3 Object Lock or compatible WORM storage where available. In dev, use a local filesystem adapter that simulates WORM (refuses overwrite when version `is_original` and a hold is active).

## Offline field UX

| Requirement | MVP behavior |
|---|---|
| Installable field app | Responsive web app with PWA installation |
| Offline record creation | Drafts, photos, voice notes, and evidence saved locally using device storage until sync |
| Sync strategy | Outbox queue with retry, conflict handling, and server acknowledgments |
| Camera-first capture | Photo capture from exception detail; multi-photo upload supported |
| Voice capture | On-device or browser speech-to-text for notes |
| Photo baseline | Side-by-side current vs previous image for the same system/asset where prior image exists |
| Customer-decline flow | Signed decline or explicit "no response" path; no silent close |

## UI screens

| Screen | Purpose | Key components |
|---|---|---|
| Property Dashboard | Portfolio/property risk view | AppShell, PropertyHeader, RiskSummaryCard, OpenExceptionList, PacketReadinessCard, TimelinePreview |
| Exception Detail | Canonical workspace for one exception | ExceptionHeader, StateBadge, RuleSummaryPanel, EvidenceChecklist, TransitionDrawer, ActivityFeed |
| Impairment Wizard | Fast field-start flow | QuickStartForm, SystemPicker, DurationEstimator, RequiredActionsPreview |
| Evidence Capture | Collect and validate proof | PhotoUploader, VoiceNoteRecorder, ReadingEntryForm, NotificationProofForm, FireWatchLogForm |
| Contradiction Map | Review record conflicts | ConflictList, ConflictCard, SourceClaimDiff, ResolutionActionPanel |
| Packet Builder | Generate stakeholder-specific export | PacketTypeSelector, ScopeFilter, MissingItemsPanel, ExportOptions |
| Vault / Document Viewer | Browse originals and derivatives | DocumentTable, VersionDrawer, HoldStatusBadge, HashBlock, ExportHistory |
| Admin / Rules | Manage jurisdiction rules and templates | RuleTable, RuleEditor, EffectiveDatePicker, SeedStatusIndicator |

## Database schema

| Table | Key columns |
|---|---|
| `organizations` | `id`, `kind`, `name`, `status` |
| `users` | `id`, `organization_id`, `email`, `role`, `mfa_required` |
| `properties` | `id`, `owner_org_id`, `manager_org_id`, `jurisdiction_id`, `name`, `address_json` |
| `jurisdictions` | `id`, `name`, `state`, `default_rule_pack_id`, `confidence` |
| `systems` | `id`, `property_id`, `system_class`, `label`, `location`, `standard_ref` |
| `assets` | `id`, `system_id`, `asset_class`, `manufacturer`, `model`, `serial_number`, `installed_at` |
| `exceptions` | `id`, `property_id`, `system_id`, `asset_id`, `type`, `state`, `severity`, `title`, `opened_at`, `closed_at` |
| `exception_state_history` | `id`, `exception_id`, `from_state`, `to_state`, `changed_by`, `reason`, `rule_evaluation_id` |
| `evidence_items` | `id`, `exception_id`, `evidence_type`, `status`, `captured_at`, `validated_at`, `validation_errors_json` |
| `documents` | `id`, `property_id`, `exception_id`, `source_type`, `title`, `document_date`, `hold_status` |
| `document_versions` | `id`, `document_id`, `version_no`, `sha256`, `storage_key`, `mime_type`, `byte_size`, `is_original`, `supersedes_version_id` |
| `document_claims` | `id`, `document_version_id`, `claim_type`, `claim_subject_ref`, `claim_value_json`, `claim_time_range_json` |
| `rule_packs` | `id`, `jurisdiction_id`, `version`, `effective_from`, `effective_to`, `source_note`, `status` |
| `rule_bindings` | `id`, `property_id`, `jurisdiction_id`, `rule_pack_id`, `override_json` |
| `rule_evaluations` | `id`, `exception_id`, `rule_pack_id`, `evaluated_at`, `requirements_json`, `blocking_json` |
| `contradictions` | `id`, `property_id`, `exception_id`, `type`, `severity`, `confidence`, `claim_a_id`, `claim_b_id`, `resolution_status` |
| `packets` | `id`, `property_id`, `packet_type`, `status`, `manifest_json`, `generated_at`, `generated_by` |
| `packet_items` | `id`, `packet_id`, `document_version_id`, `included_as`, `order_index` |
| `legal_holds` | `id`, `scope_type`, `scope_id`, `reason`, `requested_by`, `effective_at`, `released_at` |
| `notifications` | `id`, `exception_id`, `recipient_role`, `channel`, `status`, `sent_at`, `payload_hash` |
| `audit_events` | `id`, `actor_id`, `entity_type`, `entity_id`, `action`, `before_json`, `after_json`, `ip`, `user_agent`, `created_at` |

Indexes:
- `exceptions(property_id, state, type, severity)`
- `evidence_items(exception_id, status, evidence_type)`
- `document_versions(document_id, version_no desc)`
- `document_claims(claim_subject_ref, claim_type)`
- `contradictions(property_id, resolution_status, severity)`
- `audit_events(entity_type, entity_id, created_at desc)`

## Cedar Heights seed (canonical demo)

| Entity | ID | Example values |
|---|---|---|
| Contractor org | `org_beacon` | `Beacon Fire & Safety` |
| Owner org | `org_halberd` | `Halberd Realty Holdings` |
| Manager org | `org_steeplechase` | `Steeplechase Property Management` |
| AHJ org | `org_hartwell_ahj` | `City of Hartwell Fire Marshal` |
| Insurer org | `org_continental` | `Continental Mutual Property` |
| Counsel org | `org_worth_patel` | `Worth, Patel & Associates` |
| Jurisdiction | `jur_hartwell` | `Hartwell`, state = `Massachusetts`, rule pack = `hartwell_v1` |
| Property | `prop_cedar` | `Cedar Heights Apartments`, 12-story, 142-unit |
| System | `sys_sprinkler_9` | class=`sprinkler`, label=`9th-floor wet sprinkler zone` |
| System | `sys_standpipe_9w` | class=`standpipe`, label=`9th-floor west stairwell hose connection` |
| System | `sys_fire_pump` | class=`fire_pump`, label=`Main electric horizontal split-case fire pump` |
| System | `sys_alarm_panel` | class=`fire_alarm`, label=`Simplex 4100ES panel` |
| Exception | `exc_imp_0116` | type=`impairment`, state=`restored_evidence_incomplete`, opened_at=`Day -116 07:40`, severity=`critical` |
| Exception | `exc_def_9w_corr` | type=`deficiency`, state=`customer_response_pending`, severity=`high` |
| Exception | `exc_carrier_55a` | type=`carrier_recommendation`, state=`acknowledged`, severity=`medium` |
| Exception | `exc_asset_battery` | type=`asset_identity`, state=`verification_pending`, severity=`medium-high` |
| Exception | `exc_pump_perf` | type=`deficiency`, subtype=`test_discrepancy`, state=`escalated`, severity=`critical` |

```json
{
  "id": "exc_imp_0116",
  "propertyId": "prop_cedar",
  "systemId": "sys_sprinkler_9",
  "type": "impairment",
  "state": "restored_evidence_incomplete",
  "severity": "critical",
  "title": "9th-floor wet sprinkler zone out of service for frozen-pipe repair",
  "openedAt": "2026-01-05T07:40:00-05:00",
  "closedAt": null,
  "metadata": {
    "cause": "Frozen pipe at vertical riser",
    "reportedDurationMinutes": 350,
    "notifications": {
      "ahj": "unknown",
      "customer": "reported_in_log",
      "insurer": "unspecified"
    }
  }
}
```

## API contracts

REST is system of record for writes.

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/v1/exceptions` | create exception |
| `GET` | `/v1/exceptions/{id}` | fetch exception detail |
| `POST` | `/v1/exceptions/{id}/transition` | request state transition |
| `POST` | `/v1/exceptions/{id}/evidence` | upload or register evidence item |
| `POST` | `/v1/evidence/{id}/validate` | validate evidence |
| `GET` | `/v1/properties/{id}/dashboard` | property read model |
| `GET` | `/v1/properties/{id}/contradictions` | contradiction list |
| `POST` | `/v1/packets` | create packet job |
| `GET` | `/v1/packets/{id}` | fetch packet status |
| `POST` | `/v1/legal-holds` | create legal hold |
| `POST` | `/v1/documents/{id}/versions` | upload new doc version |
| `GET` | `/v1/audit-events` | audit search |
| `POST` | `/v1/rule-evaluations/run` | re-run rules on scope |

Validation error example:

```json
{
  "error": "BLOCKING_REQUIREMENTS_UNMET",
  "exceptionId": "exc_imp_0116",
  "missing": [
    "ahj_notification.valid",
    "fire_watch_record.valid",
    "restoration_test_record.valid"
  ]
}
```

## Architecture

- `apps/web`: Next.js 15 web/PWA client (App Router, React 19)
- `apps/api`: typed REST API (Fastify or Hono), OpenAPI generated
- `apps/worker`: async jobs (BullMQ on Redis OR pg-boss) for rule evaluation, contradictions, exports, notifications
- `packages/domain`: shared types, enums, zod schemas (BUILT)
- `packages/db`: Drizzle schema + migrations (owned by Backend agent)
- `packages/rules`: rule engine and seed packs
- `packages/legal-export`: contradiction engine + packet manifest builder
- `packages/seed`: demo data seeders
- `packages/ui`: shared UI components
- `infrastructure`: docker-compose, IaC templates, CI configs

## Demo script (must work end-to-end)

1. Open Cedar Heights dashboard and show five open exceptions.
2. Open the Day -116 impairment and show state = `restored_evidence_incomplete`.
3. Show rule summary for Hartwell and missing blockers: AHJ notification, fire-watch proof, restoration test readings.
4. Attempt to close the impairment and show the blocking error.
5. Open the contradiction map and show the standpipe omission conflict.
6. Open packet builder, select AHJ NOV response, and show missing items plus export-ready items.
7. Open vault and show original document versions with checksum and hold badge.
8. Apply a legal hold and show that overwrite/delete paths are disabled.
9. End on a generated packet manifest and audit entry.

## Prototype acceptance criteria

| Area | Acceptance criteria |
|---|---|
| Seeded demo | Cedar Heights loads automatically with seeded exceptions, contradictions, and packet readiness |
| Core wedge | At least one impairment cannot be closed until rule-required evidence is present |
| Statefulness | All exception types have visible states and transition history |
| Evidence rigor | Numeric validation exists for restoration readings; free text alone is insufficient where blocked |
| Packet output | User can generate at least one stakeholder packet with export manifests |
| Vault integrity | Originals show checksum/version and respect legal hold |
| Offline UX | At least evidence drafts function offline and sync later |
