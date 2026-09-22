import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { exportVotersXlsx } from "@/lib/services/export";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const result = await auth.api.getSession({
    headers: await headers(),
  });

  if (!result?.session?.userId || !result?.user?.role) {
    return new Response("Não autorizado", { status: 401 });
  }

  const session = {
    user: {
      id: result.session.userId,
      role: result.user.role,
    },
  };

  const { searchParams } = new URL(request.url);

  const filters = {
    campaignId: searchParams.get("campaignId") || undefined,
    leaderId: searchParams.get("leaderId") || undefined,
    zone: searchParams.get("zone") || undefined,
    section: searchParams.get("section") || undefined,
    search: searchParams.get("search") || undefined,
  };

  const exportResult = await exportVotersXlsx(session.user.id, session.user.role, filters);

  if (!exportResult.ok) {
    return new Response(
      JSON.stringify({ error: exportResult.code, message: exportResult.message }),
      {
        status: exportResult.code === "TOO_MANY_RECORDS" ? 400
          : exportResult.code === "FORBIDDEN" ? 403
          : 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `eleitores-${timestamp}.xlsx`;

  return new Response(new Uint8Array(exportResult.buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
