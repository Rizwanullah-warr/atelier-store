import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/db";
import * as schema from "@/db/schema";

// BETTER_AUTH_SECRET and BETTER_AUTH_URL are read from the environment.
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  // No email service is configured, so addresses are not verified and there is
  // no password reset flow yet.
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  // nextCookies must stay last so it can set cookies from server actions.
  plugins: [nextCookies()],
});
