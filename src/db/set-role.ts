// Gives an existing account admin access (or takes it away).
//   npm run user:role -- <email> admin
//   npm run user:role -- <email> customer
// The account must exist first: create it on /account.

import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { user, USER_ROLES, type UserRole } from "@/db/schema";

async function main() {
  const [email, role] = process.argv.slice(2);
  if (!email || !USER_ROLES.includes(role as UserRole)) {
    console.error("Usage: npm run user:role -- <email> <admin|customer>");
    process.exit(1);
  }

  const [updated] = await db
    .update(user)
    .set({ role: role as UserRole })
    .where(eq(sql`lower(${user.email})`, email.trim().toLowerCase()))
    .returning({ email: user.email, role: user.role });

  if (!updated) {
    console.error(`No account found for ${email}. Create it on /account first.`);
    process.exit(1);
  }
  console.log(
    `${updated.email} is now ${updated.role === "admin" ? "an admin" : "a customer"}.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
