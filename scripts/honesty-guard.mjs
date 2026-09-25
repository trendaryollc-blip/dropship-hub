#!/usr/bin/env node
/**
 * Honesty guard — CI check that fails on fabrication patterns.
 *
 * Rules:
 *  1. No Math.random() in app pages (src/app/(app)) — displayed values must
 *     come from real sources, not randomness.
 *  2. No generateMock* functions outside the acknowledged-debt allowlist.
 *     The allowlist is a ratchet: it may shrink, never grow.
 *
 * Usage: node scripts/honesty-guard.mjs  (npm run honesty)
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");

/**
 * Files allowed to still contain Math.random for displayed data.
 * Existing debt only — NEW files must not be added here.
 * (ID generation like `${Date.now()}-${Math.random()}` in shared libs is
 * outside scanned dirs; app pages are scanned strictly.)
 * Ratchet: may shrink, never grow. Competitors page cleaned in Sprint 3.
 */
const MATH_RANDOM_ALLOWLIST = new Set([]);

/**
 * Files allowed to define generateMock* — existing debt from the audit.
 * Ratchet: remove entries as each is cleaned; never add new ones.
 * Remaining: none (Sprint 4 complete).
 */
const GENERATE_MOCK_ALLOWLIST = new Set([]);

const SCAN_DIRS = [
  join(ROOT, "src", "app", "(app)"),
  join(ROOT, "src", "app", "api"),
  join(ROOT, "src", "lib"),
];

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx)$/.test(entry) && !/\.(test|spec)\.(ts|tsx)$/.test(entry)) yield full;
  }
}

const violations = [];

for (const scanDir of SCAN_DIRS) {
  for (const file of walk(scanDir)) {
    const rel = relative(ROOT, file).split(sep).join("/");
    const source = readFileSync(file, "utf8");

    if (rel.startsWith("src/app/(app)/") && /Math\.random\(/.test(source)) {
      if (!MATH_RANDOM_ALLOWLIST.has(rel)) {
        violations.push(`Math.random in app page: ${rel}`);
      }
    }

    if (/function\s+generateMock|const\s+generateMock\w*\s*=/.test(source)) {
      if (!GENERATE_MOCK_ALLOWLIST.has(rel)) {
        violations.push(`generateMock outside allowlist: ${rel}`);
      }
    }
  }
}

if (violations.length > 0) {
  console.error("✗ Honesty guard failed:\n");
  for (const v of violations) console.error(`  - ${v}`);
  console.error(
    "\nDisplayed data must come from real sources. Mock/fabrication helpers" +
      "\nare banned. Use DataUnavailable/ComingSoon states instead, or wire a" +
      "\nreal API via src/lib/api-keys/pool.ts."
  );
  process.exit(1);
}

console.log("✓ Honesty guard passed (no new fabrication patterns).");
