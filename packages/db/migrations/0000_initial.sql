-- Fireproof initial schema.
-- Hand-rolled to mirror the Drizzle schema in `src/schema/`. Re-runnable as
-- long as the migration tracker (_fireproof_migrations) is consulted; bare
-- `CREATE TYPE` is wrapped in DO blocks because Postgres has no
-- `CREATE TYPE IF NOT EXISTS`.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── ENUMS ──────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE organization_kind AS ENUM ('contractor','owner','manager','ahj','insurer','counsel','platform');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin','manager','inspector','office','viewer','integration');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE exception_type AS ENUM ('impairment','deficiency','carrier_recommendation','asset_identity');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE severity AS ENUM ('low','medium','medium_high','high','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE jurisdiction_confidence AS ENUM ('high','medium','low_inferred');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE hold_status AS ENUM ('none','pending','active','released');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE document_source_type AS ENUM ('report','email','photo','audio','voicemail','log','proposal','certificate','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE evidence_type AS ENUM (
    'notification_proof','fire_watch_record','restoration_test_record',
    'photo_evidence','customer_decision','proposal_transmission_proof',
    'asset_identity_proof','original_source_document','counsel_hold_notice'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE evidence_status AS ENUM ('missing','pending','insufficient','valid','waived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE packet_type AS ENUM ('AHJ_NOV_RESPONSE','OWNER_RESPONSE','INSURER_LOSS_CONTROL','COUNSEL_SUBROGATION');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE packet_status AS ENUM ('draft','ready','emitted','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE packet_item_kind AS ENUM ('document_version','evidence_item','narrative','cover_letter','index');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE contradiction_type AS ENUM (
    'time_overlap_disagreement','identity_attribute_mismatch','restoration_test_disagreement',
    'notification_proof_missing_or_late','fire_watch_gap','asset_location_conflict','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE contradiction_resolution_status AS ENUM ('open','reviewing','resolved','dismissed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_channel AS ENUM ('email','sms','in_app','webhook');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_status AS ENUM ('queued','sent','delivered','failed','bounced');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE audit_action AS ENUM (
    'exception.created','exception.transitioned','exception.assigned',
    'exception.severity_changed','exception.hold_status_changed',
    'evidence.upserted','evidence.waived','evidence.cleared',
    'document.created','document_version.created','document_version.superseded',
    'document_claim.created','rule_evaluation.run',
    'contradiction.detected','contradiction.resolved',
    'packet.created','packet.emitted',
    'legal_hold.issued','legal_hold.released',
    'notification.sent','notification.failed',
    'user.signed_in','user.role_changed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE claim_type AS ENUM (
    'impairment_window','fire_watch_interval','restoration_test_result',
    'asset_identity_attribute','notification_event','customer_decision_event',
    'proposal_transmission','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE system_kind AS ENUM (
    'sprinkler_wet','sprinkler_dry','sprinkler_pre_action','sprinkler_deluge',
    'standpipe','fire_pump','fire_alarm','suppression_clean_agent','suppression_co2',
    'suppression_kitchen','extinguishers_portable','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE asset_kind AS ENUM (
    'backflow_preventer','control_valve','alarm_panel','sprinkler_head',
    'fire_pump','extinguisher','pressure_gauge','detector','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE rule_binding_scope AS ENUM ('organization','jurisdiction','property');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE impairment_state AS ENUM (
    'draft','active','safeguards_pending','repair_in_progress',
    'restoration_testing_required','restored_evidence_incomplete',
    'closed_audit_ready','escalated','voided'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE deficiency_state AS ENUM (
    'detected','proposal_pending','customer_response_pending','approved_for_repair',
    'repair_in_progress','verification_pending','closed_verified',
    'declined_risk_accepted','escalated'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE carrier_recommendation_state AS ENUM (
    'imported','acknowledged','assigned','in_progress','evidence_pending',
    'closed_verified','overdue','waived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE asset_identity_state AS ENUM (
    'detected','verification_pending','reconciled','replacement_pending',
    'retest_pending','closed_verified','escalated'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── TABLES ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind organization_kind NOT NULL DEFAULT 'contractor',
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS organizations_slug_uq ON organizations(slug);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'viewer',
  is_active BOOLEAN NOT NULL DEFAULT true,
  mfa_required BOOLEAN NOT NULL DEFAULT false,
  last_login_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_org_email_uq ON users(organization_id, email);

CREATE TABLE IF NOT EXISTS jurisdictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  ahj_name TEXT NOT NULL,
  state_code TEXT NOT NULL,
  county TEXT,
  city TEXT,
  default_rule_pack_id UUID,
  confidence jurisdiction_confidence NOT NULL DEFAULT 'low_inferred',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  owner_org_id UUID REFERENCES organizations(id) ON DELETE RESTRICT,
  manager_org_id UUID REFERENCES organizations(id) ON DELETE RESTRICT,
  jurisdiction_id UUID REFERENCES jurisdictions(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  address_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  owner_ref TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS properties_org_idx ON properties(organization_id);

CREATE TABLE IF NOT EXISTS systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  kind system_kind NOT NULL,
  system_class TEXT,
  label TEXT,
  name TEXT NOT NULL,
  location TEXT,
  standard_ref TEXT,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS systems_property_idx ON systems(property_id);

CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  system_id UUID REFERENCES systems(id) ON DELETE SET NULL,
  kind asset_kind NOT NULL,
  asset_class TEXT,
  identifier TEXT NOT NULL,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  installed_at TIMESTAMPTZ,
  location_description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS assets_system_idx ON assets(system_id);
CREATE INDEX IF NOT EXISTS assets_property_idx ON assets(property_id);

CREATE TABLE IF NOT EXISTS rule_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  jurisdiction_id UUID REFERENCES jurisdictions(id) ON DELETE SET NULL,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  description TEXT,
  effective_from TIMESTAMPTZ,
  effective_to TIMESTAMPTZ,
  source_note TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  is_active BOOLEAN NOT NULL DEFAULT true,
  requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rule_packs_org_key_idx ON rule_packs(organization_id, key);

CREATE TABLE IF NOT EXISTS rule_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  rule_pack_id UUID NOT NULL REFERENCES rule_packs(id) ON DELETE RESTRICT,
  scope rule_binding_scope NOT NULL,
  jurisdiction_id UUID REFERENCES jurisdictions(id) ON DELETE SET NULL,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  exception_type exception_type NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  override_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rule_bindings_lookup_idx ON rule_bindings(organization_id, exception_type, scope);
CREATE INDEX IF NOT EXISTS rule_bindings_property_idx ON rule_bindings(property_id);
CREATE INDEX IF NOT EXISTS rule_bindings_jurisdiction_idx ON rule_bindings(jurisdiction_id);

CREATE TABLE IF NOT EXISTS exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  system_id UUID REFERENCES systems(id) ON DELETE SET NULL,
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  jurisdiction_id UUID REFERENCES jurisdictions(id) ON DELETE SET NULL,
  jurisdiction_confidence jurisdiction_confidence,
  type exception_type NOT NULL,
  state TEXT NOT NULL,
  severity severity NOT NULL,
  hold_status hold_status NOT NULL DEFAULT 'none',
  title TEXT NOT NULL,
  summary TEXT,
  rule_pack_id UUID REFERENCES rule_packs(id) ON DELETE SET NULL,
  assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reporter_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS exceptions_property_state_idx ON exceptions(property_id, state, type, severity);
CREATE INDEX IF NOT EXISTS exceptions_org_idx ON exceptions(organization_id);

CREATE TABLE IF NOT EXISTS exception_state_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  exception_id UUID NOT NULL REFERENCES exceptions(id) ON DELETE CASCADE,
  from_state TEXT,
  to_state TEXT NOT NULL,
  changed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT,
  rule_evaluation_id UUID,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS esh_exception_idx ON exception_state_history(exception_id, occurred_at);

CREATE TABLE IF NOT EXISTS evidence_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  exception_id UUID NOT NULL REFERENCES exceptions(id) ON DELETE CASCADE,
  evidence_type evidence_type NOT NULL,
  status evidence_status NOT NULL DEFAULT 'missing',
  required BOOLEAN NOT NULL DEFAULT true,
  blocking BOOLEAN NOT NULL DEFAULT false,
  rule_key TEXT,
  document_version_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  captured_at TIMESTAMPTZ,
  validated_at TIMESTAMPTZ,
  validation_errors_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  waived_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  waived_at TIMESTAMPTZ,
  waiver_reason TEXT,
  notes TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS evidence_items_exception_idx ON evidence_items(exception_id, status, evidence_type);
CREATE UNIQUE INDEX IF NOT EXISTS evidence_items_unique ON evidence_items(exception_id, evidence_type);

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  exception_id UUID REFERENCES exceptions(id) ON DELETE SET NULL,
  source_type document_source_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  document_date TIMESTAMPTZ,
  hold_status hold_status NOT NULL DEFAULT 'none',
  uploaded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS documents_property_idx ON documents(property_id);
CREATE INDEX IF NOT EXISTS documents_exception_idx ON documents(exception_id);

CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
  version_no BIGINT NOT NULL,
  sha256 TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size BIGINT NOT NULL,
  is_original BOOLEAN NOT NULL DEFAULT false,
  supersedes_version_id UUID REFERENCES document_versions(id) ON DELETE SET NULL,
  uploaded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dv_document_version_idx ON document_versions(document_id, version_no DESC);
CREATE INDEX IF NOT EXISTS dv_sha_idx ON document_versions(sha256);

CREATE TABLE IF NOT EXISTS document_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  document_version_id UUID NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
  claim_type claim_type NOT NULL,
  claim_subject_kind TEXT NOT NULL,
  claim_subject_ref UUID NOT NULL,
  claim_value_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  claim_time_range_json JSONB,
  confidence NUMERIC(4,3) NOT NULL DEFAULT 1.000,
  provenance JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS document_claims_subject_idx ON document_claims(claim_subject_ref, claim_type);
CREATE INDEX IF NOT EXISTS document_claims_version_idx ON document_claims(document_version_id);

CREATE TABLE IF NOT EXISTS rule_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  exception_id UUID NOT NULL REFERENCES exceptions(id) ON DELETE CASCADE,
  rule_pack_id UUID NOT NULL REFERENCES rule_packs(id) ON DELETE RESTRICT,
  rule_binding_id UUID REFERENCES rule_bindings(id) ON DELETE SET NULL,
  requirements_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  blocking_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_satisfied BOOLEAN NOT NULL DEFAULT false,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rule_evaluations_exception_idx ON rule_evaluations(exception_id, evaluated_at);

CREATE TABLE IF NOT EXISTS contradictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  exception_id UUID REFERENCES exceptions(id) ON DELETE CASCADE,
  type contradiction_type NOT NULL,
  severity severity NOT NULL,
  confidence NUMERIC(4,3) NOT NULL DEFAULT 1.000,
  claim_a_id UUID NOT NULL REFERENCES document_claims(id) ON DELETE CASCADE,
  claim_b_id UUID NOT NULL REFERENCES document_claims(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  resolution_status contradiction_resolution_status NOT NULL DEFAULT 'open',
  resolved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contradictions_lookup_idx ON contradictions(property_id, resolution_status, severity);

CREATE TABLE IF NOT EXISTS packets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  exception_id UUID REFERENCES exceptions(id) ON DELETE CASCADE,
  packet_type packet_type NOT NULL,
  status packet_status NOT NULL DEFAULT 'draft',
  title TEXT NOT NULL,
  artifact_storage_key TEXT,
  manifest_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ,
  generated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  emitted_at TIMESTAMPTZ,
  emitted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS packets_property_idx ON packets(property_id, packet_type);

CREATE TABLE IF NOT EXISTS packet_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  packet_id UUID NOT NULL REFERENCES packets(id) ON DELETE CASCADE,
  kind packet_item_kind NOT NULL,
  document_version_id UUID REFERENCES document_versions(id) ON DELETE SET NULL,
  evidence_item_id UUID REFERENCES evidence_items(id) ON DELETE SET NULL,
  included_as TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  title TEXT,
  body TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS packet_items_packet_idx ON packet_items(packet_id, order_index);

CREATE TABLE IF NOT EXISTS legal_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  name TEXT NOT NULL DEFAULT 'Legal hold',
  scope_type TEXT NOT NULL,
  scope_id UUID,
  reason TEXT NOT NULL,
  status hold_status NOT NULL DEFAULT 'active',
  subjects JSONB NOT NULL DEFAULT '[]'::jsonb,
  requested_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  issued_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  issued_at TIMESTAMPTZ,
  effective_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  released_at TIMESTAMPTZ,
  release_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS legal_holds_scope_idx ON legal_holds(scope_type, scope_id, status);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  exception_id UUID REFERENCES exceptions(id) ON DELETE SET NULL,
  channel notification_channel NOT NULL,
  status notification_status NOT NULL DEFAULT 'queued',
  recipient_role TEXT,
  recipient_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  recipient_address TEXT,
  template_key TEXT,
  payload_hash TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  external_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_exception_idx ON notifications(exception_id);

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  action audit_action NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  related_kind TEXT,
  related_id UUID,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_system_actor BOOLEAN NOT NULL DEFAULT false,
  before_json JSONB,
  after_json JSONB,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  request_id TEXT,
  ip TEXT,
  user_agent TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_events_entity_idx ON audit_events(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_actor_idx ON audit_events(actor_user_id);
