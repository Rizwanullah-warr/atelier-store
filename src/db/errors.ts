// Postgres error details, unwrapped from Drizzle's query error.
export type PgErrorInfo = { code: string; constraint: string | null };

export function pgError(error: unknown): PgErrorInfo | null {
  for (let current = error; current; ) {
    const candidate = current as { code?: unknown; constraint?: unknown; cause?: unknown };
    if (typeof candidate.code === "string" && /^[0-9A-Z]{5}$/.test(candidate.code)) {
      return {
        code: candidate.code,
        constraint: typeof candidate.constraint === "string" ? candidate.constraint : null,
      };
    }
    current = candidate.cause;
  }
  return null;
}

export const isUniqueViolation = (error: unknown, constraint: string) => {
  const info = pgError(error);
  return info?.code === "23505" && info.constraint === constraint;
};

export const isForeignKeyViolation = (error: unknown) => pgError(error)?.code === "23503";
