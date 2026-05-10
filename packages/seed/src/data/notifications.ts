/**
 * Operational notifications. The Day -116 demo rests on the AHJ notification
 * being **absent**, so we only seed the customer log entry that the impairment
 * record references and a couple of post-fire records-demand notifications.
 */

import { DEFAULT_ORG_ID } from './organizations.js';
import { EXCEPTION_SLUGS, USER_SLUGS } from '../ids.js';
import { dayOffset, stableId } from '../util.js';

export interface SeedNotification {
  slug: string;
  id: string;
  organizationId: string;
  exceptionId: string | null;
  channel: 'email' | 'sms' | 'in_app' | 'webhook';
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'bounced';
  recipientRole: string | null;
  recipientUserId: string | null;
  recipientAddress: string | null;
  templateKey: string | null;
  payloadHash: string | null;
  payload: Record<string, unknown>;
  sentAt: Date | null;
  deliveredAt: Date | null;
  metadata: Record<string, unknown>;
}

export const NOTIFICATIONS: SeedNotification[] = [
  {
    slug: 'notif_imp0116_customer_log',
    id: stableId('notif_imp0116_customer_log'),
    organizationId: DEFAULT_ORG_ID,
    exceptionId: stableId(EXCEPTION_SLUGS.imp0116),
    channel: 'in_app',
    status: 'sent',
    recipientRole: 'customer',
    recipientUserId: stableId(USER_SLUGS.bryanPm),
    recipientAddress: 'bryan@steeplechase.example',
    templateKey: 'impairment.opened',
    payloadHash: null,
    payload: { reason: 'Frozen pipe at 9th floor sprinkler vertical riser' },
    sentAt: dayOffset(-116, '07:55:00'),
    deliveredAt: dayOffset(-116, '07:55:00'),
    metadata: { source: 'seed' },
  },
  {
    slug: 'notif_records_demand_owner',
    id: stableId('notif_records_demand_owner'),
    organizationId: DEFAULT_ORG_ID,
    exceptionId: null,
    channel: 'email',
    status: 'sent',
    recipientRole: 'office',
    recipientUserId: stableId(USER_SLUGS.lpark),
    recipientAddress: 'lpark@beacon.example',
    templateKey: 'records_demand.received',
    payloadHash: null,
    payload: { from: 'Halberd Realty Holdings' },
    sentAt: dayOffset(4, '14:00:00'),
    deliveredAt: dayOffset(4, '14:00:00'),
    metadata: { source: 'seed' },
  },
];
