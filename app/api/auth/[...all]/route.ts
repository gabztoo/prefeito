import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

const handler = toNextJsHandler(auth);

function rejectDisabledEndpoint(request: Request): Response | null {
  const pathname = new URL(request.url).pathname;
  const authPath = pathname.startsWith("/api/auth/")
    ? pathname.slice("/api/auth".length)
    : pathname;
  const disabled =
    authPath.startsWith("/sign-up/") ||
    authPath === "/reset-password" ||
    authPath.startsWith("/reset-password/") ||
    authPath === "/admin" ||
    authPath.startsWith("/admin/");

  return disabled ? Response.json({ error: "Not found" }, { status: 404 }) : null;
}

export async function POST(request: Request) {
  try {
    const rejected = rejectDisabledEndpoint(request);
    if (rejected) return rejected;

    return await handler.POST(request);
  } catch {
    console.error("Auth POST error");
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const rejected = rejectDisabledEndpoint(request);
    if (rejected) return rejected;

    return await handler.GET(request);
  } catch {
    console.error("Auth GET error");
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
