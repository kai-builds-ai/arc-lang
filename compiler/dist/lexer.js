// Arc Language Lexer
export var TokenType;
(function (TokenType) {
    // Literals
    TokenType[TokenType["Int"] = 0] = "Int";
    TokenType[TokenType["Float"] = 1] = "Float";
    TokenType[TokenType["String"] = 2] = "String";
    TokenType[TokenType["StringInterpStart"] = 3] = "StringInterpStart";
    TokenType[TokenType["StringInterpPart"] = 4] = "StringInterpPart";
    TokenType[TokenType["StringInterpEnd"] = 5] = "StringInterpEnd";
    TokenType[TokenType["Bool"] = 6] = "Bool";
    TokenType[TokenType["Nil"] = 7] = "Nil";
    // Identifiers & Keywords
    TokenType[TokenType["Ident"] = 8] = "Ident";
    TokenType[TokenType["Fn"] = 9] = "Fn";
    TokenType[TokenType["Let"] = 10] = "Let";
    TokenType[TokenType["Mut"] = 11] = "Mut";
    TokenType[TokenType["Type"] = 12] = "Type";
    TokenType[TokenType["Use"] = 13] = "Use";
    TokenType[TokenType["Pub"] = 14] = "Pub";
    TokenType[TokenType["Match"] = 15] = "Match";
    TokenType[TokenType["If"] = 16] = "If";
    TokenType[TokenType["El"] = 17] = "El";
    TokenType[TokenType["For"] = 18] = "For";
    TokenType[TokenType["In"] = 19] = "In";
    TokenType[TokenType["Do"] = 20] = "Do";
    TokenType[TokenType["While"] = 21] = "While";
    TokenType[TokenType["Until"] = 22] = "Until";
    TokenType[TokenType["Async"] = 23] = "Async";
    TokenType[TokenType["Await"] = 24] = "Await";
    TokenType[TokenType["Ret"] = 25] = "Ret";
    TokenType[TokenType["True"] = 26] = "True";
    TokenType[TokenType["False"] = 27] = "False";
    TokenType[TokenType["NilKw"] = 28] = "NilKw";
    TokenType[TokenType["And"] = 29] = "And";
    TokenType[TokenType["Or"] = 30] = "Or";
    TokenType[TokenType["Not"] = 31] = "Not";
    TokenType[TokenType["Where"] = 32] = "Where";
    TokenType[TokenType["Matching"] = 33] = "Matching";
    TokenType[TokenType["Fetch"] = 34] = "Fetch";
    TokenType[TokenType["Break"] = 35] = "Break";
    TokenType[TokenType["Continue"] = 36] = "Continue";
    // Operators
    TokenType[TokenType["Plus"] = 37] = "Plus";
    TokenType[TokenType["Minus"] = 38] = "Minus";
    TokenType[TokenType["Star"] = 39] = "Star";
    TokenType[TokenType["Slash"] = 40] = "Slash";
    TokenType[TokenType["Percent"] = 41] = "Percent";
    TokenType[TokenType["Power"] = 42] = "Power";
    TokenType[TokenType["Eq"] = 43] = "Eq";
    TokenType[TokenType["Neq"] = 44] = "Neq";
    TokenType[TokenType["Lt"] = 45] = "Lt";
    TokenType[TokenType["Gt"] = 46] = "Gt";
    TokenType[TokenType["Lte"] = 47] = "Lte";
    TokenType[TokenType["Gte"] = 48] = "Gte";
    TokenType[TokenType["Pipe"] = 49] = "Pipe";
    TokenType[TokenType["Bar"] = 50] = "Bar";
    TokenType[TokenType["FatArrow"] = 51] = "FatArrow";
    TokenType[TokenType["Arrow"] = 52] = "Arrow";
    TokenType[TokenType["Question"] = 53] = "Question";
    TokenType[TokenType["QuestionDot"] = 54] = "QuestionDot";
    TokenType[TokenType["Range"] = 55] = "Range";
    TokenType[TokenType["Concat"] = 56] = "Concat";
    TokenType[TokenType["At"] = 57] = "At";
    TokenType[TokenType["Hash"] = 58] = "Hash";
    TokenType[TokenType["DotDotDot"] = 59] = "DotDotDot";
    TokenType[TokenType["Assign"] = 60] = "Assign";
    // Delimiters
    TokenType[TokenType["LParen"] = 61] = "LParen";
    TokenType[TokenType["RParen"] = 62] = "RParen";
    TokenType[TokenType["LBrace"] = 63] = "LBrace";
    TokenType[TokenType["RBrace"] = 64] = "RBrace";
    TokenType[TokenType["LBracket"] = 65] = "LBracket";
    TokenType[TokenType["RBracket"] = 66] = "RBracket";
    TokenType[TokenType["Comma"] = 67] = "Comma";
    TokenType[TokenType["Colon"] = 68] = "Colon";
    TokenType[TokenType["Dot"] = 69] = "Dot";
    TokenType[TokenType["Semicolon"] = 70] = "Semicolon";
    TokenType[TokenType["Newline"] = 71] = "Newline";
    // Regex
    TokenType[TokenType["Regex"] = 72] = "Regex";
    // Special
    TokenType[TokenType["EOF"] = 73] = "EOF";
})(TokenType || (TokenType = {}));
const KEYWORDS = {
    fn: TokenType.Fn, let: TokenType.Let, mut: TokenType.Mut, type: TokenType.Type,
    use: TokenType.Use, pub: TokenType.Pub, match: TokenType.Match,
    if: TokenType.If, el: TokenType.El, for: TokenType.For, in: TokenType.In,
    do: TokenType.Do, while: TokenType.While, until: TokenType.Until,
    async: TokenType.Async, await: TokenType.Await, ret: TokenType.Ret,
    true: TokenType.True, false: TokenType.False, nil: TokenType.NilKw,
    and: TokenType.And, or: TokenType.Or, not: TokenType.Not,
    where: TokenType.Where, matching: TokenType.Matching, fetch: TokenType.Fetch,
    break: TokenType.Break, continue: TokenType.Continue,
    return: TokenType.Ret, // alias: Arc uses 'ret' but accept 'return' too
};
export function lex(source) {
    const tokens = [];
    let i = 0;
    let line = 1;
    let col = 1;
    function peek(offset = 0) { return source[i + offset] ?? ""; }
    function advance() {
        const ch = source[i++];
        if (ch === "\n") {
            line++;
            col = 1;
        }
        else {
            col++;
        }
        return ch;
    }
    function tok(type, value, startLine, startCol) {
        return { type, value, line: startLine, col: startCol };
    }
    while (i < source.length) {
        const ch = peek();
        const sl = line, sc = col;
        // Whitespace (not newline)
        if (ch === " " || ch === "\t" || ch === "\r") {
            advance();
            continue;
        }
        // Newline
        if (ch === "\n") {
            advance();
            tokens.push(tok(TokenType.Newline, "\\n", sl, sc));
            continue;
        }
        // Comments: # or // to end of line
        if (ch === "#" || (ch === "/" && peek(1) === "/")) {
            while (i < source.length && peek() !== "\n")
                advance();
            continue;
        }
        // String with interpolation
        if (ch === '"') {
            advance(); // skip opening quote
            let str = "";
            const parts = [];
            let hasInterp = false;
            while (i < source.length && peek() !== '"') {
                if (peek() === "\n") {
                    // Allow multiline strings
                    str += advance();
                    continue;
                }
                if (peek() === "{") {
                    hasInterp = true;
                    if (str.length > 0 || parts.length === 0) {
                        parts.push(tok(TokenType.String, str, sl, sc));
                        str = "";
                    }
                    advance(); // skip {
                    // Lex the expression inside {} as tokens - just grab until matching }
                    let depth = 1;
                    let interpExpr = "";
                    const interpLine = line, interpCol = col;
                    while (i < source.length && depth > 0) {
                        if (peek() === '"') {
                            // Skip over string literals inside interpolation to avoid miscounting braces
                            interpExpr += advance(); // opening quote
                            while (i < source.length && peek() !== '"') {
                                if (peek() === '\\') {
                                    interpExpr += advance();
                                } // escape char
                                interpExpr += advance();
                            }
                            if (i < source.length)
                                interpExpr += advance(); // closing quote
                            continue;
                        }
                        if (peek() === "{")
                            depth++;
                        if (peek() === "}") {
                            depth--;
                            if (depth === 0)
                                break;
                        }
                        interpExpr += advance();
                    }
                    if (peek() === "}")
                        advance(); // skip }
                    // Skip empty interpolation
                    if (interpExpr.trim().length > 0) {
                        parts.push(tok(TokenType.Ident, interpExpr, interpLine, interpCol));
                    }
                    else {
                        // Empty interpolation {} - treat as empty string part
                        parts.push(tok(TokenType.String, "", interpLine, interpCol));
                    }
                    continue;
                }
                if (peek() === "\\") {
                    advance();
                    if (i >= source.length) {
                        throw new Error(`Unterminated string literal (escape at end of file) at line ${sl}, col ${sc}`);
                    }
                    const esc = advance();
                    if (esc === "n")
                        str += "\n";
                    else if (esc === "t")
                        str += "\t";
                    else if (esc === "r")
                        str += "\r";
                    else if (esc === "0")
                        str += "\0";
                    else if (esc === "\\")
                        str += "\\";
                    else if (esc === '"')
                        str += '"';
                    else if (esc === "{")
                        str += "{";
                    else if (esc === "x") {
                        // \xNN - hex escape (2 digits)
                        let hex = "";
                        for (let h = 0; h < 2 && i < source.length; h++) {
                            const hc = peek();
                            if (/[0-9a-fA-F]/.test(hc)) {
                                hex += advance();
                            }
                            else
                                break;
                        }
                        str += hex.length > 0 ? String.fromCharCode(parseInt(hex, 16)) : "x";
                    }
                    else if (esc === "u") {
                        // \u{NNNN} or \uNNNN - unicode escape
                        if (peek() === "{") {
                            advance(); // skip {
                            let hex = "";
                            while (i < source.length && peek() !== "}") {
                                hex += advance();
                            }
                            if (peek() === "}")
                                advance();
                            str += hex.length > 0 ? String.fromCodePoint(parseInt(hex, 16)) : "";
                        }
                        else {
                            // \uNNNN - 4 hex digits
                            let hex = "";
                            for (let h = 0; h < 4 && i < source.length; h++) {
                                const hc = peek();
                                if (/[0-9a-fA-F]/.test(hc)) {
                                    hex += advance();
                                }
                                else
                                    break;
                            }
                            str += hex.length > 0 ? String.fromCharCode(parseInt(hex, 16)) : "u";
                        }
                    }
                    else
                        str += esc;
                    continue;
                }
                str += advance();
            }
            if (i >= source.length) {
                throw new Error(`Unterminated string literal at line ${sl}, col ${sc}`);
            }
            if (peek() === '"')
                advance(); // skip closing quote
            if (hasInterp) {
                if (str.length > 0)
                    parts.push(tok(TokenType.String, str, sl, sc));
                // Encode as StringInterpStart ... StringInterpEnd
                tokens.push(tok(TokenType.StringInterpStart, "", sl, sc));
                for (const p of parts) {
                    if (p.type === TokenType.String) {
                        tokens.push(tok(TokenType.StringInterpPart, p.value, p.line, p.col));
                    }
                    else {
                        // It's an ident expression
                        tokens.push(tok(TokenType.Ident, p.value, p.line, p.col));
                    }
                }
                tokens.push(tok(TokenType.StringInterpEnd, "", line, col));
            }
            else {
                tokens.push(tok(TokenType.String, str, sl, sc));
            }
            continue;
        }
        // Numbers
        if (ch >= "0" && ch <= "9") {
            let num = "";
            let isFloat = false;
            while (i < source.length && ((peek() >= "0" && peek() <= "9") || peek() === ".")) {
                if (peek() === ".") {
                    if (peek(1) === ".")
                        break; // range operator
                    if (isFloat)
                        break;
                    // Only consume dot if followed by a digit (otherwise it's member access)
                    if (!(peek(1) >= "0" && peek(1) <= "9"))
                        break;
                    isFloat = true;
                }
                num += advance();
            }
            tokens.push(tok(isFloat ? TokenType.Float : TokenType.Int, num, sl, sc));
            continue;
        }
        // Identifiers and keywords
        if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || ch === "_") {
            let ident = "";
            while (i < source.length && ((peek() >= "a" && peek() <= "z") || (peek() >= "A" && peek() <= "Z") || (peek() >= "0" && peek() <= "9") || peek() === "_")) {
                ident += advance();
            }
            const kw = KEYWORDS[ident];
            if (kw !== undefined) {
                tokens.push(tok(kw, ident, sl, sc));
            }
            else {
                tokens.push(tok(TokenType.Ident, ident, sl, sc));
            }
            continue;
        }
        // Regex literal: /pattern/ (only after 'matching' keyword)
        if (ch === "/" && tokens.length > 0 && tokens[tokens.length - 1].type === TokenType.Matching) {
            advance(); // skip opening /
            let pattern = "";
            while (i < source.length && peek() !== "/" && peek() !== "\n") {
                if (peek() === "\\") {
                    pattern += advance();
                } // include escape char
                pattern += advance();
            }
            if (peek() === "/")
                advance(); // skip closing /
            tokens.push(tok(TokenType.Regex, pattern, sl, sc));
            continue;
        }
        // Multi-char operators
        if (ch === "|" && peek(1) === ">") {
            advance();
            advance();
            tokens.push(tok(TokenType.Pipe, "|>", sl, sc));
            continue;
        }
        if (ch === "|") {
            advance();
            tokens.push(tok(TokenType.Bar, "|", sl, sc));
            continue;
        }
        if (ch === "=" && peek(1) === ">") {
            advance();
            advance();
            tokens.push(tok(TokenType.FatArrow, "=>", sl, sc));
            continue;
        }
        if (ch === "-" && peek(1) === ">") {
            advance();
            advance();
            tokens.push(tok(TokenType.Arrow, "->", sl, sc));
            continue;
        }
        if (ch === "*" && peek(1) === "*") {
            advance();
            advance();
            tokens.push(tok(TokenType.Power, "**", sl, sc));
            continue;
        }
        if (ch === "+" && peek(1) === "+") {
            advance();
            advance();
            tokens.push(tok(TokenType.Concat, "++", sl, sc));
            continue;
        }
        if (ch === "=" && peek(1) === "=") {
            advance();
            advance();
            tokens.push(tok(TokenType.Eq, "==", sl, sc));
            continue;
        }
        if (ch === "!" && peek(1) === "=") {
            advance();
            advance();
            tokens.push(tok(TokenType.Neq, "!=", sl, sc));
            continue;
        }
        if (ch === "!") {
            advance();
            tokens.push(tok(TokenType.Not, "!", sl, sc));
            continue;
        }
        if (ch === "<" && peek(1) === "=") {
            advance();
            advance();
            tokens.push(tok(TokenType.Lte, "<=", sl, sc));
            continue;
        }
        if (ch === ">" && peek(1) === "=") {
            advance();
            advance();
            tokens.push(tok(TokenType.Gte, ">=", sl, sc));
            continue;
        }
        if (ch === "?" && peek(1) === ".") {
            advance();
            advance();
            tokens.push(tok(TokenType.QuestionDot, "?.", sl, sc));
            continue;
        }
        if (ch === "." && peek(1) === "." && peek(2) === ".") {
            advance();
            advance();
            advance();
            tokens.push(tok(TokenType.DotDotDot, "...", sl, sc));
            continue;
        }
        if (ch === "." && peek(1) === ".") {
            advance();
            advance();
            tokens.push(tok(TokenType.Range, "..", sl, sc));
            continue;
        }
        // Single char
        const singles = {
            "+": TokenType.Plus, "-": TokenType.Minus, "*": TokenType.Star, "/": TokenType.Slash,
            "%": TokenType.Percent, "<": TokenType.Lt, ">": TokenType.Gt, "?": TokenType.Question,
            "@": TokenType.At, "=": TokenType.Assign,
            "(": TokenType.LParen, ")": TokenType.RParen, "{": TokenType.LBrace, "}": TokenType.RBrace,
            "[": TokenType.LBracket, "]": TokenType.RBracket, ",": TokenType.Comma, ":": TokenType.Colon,
            ".": TokenType.Dot, ";": TokenType.Semicolon,
        };
        if (singles[ch] !== undefined) {
            advance();
            tokens.push(tok(singles[ch], ch, sl, sc));
            continue;
        }
        // Unknown
        advance();
    }
    tokens.push(tok(TokenType.EOF, "", line, col));
    return tokens;
}
