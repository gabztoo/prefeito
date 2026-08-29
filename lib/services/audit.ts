export type AuditAction =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "login"
  | "logout"
  | "export"
  | "invite"
  | "access_denied";

export type AuditEntity =
  | "user"
  | "voter"
  | "campaign"
  | "election"
  | "export"
  | "invitation"
  | "auth"
  | "system";

interface AuditLogEntry {
  timestamp: string;
  action: AuditAction;
  entity: AuditEntity;
  actorId?: string;
  actorEmail?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

function sanitizeMetadata(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveFields = ["password", "token", "secret", "key", "credential", "cpf", "email"];
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    const isSensitive = sensitiveFields.some((field) =>
      key.toLowerCase().includes(field)
    );
    sanitized[key] = isSensitive ? "[REDACTED]" : value;
  }

  return sanitized;
}

export async function logAuditEvent(params: {
  action: AuditAction;
  entity: AuditEntity;
  actorId?: string;
  actorEmail?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  const sanitizedMetadata = params.metadata ? sanitizeMetadata(params.metadata) : undefined;

  const entry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    action: params.action,
    entity: params.entity,
    actorId: params.actorId,
    actorEmail: params.actorEmail,
    entityId: params.entityId,
    metadata: sanitizedMetadata,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  };

  if (process.env.NODE_ENV === "development") {
    console.log("[AUDIT]", JSON.stringify(entry, null, 2));
  }

  if (process.env.AUDIT_WEBHOOK_URL) {
    try {
      await fetch(process.env.AUDIT_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
    } catch (error) {
      console.error("[AUDIT] Failed to send audit log:", error);
    }
  }
}

export function extractRequestInfo(request: Request): {
  ipAddress?: string;
  userAgent?: string;
} {
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    undefined;

  const userAgent = request.headers.get("user-agent") || undefined;

  return { ipAddress, userAgent };
}
