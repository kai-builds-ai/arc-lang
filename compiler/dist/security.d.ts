import { Value } from "./interpreter.js";
export interface SecurityConfig {
    maxSourceSize?: number;
    maxStringLength?: number;
    maxNestingDepth?: number;
    maxExecutionSteps?: number;
    maxRecursionDepth?: number;
    maxArraySize?: number;
    maxMapSize?: number;
    executionTimeoutMs?: number;
    allowedToolMethods?: string[];
    blockedToolMethods?: string[];
    allowedUrlPatterns?: RegExp[];
    blockedUrlPatterns?: RegExp[];
    disableToolCalls?: boolean;
    allowedImports?: string[];
    blockedImports?: string[];
    disableImports?: boolean;
}
declare const DEFAULTS: Required<Pick<SecurityConfig, 'maxSourceSize' | 'maxStringLength' | 'maxNestingDepth' | 'maxExecutionSteps' | 'maxRecursionDepth' | 'maxArraySize' | 'maxMapSize' | 'executionTimeoutMs'>>;
export declare class SecurityError extends Error {
    code: string;
    constructor(code: string, message: string);
}
export declare function validateSource(source: string, config?: SecurityConfig): void;
export declare function validateNestingDepth(node: any, config?: SecurityConfig, depth?: number): void;
export declare function validateToolCall(method: string, url: string, config: SecurityConfig): void;
export declare function validateImport(moduleName: string, config: SecurityConfig): void;
export declare class ExecutionContext {
    steps: number;
    recursionDepth: number;
    startTime: number;
    private config;
    constructor(config?: SecurityConfig);
    tick(): void;
    pushCall(): void;
    popCall(): void;
    checkArraySize(size: number): void;
    checkMapSize(size: number): void;
}
export declare class SafeInterpreter {
    private config;
    constructor(config?: SecurityConfig);
    run(source: string): Value;
    private checkNoToolCalls;
}
export declare function createSandbox(config?: SecurityConfig): SafeInterpreter;
export { DEFAULTS as SECURITY_DEFAULTS };
