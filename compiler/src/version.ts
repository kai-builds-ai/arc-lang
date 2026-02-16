// Arc Version System

export const ARC_VERSION = "0.5.0";
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
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] < pb[i]) return -1;
    if (pa[i] > pb[i]) return 1;
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
    const [major] = base.split(".").map(Number);
    const [curMajor] = current.split(".").map(Number);
    const ok = curMajor === major && compareSemver(current, base) >= 0;
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
  const ok = compareSemver(current, required) >= 0;
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
