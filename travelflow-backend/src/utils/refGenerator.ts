import { prisma } from "../lib/prisma";

export type RefPrefix = "BK" | "LD" | "CUS" | "INV" | "EXP" | "SUP" | "RCP" | "CPY" | "REC" | "CU" | "SPY" | "CN" | "JE" | "QT";

/**
 * Generate a sequential reference number for a given prefix and agency.
 * @param prefix - The reference prefix (e.g. "BK", "INV", "EXP")
 * @param agencyId - The agency UUID
 * @param customYear - Optional year override for historical imports (e.g. 2024).
 *                     If omitted, uses the current calendar year.
 */
export async function generateRef(prefix: RefPrefix, agencyId: string, customYear?: number): Promise<string> {
  const year = customYear ?? new Date().getFullYear();
  const key = `${prefix}_${agencyId}_${year}`;

  const counter = await prisma.counter.upsert({
    where: { id: key },
    update: { seq: { increment: 1 } },
    create: { id: key, seq: 1 },
  });

  return `${prefix}-${year}-${String(counter.seq).padStart(3, "0")}`;
}

