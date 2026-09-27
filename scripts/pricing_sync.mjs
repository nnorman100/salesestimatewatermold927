#!/usr/bin/env node
/**
 * Regenerates `pricing_manifest.json` from the Python pricing engine (single
 * source of truth) and exits non-zero if the checked-in copy drifted.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const pythonBin = process.platform === "win32" ? "python" : "python3";
const manifestPath = "pricing_manifest.json";

// Regenerate the canonical manifest in place from pricing_engine.py.
execFileSync(
  pythonBin,
  ["pricing_engine.py", "--emit-config", "--out", manifestPath],
  { stdio: "inherit" },
);

const generated = readFileSync(manifestPath, "utf-8");

let committed = null;
try {
  committed = execFileSync("git", ["show", `HEAD:${manifestPath}`], {
    encoding: "utf-8",
  });
} catch {
  // Not yet committed (first generation) — nothing to diff against.
}

if (committed !== null && generated !== committed) {
  console.error(
    `DRIFT: ${manifestPath} changed after regeneration. Commit the regenerated file.`,
  );
  process.exit(1);
}

console.log(`${manifestPath} is in sync with pricing_engine.py --emit-config.`);