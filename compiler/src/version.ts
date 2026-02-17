// Arc Version System

export const ARC_VERSION = "0.6.3";
export const ARC_BUILD_DATE = new Date().toISOString().split("T")[0];
export const ARC_PLATFORM = `${process.platform}-${process.arch}`;

/** Print version info */
export function printVersion(): void {
  console.log(`Arc ${ARC_VERSION}`);
  console.log(`Build date: ${ARC_BUILD_DATE}`);
  console.log(`Platform:   ${ARC_PLATFORM}`);
  console.log(`Node.js:    ${process.version}`);
}

/** Semver comparison: returns -1, 0, or 1 */
export function compareSemver(a: string, b: string): number {
  // Strip pre-release suffixes for numeric comparison
  const stripPre = (s: string) => s.replace(/-.*$/, "");
  const pa = stripPre(a).split(".").map(Number);
  const pb = stripPre(b).split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const va = pa[i] ?? 0;
    const vb = pb[i] ?? 0;
    if (isNaN(va) || isNaN(vb)) continue;
    if (va < vb) return -1;
    if (va > vb) return 1;
  }
  // If numeric parts are equal, pre-release < release
  const aHasPre = a.includes("-");
  const bHasPre = b.includes("-");
  if (aHasPre && !bHasPre) return -1;
  if (!aHasPre && bHasPre) return 1;
  // Both have pre-release: compare lexically
  if (aHasPre && bHasPre) {
    const aPre = a.slice(a.indexOf("-") + 1);
    const bPre = b.slice(b.indexOf("-") + 1);
    if (aPre < bPre) return -1;
    if (aPre > bPre) return 1;
  }
  return 0;
}

/** Check if a manifest's arc version requirement is compatible */
export function checkVersionCompatibility(required: string): { compatible: boolean; message: string } {
  // Support formats: "0.5.0", ">=0.4.0", "^0.5.0", "~0.5.0"
  const current = ARC_VERSION;

  if (required.startsWith(">=")) {
    const min = required.slice(2);
    const ok = compareSemver(current, min) >= 0;
    return { compatible: ok, message: ok ? "Compatible" : `Requires Arc >=${min}, current is ${current}` };
  }

  if (required.startsWith("^")) {
    const base = required.slice(1);
    const parts = base.split(".").map(Number);
    const curParts = current.split(".").map(Number);
    let ok: boolean;
    if (parts[0] === 0) {
      // ^0.x.y means >=0.x.y, <0.(x+1).0 — constrain on minor when major is 0
      ok = curParts[0] === 0 && curParts[1] === parts[1] && compareSemver(current, base) >= 0;
    } else {
      // ^x.y.z means >=x.y.z, <(x+1).0.0
      ok = curParts[0] === parts[0] && compareSemver(current, base) >= 0;
    }
    return { compatible: ok, message: ok ? "Compatible" : `Requires Arc ${required}, current is ${current}` };
  }

  if (required.startsWith("~")) {
    const base = required.slice(1);
    const parts = base.split(".").map(Number);
    const curParts = current.split(".").map(Number);
    const ok = curParts[0] === parts[0] && curParts[1] === parts[1] && compareSemver(current, base) >= 0;
    return { compatible: ok, message: ok ? "Compatible" : `Requires Arc ${required}, current is ${current}` };
  }

  // Exact match
  const ok = compareSemver(current, required) === 0;
  return { compatible: ok, message: ok ? "Compatible" : `Requires Arc ${required}, current is ${current}` };
}

/** Deprecation registry */
interface DeprecationEntry {
  feature: string;
  since: string;
  removeIn: string;
  migration: string;
}

const deprecations: DeprecationEntry[] = [];
const emittedWarnings = new Set<string>();

/** Register a deprecated feature */
export function deprecate(feature: string, since: string, removeIn: string, migration: string): void {
  deprecations.push({ feature, since, removeIn, migration });
}

/** Emit a deprecation warning (once per feature per session) */
export function emitDeprecationWarning(feature: string): void {
  if (emittedWarnings.has(feature)) return;
  const entry = deprecations.find(d => d.feature === feature);
  if (!entry) return;
  emittedWarnings.add(feature);
  console.warn(`⚠ DEPRECATED: '${feature}' was deprecated in v${entry.since} and will be removed in v${entry.removeIn}.`);
  console.warn(`  Migration: ${entry.migration}`);
}

/** Get all registered deprecations */
export function getDeprecations(): readonly DeprecationEntry[] {
  return deprecations;
}
