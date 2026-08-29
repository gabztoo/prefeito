import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { exportCsv } from "@/lib/services/export";

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
  };

  const exportResult = await exportCsv(session.user.id, session.user.role, filters);

  if (!exportResult.ok) {
    if (exportResult.code === "TOO_MANY_RECORDS") {
      return new Response(
        JSON.stringify({ error: exportResult.code, message: exportResult.message }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: exportResult.code, message: exportResult.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `eleitores-${timestamp}.csv`;

  return new Response(exportResult.stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "Transfer-Encoding": "chunked",
    },
  });
}
