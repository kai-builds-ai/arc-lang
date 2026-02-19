// Arc Language Code Formatter
// Pretty-prints Arc source with consistent style
import { lex } from "./lexer.js";
import { parse } from "./parser.js";
const DEFAULT_OPTIONS = {
    indentSize: 2,
    maxLineLength: 100,
};
// Extract comments from source (lexer skips them)
function extractComments(source) {
    const comments = [];
    let line = 1, col = 1;
    let i = 0;
    while (i < source.length) {
        if (source[i] === '"' || source[i] === "'") {
            const quote = source[i];
            i++;
            col++;
            while (i < source.length && source[i] !== quote) {
                if (source[i] === '\\') {
                    i++;
                    col++;
                }
                if (i < source.length && source[i] === '\n') {
                    line++;
                    col = 1;
                }
                else {
                    col++;
                }
                i++;
            }
            if (i < source.length) {
                i++;
                col++;
            }
        }
        else if (source[i] === '/' && i + 1 < source.length && source[i + 1] === '/') {
            const startLine = line, startCol = col;
            let text = '';
            while (i < source.length && source[i] !== '\n') {
                text += source[i];
                i++;
                col++;
            }
            comments.push({ text, line: startLine, col: startCol });
        }
        else if (source[i] === '#') {
            const startLine = line, startCol = col;
            let text = '';
            while (i < source.length && source[i] !== '\n') {
                text += source[i];
                i++;
                col++;
            }
            comments.push({ text, line: startLine, col: startCol });
        }
        else {
            if (source[i] === '\n') {
                line++;
                col = 1;
            }
            else {
                col++;
            }
            i++;
        }
    }
    return comments;
}
// Map comments to the nearest following AST node line
function buildCommentMap(comments, stmts) {
    // Map: stmtIndex -> comments that appear before it
    const map = new Map();
    if (comments.length === 0 || stmts.length === 0)
        return map;
    let ci = 0;
    for (let si = 0; si < stmts.length; si++) {
        const stmtLine = stmts[si].loc.line;
        const before = [];
        while (ci < comments.length && comments[ci].line <= stmtLine) {
            before.push(comments[ci]);
            ci++;
        }
        if (before.length > 0)
            map.set(si, before);
    }
    // Trailing comments (after last stmt)
    if (ci < comments.length) {
        const trailing = [];
        while (ci < comments.length) {
            trailing.push(comments[ci]);
            ci++;
        }
        map.set(stmts.length, trailing);
    }
    return map;
}
export function format(source, options) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const comments = extractComments(source);
    const tokens = lex(source);
    const ast = parse(tokens);
    const commentMap = buildCommentMap(comments, ast.stmts);
    const lines = [];
    function emit(line) { lines.push(line); }
    function indent(depth) { return ' '.repeat(depth * opts.indentSize); }
    function formatExpr(expr, depth) {
        switch (expr.kind) {
            case "IntLiteral": return String(expr.value);
            case "FloatLiteral": {
                const s = String(expr.value);
                return s.includes('.') ? s : s + '.0';
            }
            case "BoolLiteral": return expr.value ? "true" : "false";
            case "NilLiteral": return "nil";
            case "StringLiteral": {
                // Use single quotes if the string contains double quotes (e.g. JSON strings)
                if (expr.value.includes('"')) {
                    return `'${escapeSingleQuoteString(expr.value)}'`;
                }
                return `"${escapeString(expr.value)}"`;
            }
            case "StringInterp": {
                let s = '"';
                for (const part of expr.parts) {
                    if (typeof part === "string")
                        s += escapeString(part);
                    else
                        s += `{${formatExpr(part, depth)}}`;
                }
                return s + '"';
            }
            case "Identifier": return expr.name;
            case "BinaryExpr": {
                const l = formatExpr(expr.left, depth);
                const r = formatExpr(expr.right, depth);
                return `${l} ${expr.op} ${r}`;
            }
            case "UnaryExpr": {
                const operand = formatExpr(expr.operand, depth);
                return expr.op === "not" ? `not ${operand}` : `${expr.op}${operand}`;
            }
            case "CallExpr": {
                const callee = formatExpr(expr.callee, depth);
                const args = expr.args.map(a => formatExpr(a, depth)).join(", ");
                return `${callee}(${args})`;
            }
            case "MemberExpr":
                return `${formatExpr(expr.object, depth)}.${expr.property}`;
            case "IndexExpr":
                return `${formatExpr(expr.object, depth)}[${formatExpr(expr.index, depth)}]`;
            case "PipelineExpr": {
                const l = formatExpr(expr.left, depth);
                const r = formatExpr(expr.right, depth);
                const single = `${l} |> ${r}`;
                if (single.length + depth * opts.indentSize <= opts.maxLineLength) {
                    return single;
                }
                return `${l}\n${indent(depth + 1)}|> ${r}`;
            }
            case "IfExpr": {
                const cond = formatExpr(expr.condition, depth);
                const thenInline = formatBlockExpr(expr.then, depth);
                if (expr.else_) {
                    let elInline;
                    if (expr.else_.kind === "IfExpr") {
                        elInline = formatExpr(expr.else_, depth);
                    }
                    else {
                        elInline = formatBlockExpr(expr.else_, depth);
                    }
                    const single = `if ${cond} ${thenInline} else ${elInline}`;
                    if (single.length + depth * opts.indentSize <= opts.maxLineLength) {
                        return single;
                    }
                    // Force multi-line blocks when single-line is too long
                    const thenMulti = expr.then.kind === "BlockExpr"
                        ? formatBlockMultiline(expr.then, depth)
                        : thenInline;
                    if (expr.else_.kind === "IfExpr") {
                        return `if ${cond} ${thenMulti} else ${formatExpr(expr.else_, depth)}`;
                    }
                    const elMulti = expr.else_.kind === "BlockExpr"
                        ? formatBlockMultiline(expr.else_, depth)
                        : elInline;
                    return `if ${cond} ${thenMulti} else ${elMulti}`;
                }
                const single = `if ${cond} ${thenInline}`;
                if (single.length + depth * opts.indentSize <= opts.maxLineLength) {
                    return single;
                }
                const thenMulti = expr.then.kind === "BlockExpr"
                    ? formatBlockMultiline(expr.then, depth)
                    : thenInline;
                return `if ${cond} ${thenMulti}`;
            }
            case "MatchExpr": {
                const subject = formatExpr(expr.subject, depth);
                const armsStr = expr.arms.map(arm => {
                    const pat = formatPattern(arm.pattern);
                    const guard = arm.guard ? ` if ${formatExpr(arm.guard, depth + 1)}` : '';
                    const body = formatExpr(arm.body, depth + 1);
                    return `${indent(depth + 1)}${pat}${guard} => ${body}`;
                }).join(',\n');
                return `match ${subject} {\n${armsStr}\n${indent(depth)}}`;
            }
            case "LambdaExpr": {
                const params = expr.params.length === 1
                    ? expr.params[0]
                    : `(${expr.params.join(", ")})`;
                return `${params} => ${formatExpr(expr.body, depth)}`;
            }
            case "ListLiteral": {
                if (expr.elements.length === 0)
                    return "[]";
                const elems = expr.elements.map(e => formatExpr(e, depth));
                const single = `[${elems.join(", ")}]`;
                if (single.length + depth * opts.indentSize <= opts.maxLineLength)
                    return single;
                return `[\n${elems.map(e => `${indent(depth + 1)}${e}`).join(',\n')}\n${indent(depth)}]`;
            }
            case "MapLiteral": {
                if (expr.entries.length === 0)
                    return "{}";
                const entries = expr.entries.map(e => {
                    if (e.spread)
                        return `...${formatExpr(e.spread, depth + 1)}`;
                    const key = typeof e.key === "string" ? e.key : formatExpr(e.key, depth + 1);
                    return `${key}: ${formatExpr(e.value, depth + 1)}`;
                });
                const single = `{ ${entries.join(", ")} }`;
                if (single.length + depth * opts.indentSize <= opts.maxLineLength)
                    return single;
                return `{\n${entries.map(e => `${indent(depth + 1)}${e}`).join(',\n')}\n${indent(depth)}}`;
            }
            case "ListComprehension": {
                const ex = formatExpr(expr.expr, depth);
                const iter = formatExpr(expr.iterable, depth);
                const filter = expr.filter ? ` if ${formatExpr(expr.filter, depth)}` : '';
                return `[${ex} for ${expr.variable} in ${iter}${filter}]`;
            }
            case "ToolCallExpr": {
                const arg = formatExpr(expr.arg, depth);
                const body = expr.body ? ` ${formatBlockExpr(expr.body, depth)}` : '';
                return `@${expr.method} ${arg}${body}`;
            }
            case "RangeExpr":
                return `${formatExpr(expr.start, depth)}..${formatExpr(expr.end, depth)}`;
            case "BlockExpr":
                return formatBlockInline(expr, depth);
            case "AsyncExpr":
                return `async ${formatBlockExpr(expr.body, depth)}`;
            case "AwaitExpr":
                return `await ${formatExpr(expr.expr, depth)}`;
            case "FetchExpr": {
                const targets = expr.targets.map(t => formatExpr(t, depth)).join(", ");
                return `fetch [${targets}]`;
            }
            case "GroupExpr": return `(${formatExpr(expr.expr, depth)})`;
            case "SpreadExpr": return `...${formatExpr(expr.expr, depth)}`;
            case "OptionalMemberExpr": return `${formatExpr(expr.object, depth)}?.${expr.property}`;
            case "TryExpr": return `${formatExpr(expr.expr, depth)}?`;
            case "TryCatchExpr":
                return `try ${formatBlockExpr(expr.body, depth)} catch ${expr.catchVar} ${formatBlockExpr(expr.catchBody, depth)}`;
            default: return `/* unknown */`;
        }
    }
    function formatBlockExpr(expr, depth) {
        if (expr.kind === "BlockExpr")
            return formatBlockInline(expr, depth);
        return formatExpr(expr, depth);
    }
    function formatBlockMultiline(block, depth) {
        if (block.stmts.length === 0)
            return "{}";
        const body = block.stmts.map(s => `${indent(depth + 1)}${formatStmtStr(s, depth + 1)}`).join('\n');
        return `{\n${body}\n${indent(depth)}}`;
    }
    function formatBlockInline(block, depth) {
        if (block.stmts.length === 0)
            return "{}";
        if (block.stmts.length === 1) {
            const s = formatStmtStr(block.stmts[0], depth + 1);
            const single = `{ ${s} }`;
            if (single.length + depth * opts.indentSize <= opts.maxLineLength)
                return single;
        }
        const body = block.stmts.map(s => `${indent(depth + 1)}${formatStmtStr(s, depth + 1)}`).join('\n');
        return `{\n${body}\n${indent(depth)}}`;
    }
    function formatPattern(pat) {
        switch (pat.kind) {
            case "WildcardPattern": return "_";
            case "LiteralPattern":
                if (pat.value === null)
                    return "nil";
                if (typeof pat.value === "string")
                    return `"${escapeString(pat.value)}"`;
                return String(pat.value);
            case "BindingPattern": return pat.name;
            case "ArrayPattern": return `[${pat.elements.map(formatPattern).join(", ")}]`;
            case "OrPattern": return pat.patterns.map(formatPattern).join(" | ");
            case "ConstructorPattern": return `${pat.name}(${pat.args.map(formatPattern).join(", ")})`;
            default: return "_";
        }
    }
    function formatTypeExpr(t) {
        switch (t.kind) {
            case "NamedType": return t.name;
            case "RecordType": {
                const fields = t.fields.map(f => `${f.name}: ${formatTypeExpr(f.type)}`).join(", ");
                return `{ ${fields} }`;
            }
            case "UnionType": return t.variants.map(formatTypeExpr).join(" | ");
            case "FunctionType": {
                const params = t.params.map(formatTypeExpr).join(", ");
                return `(${params}) -> ${formatTypeExpr(t.ret)}`;
            }
            case "ConstrainedType":
                return `${formatTypeExpr(t.base)} ${t.constraint} ${formatExpr(t.predicate, 0)}`;
            case "EnumType":
                return t.variants.map(v => {
                    if (v.params)
                        return `${v.name}(${v.params.map(formatTypeExpr).join(", ")})`;
                    return v.name;
                }).join(" | ");
            case "GenericType":
                return `${t.name}<${t.params.map(formatTypeExpr).join(", ")}>`;
        }
    }
    function formatStmtStr(stmt, depth) {
        switch (stmt.kind) {
            case "LetStmt": {
                const pub = stmt.pub ? "pub " : "";
                const mut = stmt.mutable ? "mut " : "";
                const name = typeof stmt.name === "string"
                    ? stmt.name
                    : stmt.name.type === "object"
                        ? `{ ${stmt.name.names.join(", ")} }`
                        : `[${stmt.name.names.join(", ")}]`;
                return `${pub}let ${mut}${name} = ${formatExpr(stmt.value, depth)}`;
            }
            case "FnStmt": {
                const pub = stmt.pub ? "pub " : "";
                const async_ = stmt.isAsync ? "async " : "";
                const params = stmt.params.join(", ");
                if (stmt.body.kind === "BlockExpr") {
                    return `${pub}${async_}fn ${stmt.name}(${params}) ${formatBlockInline(stmt.body, depth)}`;
                }
                return `${pub}${async_}fn ${stmt.name}(${params}) => ${formatExpr(stmt.body, depth)}`;
            }
            case "ForStmt":
                return `for ${stmt.variable} in ${formatExpr(stmt.iterable, depth)} ${formatBlockExpr(stmt.body, depth)}`;
            case "DoStmt": {
                const kw = stmt.isWhile ? "while" : "until";
                return `do ${formatBlockExpr(stmt.body, depth)} ${kw} ${formatExpr(stmt.condition, depth)}`;
            }
            case "ExprStmt":
                return formatExpr(stmt.expr, depth);
            case "UseStmt": {
                const path = stmt.path.join("/");
                if (stmt.wildcard)
                    return `use ${path}: *`;
                if (stmt.imports)
                    return `use ${path}: ${stmt.imports.join(", ")}`;
                return `use ${path}`;
            }
            case "TypeStmt": {
                const pub = stmt.pub ? "pub " : "";
                return `${pub}type ${stmt.name} = ${formatTypeExpr(stmt.def)}`;
            }
            case "RetStmt":
                return stmt.value ? `return ${formatExpr(stmt.value, depth)}` : "return";
            case "WhileStmt":
                return `while ${formatExpr(stmt.condition, depth)} ${formatBlockExpr(stmt.body, depth)}`;
            case "BreakStmt":
                return "break";
            case "ContinueStmt":
                return "continue";
            case "TryCatchStmt":
                return `try ${formatBlockExpr(stmt.body, depth)} catch ${stmt.catchVar} ${formatBlockExpr(stmt.catchBody, depth)}`;
            case "AssignStmt":
                return `${stmt.target} = ${formatExpr(stmt.value, depth)}`;
            case "MemberAssignStmt":
                return `${formatExpr(stmt.object, depth)}.${stmt.property} = ${formatExpr(stmt.value, depth)}`;
            case "IndexAssignStmt":
                return `${formatExpr(stmt.object, depth)}[${formatExpr(stmt.index, depth)}] = ${formatExpr(stmt.value, depth)}`;
            default:
                return `/* unknown stmt: ${stmt.kind} */`;
        }
    }
    // Emit top-level statements with comments and blank lines between declarations
    let prevKind = '';
    for (let i = 0; i < ast.stmts.length; i++) {
        const stmtComments = commentMap.get(i);
        if (stmtComments) {
            for (const c of stmtComments) {
                // If comment is on same line as previous stmt, it was inline — but we can't detect easily
                // so emit as standalone line
                emit(c.text);
            }
        }
        const stmt = ast.stmts[i];
        const isDecl = stmt.kind === "FnStmt" || stmt.kind === "TypeStmt";
        const prevIsDecl = prevKind === "FnStmt" || prevKind === "TypeStmt";
        // Blank line between top-level declarations
        if (i > 0 && (isDecl || prevIsDecl)) {
            // Only add if there isn't already a blank line from comments
            if (!stmtComments || stmtComments.length === 0) {
                emit('');
            }
        }
        emit(formatStmtStr(stmt, 0));
        prevKind = stmt.kind;
    }
    // Trailing comments
    const trailingComments = commentMap.get(ast.stmts.length);
    if (trailingComments) {
        for (const c of trailingComments)
            emit(c.text);
    }
    // Normalize trailing newline
    let result = lines.join('\n');
    result = result.replace(/\n+$/, '') + '\n';
    return result;
}
function escapeString(s) {
    return s
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\t/g, '\\t');
}
function escapeSingleQuoteString(s) {
    return s
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\n/g, '\\n')
        .replace(/\t/g, '\\t');
}
