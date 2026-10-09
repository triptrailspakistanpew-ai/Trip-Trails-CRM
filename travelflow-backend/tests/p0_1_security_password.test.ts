import { describe, it, expect, printSuiteSummary } from "./test_harness";
import { prisma } from "../src/lib/prisma";
import * as authService from "../src/services/auth.service";
import * as domainService from "../src/services/domain.service";

async function run() {
  await describe("P0.1: Security — Password Hash Exposure Prevention", async () => {
    // Fetch a real user from database
    const user = await prisma.user.findFirst({
      where: { isDeleted: false, status: "active" },
    });
    if (!user) throw new Error("No active user found in seeded database");

    await it("authService.getMe() must never contain password or password hash", async () => {
      const me = await authService.getMe(user.id);
      expect(me).toBeDefined();
      expect((me as any).password).toBeUndefined();
      expect(JSON.stringify(me).includes("$2a$")).toBeFalsy();
      expect(JSON.stringify(me).includes("$2b$")).toBeFalsy();
    });

    await it("authService.login() user payload must never contain password hash", async () => {
      const loginRes = await authService.login(user.email, "Password123!");
      expect(loginRes.user).toBeDefined();
      expect((loginRes.user as any).password).toBeUndefined();
      expect(JSON.stringify(loginRes.user).includes("$2a$")).toBeFalsy();
    });

    await it("domainService.listUsers() must never expose password field", async () => {
      const usersRes = await domainService.listUsers({ agencyId: user.agencyId });
      const users = (usersRes as any).data || usersRes;
      expect(users.length > 0).toBeTruthy();
      for (const u of users) {
        expect((u as any).password).toBeUndefined();
        expect(JSON.stringify(u).includes("$2a$")).toBeFalsy();
      }
    });

    await it("domainService.getUser() must never expose password field", async () => {
      const userRes = await domainService.getUser({ agencyId: user.agencyId }, user.id);
      expect(userRes).toBeDefined();
      expect((userRes as any).password).toBeUndefined();
      expect(JSON.stringify(userRes).includes("$2a$")).toBeFalsy();
    });
  });

  const ok = printSuiteSummary();
  await prisma.$disconnect();
  process.exit(ok ? 0 : 1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
