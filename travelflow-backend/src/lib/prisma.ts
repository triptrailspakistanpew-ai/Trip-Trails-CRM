import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma =
  global.prismaGlobal ??
  new PrismaClient({
    log:
      process.env.DEBUG_PRISMA === "true"
        ? ["query", "error", "warn"]
        : ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prismaGlobal = prisma;
}

// RLS middleware — sets agency ID session variable for row-level security policies.
// The app's existing app-level filtering (agencyFilter) remains the authoritative guard.
// When connecting to remote databases (e.g. Supabase pooler), SET LOCAL outside transactions
// incurs a ~280ms network round-trip penalty per query and does not persist across pooled connections.
if (process.env.ENABLE_RLS_MIDDLEWARE === "true") {
  prisma.$use(async (params, next) => {
    const agencyId =
      params.args?.where?.agencyId ??
      params.args?.data?.agencyId ??
      params.args?.data?.create?.agencyId;

    if (agencyId && typeof agencyId === "string" && agencyId.match(/^[0-9a-f-]{36}$/i)) {
      try {
        await prisma.$executeRawUnsafe(
          `SET LOCAL app.current_agency_id = '${agencyId}'`
        );
      } catch {
        // RLS not enabled or connection pool issue — continue silently.
      }
    }

    return next(params);
  });
}
