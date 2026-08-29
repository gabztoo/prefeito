import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

const handler = toNextJsHandler(auth);

export async function POST(request: Request) {
  try {
    return await handler.POST(request);
  } catch (error) {
    console.error("Auth POST error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    return await handler.GET(request);
  } catch (error) {
    console.error("Auth GET error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
