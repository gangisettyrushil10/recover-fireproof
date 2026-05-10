-- Truncate every Fireproof table in dependency order. Useful for tests; do
-- NOT run in production. The order tracks foreign keys so RESTRICTed FKs
-- never abort the truncate.

TRUNCATE TABLE
  audit_events,
  notifications,
  legal_holds,
  packet_items,
  packets,
  contradictions,
  rule_evaluations,
  document_claims,
  document_versions,
  documents,
  evidence_items,
  exception_state_history,
  exceptions,
  rule_bindings,
  rule_packs,
  assets,
  systems,
  properties,
  jurisdictions,
  users,
  organizations
RESTART IDENTITY CASCADE;
