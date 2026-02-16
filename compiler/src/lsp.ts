// Arc Language Server Protocol Implementation

import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  InitializeResult,
  TextDocumentSyncKind,
  CompletionItem,
  CompletionItemKind,
  Hover,
  MarkupKind,
  Definition,
  SymbolInformation,
  SymbolKind,
  DocumentSymbol,
  DiagnosticSeverity,
  Diagnostic as LspDiagnostic,
  Position,
  Range,
} from "vscode-languageserver/node.js";

import { TextDocument } from "vscode-languageserver-textdocument";

import { lex } from "./lexer.js";
import { parse, ParseError } from "./parser.js";
import { analyze, Diagnostic as ArcDiagnostic } from "./semantic.js";
import { typecheck } from "./typechecker.js";
import * as AST from "./ast.js";

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

// Cache parsed results per document
const documentCache = new Map<string, { program: AST.Program; version: number }>();

connection.onInitialize((_params: InitializeParams): InitializeResult => {
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Full,
      completionProvider: { triggerCharacters: [".", "@"] },
      hoverProvider: true,
      definitionProvider: true,
      documentSymbolProvider: true,
    },
  };
});

// --- Diagnostics ---

function validateDocument(textDocument: TextDocument): void {
  const text = textDocument.getText();
  const diagnostics: LspDiagnostic[] = [];

  try {
    const tokens = lex(text);
    const program = parse(tokens);

    // Cache the program
    documentCache.set(textDocument.uri, { program, version: textDocument.version });

    // Semantic analysis
    const semanticDiags = analyze(program);
    for (const d of semanticDiags) {
      diagnostics.push({
        severity: d.level === "error" ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning,
        range: locToRange(d.loc),
        message: d.message,
        source: "arc",
      });
    }

    // Type checking
    const typeDiags = typecheck(program);
    for (const d of typeDiags) {
      diagnostics.push({
        severity: d.level === "error" ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning,
        range: d.loc ? locToRange(d.loc) : { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
        message: d.message,
        source: "arc-typecheck",
      });
    }
  } catch (e) {
    if (e instanceof ParseError) {
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: locToRange(e.loc),
        message: e.message,
        source: "arc-parser",
      });
    } else if (e instanceof Error) {
      // Lexer or other errors - show at start
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
        message: e.message,
        source: "arc",
      });
    }
  }

  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

function locToRange(loc: AST.Loc): Range {
  const line = Math.max(0, loc.line - 1);
  const col = Math.max(0, loc.col - 1);
  return {
    start: { line, character: col },
    end: { line, character: col + 10 },
  };
}

documents.onDidChangeContent((change) => {
  validateDocument(change.document);
});

// --- Completion ---

const ARC_KEYWORDS = [
  "fn", "let", "mut", "type", "use", "pub", "match", "if", "el",
  "for", "in", "do", "ret", "async", "await", "nil", "true", "false",
  "and", "or", "not", "while", "until", "where", "matching",
];

const STDLIB_FUNCTIONS = [
  "print", "println", "len", "push", "pop", "map", "filter", "reduce",
  "range", "keys", "values", "entries", "str", "int", "float",
  "sort", "reverse", "join", "split", "trim", "contains",
  "starts_with", "ends_with", "replace", "to_upper", "to_lower",
  "slice", "flat", "flat_map", "zip", "enumerate", "sum", "min", "max",
  "abs", "head", "tail", "take", "drop", "find", "any", "all", "count",
  "unique", "group_by", "sort_by", "chunk", "assert", "assert_eq",
  "Some", "None", "Ok", "Err", "read_file", "write_file",
];

connection.onCompletion((_params) => {
  const doc = documents.get(_params.textDocument.uri);
  const items: CompletionItem[] = [];

  // Keywords
  for (const kw of ARC_KEYWORDS) {
    items.push({ label: kw, kind: CompletionItemKind.Keyword });
  }

  // Stdlib
  for (const fn of STDLIB_FUNCTIONS) {
    items.push({ label: fn, kind: CompletionItemKind.Function });
  }

  // In-scope symbols from cached program
  const cached = documentCache.get(_params.textDocument.uri);
  if (cached) {
    for (const stmt of cached.program.stmts) {
      if (stmt.kind === "FnStmt") {
        items.push({ label: stmt.name, kind: CompletionItemKind.Function, detail: `fn ${stmt.name}(${stmt.params.join(", ")})` });
      } else if (stmt.kind === "LetStmt" && typeof stmt.name === "string") {
        items.push({ label: stmt.name, kind: CompletionItemKind.Variable });
      } else if (stmt.kind === "TypeStmt") {
        items.push({ label: stmt.name, kind: CompletionItemKind.Class });
      }
    }
  }

  return items;
});

// --- Hover ---

connection.onHover((params) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;

  const cached = documentCache.get(params.textDocument.uri);
  if (!cached) return null;

  const word = getWordAtPosition(doc, params.position);
  if (!word) return null;

  // Search for definition in program
  for (const stmt of cached.program.stmts) {
    if (stmt.kind === "FnStmt" && stmt.name === word) {
      const sig = `fn ${stmt.name}(${stmt.params.join(", ")})`;
      return {
        contents: { kind: MarkupKind.Markdown, value: `\`\`\`arc\n${sig}\n\`\`\`` },
      };
    }
    if (stmt.kind === "LetStmt" && typeof stmt.name === "string" && stmt.name === word) {
      const mut = stmt.mutable ? "mut " : "";
      return {
        contents: { kind: MarkupKind.Markdown, value: `\`\`\`arc\nlet ${mut}${stmt.name}\n\`\`\`` },
      };
    }
    if (stmt.kind === "TypeStmt" && stmt.name === word) {
      return {
        contents: { kind: MarkupKind.Markdown, value: `\`\`\`arc\ntype ${stmt.name}\n\`\`\`` },
      };
    }
  }

  // Check keywords
  if (ARC_KEYWORDS.includes(word)) {
    return { contents: { kind: MarkupKind.Markdown, value: `**keyword** \`${word}\`` } };
  }

  // Check stdlib
  if (STDLIB_FUNCTIONS.includes(word)) {
    return { contents: { kind: MarkupKind.Markdown, value: `**stdlib** \`${word}\`` } };
  }

  return null;
});

// --- Go to Definition ---

connection.onDefinition((params) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;

  const cached = documentCache.get(params.textDocument.uri);
  if (!cached) return null;

  const word = getWordAtPosition(doc, params.position);
  if (!word) return null;

  for (const stmt of cached.program.stmts) {
    if (stmt.kind === "FnStmt" && stmt.name === word) {
      return {
        uri: params.textDocument.uri,
        range: locToRange(stmt.loc),
      };
    }
    if (stmt.kind === "LetStmt" && typeof stmt.name === "string" && stmt.name === word) {
      return {
        uri: params.textDocument.uri,
        range: locToRange(stmt.loc),
      };
    }
    if (stmt.kind === "TypeStmt" && stmt.name === word) {
      return {
        uri: params.textDocument.uri,
        range: locToRange(stmt.loc),
      };
    }
  }

  return null;
});

// --- Document Symbols ---

connection.onDocumentSymbol((params) => {
  const cached = documentCache.get(params.textDocument.uri);
  if (!cached) return [];

  const symbols: DocumentSymbol[] = [];

  for (const stmt of cached.program.stmts) {
    if (stmt.kind === "FnStmt") {
      symbols.push({
        name: stmt.name,
        kind: SymbolKind.Function,
        range: locToRange(stmt.loc),
        selectionRange: locToRange(stmt.loc),
      });
    } else if (stmt.kind === "LetStmt" && typeof stmt.name === "string") {
      symbols.push({
        name: stmt.name,
        kind: SymbolKind.Variable,
        range: locToRange(stmt.loc),
        selectionRange: locToRange(stmt.loc),
      });
    } else if (stmt.kind === "TypeStmt") {
      symbols.push({
        name: stmt.name,
        kind: SymbolKind.Class,
        range: locToRange(stmt.loc),
        selectionRange: locToRange(stmt.loc),
      });
    }
  }

  return symbols;
});

// --- Helpers ---

function getWordAtPosition(doc: TextDocument, pos: Position): string | null {
  const line = doc.getText({
    start: { line: pos.line, character: 0 },
    end: { line: pos.line + 1, character: 0 },
  });
  const before = line.slice(0, pos.character);
  const after = line.slice(pos.character);
  const matchBefore = before.match(/[a-zA-Z_][a-zA-Z0-9_]*$/);
  const matchAfter = after.match(/^[a-zA-Z0-9_]*/);
  if (!matchBefore) return null;
  return matchBefore[0] + (matchAfter?.[0] ?? "");
}

// Start
documents.listen(connection);
connection.listen();
