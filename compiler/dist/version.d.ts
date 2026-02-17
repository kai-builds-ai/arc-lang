export declare const ARC_VERSION = "0.5.9";
export declare const ARC_BUILD_DATE: string;
export declare const ARC_PLATFORM: string;
/** Print version info */
export declare function printVersion(): void;
/** Semver comparison: returns -1, 0, or 1 */
export declare function compareSemver(a: string, b: string): number;
/** Check if a manifest's arc version requirement is compatible */
export declare function checkVersionCompatibility(required: string): {
    compatible: boolean;
    message: string;
};
/** Deprecation registry */
interface DeprecationEntry {
    feature: string;
    since: string;
    removeIn: string;
    migration: string;
}
/** Register a deprecated feature */
export declare function deprecate(feature: string, since: string, removeIn: string, migration: string): void;
/** Emit a deprecation warning (once per feature per session) */
export declare function emitDeprecationWarning(feature: string): void;
/** Get all registered deprecations */
export declare function getDeprecations(): readonly DeprecationEntry[];
export {};
