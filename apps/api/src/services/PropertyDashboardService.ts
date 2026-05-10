/**
 * Property dashboard read model — joins exceptions, evidence, contradictions,
 * packets, and audit events to produce one denormalized payload for the home
 * screen.
 */

import { and, desc, eq, sql } from 'drizzle-orm';
import { schema, type Database } from '@fireproof/db';
import type { PacketType } from '@fireproof/domain';
import { notFound } from '@fireproof/domain';

const PACKET_TYPES: { type: PacketType; label: string }[] = [
  { type: 'AHJ_NOV_RESPONSE', label: 'AHJ NOV response' },
  { type: 'OWNER_RESPONSE', label: 'Owner response' },
  { type: 'INSURER_LOSS_CONTROL', label: 'Insurer / loss control' },
  { type: 'COUNSEL_SUBROGATION', label: 'Counsel / subrogation' },
];

export class PropertyDashboardService {
  constructor(private readonly db: Database) {}

  async load(organization_id: string, property_id: string): Promise<{
    property: {
      id: string;
      name: string;
      address?: string;
      jurisdiction?: { id: string; name: string; confidence: string } | null;
    };
    open_exceptions: Array<{
      id: string;
      type: string;
      state: string;
      severity: string;
      title: string;
      opened_at: string;
      closed_at: string | null;
      latest_evaluation: typeof schema.rule_evaluations.$inferSelect | null;
    }>;
    packet_readiness: Array<{
      type: PacketType;
      label: string;
      ready_count: number;
      missing_count: number;
      last_emitted_at: string | null;
    }>;
    contradiction_count: number;
    recent_audit_events: Array<typeof schema.audit_events.$inferSelect>;
    risk_summary: {
      open_count: number;
      blocking_count: number;
      overdue_count: number;
      severity_breakdown: Record<string, number>;
    };
  }> {
    const propRows = await this.db
      .select()
      .from(schema.properties)
      .where(
        and(
          eq(schema.properties.id, property_id),
          eq(schema.properties.organization_id, organization_id),
        ),
      )
      .limit(1);
    const property = propRows[0];
    if (!property) throw notFound('property', property_id);

    let jurisdiction: typeof schema.jurisdictions.$inferSelect | undefined;
    if (property.jurisdiction_id) {
      const jr = await this.db
        .select()
        .from(schema.jurisdictions)
        .where(eq(schema.jurisdictions.id, property.jurisdiction_id))
        .limit(1);
      jurisdiction = jr[0];
    }

    const exceptions = await this.db
      .select()
      .from(schema.exceptions)
      .where(
        and(
          eq(schema.exceptions.organization_id, organization_id),
          eq(schema.exceptions.property_id, property_id),
        ),
      )
      .orderBy(desc(schema.exceptions.opened_at));

    const evals = await Promise.all(
      exceptions.map(async (e) => {
        const rows = await this.db
          .select()
          .from(schema.rule_evaluations)
          .where(eq(schema.rule_evaluations.exception_id, e.id))
          .orderBy(desc(schema.rule_evaluations.evaluated_at))
          .limit(1);
        return { exception_id: e.id, evaluation: rows[0] ?? null };
      }),
    );
    const evalByExc = new Map(evals.map((e) => [e.exception_id, e.evaluation]));

    const evidenceCounts = await this.db
      .select({
        exception_id: schema.evidence_items.exception_id,
        status: schema.evidence_items.status,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.evidence_items)
      .where(
        and(
          eq(schema.evidence_items.organization_id, organization_id),
          // restrict to exceptions in this property via subquery; simpler: fetch all and filter client-side
        ),
      )
      .groupBy(schema.evidence_items.exception_id, schema.evidence_items.status);
    const evidenceByExc = new Map<string, Record<string, number>>();
    for (const ev of evidenceCounts) {
      const m = evidenceByExc.get(ev.exception_id) ?? {};
      m[ev.status] = ev.count;
      evidenceByExc.set(ev.exception_id, m);
    }

    const contradictionCountRow = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.contradictions)
      .where(
        and(
          eq(schema.contradictions.organization_id, organization_id),
          eq(schema.contradictions.property_id, property_id),
        ),
      );
    const contradiction_count = Number(contradictionCountRow[0]?.count ?? 0);

    const recent_audit_events = await this.db
      .select()
      .from(schema.audit_events)
      .where(eq(schema.audit_events.organization_id, organization_id))
      .orderBy(desc(schema.audit_events.created_at))
      .limit(10);

    const open_exceptions = exceptions
      .filter((e) => !e.closed_at)
      .map((e) => ({
        id: e.id,
        type: e.type,
        state: e.state,
        severity: e.severity,
        title: e.title,
        opened_at: (e.opened_at ?? new Date()).toISOString(),
        closed_at: e.closed_at ? e.closed_at.toISOString() : null,
        latest_evaluation: evalByExc.get(e.id) ?? null,
      }));

    const blocking_count = open_exceptions.filter((e) => {
      const blockers = (e.latest_evaluation?.blocking_json ?? []) as unknown[];
      return blockers.length > 0;
    }).length;
    const now = Date.now();
    const overdue_count = exceptions.filter(
      (e) => !e.closed_at && e.due_at && e.due_at.getTime() < now,
    ).length;

    const severity_breakdown: Record<string, number> = {};
    for (const e of open_exceptions) {
      severity_breakdown[e.severity] = (severity_breakdown[e.severity] ?? 0) + 1;
    }

    // Packet readiness — simple heuristic per type:
    // ready_count = number of exceptions with rule_evaluation.is_satisfied=true
    // missing_count = number of exceptions with at least one blocking requirement
    const packets = await this.db
      .select()
      .from(schema.packets)
      .where(
        and(
          eq(schema.packets.organization_id, organization_id),
          eq(schema.packets.property_id, property_id),
        ),
      );
    const lastEmittedByType = new Map<PacketType, Date>();
    for (const p of packets) {
      if (p.emitted_at) {
        const t = p.packet_type as PacketType;
        const prev = lastEmittedByType.get(t);
        if (!prev || p.emitted_at > prev) lastEmittedByType.set(t, p.emitted_at);
      }
    }

    const ready = open_exceptions.filter((e) => e.latest_evaluation?.is_satisfied).length;
    const missing = open_exceptions.length - ready;
    const packet_readiness = PACKET_TYPES.map((p) => ({
      type: p.type,
      label: p.label,
      ready_count: ready,
      missing_count: Math.max(0, missing),
      last_emitted_at: lastEmittedByType.get(p.type)?.toISOString() ?? null,
    }));

    return {
      property: {
        id: property.id,
        name: property.name,
        address: (property.address_json as { line1?: string } | null)?.line1,
        jurisdiction: jurisdiction
          ? {
              id: jurisdiction.id,
              name: jurisdiction.name,
              confidence: jurisdiction.confidence ?? 'medium',
            }
          : null,
      },
      open_exceptions,
      packet_readiness,
      contradiction_count,
      recent_audit_events,
      risk_summary: {
        open_count: open_exceptions.length,
        blocking_count,
        overdue_count,
        severity_breakdown,
      },
    };
  }
}
