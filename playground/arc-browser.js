// Arc Language Browser Interpreter
// Self-contained: Lexer → Parser → Interpreter
// No dependencies, no build step

(function(global) {
"use strict";

// ============================================================
// LEXER
// ============================================================

var TT = {
  Int: "Int", Float: "Float", String: "String",
  StringInterpStart: "StringInterpStart", StringInterpPart: "StringInterpPart",
  StringInterpEnd: "StringInterpEnd",
  Bool: "Bool", Nil: "Nil", Ident: "Ident",
  Fn: "Fn", Let: "Let", Mut: "Mut", Match: "Match",
  If: "If", El: "El", For: "For", In: "In",
  Do: "Do", While: "While", Until: "Until",
  Ret: "Ret", And: "And", Or: "Or", Not: "Not",
  True: "True", False: "False", NilKw: "NilKw",
  Plus: "Plus", Minus: "Minus", Star: "Star", Slash: "Slash",
  Percent: "Percent", Power: "Power",
  Eq: "Eq", Neq: "Neq", Lt: "Lt", Gt: "Gt", Lte: "Lte", Gte: "Gte",
  Pipe: "Pipe", FatArrow: "FatArrow", Arrow: "Arrow",
  Question: "Question", Range: "Range", Concat: "Concat",
  At: "At", Hash: "Hash", Assign: "Assign",
  LParen: "LParen", RParen: "RParen",
  LBrace: "LBrace", RBrace: "RBrace",
  LBracket: "LBracket", RBracket: "RBracket",
  Comma: "Comma", Colon: "Colon", Dot: "Dot",
  Semicolon: "Semicolon", Newline: "Newline",
  EOF: "EOF"
};

var KEYWORDS = {
  fn: TT.Fn, let: TT.Let, mut: TT.Mut, match: TT.Match,
  if: TT.If, el: TT.El, for: TT.For, in: TT.In,
  do: TT.Do, while: TT.While, until: TT.Until,
  ret: TT.Ret, true: TT.True, false: TT.False, nil: TT.NilKw,
  and: TT.And, or: TT.Or, not: TT.Not
};

function lex(source) {
  var tokens = [];
  var i = 0, line = 1, col = 1;

  function peek(off) { return source[i + (off || 0)] || ""; }
  function advance() {
    var ch = source[i++];
    if (ch === "\n") { line++; col = 1; } else { col++; }
    return ch;
  }
  function tok(type, value, sl, sc) {
    return { type: type, value: value, line: sl, col: sc };
  }

  while (i < source.length) {
    var ch = peek();
    var sl = line, sc = col;

    if (ch === " " || ch === "\t" || ch === "\r") { advance(); continue; }
    if (ch === "\n") { advance(); tokens.push(tok(TT.Newline, "\\n", sl, sc)); continue; }

    // Comments
    if (ch === "#") {
      while (i < source.length && peek() !== "\n") advance();
      continue;
    }

    // Strings
    if (ch === '"') {
      advance();
      var str = "", parts = [], hasInterp = false;
      while (i < source.length && peek() !== '"') {
        if (peek() === "\\") {
          advance();
          var esc = advance();
          if (esc === "n") str += "\n";
          else if (esc === "t") str += "\t";
          else if (esc === "\\") str += "\\";
          else if (esc === '"') str += '"';
          else str += esc;
          continue;
        }
        if (peek() === "{") {
          hasInterp = true;
          parts.push({ t: "s", v: str }); str = "";
          advance(); // skip {
          var depth = 1, interpExpr = "";
          while (i < source.length && depth > 0) {
            if (peek() === "{") depth++;
            if (peek() === "}") { depth--; if (depth === 0) break; }
            interpExpr += advance();
          }
          if (peek() === "}") advance();
          parts.push({ t: "e", v: interpExpr });
          continue;
        }
        str += advance();
      }
      if (peek() === '"') advance();

      if (hasInterp) {
        parts.push({ t: "s", v: str });
        tokens.push(tok(TT.StringInterpStart, "", sl, sc));
        for (var pi = 0; pi < parts.length; pi++) {
          if (parts[pi].t === "s") {
            tokens.push(tok(TT.StringInterpPart, parts[pi].v, sl, sc));
          } else {
            // Lex the interpolation expression
            var innerTokens = lex(parts[pi].v);
            // Remove EOF
            for (var ti = 0; ti < innerTokens.length; ti++) {
              if (innerTokens[ti].type !== TT.EOF && innerTokens[ti].type !== TT.Newline) {
                tokens.push(innerTokens[ti]);
              }
            }
          }
        }
        tokens.push(tok(TT.StringInterpEnd, "", line, col));
      } else {
        tokens.push(tok(TT.String, str, sl, sc));
      }
      continue;
    }

    // Numbers
    if (ch >= "0" && ch <= "9") {
      var num = "", isFloat = false;
      while (i < source.length && ((peek() >= "0" && peek() <= "9") || peek() === ".")) {
        if (peek() === ".") {
          if (peek(1) === ".") break;
          if (isFloat) break;
          isFloat = true;
        }
        num += advance();
      }
      tokens.push(tok(isFloat ? TT.Float : TT.Int, num, sl, sc));
      continue;
    }

    // Identifiers
    if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || ch === "_") {
      var ident = "";
      while (i < source.length && ((peek() >= "a" && peek() <= "z") || (peek() >= "A" && peek() <= "Z") || (peek() >= "0" && peek() <= "9") || peek() === "_")) {
        ident += advance();
      }
      var kw = KEYWORDS[ident];
      if (kw) tokens.push(tok(kw, ident, sl, sc));
      else tokens.push(tok(TT.Ident, ident, sl, sc));
      continue;
    }

    // Multi-char ops
    if (ch === "|" && peek(1) === ">") { advance(); advance(); tokens.push(tok(TT.Pipe, "|>", sl, sc)); continue; }
    if (ch === "=" && peek(1) === ">") { advance(); advance(); tokens.push(tok(TT.FatArrow, "=>", sl, sc)); continue; }
    if (ch === "-" && peek(1) === ">") { advance(); advance(); tokens.push(tok(TT.Arrow, "->", sl, sc)); continue; }
    if (ch === "*" && peek(1) === "*") { advance(); advance(); tokens.push(tok(TT.Power, "**", sl, sc)); continue; }
    if (ch === "+" && peek(1) === "+") { advance(); advance(); tokens.push(tok(TT.Concat, "++", sl, sc)); continue; }
    if (ch === "=" && peek(1) === "=") { advance(); advance(); tokens.push(tok(TT.Eq, "==", sl, sc)); continue; }
    if (ch === "!" && peek(1) === "=") { advance(); advance(); tokens.push(tok(TT.Neq, "!=", sl, sc)); continue; }
    if (ch === "<" && peek(1) === "=") { advance(); advance(); tokens.push(tok(TT.Lte, "<=", sl, sc)); continue; }
    if (ch === ">" && peek(1) === "=") { advance(); advance(); tokens.push(tok(TT.Gte, ">=", sl, sc)); continue; }
    if (ch === "." && peek(1) === ".") { advance(); advance(); tokens.push(tok(TT.Range, "..", sl, sc)); continue; }

    // Single char
    var singles = {
      "+": TT.Plus, "-": TT.Minus, "*": TT.Star, "/": TT.Slash,
      "%": TT.Percent, "<": TT.Lt, ">": TT.Gt, "?": TT.Question,
      "@": TT.At, "=": TT.Assign,
      "(": TT.LParen, ")": TT.RParen, "{": TT.LBrace, "}": TT.RBrace,
      "[": TT.LBracket, "]": TT.RBracket, ",": TT.Comma, ":": TT.Colon,
      ".": TT.Dot, ";": TT.Semicolon
    };
    if (singles[ch]) {
      advance();
      tokens.push(tok(singles[ch], ch, sl, sc));
      continue;
    }

    advance(); // skip unknown
  }

  tokens.push(tok(TT.EOF, "", line, col));
  return tokens;
}

// ============================================================
// PARSER
// ============================================================

function Parser(tokens) {
  this.tokens = tokens;
  this.pos = 0;
}

Parser.prototype.peek = function() { return this.tokens[this.pos] || { type: TT.EOF, value: "", line: 0, col: 0 }; };
Parser.prototype.advance = function() { return this.tokens[this.pos++]; };
Parser.prototype.at = function(type) { return this.peek().type === type; };
Parser.prototype.eat = function(type) {
  if (this.at(type)) return this.advance();
  throw new ArcError("Expected " + type + " but got " + this.peek().type + " ('" + this.peek().value + "')", this.peek().line);
};
Parser.prototype.skipNewlines = function() { while (this.at(TT.Newline) || this.at(TT.Semicolon)) this.advance(); };

Parser.prototype.parse = function() {
  var stmts = [];
  this.skipNewlines();
  while (!this.at(TT.EOF)) {
    stmts.push(this.parseStmt());
    this.skipNewlines();
  }
  return { kind: "Program", stmts: stmts };
};

Parser.prototype.parseStmt = function() {
  var t = this.peek();
  if (t.type === TT.Let) return this.parseLet();
  if (t.type === TT.Fn) return this.parseFn();
  if (t.type === TT.For) return this.parseFor();
  if (t.type === TT.Do) return this.parseDo();
  if (t.type === TT.Ret) return this.parseRet();
  var expr = this.parseExpr();
  this.skipNewlines();
  return { kind: "ExprStmt", expr: expr, loc: { line: t.line, col: t.col } };
};

Parser.prototype.parseLet = function() {
  var t = this.eat(TT.Let);
  var mutable = false;
  if (this.at(TT.Mut)) { this.advance(); mutable = true; }

  var name;
  if (this.at(TT.LBrace)) {
    // Destructure {a, b}
    this.advance();
    var names = [];
    while (!this.at(TT.RBrace)) {
      names.push(this.eat(TT.Ident).value);
      if (this.at(TT.Comma)) this.advance();
    }
    this.eat(TT.RBrace);
    name = { kind: "DestructureTarget", type: "object", names: names };
  } else if (this.at(TT.LBracket)) {
    this.advance();
    var names2 = [];
    while (!this.at(TT.RBracket)) {
      names2.push(this.eat(TT.Ident).value);
      if (this.at(TT.Comma)) this.advance();
    }
    this.eat(TT.RBracket);
    name = { kind: "DestructureTarget", type: "array", names: names2 };
  } else {
    name = this.eat(TT.Ident).value;
  }

  this.eat(TT.Assign);
  var value = this.parseExpr();
  this.skipNewlines();
  return { kind: "LetStmt", name: name, mutable: mutable, value: value, loc: { line: t.line, col: t.col } };
};

Parser.prototype.parseFn = function() {
  var t = this.eat(TT.Fn);
  var name = this.eat(TT.Ident).value;
  this.eat(TT.LParen);
  var params = [];
  while (!this.at(TT.RParen)) {
    params.push(this.eat(TT.Ident).value);
    if (this.at(TT.Comma)) this.advance();
  }
  this.eat(TT.RParen);
  var body;
  if (this.at(TT.FatArrow)) {
    this.advance();
    body = this.parseExpr();
  } else {
    body = this.parseBlock();
  }
  this.skipNewlines();
  return { kind: "FnStmt", name: name, params: params, body: body, loc: { line: t.line, col: t.col } };
};

Parser.prototype.parseFor = function() {
  var t = this.eat(TT.For);
  var varName = this.eat(TT.Ident).value;
  this.eat(TT.In);
  var iterable = this.parseExpr();
  var body = this.parseBlock();
  this.skipNewlines();
  return { kind: "ForStmt", variable: varName, iterable: iterable, body: body, loc: { line: t.line, col: t.col } };
};

Parser.prototype.parseDo = function() {
  var t = this.eat(TT.Do);
  var body = this.parseBlock();
  var isWhile = false;
  if (this.at(TT.While)) { this.advance(); isWhile = true; }
  else { this.eat(TT.Until); }
  var condition = this.parseExpr();
  this.skipNewlines();
  return { kind: "DoStmt", body: body, condition: condition, isWhile: isWhile, loc: { line: t.line, col: t.col } };
};

Parser.prototype.parseRet = function() {
  var t = this.eat(TT.Ret);
  var val = this.parseExpr();
  return { kind: "RetStmt", value: val, loc: { line: t.line, col: t.col } };
};

Parser.prototype.parseBlock = function() {
  this.skipNewlines();
  this.eat(TT.LBrace);
  this.skipNewlines();
  var stmts = [];
  while (!this.at(TT.RBrace) && !this.at(TT.EOF)) {
    stmts.push(this.parseStmt());
    this.skipNewlines();
  }
  this.eat(TT.RBrace);
  return { kind: "BlockExpr", stmts: stmts, loc: stmts.length > 0 ? stmts[0].loc : { line: 0, col: 0 } };
};

// Expression parsing with precedence climbing
Parser.prototype.parseExpr = function() { return this.parsePipeline(); };

Parser.prototype.parsePipeline = function() {
  var left = this.parseOr();
  while (this.at(TT.Pipe)) {
    this.advance();
    var right = this.parseOr();
    left = { kind: "PipelineExpr", left: left, right: right, loc: left.loc };
  }
  return left;
};

Parser.prototype.parseOr = function() {
  var left = this.parseAnd();
  while (this.at(TT.Or)) { this.advance(); var r = this.parseAnd(); left = { kind: "BinaryExpr", op: "or", left: left, right: r, loc: left.loc }; }
  return left;
};

Parser.prototype.parseAnd = function() {
  var left = this.parseEquality();
  while (this.at(TT.And)) { this.advance(); var r = this.parseEquality(); left = { kind: "BinaryExpr", op: "and", left: left, right: r, loc: left.loc }; }
  return left;
};

Parser.prototype.parseEquality = function() {
  var left = this.parseComparison();
  while (this.at(TT.Eq) || this.at(TT.Neq)) {
    var op = this.advance().value;
    var r = this.parseComparison();
    left = { kind: "BinaryExpr", op: op, left: left, right: r, loc: left.loc };
  }
  return left;
};

Parser.prototype.parseComparison = function() {
  var left = this.parseConcat();
  while (this.at(TT.Lt) || this.at(TT.Gt) || this.at(TT.Lte) || this.at(TT.Gte)) {
    var op = this.advance().value;
    var r = this.parseConcat();
    left = { kind: "BinaryExpr", op: op, left: left, right: r, loc: left.loc };
  }
  return left;
};

Parser.prototype.parseConcat = function() {
  var left = this.parseRange();
  while (this.at(TT.Concat)) { this.advance(); var r = this.parseRange(); left = { kind: "BinaryExpr", op: "++", left: left, right: r, loc: left.loc }; }
  return left;
};

Parser.prototype.parseRange = function() {
  var left = this.parseAddSub();
  if (this.at(TT.Range)) {
    this.advance();
    var right = this.parseAddSub();
    return { kind: "RangeExpr", start: left, end: right, loc: left.loc };
  }
  return left;
};

Parser.prototype.parseAddSub = function() {
  var left = this.parseMulDiv();
  while (this.at(TT.Plus) || this.at(TT.Minus)) {
    var op = this.advance().value;
    var r = this.parseMulDiv();
    left = { kind: "BinaryExpr", op: op, left: left, right: r, loc: left.loc };
  }
  return left;
};

Parser.prototype.parseMulDiv = function() {
  var left = this.parsePower();
  while (this.at(TT.Star) || this.at(TT.Slash) || this.at(TT.Percent)) {
    var op = this.advance().value;
    var r = this.parsePower();
    left = { kind: "BinaryExpr", op: op, left: left, right: r, loc: left.loc };
  }
  return left;
};

Parser.prototype.parsePower = function() {
  var left = this.parseUnary();
  if (this.at(TT.Power)) {
    this.advance();
    var r = this.parsePower(); // right-associative
    return { kind: "BinaryExpr", op: "**", left: left, right: r, loc: left.loc };
  }
  return left;
};

Parser.prototype.parseUnary = function() {
  if (this.at(TT.Minus)) {
    var t = this.advance();
    var operand = this.parseUnary();
    return { kind: "UnaryExpr", op: "-", operand: operand, loc: { line: t.line, col: t.col } };
  }
  if (this.at(TT.Not)) {
    var t2 = this.advance();
    var operand2 = this.parseUnary();
    return { kind: "UnaryExpr", op: "not", operand: operand2, loc: { line: t2.line, col: t2.col } };
  }
  return this.parsePostfix();
};

Parser.prototype.parsePostfix = function() {
  var expr = this.parsePrimary();
  while (true) {
    if (this.at(TT.LParen)) {
      this.advance();
      var args = [];
      while (!this.at(TT.RParen) && !this.at(TT.EOF)) {
        args.push(this.parseExpr());
        if (this.at(TT.Comma)) this.advance();
      }
      this.eat(TT.RParen);
      expr = { kind: "CallExpr", callee: expr, args: args, loc: expr.loc };
    } else if (this.at(TT.LBracket)) {
      this.advance();
      var index = this.parseExpr();
      this.eat(TT.RBracket);
      expr = { kind: "IndexExpr", object: expr, index: index, loc: expr.loc };
    } else if (this.at(TT.Dot)) {
      this.advance();
      var prop = this.eat(TT.Ident).value;
      expr = { kind: "MemberExpr", object: expr, property: prop, loc: expr.loc };
    } else {
      break;
    }
  }
  return expr;
};

Parser.prototype.parsePrimary = function() {
  var t = this.peek();

  // Numbers
  if (t.type === TT.Int) { this.advance(); return { kind: "IntLiteral", value: parseInt(t.value, 10), loc: { line: t.line, col: t.col } }; }
  if (t.type === TT.Float) { this.advance(); return { kind: "FloatLiteral", value: parseFloat(t.value), loc: { line: t.line, col: t.col } }; }

  // Booleans
  if (t.type === TT.True) { this.advance(); return { kind: "BoolLiteral", value: true, loc: { line: t.line, col: t.col } }; }
  if (t.type === TT.False) { this.advance(); return { kind: "BoolLiteral", value: false, loc: { line: t.line, col: t.col } }; }

  // Nil
  if (t.type === TT.NilKw) { this.advance(); return { kind: "NilLiteral", loc: { line: t.line, col: t.col } }; }

  // String
  if (t.type === TT.String) { this.advance(); return { kind: "StringLiteral", value: t.value, loc: { line: t.line, col: t.col } }; }

  // String interpolation
  if (t.type === TT.StringInterpStart) {
    return this.parseStringInterp();
  }

  // Identifier (could be lambda: x => ...)
  if (t.type === TT.Ident) {
    // Check for lambda: ident =>
    if (this.tokens[this.pos + 1] && this.tokens[this.pos + 1].type === TT.FatArrow) {
      this.advance(); // ident
      this.advance(); // =>
      var body = this.parseExpr();
      return { kind: "LambdaExpr", params: [t.value], body: body, loc: { line: t.line, col: t.col } };
    }
    this.advance();
    // Check for assignment: ident = expr (but not ==)
    if (this.at(TT.Assign) && !(this.tokens[this.pos + 1] && this.tokens[this.pos].value === "=" && this.tokens[this.pos + 1] && false)) {
      // Actually, Assign is just "=", and "==" is Eq. So if we see Assign, it's reassignment.
      this.advance();
      var val = this.parseExpr();
      return { kind: "AssignExpr", name: t.value, value: val, loc: { line: t.line, col: t.col } };
    }
    return { kind: "Identifier", name: t.value, loc: { line: t.line, col: t.col } };
  }

  // Parenthesized expr or multi-param lambda
  if (t.type === TT.LParen) {
    this.advance();
    // Check for () => or (a, b) =>
    if (this.at(TT.RParen)) {
      this.advance();
      if (this.at(TT.FatArrow)) {
        this.advance();
        var lb = this.parseExpr();
        return { kind: "LambdaExpr", params: [], body: lb, loc: { line: t.line, col: t.col } };
      }
      // Empty tuple? Return nil
      return { kind: "NilLiteral", loc: { line: t.line, col: t.col } };
    }

    // Try to detect lambda: (ident, ident, ...) =>
    var saved = this.pos;
    var maybeLambda = true;
    var lparams = [];
    if (this.at(TT.Ident)) {
      lparams.push(this.peek().value);
      this.advance();
      while (this.at(TT.Comma)) {
        this.advance();
        if (this.at(TT.Ident)) { lparams.push(this.peek().value); this.advance(); }
        else { maybeLambda = false; break; }
      }
      if (maybeLambda && this.at(TT.RParen)) {
        this.advance();
        if (this.at(TT.FatArrow)) {
          this.advance();
          var lb2 = this.parseExpr();
          return { kind: "LambdaExpr", params: lparams, body: lb2, loc: { line: t.line, col: t.col } };
        }
      }
    }
    // Not a lambda, restore and parse as grouped expr
    this.pos = saved;
    var expr = this.parseExpr();
    this.eat(TT.RParen);
    return expr;
  }

  // List literal or comprehension
  if (t.type === TT.LBracket) {
    return this.parseList();
  }

  // Map literal or block
  if (t.type === TT.LBrace) {
    return this.parseMapOrBlock();
  }

  // If expression
  if (t.type === TT.If) { return this.parseIf(); }

  // Match expression
  if (t.type === TT.Match) { return this.parseMatch(); }

  // Tool call @METHOD "url"
  if (t.type === TT.At) {
    this.advance();
    var method = this.eat(TT.Ident).value;
    var arg = this.parseExpr();
    return { kind: "ToolCallExpr", method: method, arg: arg, loc: { line: t.line, col: t.col } };
  }

  throw new ArcError("Unexpected token: " + t.type + " ('" + t.value + "')", t.line);
};

Parser.prototype.parseStringInterp = function() {
  var t = this.eat(TT.StringInterpStart);
  var parts = [];
  while (!this.at(TT.StringInterpEnd) && !this.at(TT.EOF)) {
    if (this.at(TT.StringInterpPart)) {
      parts.push(this.advance().value);
    } else {
      parts.push(this.parseExpr());
    }
  }
  this.eat(TT.StringInterpEnd);
  return { kind: "StringInterp", parts: parts, loc: { line: t.line, col: t.col } };
};

Parser.prototype.parseList = function() {
  var t = this.eat(TT.LBracket);
  this.skipNewlines();
  if (this.at(TT.RBracket)) {
    this.advance();
    return { kind: "ListLiteral", elements: [], loc: { line: t.line, col: t.col } };
  }
  var first = this.parseExpr();
  this.skipNewlines();

  // Comprehension: [expr for x in iter]
  if (this.at(TT.For)) {
    this.advance();
    var varName = this.eat(TT.Ident).value;
    this.eat(TT.In);
    var iterable = this.parseExpr();
    var filter = null;
    if (this.at(TT.If)) { this.advance(); filter = this.parseExpr(); }
    this.skipNewlines();
    this.eat(TT.RBracket);
    return { kind: "ListComprehension", expr: first, variable: varName, iterable: iterable, filter: filter, loc: { line: t.line, col: t.col } };
  }

  var elements = [first];
  while (this.at(TT.Comma)) {
    this.advance();
    this.skipNewlines();
    if (this.at(TT.RBracket)) break;
    elements.push(this.parseExpr());
    this.skipNewlines();
  }
  this.skipNewlines();
  this.eat(TT.RBracket);
  return { kind: "ListLiteral", elements: elements, loc: { line: t.line, col: t.col } };
};

Parser.prototype.parseMapOrBlock = function() {
  var t = this.peek();
  // Peek ahead to distinguish map from block
  var saved = this.pos;
  this.advance(); // skip {
  this.skipNewlines();

  // Empty {} = empty map
  if (this.at(TT.RBrace)) {
    this.advance();
    return { kind: "MapLiteral", entries: [], loc: { line: t.line, col: t.col } };
  }

  // If we see Ident/Int/String followed by :, it's a map
  if ((this.at(TT.Ident) || this.at(TT.Int) || this.at(TT.String)) && this.tokens[this.pos + 1] && this.tokens[this.pos + 1].type === TT.Colon) {
    // Map literal
    this.pos = saved;
    return this.parseMap();
  }

  // Otherwise it's a block — restore and parse as block
  this.pos = saved;
  return this.parseBlock();
};

Parser.prototype.parseMap = function() {
  var t = this.eat(TT.LBrace);
  this.skipNewlines();
  var entries = [];
  while (!this.at(TT.RBrace) && !this.at(TT.EOF)) {
    var key;
    if (this.at(TT.Ident)) key = this.advance().value;
    else if (this.at(TT.Int)) key = this.advance().value;
    else if (this.at(TT.String)) key = this.advance().value;
    else throw new ArcError("Expected map key", this.peek().line);
    this.eat(TT.Colon);
    this.skipNewlines();
    var val = this.parseExpr();
    entries.push({ key: key, value: val });
    this.skipNewlines();
    if (this.at(TT.Comma)) { this.advance(); this.skipNewlines(); }
  }
  this.eat(TT.RBrace);
  return { kind: "MapLiteral", entries: entries, loc: { line: t.line, col: t.col } };
};

Parser.prototype.parseIf = function() {
  var t = this.eat(TT.If);
  var cond = this.parseExpr();
  var then = this.parseBlock();
  var else_ = null;
  this.skipNewlines();
  if (this.at(TT.El)) {
    this.advance();
    this.skipNewlines();
    if (this.at(TT.If)) {
      else_ = this.parseIf();
    } else {
      else_ = this.parseBlock();
    }
  }
  return { kind: "IfExpr", condition: cond, then: then, else_: else_, loc: { line: t.line, col: t.col } };
};

Parser.prototype.parseMatch = function() {
  var t = this.eat(TT.Match);
  var subject = this.parseExpr();
  this.skipNewlines();
  this.eat(TT.LBrace);
  this.skipNewlines();
  var arms = [];
  while (!this.at(TT.RBrace) && !this.at(TT.EOF)) {
    var pattern = this.parsePattern();
    var guard = null;
    if (this.at(TT.If)) { this.advance(); guard = this.parseExpr(); }
    this.eat(TT.FatArrow);
    this.skipNewlines();
    var body = this.parseExpr();
    arms.push({ pattern: pattern, guard: guard, body: body });
    this.skipNewlines();
    if (this.at(TT.Comma)) { this.advance(); this.skipNewlines(); }
  }
  this.eat(TT.RBrace);
  return { kind: "MatchExpr", subject: subject, arms: arms, loc: { line: t.line, col: t.col } };
};

Parser.prototype.parsePattern = function() {
  var t = this.peek();
  if (t.type === TT.Ident && t.value === "_") {
    this.advance();
    return { kind: "WildcardPattern", loc: { line: t.line, col: t.col } };
  }
  if (t.type === TT.Int || t.type === TT.Float) {
    this.advance();
    return { kind: "LiteralPattern", value: parseFloat(t.value), loc: { line: t.line, col: t.col } };
  }
  if (t.type === TT.Minus && this.tokens[this.pos + 1] && (this.tokens[this.pos + 1].type === TT.Int || this.tokens[this.pos + 1].type === TT.Float)) {
    this.advance();
    var num = this.advance();
    return { kind: "LiteralPattern", value: -parseFloat(num.value), loc: { line: t.line, col: t.col } };
  }
  if (t.type === TT.String) {
    this.advance();
    return { kind: "LiteralPattern", value: t.value, loc: { line: t.line, col: t.col } };
  }
  if (t.type === TT.True) { this.advance(); return { kind: "LiteralPattern", value: true, loc: { line: t.line, col: t.col } }; }
  if (t.type === TT.False) { this.advance(); return { kind: "LiteralPattern", value: false, loc: { line: t.line, col: t.col } }; }
  if (t.type === TT.NilKw) { this.advance(); return { kind: "LiteralPattern", value: null, loc: { line: t.line, col: t.col } }; }
  if (t.type === TT.LBracket) {
    this.advance();
    var elements = [];
    while (!this.at(TT.RBracket) && !this.at(TT.EOF)) {
      elements.push(this.parsePattern());
      if (this.at(TT.Comma)) this.advance();
    }
    this.eat(TT.RBracket);
    return { kind: "ArrayPattern", elements: elements, loc: { line: t.line, col: t.col } };
  }
  if (t.type === TT.Ident) {
    this.advance();
    return { kind: "BindingPattern", name: t.value, loc: { line: t.line, col: t.col } };
  }
  throw new ArcError("Unexpected pattern: " + t.type, t.line);
};

// ============================================================
// INTERPRETER
// ============================================================

function ArcError(message, line) {
  this.message = message;
  this.line = line;
}
ArcError.prototype = Object.create(Error.prototype);
ArcError.prototype.constructor = ArcError;

function ReturnSignal(value) { this.value = value; }

function Environment(parent) {
  this.vars = Object.create(null);
  this.mutables = Object.create(null);
  this.parent = parent || null;
}
Environment.prototype.get = function(name) {
  if (name in this.vars) return this.vars[name];
  if (this.parent) return this.parent.get(name);
  return undefined;
};
Environment.prototype.set = function(name, value, mutable) {
  this.vars[name] = value;
  if (mutable) this.mutables[name] = true;
};
Environment.prototype.assign = function(name, value) {
  if (name in this.vars) {
    if (this.mutables[name]) { this.vars[name] = value; return; }
    throw new ArcError("Cannot reassign immutable variable '" + name + "'", 0);
  }
  if (this.parent) return this.parent.assign(name, value);
  throw new ArcError("Undefined variable '" + name + "'", 0);
};

function Interpreter(outputFn) {
  this.output = outputFn || function(s) { console.log(s); };
  this.globals = new Environment();
  this.stepCount = 0;
  this.maxSteps = 500000;
  this.setupPrelude();
}

Interpreter.prototype.step = function() {
  if (++this.stepCount > this.maxSteps) throw new ArcError("Execution limit exceeded (infinite loop?)", 0);
};

Interpreter.prototype.setupPrelude = function() {
  var self = this;
  var g = this.globals;

  g.set("print", function() {
    var args = Array.prototype.slice.call(arguments);
    self.output(args.map(function(a) { return self.display(a); }).join(" "));
    return null;
  });

  g.set("len", function(a) {
    if (Array.isArray(a)) return a.length;
    if (typeof a === "string") return a.length;
    if (a && typeof a === "object") return Object.keys(a).length;
    return 0;
  });

  g.set("map", function(fn) {
    return function(arr) {
      if (!Array.isArray(arr)) throw new ArcError("map expects a list", 0);
      return arr.map(function(x, i) { return fn(x, i); });
    };
  });

  g.set("filter", function(fn) {
    return function(arr) {
      if (!Array.isArray(arr)) throw new ArcError("filter expects a list", 0);
      return arr.filter(function(x) { return self.truthy(fn(x)); });
    };
  });

  g.set("reduce", function(fn, init) {
    return function(arr) {
      return arr.reduce(function(acc, x) { return fn(acc, x); }, init);
    };
  });

  g.set("sort", function(arrOrFn) {
    if (typeof arrOrFn === "function") {
      return function(arr) { return arr.slice().sort(function(a, b) { return arrOrFn(a, b); }); };
    }
    if (Array.isArray(arrOrFn)) return arrOrFn.slice().sort(function(a, b) { return a < b ? -1 : a > b ? 1 : 0; });
    throw new ArcError("sort expects a list", 0);
  });

  g.set("sum", function(arr) {
    if (!Array.isArray(arr)) throw new ArcError("sum expects a list", 0);
    return arr.reduce(function(a, b) { return a + b; }, 0);
  });

  g.set("join", function(sep) {
    if (Array.isArray(sep)) return sep.join(",");
    return function(arr) { return arr.join(sep); };
  });

  g.set("split", function(sep) {
    return function(s) { return s.split(sep); };
  });

  g.set("trim", function(s) { return typeof s === "string" ? s.trim() : s; });
  g.set("upper", function(s) { return typeof s === "string" ? s.toUpperCase() : s; });
  g.set("lower", function(s) { return typeof s === "string" ? s.toLowerCase() : s; });

  g.set("each", function(fn) {
    return function(arr) {
      arr.forEach(function(x) { fn(x); });
      return null;
    };
  });

  g.set("take", function(n) {
    return function(arr) { return arr.slice(0, n); };
  });

  g.set("drop", function(n) {
    return function(arr) { return arr.slice(n); };
  });

  g.set("reverse", function(arr) { return arr.slice().reverse(); });
  g.set("contains", function(val) { return function(arr) { return arr.indexOf(val) >= 0; }; });
  g.set("keys", function(obj) { return Object.keys(obj); });
  g.set("values", function(obj) { return Object.keys(obj).map(function(k) { return obj[k]; }); });
  g.set("type", function(v) {
    if (v === null || v === undefined) return "nil";
    if (Array.isArray(v)) return "list";
    return typeof v;
  });
  g.set("str", function(v) { return self.display(v); });
  g.set("int", function(v) { return parseInt(v, 10) || 0; });
  g.set("float", function(v) { return parseFloat(v) || 0; });
  g.set("abs", function(v) { return Math.abs(v); });
  g.set("min", function() { return Math.min.apply(null, arguments); });
  g.set("max", function() { return Math.max.apply(null, arguments); });
  g.set("floor", function(v) { return Math.floor(v); });
  g.set("ceil", function(v) { return Math.ceil(v); });
  g.set("round", function(v) { return Math.round(v); });
  g.set("range", function(a, b) {
    var arr = [];
    for (var i = a; i < b; i++) arr.push(i);
    return arr;
  });
};

Interpreter.prototype.display = function(val) {
  if (val === null || val === undefined) return "nil";
  if (typeof val === "function") return "<function>";
  if (Array.isArray(val)) {
    return "[" + val.map(function(v) { return this.display(v); }.bind(this)).join(", ") + "]";
  }
  if (typeof val === "object") {
    var entries = [];
    for (var k in val) {
      if (val.hasOwnProperty(k)) entries.push(k + ": " + this.display(val[k]));
    }
    return "{" + entries.join(", ") + "}";
  }
  return String(val);
};

Interpreter.prototype.truthy = function(val) {
  return val !== null && val !== undefined && val !== false && val !== 0;
};

Interpreter.prototype.run = function(source) {
  this.stepCount = 0;
  var tokens = lex(source);
  var parser = new Parser(tokens);
  var program = parser.parse();
  return this.execProgram(program, this.globals);
};

Interpreter.prototype.execProgram = function(program, env) {
  var result = null;
  for (var i = 0; i < program.stmts.length; i++) {
    result = this.execStmt(program.stmts[i], env);
  }
  return result;
};

Interpreter.prototype.execStmt = function(stmt, env) {
  this.step();
  switch (stmt.kind) {
    case "LetStmt": return this.execLet(stmt, env);
    case "FnStmt": return this.execFnDef(stmt, env);
    case "ForStmt": return this.execFor(stmt, env);
    case "DoStmt": return this.execDo(stmt, env);
    case "ExprStmt": return this.evalExpr(stmt.expr, env);
    case "RetStmt": throw new ReturnSignal(this.evalExpr(stmt.value, env));
    default: throw new ArcError("Unknown statement: " + stmt.kind, (stmt.loc && stmt.loc.line) || 0);
  }
};

Interpreter.prototype.execLet = function(stmt, env) {
  var val = this.evalExpr(stmt.value, env);
  if (typeof stmt.name === "string") {
    env.set(stmt.name, val, stmt.mutable);
  } else if (stmt.name.kind === "DestructureTarget") {
    if (stmt.name.type === "array" && Array.isArray(val)) {
      for (var i = 0; i < stmt.name.names.length; i++) {
        env.set(stmt.name.names[i], val[i] !== undefined ? val[i] : null, stmt.mutable);
      }
    } else if (stmt.name.type === "object" && val && typeof val === "object") {
      for (var j = 0; j < stmt.name.names.length; j++) {
        env.set(stmt.name.names[j], val[stmt.name.names[j]] !== undefined ? val[stmt.name.names[j]] : null, stmt.mutable);
      }
    }
  }
  return val;
};

Interpreter.prototype.execFnDef = function(stmt, env) {
  var self = this;
  var fn = function() {
    var args = arguments;
    var fnEnv = new Environment(env);
    for (var i = 0; i < stmt.params.length; i++) {
      fnEnv.set(stmt.params[i], args[i] !== undefined ? args[i] : null);
    }
    try {
      return self.evalExpr(stmt.body, fnEnv);
    } catch (e) {
      if (e instanceof ReturnSignal) return e.value;
      throw e;
    }
  };
  fn._name = stmt.name;
  fn._params = stmt.params;
  env.set(stmt.name, fn);
  return fn;
};

Interpreter.prototype.execFor = function(stmt, env) {
  var iter = this.evalExpr(stmt.iterable, env);
  if (!Array.isArray(iter)) throw new ArcError("for..in requires an iterable list", stmt.loc.line);
  var result = null;
  for (var i = 0; i < iter.length; i++) {
    this.step();
    var loopEnv = new Environment(env);
    loopEnv.set(stmt.variable, iter[i]);
    try {
      result = this.evalExpr(stmt.body, loopEnv);
    } catch (e) {
      if (e instanceof ReturnSignal) throw e;
      throw e;
    }
  }
  return result;
};

Interpreter.prototype.execDo = function(stmt, env) {
  var result = null;
  var maxIter = 100000;
  do {
    this.step();
    if (--maxIter <= 0) throw new ArcError("do loop iteration limit", stmt.loc.line);
    var loopEnv = new Environment(env);
    result = this.evalExpr(stmt.body, loopEnv);
    var cond = this.evalExpr(stmt.condition, env);
    if (stmt.isWhile && !this.truthy(cond)) break;
    if (!stmt.isWhile && this.truthy(cond)) break;
  } while (true);
  return result;
};

Interpreter.prototype.evalExpr = function(expr, env) {
  this.step();
  switch (expr.kind) {
    case "IntLiteral": return expr.value;
    case "FloatLiteral": return expr.value;
    case "BoolLiteral": return expr.value;
    case "NilLiteral": return null;
    case "StringLiteral": return expr.value;
    case "StringInterp": return this.evalStringInterp(expr, env);
    case "Identifier": return this.evalIdent(expr, env);
    case "BinaryExpr": return this.evalBinary(expr, env);
    case "UnaryExpr": return this.evalUnary(expr, env);
    case "CallExpr": return this.evalCall(expr, env);
    case "MemberExpr": return this.evalMember(expr, env);
    case "IndexExpr": return this.evalIndex(expr, env);
    case "PipelineExpr": return this.evalPipeline(expr, env);
    case "IfExpr": return this.evalIf(expr, env);
    case "MatchExpr": return this.evalMatch(expr, env);
    case "LambdaExpr": return this.evalLambda(expr, env);
    case "ListLiteral": return this.evalList(expr, env);
    case "MapLiteral": return this.evalMap(expr, env);
    case "ListComprehension": return this.evalComprehension(expr, env);
    case "ToolCallExpr": return this.evalToolCall(expr, env);
    case "RangeExpr": return this.evalRange(expr, env);
    case "BlockExpr": return this.evalBlock(expr, env);
    case "AssignExpr":
      var v = this.evalExpr(expr.value, env);
      env.assign(expr.name, v);
      return v;
    default: throw new ArcError("Unknown expression: " + expr.kind, (expr.loc && expr.loc.line) || 0);
  }
};

Interpreter.prototype.evalStringInterp = function(expr, env) {
  var result = "";
  for (var i = 0; i < expr.parts.length; i++) {
    if (typeof expr.parts[i] === "string") {
      result += expr.parts[i];
    } else {
      result += this.display(this.evalExpr(expr.parts[i], env));
    }
  }
  return result;
};

Interpreter.prototype.evalIdent = function(expr, env) {
  var val = env.get(expr.name);
  if (val === undefined) throw new ArcError("Undefined variable '" + expr.name + "'", expr.loc.line);
  return val;
};

Interpreter.prototype.evalBinary = function(expr, env) {
  var l = this.evalExpr(expr.left, env);
  // Short-circuit for and/or
  if (expr.op === "and") return this.truthy(l) ? this.evalExpr(expr.right, env) : l;
  if (expr.op === "or") return this.truthy(l) ? l : this.evalExpr(expr.right, env);

  var r = this.evalExpr(expr.right, env);
  switch (expr.op) {
    case "+": return l + r;
    case "-": return l - r;
    case "*": return l * r;
    case "/":
      if (r === 0) throw new ArcError("Division by zero", expr.loc.line);
      return l / r;
    case "%": return l % r;
    case "**": return Math.pow(l, r);
    case "==": return this.deepEqual(l, r);
    case "!=": return !this.deepEqual(l, r);
    case "<": return l < r;
    case ">": return l > r;
    case "<=": return l <= r;
    case ">=": return l >= r;
    case "++":
      if (Array.isArray(l) && Array.isArray(r)) return l.concat(r);
      return String(l) + String(r);
    default: throw new ArcError("Unknown operator: " + expr.op, expr.loc.line);
  }
};

Interpreter.prototype.deepEqual = function(a, b) {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (!this.deepEqual(a[i], b[i])) return false;
    return true;
  }
  return false;
};

Interpreter.prototype.evalUnary = function(expr, env) {
  var val = this.evalExpr(expr.operand, env);
  if (expr.op === "-") return -val;
  if (expr.op === "not") return !this.truthy(val);
  throw new ArcError("Unknown unary: " + expr.op, expr.loc.line);
};

Interpreter.prototype.evalCall = function(expr, env) {
  var callee = this.evalExpr(expr.callee, env);
  if (typeof callee !== "function") {
    throw new ArcError("'" + (expr.callee.name || "value") + "' is not a function", expr.loc.line);
  }
  var args = [];
  for (var i = 0; i < expr.args.length; i++) {
    args.push(this.evalExpr(expr.args[i], env));
  }
  return callee.apply(null, args);
};

Interpreter.prototype.evalMember = function(expr, env) {
  var obj = this.evalExpr(expr.object, env);
  if (obj === null || obj === undefined) throw new ArcError("Cannot access property '" + expr.property + "' of nil", expr.loc.line);
  return obj[expr.property] !== undefined ? obj[expr.property] : null;
};

Interpreter.prototype.evalIndex = function(expr, env) {
  var obj = this.evalExpr(expr.object, env);
  var idx = this.evalExpr(expr.index, env);
  if (obj === null || obj === undefined) return null;

  // Handle assignment: obj[key] = val (treated as side effect)
  if (Array.isArray(obj)) return obj[idx] !== undefined ? obj[idx] : null;
  if (typeof obj === "object") return obj[idx] !== undefined ? obj[idx] : null;
  return null;
};

Interpreter.prototype.evalPipeline = function(expr, env) {
  var val = this.evalExpr(expr.left, env);
  var right = this.evalExpr(expr.right, env);
  if (typeof right !== "function") throw new ArcError("Pipeline target is not a function", expr.loc.line);
  return right(val);
};

Interpreter.prototype.evalIf = function(expr, env) {
  var cond = this.evalExpr(expr.condition, env);
  if (this.truthy(cond)) return this.evalExpr(expr.then, env);
  if (expr.else_) return this.evalExpr(expr.else_, env);
  return null;
};

Interpreter.prototype.evalMatch = function(expr, env) {
  var subject = this.evalExpr(expr.subject, env);
  for (var i = 0; i < expr.arms.length; i++) {
    var arm = expr.arms[i];
    var bindings = {};
    if (this.matchPattern(arm.pattern, subject, bindings)) {
      var armEnv = new Environment(env);
      for (var k in bindings) armEnv.set(k, bindings[k]);
      if (arm.guard) {
        if (!this.truthy(this.evalExpr(arm.guard, armEnv))) continue;
      }
      return this.evalExpr(arm.body, armEnv);
    }
  }
  throw new ArcError("No matching pattern", expr.loc.line);
};

Interpreter.prototype.matchPattern = function(pat, val, bindings) {
  switch (pat.kind) {
    case "WildcardPattern": return true;
    case "LiteralPattern": return this.deepEqual(pat.value, val);
    case "BindingPattern":
      bindings[pat.name] = val;
      return true;
    case "ArrayPattern":
      if (!Array.isArray(val)) return false;
      if (pat.elements.length !== val.length) return false;
      for (var i = 0; i < pat.elements.length; i++) {
        if (!this.matchPattern(pat.elements[i], val[i], bindings)) return false;
      }
      return true;
    default: return false;
  }
};

Interpreter.prototype.evalLambda = function(expr, env) {
  var self = this;
  var fn = function() {
    var args = arguments;
    var lEnv = new Environment(env);
    for (var i = 0; i < expr.params.length; i++) {
      lEnv.set(expr.params[i], args[i] !== undefined ? args[i] : null);
    }
    return self.evalExpr(expr.body, lEnv);
  };
  fn._params = expr.params;
  return fn;
};

Interpreter.prototype.evalList = function(expr, env) {
  var arr = [];
  for (var i = 0; i < expr.elements.length; i++) arr.push(this.evalExpr(expr.elements[i], env));
  return arr;
};

Interpreter.prototype.evalMap = function(expr, env) {
  var obj = {};
  for (var i = 0; i < expr.entries.length; i++) {
    var key = expr.entries[i].key;
    obj[key] = this.evalExpr(expr.entries[i].value, env);
  }
  return obj;
};

Interpreter.prototype.evalComprehension = function(expr, env) {
  var iter = this.evalExpr(expr.iterable, env);
  if (!Array.isArray(iter)) throw new ArcError("Comprehension requires a list", expr.loc.line);
  var result = [];
  for (var i = 0; i < iter.length; i++) {
    this.step();
    var cEnv = new Environment(env);
    cEnv.set(expr.variable, iter[i]);
    if (expr.filter) {
      if (!this.truthy(this.evalExpr(expr.filter, cEnv))) continue;
    }
    result.push(this.evalExpr(expr.expr, cEnv));
  }
  return result;
};

Interpreter.prototype.evalToolCall = function(expr, env) {
  var method = expr.method;
  var arg = this.evalExpr(expr.arg, env);
  // Mock tool calls
  var mocks = {
    "GET api/weather/nyc": { temp: "72°F", condition: "Sunny", city: "NYC" },
    "GET api/users": [{ name: "Alice", role: "admin" }, { name: "Bob", role: "user" }],
  };
  var key = method + " " + arg;
  if (mocks[key]) return mocks[key];
  return { tool: method, input: arg, result: "mock response for @" + method + ' "' + arg + '"' };
};

Interpreter.prototype.evalRange = function(expr, env) {
  var start = this.evalExpr(expr.start, env);
  var end = this.evalExpr(expr.end, env);
  var arr = [];
  for (var i = start; i < end; i++) { arr.push(i); this.step(); }
  return arr;
};

Interpreter.prototype.evalBlock = function(expr, env) {
  var blockEnv = new Environment(env);
  var result = null;
  for (var i = 0; i < expr.stmts.length; i++) {
    result = this.execStmt(expr.stmts[i], blockEnv);
  }
  return result;
};

// ============================================================
// PUBLIC API
// ============================================================

global.ArcInterpreter = Interpreter;
global.ArcError = ArcError;

})(typeof window !== "undefined" ? window : global);
