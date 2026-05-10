/**
 * Stable slugs for every Cedar Heights seeded entity. Every other module in
 * `@fireproof/seed` imports from here — never re-define a slug inline.
 *
 * To map a slug → UUID, call `stableId(slug)` from `./util`.
 */

export const ORG_SLUGS = {
  beacon: 'org_beacon',
  halberd: 'org_halberd',
  steeplechase: 'org_steeplechase',
  hartwellAhj: 'org_hartwell_ahj',
  continental: 'org_continental',
  worthPatel: 'org_worth_patel',
} as const;

export const USER_SLUGS = {
  lpark: 'usr_lpark',
  mdisalvo: 'usr_mdisalvo',
  bryanPm: 'usr_bryan_pm',
  reyes: 'usr_reyes',
  jstein: 'usr_jstein',
  counsel: 'usr_counsel',
} as const;

export const JURISDICTION_SLUGS = {
  hartwell: 'jur_hartwell',
  wessex: 'jur_wessex',
  dunmoor: 'jur_dunmoor',
} as const;

export const RULE_PACK_SLUGS = {
  hartwellV1: 'rule_pack_hartwell_v1',
  wessexV1: 'rule_pack_wessex_v1',
  dunmoorV1: 'rule_pack_dunmoor_v1',
} as const;

export const RULE_BINDING_SLUGS = {
  cedarHartwell: 'rule_binding_cedar_hartwell',
} as const;

export const PROPERTY_SLUGS = {
  cedar: 'prop_cedar',
} as const;

export const SYSTEM_SLUGS = {
  sprinkler9: 'sys_sprinkler_9',
  standpipe9w: 'sys_standpipe_9w',
  firePump: 'sys_fire_pump',
  alarmPanel: 'sys_alarm_panel',
  fdc: 'sys_fdc',
} as const;

export const ASSET_SLUGS = {
  batteryRecorded: 'ast_battery_recorded',
  batteryInstalled: 'ast_battery_installed',
  pumpMotor: 'ast_pump_motor',
} as const;

export const EXCEPTION_SLUGS = {
  imp0116: 'exc_imp_0116',
  def9wCorr: 'exc_def_9w_corr',
  carrier55a: 'exc_carrier_55a',
  assetBattery: 'exc_asset_battery',
  pumpPerf: 'exc_pump_perf',
} as const;

export const DOCUMENT_SLUGS = {
  carrierSurveyD416: 'doc_carrier_survey_d416',
  ahjRoutineD243: 'doc_ahj_routine_d243',
  quarterlyD211: 'doc_quarterly_d211',
  trainingTranscriptD198: 'doc_training_transcript_d198',
  impairmentLogD116: 'doc_impairment_log_d116',
  emailThreadCorrosion: 'doc_email_thread_corrosion',
  proposal2026009: 'doc_proposal_2026_009',
  marshalVoicemailD3: 'doc_marshal_voicemail_d3',
  ownerRecordsDemandD4: 'doc_owner_records_demand_d4',
  novD12: 'doc_nov_d12',
  pumpTestPerf: 'doc_pump_test_d_pump_perf',
  batteryPhoto: 'doc_battery_photo',
  batteryPlateRecord: 'doc_battery_plate_record',
} as const;

export type Slug = string & { readonly __slug: unique symbol };
