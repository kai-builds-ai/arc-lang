// Arc Language Error Reporting System - Rich, friendly error messages

import * as AST from "./ast.js";

// Error codes
export enum ErrorCode {
  // Parse errors (ARC001-ARC099)
  UNEXPECTED_TOKEN = "ARC001",
  MISSING_CLOSING_PAREN = "ARC002",
  MISSING_CLOSING_BRACKET = "ARC003",
  MISSING_CLOSING_BRACE = "ARC004",
  EXPECTED_EXPRESSION = "ARC005",
  INVALID_ASSIGNMENT = "ARC006",
  UNTERMINATED_STRING = "ARC007",
  INVALID_NUMBER = "ARC008",

  // Type errors (ARC100-ARC199)
  TYPE_MISMATCH = "ARC100",
  INVALID_OPERATOR = "ARC101",
  NOT_CALLABLE = "ARC102",
  WRONG_ARITY = "ARC103",

  // Runtime errors (ARC200-ARC299)
  UNDEFINED_VARIABLE = "ARC200",
  IMMUTABLE_REASSIGN = "ARC201",
  INDEX_OUT_OF_BOUNDS = "ARC202",
  DIVISION_BY_ZERO = "ARC203",
  NOT_ITERABLE = "ARC204",
  ASSERTION_FAILED = "ARC205",
  PROPERTY_ACCESS = "ARC206",

  // Import errors (ARC300-ARC399)
  MODULE_NOT_FOUND = "ARC300",
  CIRCULAR_IMPORT = "ARC301",

  // Security errors (ARC400-ARC499)
  SOURCE_TOO_LARGE = "ARC400",
  NESTING_TOO_DEEP = "ARC401",
  EXECUTION_LIMIT = "ARC402",
  RECURSION_LIMIT = "ARC403",
  TOOL_CALL_BLOCKED = "ARC404",
  IMPORT_BLOCKED = "ARC405",
  TIMEOUT = "ARC406",
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

// ANSI color codes
const COLORS = {
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
  underline: "\x1b[4m",
};

function noColor(s: string): string {
  return s.replace(/\x1b\[\d+m/g, "");
}

// Levenshtein distance for "did you mean?" suggestions
export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// Find closest match from a list of candidates
export function findClosestMatch(name: string, candidates: string[], maxDistance = 3): string | null {
  let best: string | null = null;
  let bestDist = maxDistance + 1;
  for (const c of candidates) {
    const d = levenshtein(name, c);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

// Format a rich error message with source snippet
export function formatError(error: ArcError, useColor = true, filePath?: string): string {
  const c = useColor ? COLORS : { red: "", yellow: "", cyan: "", gray: "", bold: "", reset: "", underline: "" };
  const lines: string[] = [];

  // Header: category[code]: message
  lines.push(
    `${c.red}${c.bold}${error.category}[${error.code}]${c.reset}: ${c.bold}${error.message}${c.reset}`
  );

  // Location line
  if (filePath && error.loc) {
    lines.push(`${c.cyan}  --> ${filePath}:${error.loc.line}:${error.loc.col}${c.reset}`);
  } else if (error.loc) {
    lines.push(`${c.cyan}  --> line ${error.loc.line}:${error.loc.col}${c.reset}`);
  }

  // Source snippet with error pointer
  if (error.source && error.loc) {
    const sourceLines = error.source.split("\n");
    const lineIdx = error.loc.line - 1;

    if (lineIdx >= 0 && lineIdx < sourceLines.length) {
      const lineNum = error.loc.line;
      const padding = String(lineNum).length;

      // Line before (context)
      if (lineIdx > 0) {
        lines.push(`${c.gray}${String(lineNum - 1).padStart(padding)} │${c.reset} ${sourceLines[lineIdx - 1]}`);
      }

      // Error line
      lines.push(`${c.cyan}${String(lineNum).padStart(padding)} │${c.reset} ${sourceLines[lineIdx]}`);

      // Underline pointer
      const col = Math.max(0, error.loc.col - 1);
      const pointer = " ".repeat(padding) + " │ " + " ".repeat(col) + `${c.red}^^^${c.reset}`;
      lines.push(pointer);

      // Line after (context)
      if (lineIdx + 1 < sourceLines.length) {
        lines.push(`${c.gray}${String(lineNum + 1).padStart(padding)} │${c.reset} ${sourceLines[lineIdx + 1]}`);
      }
    }
  }

  // Suggestion
  if (error.suggestion) {
    lines.push(`${c.yellow}hint${c.reset}: ${error.suggestion}`);
  }

  return lines.join("\n");
}

// Create specific error constructors
export function undefinedVariableError(name: string, candidates: string[], loc?: AST.Loc, source?: string): ArcError {
  const suggestion = findClosestMatch(name, candidates);
  return {
    code: ErrorCode.UNDEFINED_VARIABLE,
    category: "RuntimeError",
    message: `Undefined variable '${name}'`,
    loc,
    source,
    suggestion: suggestion ? `Did you mean '${suggestion}'?` : undefined,
  };
}

export function parseError(message: string, loc?: AST.Loc, source?: string, suggestion?: string): ArcError {
  // Auto-detect suggestion from message
  if (!suggestion) {
    if (message.includes("Expected RParen") || message.includes("Expected )")) {
      suggestion = "Missing closing parenthesis ')'";
    } else if (message.includes("Expected RBracket") || message.includes("Expected ]")) {
      suggestion = "Missing closing bracket ']'";
    } else if (message.includes("Expected RBrace") || message.includes("Expected }")) {
      suggestion = "Missing closing brace '}'";
    }
  }

  return {
    code: ErrorCode.UNEXPECTED_TOKEN,
    category: "ParseError",
    message,
    loc,
    source,
    suggestion,
  };
}

export function typeError(message: string, loc?: AST.Loc, source?: string): ArcError {
  return {
    code: ErrorCode.TYPE_MISMATCH,
    category: "TypeError",
    message,
    loc,
    source,
  };
}

export function runtimeError(code: ErrorCode, message: string, loc?: AST.Loc, source?: string, suggestion?: string): ArcError {
  return {
    code,
    category: "RuntimeError",
    message,
    loc,
    source,
    suggestion,
  };
}

export function importError(message: string, loc?: AST.Loc, source?: string): ArcError {
  return {
    code: ErrorCode.MODULE_NOT_FOUND,
    category: "ImportError",
    message,
    loc,
    source,
  };
}

export function securityError(code: ErrorCode, message: string): ArcError {
  return {
    code,
    category: "SecurityError",
    message,
  };
}

// Pretty-print an error that was caught during execution
export function prettyPrintError(err: Error, source?: string, useColor = true, filePath?: string): string {
  // Check for ParseError (has loc property)
  if ("loc" in err && (err as any).loc && err.message.startsWith("Parse error")) {
    const loc = (err as any).loc as AST.Loc;
    let cleanMsg = err.message.replace(/^Parse error at line \d+, col \d+: /, "");
    // Make token names more human-friendly
    cleanMsg = cleanMsg
      .replace(/\bRBrace\b/g, "'}'")
      .replace(/\bLBrace\b/g, "'{'")
      .replace(/\bRParen\b/g, "')'")
      .replace(/\bLParen\b/g, "'('")
      .replace(/\bRBracket\b/g, "']'")
      .replace(/\bLBracket\b/g, "'['")
      .replace(/\bEOF ''/g, "end of file")
      .replace(/^Expected /, "Expected ");
    const rawMsg = err.message.replace(/^Parse error at line \d+, col \d+: /, "");
    let suggestion: string | undefined;
    if (rawMsg.includes("Expected RBrace")) suggestion = "Add a closing '}' to match the opening brace.";
    else if (rawMsg.includes("Expected RParen")) suggestion = "Add a closing ')' to match the opening parenthesis.";
    else if (rawMsg.includes("Expected RBracket")) suggestion = "Add a closing ']' to match the opening bracket.";
    return formatError({
      code: ErrorCode.UNEXPECTED_TOKEN,
      category: "ParseError",
      message: cleanMsg,
      loc,
      source,
      suggestion,
    }, useColor, filePath);
  }

  // If it's already a structured ArcRuntimeError, use its fields directly
  if (err instanceof ArcRuntimeError) {
    const cleanMsg = err.message.replace(/ at line \d+(?:, col \d+)?$/, "");
    return formatError({
      code: err.arcCode,
      category: err.arcCategory,
      message: cleanMsg,
      loc: err.loc,
      source,
      suggestion: err.suggestion,
    }, useColor, filePath);
  }

  // Try to extract location from error message
  const locMatch = err.message.match(/at line (\d+)(?:, col (\d+))?/);
  const loc = locMatch ? { line: parseInt(locMatch[1]), col: parseInt(locMatch[2] || "1") } : undefined;
  const cleanMsg = err.message.replace(/ at line \d+(?:, col \d+)?$/, "");

  // Detect error category
  let category: ErrorCategory = "RuntimeError";
  let code: ErrorCode = ErrorCode.UNDEFINED_VARIABLE;
  let suggestion: string | undefined;

  if (err.message.includes("Parse error")) {
    category = "ParseError";
    code = ErrorCode.UNEXPECTED_TOKEN;
    // Extract suggestion for parse errors
    if (err.message.includes("Expected RBrace")) suggestion = "Missing closing brace '}'";
    else if (err.message.includes("Expected RParen")) suggestion = "Missing closing parenthesis ')'";
    else if (err.message.includes("Expected RBracket")) suggestion = "Missing closing bracket ']'";
  } else if (err.message.includes("Undefined variable")) {
    code = ErrorCode.UNDEFINED_VARIABLE;
  } else if (err.message.includes("Cannot reassign immutable")) {
    code = ErrorCode.IMMUTABLE_REASSIGN;
    suggestion = "Use 'let mut' to declare a mutable variable";
  } else if (err.message.includes("Not callable")) {
    code = ErrorCode.NOT_CALLABLE;
    suggestion = "Only functions can be called. Check that the value is a function.";
  } else if (err.message.includes("Division by zero")) {
    code = ErrorCode.DIVISION_BY_ZERO;
    suggestion = "Check that the divisor is not zero before dividing.";
  } else if (err.message.includes("Module not found")) {
    category = "ImportError";
    code = ErrorCode.MODULE_NOT_FOUND;
  } else if (err.message.includes("SecurityError") || err.name === "SecurityError") {
    category = "SecurityError";
    code = ErrorCode.EXECUTION_LIMIT;
  } else if (err.message.includes("Cannot access property")) {
    code = ErrorCode.PROPERTY_ACCESS;
  }

  return formatError({ code, category, message: cleanMsg, loc, source, suggestion }, useColor, filePath);
}

// Custom error class that carries structured location info
export class ArcRuntimeError extends Error {
  loc?: AST.Loc;
  arcCode: ErrorCode;
  arcCategory: ErrorCategory;
  suggestion?: string;

  constructor(message: string, options: {
    code?: ErrorCode;
    category?: ErrorCategory;
    loc?: AST.Loc;
    suggestion?: string;
  } = {}) {
    super(message);
    this.name = "ArcRuntimeError";
    this.arcCode = options.code ?? ErrorCode.UNDEFINED_VARIABLE;
    this.arcCategory = options.category ?? "RuntimeError";
    this.loc = options.loc;
    this.suggestion = options.suggestion;
  }
}

let prettyErrorsEnabled = true;

export function setPrettyErrors(enabled: boolean): void {
  prettyErrorsEnabled = enabled;
}

export function isPrettyErrorsEnabled(): boolean {
  return prettyErrorsEnabled;
}
