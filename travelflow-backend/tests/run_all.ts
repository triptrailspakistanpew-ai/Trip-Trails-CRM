/**
 * Master Test Suite Runner for TravelFlow Backend
 * Runs all P0 integration and regression tests sequentially.
 */

import { execSync } from "child_process";
import path from "path";

const testFiles = [
  "p0_1_security_password.test.ts",
  "p0_2_expenses.test.ts",
  "p0_3_margin_journals.test.ts",
  "p0_4_pricing_quantity.test.ts",
  "p0_5_duplicate_invoices.test.ts",
  "p0_6_supplier_ledger_import_accounting.test.ts",
];

console.log("════════════════════════════════════════════════════════════");
console.log("             RUNNING ALL P0 BACKEND REGRESSION TESTS        ");
console.log("════════════════════════════════════════════════════════════\n");

let allPassed = true;

for (const file of testFiles) {
  const fullPath = path.join(__dirname, file);
  console.log(`\n▶ Running: ${file}`);
  try {
    execSync(`npx tsx "${fullPath}"`, { stdio: "inherit" });
  } catch (error) {
    allPassed = false;
    console.error(`\x1b[31m✖ Suite failed:\x1b[0m ${file}`);
  }
}

if (!allPassed) {
  console.error("\n\x1b[31mOne or more test suites failed.\x1b[0m\n");
  process.exit(1);
} else {
  console.log("\n\x1b[32mAll test suites completed successfully!\x1b[0m\n");
  process.exit(0);
}
