import { auth } from "@/lib/auth";
import { isDisabledAuthPath } from "@/lib/auth-route-policy";
import { toNextJsHandler } from "better-auth/next-js";

const handler = toNextJsHandler(auth);

function rejectDisabledEndpoint(request: Request): Response | null {
  return isDisabledAuthPath(new URL(request.url).pathname)
    ? Response.json({ error: "Not found" }, { status: 404 })
    : null;
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
