import { readFileSync } from "fs";
import { config } from "dotenv";

config({ path: ".env" });

async function test() {
  const { auth } = await import("../lib/auth");
  console.log("auth type:", typeof auth);
  console.log("auth keys:", Object.keys(auth));
  console.log("has handler:", "handler" in auth);
  if ("handler" in auth) {
    console.log("handler type:", typeof auth.handler);
  }
}

test().catch((e) => console.error("Error:", e.message));
