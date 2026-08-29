import { db } from "@/db/drizzle";
import { account, session, user, verification, rateLimit } from "@/db/schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";

export const auth = betterAuth({
  trustedOrigins: [`${process.env.NEXT_PUBLIC_APP_URL}`],
  allowedDevOrigins: [`${process.env.NEXT_PUBLIC_APP_URL}`],
  cookieCache: {
    enabled: false,
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      session,
      account,
      verification,
      rateLimit,
    },
  }),
  plugins: [
    nextCookies(),
    admin({
      disableHttpEndpoints: true,
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
  ],
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    revokeSessionsOnPasswordReset: true,
  },
});
