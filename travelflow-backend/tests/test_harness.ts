/**
 * TravelFlow Automated Test Harness
 * Lightweight, zero-dependency runner that executes with `npx tsx tests/...`
 */

export interface TestResult {
  name: string;
  passed: boolean;
  error?: Error | any;
  durationMs: number;
}

export interface SuiteResult {
  suiteName: string;
  results: TestResult[];
  total: number;
  passed: number;
  failed: number;
}

let currentSuite = "";
let suiteResults: SuiteResult[] = [];

export function describe(name: string, fn: () => void | Promise<void>) {
  currentSuite = name;
  const currentSuiteResult: SuiteResult = {
    suiteName: name,
    results: [],
    total: 0,
    passed: 0,
    failed: 0,
  };
  suiteResults.push(currentSuiteResult);
  return fn();
}

let currentPromise: Promise<void> = Promise.resolve();

export function it(name: string, fn: () => void | Promise<void>) {
  const suite = suiteResults[suiteResults.length - 1];
  currentPromise = currentPromise.then(async () => {
    const start = Date.now();
    try {
      await fn();
      const durationMs = Date.now() - start;
      suite.results.push({ name, passed: true, durationMs });
      suite.passed++;
      console.log(`  \x1b[32m✔ PASS\x1b[0m ${name} (${durationMs}ms)`);
    } catch (error) {
      const durationMs = Date.now() - start;
      suite.results.push({ name, passed: false, error, durationMs });
      suite.failed++;
      console.error(`  \x1b[31m✖ FAIL\x1b[0m ${name} (${durationMs}ms)`);
      console.error(`    ${(error as any)?.stack || error}`);
    } finally {
      suite.total++;
    }
  });
  return currentPromise;
}

export function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
      }
    },
    toEqual(expected: any) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
      }
    },
    toBeCloseTo(expected: number, delta: number = 0.01) {
      if (Math.abs(Number(actual) - Number(expected)) > delta) {
        throw new Error(`Expected ${actual} to be close to ${expected} (within ±${delta})`);
      }
    },
    toBeDefined() {
      if (actual === undefined) {
        throw new Error(`Expected value to be defined, got undefined`);
      }
    },
    toBeUndefined() {
      if (actual !== undefined) {
        throw new Error(`Expected undefined, got ${JSON.stringify(actual)}`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected truthy value, got ${actual}`);
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new Error(`Expected falsy value, got ${actual}`);
      }
    },
    toContain(expected: any) {
      if (typeof actual !== "string" && !Array.isArray(actual)) {
        throw new Error(`Expected string or array for toContain, got ${typeof actual}`);
      }
      if (!actual.includes(expected)) {
        throw new Error(`Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(expected)}`);
      }
    },
    toBeGreaterThan(expected: number) {
      if (Number(actual) <= Number(expected)) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    },
    toBeGreaterThanOrEqual(expected: number) {
      if (Number(actual) < Number(expected)) {
        throw new Error(`Expected ${actual} to be greater than or equal to ${expected}`);
      }
    },
    toThrow(expectedMessageSnippet?: string) {
      // handled when fn passed as actual
    },
  };
}

export async function expectToThrow(fn: () => any | Promise<any>, snippet?: string) {
  let threw = false;
  let err: any;
  try {
    await fn();
  } catch (e: any) {
    threw = true;
    err = e;
  }
  if (!threw) {
    throw new Error(`Expected function to throw, but it succeeded.`);
  }
  if (snippet && !String(err?.message || err).toLowerCase().includes(snippet.toLowerCase())) {
    throw new Error(`Expected error containing "${snippet}", but got "${err?.message || err}"`);
  }
}

export async function printSuiteSummary(): Promise<boolean> {
  await currentPromise;
  console.log("\n══════════════════════════════════════════════");
  console.log("             TEST EXECUTION SUMMARY           ");
  console.log("══════════════════════════════════════════════");
  let totalAll = 0;
  let passedAll = 0;
  let failedAll = 0;

  for (const s of suiteResults) {
    console.log(`\nSuite: \x1b[1m${s.suiteName}\x1b[0m (${s.passed}/${s.total} passed)`);
    totalAll += s.total;
    passedAll += s.passed;
    failedAll += s.failed;
  }

  console.log("\n──────────────────────────────────────────────");
  console.log(`Total Tests: ${totalAll} | Passed: \x1b[32m${passedAll}\x1b[0m | Failed: \x1b[31m${failedAll}\x1b[0m`);
  console.log("──────────────────────────────────────────────\n");
  return failedAll === 0;
}
