export interface ArcToml {
    package: {
        name: string;
        version: string;
        description: string;
        author: string;
        license: string;
    };
    dependencies: Record<string, string>;
    "dev-dependencies": Record<string, string>;
}
export declare function parseArcToml(content: string): ArcToml;
export declare function serializeArcToml(toml: ArcToml): string;
export declare function findArcToml(startDir?: string): string;
export declare function readToml(dir?: string): ArcToml;
export declare function writeToml(toml: ArcToml, dir?: string): void;
export interface LockEntry {
    name: string;
    version: string;
    source: string;
    integrity: string;
}
export declare function generateLockFile(toml: ArcToml): string;
export declare function pkgInit(dir?: string): void;
export declare function pkgAdd(name: string, options?: {
    dev?: boolean;
    dir?: string;
}): void;
export declare function pkgRemove(name: string, dir?: string): void;
export declare function pkgList(dir?: string): void;
export declare function pkgInstall(dir?: string): void;
