import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { accountEmail, isEmailConfigured, sendEmail } from "@/lib/email";

const emailEnabled = isEmailConfigured();

// BETTER_AUTH_SECRET and BETTER_AUTH_URL are read from the environment.
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // Without RESEND_API_KEY these stay off, so the API says "not enabled"
    // instead of silently dropping the email.
    ...(emailEnabled && {
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        const result = await sendEmail({
          to: user.email,
          subject: "Reset your Atelier password",
          ...accountEmail({
            heading: "Reset your password",
            intro:
              "We received a request to reset the password for your Atelier account. The link works for one hour.",
            action: "Choose a new password",
            url,
            outro:
              "If you didn't ask for this, you can ignore this email; your password stays the same.",
          }),
        });
        if (!result.ok) console.error("[auth] password reset email:", result.error);
      },
    }),
  },
  // Verification is encouraged (banner on /account) but does not block sign-in.
  emailVerification: emailEnabled
    ? {
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
        expiresIn: 60 * 60 * 24,
        sendVerificationEmail: async ({ user, url }) => {
          const result = await sendEmail({
            to: user.email,
            subject: "Verify your Atelier email",
            ...accountEmail({
              heading: "Verify your email",
              intro: `Hello ${user.name}, please confirm this is your email address. The link works for 24 hours.`,
              action: "Verify email",
              url,
              outro: "If you didn't create an Atelier account, you can ignore this email.",
            }),
          });
          if (!result.ok) throw new Error(result.error);
        },
      }
    : undefined,
  user: {
    additionalFields: {
      // "customer" or "admin". input: false means sign-up can't set it; change
      // it with `npm run user:role -- <email> <admin|customer>`.
      role: { type: "string", required: false, defaultValue: "customer", input: false },
    },
  },
  // nextCookies must stay last so it can set cookies from server actions.
  plugins: [nextCookies()],
});
