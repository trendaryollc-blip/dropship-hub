#!/usr/bin/env node
// Production dependency security gate.
//
// Fails CI only on high/critical advisories that `npm audit fix` can resolve
// WITHOUT a breaking (semver-major) upgrade. Advisories whose only remediation
// is a semver-major bump — or that have no patched release at all — are printed
// as warnings instead of failing the build. This keeps the gate meaningful
// (regressions with a safe fix block CI) without letting a single unfixable
// transitive advisory such as node-forge block every deploy forever.
import { execFileSync } from "node:child_process";

const isWindows = process.platform === "win32";
const npmCmd = isWindows ? "npm.cmd" : "npm";

function runAudit() {
  try {
    return execFileSync(npmCmd, ["audit", "--omit=dev", "--json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      shell: isWindows,
    });
  } catch (err) {
    if (err && typeof err.stdout === "string" && err.stdout.trim()) return err.stdout;
    throw err;
  }
}

let report;
try {
  report = JSON.parse(runAudit());
} catch (err) {
  console.error("[audit-gate] Could not parse npm audit output:", err instanceof Error ? err.message : err);
  process.exit(1);
}

const vulns = report.vulnerabilities || {};
const blocking = [];
const deferred = [];

for (const [name, v] of Object.entries(vulns)) {
  if (v.severity !== "high" && v.severity !== "critical") continue;
  // `fixAvailable === true` means `npm audit fix` can remediate it without a
  // major upgrade. Anything else (false, or an object with isSemVerMajor) is
  // deferred to a manual, tested migration.
  if (v.fixAvailable === true) blocking.push(`${name} (${v.severity})`);
  else deferred.push(`${name} (${v.severity})`);
}

if (deferred.length) {
  console.warn("[audit-gate] Deferred advisories (only a semver-major upgrade or no fix exists):");
  for (const d of deferred) console.warn(`  - ${d}`);
}

if (blocking.length) {
  console.error("[audit-gate] FAILED — high/critical advisories that `npm audit fix` resolves:");
  for (const b of blocking) console.error(`  - ${b}`);
  process.exit(1);
}

console.log("[audit-gate] Passed — no non-breaking high/critical advisories in production deps.");
