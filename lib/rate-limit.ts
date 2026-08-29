import { createHmac } from "crypto";

/**
 * Compute HMAC-SHA-256 for rate limiting
 */
export function computeHmac(key: string, data: string): string {
  return createHmac("sha256", key).update(data).digest("hex");
}

/**
 * Compute bucket hash for rate limiting
 * Combines IP, link, and window into a single hash
 */
export function computeBucketHash(
  ip: string,
  linkId: string,
  windowMinutes: number
): string {
  const data = `${ip}:${linkId}:${windowMinutes}`;
  return computeHmac(process.env.RATE_LIMIT_SECRET || "default-secret", data);
}

/**
 * Check if honeypot field is filled
 */
export function isHoneypotFilled(value: string | undefined | null): boolean {
  return value !== undefined && value !== null && value.trim().length > 0;
}

/**
 * Check rate limit
 */
export function checkRateLimit(
  count: number,
  limit: number
): { allowed: boolean; count: number } {
  return {
    allowed: count <= limit,
    count,
  };
}

/**
 * Get current window in minutes (10-minute windows)
 */
export function getCurrentWindow(): number {
  return Math.floor(Date.now() / (10 * 60 * 1000));
}

/**
 * Get IP from request headers (Vercel or standard)
 */
export function getIpFromHeaders(
  headers: Headers
): string | null {
  // In Vercel, use x-vercel-forwarded-for
  const forwardedFor = headers.get("x-vercel-forwarded-for");
  if (forwardedFor) {
    // Take the first IP
    const ip = forwardedFor.split(",")[0].trim();
    if (ip) return ip;
  }

  // Standard headers
  const xForwardedFor = headers.get("x-forwarded-for");
  if (xForwardedFor) {
    const ip = xForwardedFor.split(",")[0].trim();
    if (ip) return ip;
  }

  const xRealIp = headers.get("x-real-ip");
  if (xRealIp) return xRealIp;

  return null;
}

/**
 * Normalize IP for rate limiting
 * IPv6 reduced to /64 prefix
 */
export function normalizeIp(ip: string): string {
  // Check if IPv6
  if (ip.includes(":")) {
    // Reduce to /64 prefix (first 8 groups)
    const parts = ip.split(":");
    if (parts.length >= 8) {
      return parts.slice(0, 8).join(":") + "::";
    }
    return ip;
  }
  return ip;
}

import { db } from "@/db/drizzle";
import { registration_rate_limit } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function incrementRateLimit(
  ip: string,
  linkId: string,
  windowMinutes: number
): Promise<{ allowed: boolean; count: number }> {
  const bucketHash = computeBucketHash(ip, linkId, windowMinutes);
  const expiresAt = new Date(Date.now() + windowMinutes * 60 * 1000);
  const result = await db.insert(registration_rate_limit).values({ bucketHash, count: 1, expiresAt }).onConflictDoUpdate({ target: registration_rate_limit.bucketHash, set: { count: sql`LEAST(${registration_rate_limit.count} + 1, 100)`, updatedAt: new Date() } }).returning({ count: registration_rate_limit.count });
  const count = result[0]?.count ?? 1;
  return { allowed: count <= 5, count };
}