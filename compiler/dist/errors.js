// Arc Language Error Reporting System - Rich, friendly error messages
// Error codes
export var ErrorCode;
(function (ErrorCode) {
    // Parse errors (ARC001-ARC099)
    ErrorCode["UNEXPECTED_TOKEN"] = "ARC001";
    ErrorCode["MISSING_CLOSING_PAREN"] = "ARC002";
    ErrorCode["MISSING_CLOSING_BRACKET"] = "ARC003";
    ErrorCode["MISSING_CLOSING_BRACE"] = "ARC004";
    ErrorCode["EXPECTED_EXPRESSION"] = "ARC005";
    ErrorCode["INVALID_ASSIGNMENT"] = "ARC006";
    ErrorCode["UNTERMINATED_STRING"] = "ARC007";
    ErrorCode["INVALID_NUMBER"] = "ARC008";
    // Type errors (ARC100-ARC199)
    ErrorCode["TYPE_MISMATCH"] = "ARC100";
    ErrorCode["INVALID_OPERATOR"] = "ARC101";
    ErrorCode["NOT_CALLABLE"] = "ARC102";
    ErrorCode["WRONG_ARITY"] = "ARC103";
    // Runtime errors (ARC200-ARC299)
    ErrorCode["UNDEFINED_VARIABLE"] = "ARC200";
    ErrorCode["IMMUTABLE_REASSIGN"] = "ARC201";
    ErrorCode["INDEX_OUT_OF_BOUNDS"] = "ARC202";
    ErrorCode["DIVISION_BY_ZERO"] = "ARC203";
    ErrorCode["NOT_ITERABLE"] = "ARC204";
    ErrorCode["ASSERTION_FAILED"] = "ARC205";
    ErrorCode["PROPERTY_ACCESS"] = "ARC206";
    // Import errors (ARC300-ARC399)
    ErrorCode["MODULE_NOT_FOUND"] = "ARC300";
    ErrorCode["CIRCULAR_IMPORT"] = "ARC301";
    // Security errors (ARC400-ARC499)
    ErrorCode["SOURCE_TOO_LARGE"] = "ARC400";
    ErrorCode["NESTING_TOO_DEEP"] = "ARC401";
    ErrorCode["EXECUTION_LIMIT"] = "ARC402";
    ErrorCode["RECURSION_LIMIT"] = "ARC403";
    ErrorCode["TOOL_CALL_BLOCKED"] = "ARC404";
    ErrorCode["IMPORT_BLOCKED"] = "ARC405";
    ErrorCode["TIMEOUT"] = "ARC406";
})(ErrorCode || (ErrorCode = {}));
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
function noColor(s) {
    return s.replace(/\x1b\[\d+m/g, "");
}
// Levenshtein distance for "did you mean?" suggestions
export function levenshtein(a, b) {
    const m = a.length, n = b.length;
    if (m === 0)
        return n;
    if (n === 0)
        return m;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++)
        dp[i][0] = i;
    for (let j = 0; j <= n; j++)
        dp[0][j] = j;
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
export function findClosestMatch(name, candidates, maxDistance = 3) {
    let best = null;
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
export function formatError(error, useColor = true) {
    const c = useColor ? COLORS : { red: "", yellow: "", cyan: "", gray: "", bold: "", reset: "", underline: "" };
    const lines = [];
    // Header: category[code]: message
    lines.push(`${c.red}${c.bold}${error.category}[${error.code}]${c.reset}: ${c.bold}${error.message}${c.reset}`);
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
export function undefinedVariableError(name, candidates, loc, source) {
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
export function parseError(message, loc, source, suggestion) {
    // Auto-detect suggestion from message
    if (!suggestion) {
        if (message.includes("Expected RParen") || message.includes("Expected )")) {
            suggestion = "Missing closing parenthesis ')'";
        }
        else if (message.includes("Expected RBracket") || message.includes("Expected ]")) {
            suggestion = "Missing closing bracket ']'";
        }
        else if (message.includes("Expected RBrace") || message.includes("Expected }")) {
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
export function typeError(message, loc, source) {
    return {
        code: ErrorCode.TYPE_MISMATCH,
        category: "TypeError",
        message,
        loc,
        source,
    };
}
export function runtimeError(code, message, loc, source, suggestion) {
    return {
        code,
        category: "RuntimeError",
        message,
        loc,
        source,
        suggestion,
    };
}
export function importError(message, loc, source) {
    return {
        code: ErrorCode.MODULE_NOT_FOUND,
        category: "ImportError",
        message,
        loc,
        source,
    };
}
export function securityError(code, message) {
    return {
        code,
        category: "SecurityError",
        message,
    };
}
// Pretty-print an error that was caught during execution
export function prettyPrintError(err, source, useColor = true) {
    // Try to extract location from error message
    const locMatch = err.message.match(/at line (\d+)(?:, col (\d+))?/);
    const loc = locMatch ? { line: parseInt(locMatch[1]), col: parseInt(locMatch[2] || "1") } : undefined;
    // Detect error category
    let category = "RuntimeError";
    let code = ErrorCode.UNDEFINED_VARIABLE;
    let suggestion;
    if (err.message.includes("Parse error")) {
        category = "ParseError";
        code = ErrorCode.UNEXPECTED_TOKEN;
    }
    else if (err.message.includes("Undefined variable")) {
        code = ErrorCode.UNDEFINED_VARIABLE;
        const nameMatch = err.message.match(/Undefined variable: (\w+)/);
        if (nameMatch) {
            suggestion = `Check that '${nameMatch[1]}' is defined before use`;
        }
    }
    else if (err.message.includes("Cannot reassign immutable")) {
        code = ErrorCode.IMMUTABLE_REASSIGN;
        suggestion = "Use 'let mut' to declare a mutable variable";
    }
    else if (err.message.includes("Not callable")) {
        code = ErrorCode.NOT_CALLABLE;
    }
    else if (err.message.includes("SecurityError") || err.name === "SecurityError") {
        category = "SecurityError";
        code = ErrorCode.EXECUTION_LIMIT;
    }
    return formatError({ code, category, message: err.message, loc, source, suggestion }, useColor);
}
let prettyErrorsEnabled = true;
export function setPrettyErrors(enabled) {
    prettyErrorsEnabled = enabled;
}
export function isPrettyErrorsEnabled() {
    return prettyErrorsEnabled;
}
