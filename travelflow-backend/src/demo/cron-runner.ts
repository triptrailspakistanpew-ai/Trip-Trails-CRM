/**
 * TravelFlow Pakistan - Idempotent Demo Daily Cron Runner
 * Ensures scheduled activity runs exactly once per calendar day per tenant.
 * Uses persistent database locking (via Counter) to prevent duplicate runs
 * across server restarts, multiple instances, or repeated triggers.
 */

import { PrismaClient } from "@prisma/client";
import { DEMO_CONFIG } from "./config";
import { generateDailyDemoActivity, DailyActivityMetrics } from "./daily-activity";

const prisma = new PrismaClient();

export interface CronRunResult {
  success: boolean;
  skipped: boolean;
  reason?: string;
  date: string;
  metrics?: DailyActivityMetrics;
  error?: string;
}

export async function runDailyDemoCron(options: {
  targetDate?: Date;
  force?: boolean;
} = {}): Promise<CronRunResult> {
  const agencyId = DEMO_CONFIG.agency.id;
  const targetDate = options.targetDate || new Date();
  const dateStr = targetDate.toISOString().split("T")[0];

  console.log(`\n⏰ [CRON RUNNER] Executing scheduled demo activity check for: ${dateStr}`);

  // Production safety check
  if (!DEMO_CONFIG.enabled && !options.force) {
    console.log("⚠️  [CRON RUNNER] DEMO_MODE is disabled in this environment. Skipping.");
    return { success: true, skipped: true, reason: "DEMO_MODE_DISABLED", date: dateStr };
  }

  // Idempotency check using persistent Counter record
  const lockKey = `DEMO_CRON_${agencyId}_${dateStr}`;
  const existingLock = await prisma.counter.findUnique({
    where: { id: lockKey },
  });

  if (existingLock && !options.force) {
    console.log(`🔒 [CRON RUNNER] Activity for ${dateStr} has ALREADY been generated (Seq #${existingLock.seq}).`);
    console.log("   Skipping execution to guarantee zero duplicate invoices, bookings, or ledger entries.");
    return {
      success: true,
      skipped: true,
      reason: "ALREADY_EXECUTED_TODAY",
      date: dateStr,
    };
  }

  try {
    // Generate daily operations
    const metrics = await generateDailyDemoActivity(targetDate);

    // Save persistent run lock
    await prisma.counter.upsert({
      where: { id: lockKey },
      update: { seq: { increment: 1 } },
      create: { id: lockKey, seq: 1 },
    });

    console.log(`🎉 [CRON RUNNER] Scheduled demo run for ${dateStr} recorded and locked successfully.`);

    return {
      success: true,
      skipped: false,
      date: dateStr,
      metrics,
    };
  } catch (err: any) {
    console.error(`❌ [CRON RUNNER ERROR] Failed to complete demo run for ${dateStr}:`, err);
    return {
      success: false,
      skipped: false,
      date: dateStr,
      error: err?.message || String(err),
    };
  }
}

// Direct CLI Execution
if (require.main === module) {
  const isForce = process.argv.includes("--force");
  const dateArgIdx = process.argv.indexOf("--date");
  let targetDate = new Date();

  if (dateArgIdx !== -1 && process.argv[dateArgIdx + 1]) {
    targetDate = new Date(process.argv[dateArgIdx + 1]);
    if (isNaN(targetDate.getTime())) {
      console.error("Invalid date argument provided. Format: YYYY-MM-DD");
      process.exit(1);
    }
  }

  runDailyDemoCron({ targetDate, force: isForce })
    .then((result) => {
      if (!result.success) {
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error("Unhandled exception in cron runner:", err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
