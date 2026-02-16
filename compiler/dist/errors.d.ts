import * as AST from "./ast.js";
export declare enum ErrorCode {
    UNEXPECTED_TOKEN = "ARC001",
    MISSING_CLOSING_PAREN = "ARC002",
    MISSING_CLOSING_BRACKET = "ARC003",
    MISSING_CLOSING_BRACE = "ARC004",
    EXPECTED_EXPRESSION = "ARC005",
    INVALID_ASSIGNMENT = "ARC006",
    UNTERMINATED_STRING = "ARC007",
    INVALID_NUMBER = "ARC008",
    TYPE_MISMATCH = "ARC100",
    INVALID_OPERATOR = "ARC101",
    NOT_CALLABLE = "ARC102",
    WRONG_ARITY = "ARC103",
    UNDEFINED_VARIABLE = "ARC200",
    IMMUTABLE_REASSIGN = "ARC201",
    INDEX_OUT_OF_BOUNDS = "ARC202",
    DIVISION_BY_ZERO = "ARC203",
    NOT_ITERABLE = "ARC204",
    ASSERTION_FAILED = "ARC205",
    PROPERTY_ACCESS = "ARC206",
    MODULE_NOT_FOUND = "ARC300",
    CIRCULAR_IMPORT = "ARC301",
    SOURCE_TOO_LARGE = "ARC400",
    NESTING_TOO_DEEP = "ARC401",
    EXECUTION_LIMIT = "ARC402",
    RECURSION_LIMIT = "ARC403",
    TOOL_CALL_BLOCKED = "ARC404",
    IMPORT_BLOCKED = "ARC405",
    TIMEOUT = "ARC406"
}
export type ErrorCategory = "ParseError" | "TypeError" | "RuntimeError" | "ImportError" | "SecurityError";
export interface ArcError {
    code: ErrorCode;
    category: ErrorCategory;
    message: string;
    loc?: AST.Loc;
    source?: string;
    suggestion?: string;
}
export declare function levenshtein(a: string, b: string): number;
export declare function findClosestMatch(name: string, candidates: string[], maxDistance?: number): string | null;
export declare function formatError(error: ArcError, useColor?: boolean): string;
export declare function undefinedVariableError(name: string, candidates: string[], loc?: AST.Loc, source?: string): ArcError;
export declare function parseError(message: string, loc?: AST.Loc, source?: string, suggestion?: string): ArcError;
export declare function typeError(message: string, loc?: AST.Loc, source?: string): ArcError;
export declare function runtimeError(code: ErrorCode, message: string, loc?: AST.Loc, source?: string, suggestion?: string): ArcError;
export declare function importError(message: string, loc?: AST.Loc, source?: string): ArcError;
export declare function securityError(code: ErrorCode, message: string): ArcError;
export declare function prettyPrintError(err: Error, source?: string, useColor?: boolean): string;
export declare function setPrettyErrors(enabled: boolean): void;
export declare function isPrettyErrorsEnabled(): boolean;
