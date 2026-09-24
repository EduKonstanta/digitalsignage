import { db } from "@/lib/db";

interface LogActivityInput {
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  ipAddress?: string;
  requestId?: string;
}

/**
 * Prisma's Json columns only accept plain JSON-serializable values — Date
 * instances (present on nearly every Prisma record we log) are rejected at
 * runtime. Round-tripping through JSON.stringify/parse converts dates to
 * ISO strings and drops undefined, matching what actually gets stored.
 */
function toJsonSafe(value: unknown): object | undefined {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

/**
 * Records an admin action to the ActivityLog audit trail. Failures are
 * swallowed (logged to console) so a logging problem never breaks the
 * actual mutation it's describing.
 */
export async function logActivity(input: LogActivityInput) {
  try {
    await db.activityLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        beforeData: toJsonSafe(input.before),
        afterData: toJsonSafe(input.after),
        ipAddress: input.ipAddress,
        requestId: input.requestId,
      },
    });
  } catch (error) {
    console.error("Failed to write activity log", error);
  }
}
