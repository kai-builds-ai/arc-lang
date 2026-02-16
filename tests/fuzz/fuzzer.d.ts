interface FuzzResult {
    iterations: number;
    crashes: CrashReport[];
    lexerErrors: number;
    parserErrors: number;
    interpreterErrors: number;
    successes: number;
}
interface CrashReport {
    source: string;
    phase: "lexer" | "parser" | "interpreter";
    error: string;
    stack?: string;
}
export declare function runFuzzer(iterations?: number): FuzzResult;
export declare function fuzzReport(result: FuzzResult): void;
export declare let passed: number;
export declare let failed: number;
export declare function runFuzzTests(): {
    passed: number;
    failed: number;
};
export {};
