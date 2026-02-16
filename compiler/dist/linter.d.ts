export type Severity = "error" | "warning" | "info";
export interface LintDiagnostic {
    severity: Severity;
    message: string;
    rule: string;
    file: string;
    line: number;
    col: number;
}
export interface LintOptions {
    maxLineLength: number;
    file: string;
}
export declare function lint(source: string, options?: Partial<LintOptions>): LintDiagnostic[];
export declare function formatDiagnostic(d: LintDiagnostic): string;
