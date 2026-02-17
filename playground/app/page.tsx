"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import examples from "@/data/examples.json";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const DEFAULT_CODE = `// Welcome to the Arc Playground! ⚡
// Press Ctrl+Enter (or click Run) to execute

print("Hello, Arc! ⚡")

let nums = [1, 2, 3, 4, 5]
let doubled = nums |> map(fn(x) { x * 2 })
print("Doubled: {doubled}")

fn greet(name) {
  "Hello, {name}!"
}

print(greet("world"))
`;

function decodeHash(): string | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.slice(1);
  if (!hash) return null;
  try {
    return atob(hash);
  } catch {
    return null;
  }
}

export default function Playground() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [execTime, setExecTime] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const editorRef = useRef<unknown>(null);

  useEffect(() => {
    const shared = decodeHash();
    if (shared) setCode(shared);
  }, []);

  const runCode = useCallback(async () => {
    setRunning(true);
    setOutput("");
    setError(null);
    setExecTime(null);
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      setOutput(data.output || "");
      setError(data.error || null);
      setExecTime(data.executionTime);
    } catch (e) {
      setError("Failed to connect to server");
    } finally {
      setRunning(false);
    }
  }, [code]);

  const share = useCallback(() => {
    const encoded = btoa(code);
    const url = `${window.location.origin}${window.location.pathname}#${encoded}`;
    navigator.clipboard.writeText(url);
    alert("Link copied to clipboard!");
  }, [code]);

  const loadExample = useCallback((idx: number) => {
    if (idx >= 0 && idx < examples.length) {
      setCode(examples[idx].code);
      setOutput("");
      setError(null);
      setExecTime(null);
    }
  }, []);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        runCode();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [runCode]);

  function handleEditorMount(editor: unknown) {
    editorRef.current = editor;
  }

  function handleEditorBeforeMount(monaco: typeof import("monaco-editor")) {
    monaco.languages.register({ id: "arc" });
    monaco.languages.setMonarchTokensProvider("arc", {
      keywords: [
        "let", "mut", "fn", "if", "else", "match", "for", "in",
        "while", "return", "use", "try", "catch", "true", "false", "nil", "pipe",
      ],
      operators: [
        "=", ">", "<", "==", "!=", ">=", "<=", "=>", "+", "-", "*", "/",
        "%", "**", "++", "|>", "..", "?.", "and", "or", "not",
      ],
      tokenizer: {
        root: [
          [/\/\/.*$/, "comment"],
          [/#.*$/, "comment"],
          [/"/, "string", "@string"],
          [/\d+\.?\d*/, "number"],
          [/[a-zA-Z_]\w*/, {
            cases: {
              "@keywords": "keyword",
              "@default": "identifier",
            },
          }],
          [/[{}()\[\]]/, "delimiter.bracket"],
          [/\|>/, "operator"],
          [/=>/, "operator"],
          [/[=!<>]=?/, "operator"],
          [/[+\-*/%]/, "operator"],
        ],
        string: [
          [/\{/, "delimiter.bracket", "@stringExpr"],
          [/[^"\\{]+/, "string"],
          [/\\./, "string.escape"],
          [/"/, "string", "@pop"],
        ],
        stringExpr: [
          [/\}/, "delimiter.bracket", "@pop"],
          [/[^}]+/, "identifier"],
        ],
      },
    } as import("monaco-editor").languages.IMonarchLanguage);

    monaco.editor.defineTheme("arc-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "c792ea", fontStyle: "bold" },
        { token: "string", foreground: "c3e88d" },
        { token: "number", foreground: "f78c6c" },
        { token: "comment", foreground: "546e7a", fontStyle: "italic" },
        { token: "operator", foreground: "89ddff" },
        { token: "identifier", foreground: "eeffff" },
        { token: "delimiter.bracket", foreground: "ffd700" },
        { token: "string.escape", foreground: "89ddff" },
      ],
      colors: {
        "editor.background": "#0a0a0f",
        "editor.foreground": "#eeffff",
        "editor.lineHighlightBackground": "#1a1a2e",
        "editor.selectionBackground": "#3a3a5e",
        "editorCursor.foreground": "#7c5cfc",
        "editorLineNumber.foreground": "#4a4a6a",
        "editorLineNumber.activeForeground": "#7c5cfc",
      },
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Header */}
      <header style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 16px",
        background: "var(--bg-secondary)",
        borderBottom: "1px solid var(--border)",
        flexWrap: "wrap",
        gap: "8px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <h1 style={{ fontSize: "18px", fontWeight: 700 }}>
            ⚡ Arc <span style={{ color: "var(--text-dim)", fontWeight: 400, fontSize: "14px" }}>Playground</span>
          </h1>
          <select
            onChange={(e) => loadExample(parseInt(e.target.value))}
            defaultValue=""
            style={{
              background: "var(--bg-tertiary)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              padding: "6px 10px",
              fontSize: "13px",
            }}
          >
            <option value="" disabled>Examples...</option>
            {examples.map((ex, i) => (
              <option key={i} value={i}>{ex.category} → {ex.name}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={share} style={{
            background: "var(--bg-tertiary)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            padding: "6px 14px",
            fontSize: "13px",
          }}>
            Share
          </button>
          <button onClick={runCode} disabled={running} style={{
            background: running ? "var(--bg-tertiary)" : "var(--accent)",
            color: "#fff",
            borderRadius: "6px",
            padding: "6px 18px",
            fontSize: "13px",
            fontWeight: 600,
            opacity: running ? 0.7 : 1,
          }}>
            {running ? "Running..." : "▶ Run"}
            <span style={{ fontSize: "11px", marginLeft: "6px", opacity: 0.7 }}>Ctrl+Enter</span>
          </button>
        </div>
      </header>

      {/* Main panels */}
      <div style={{
        flex: 1,
        display: "flex",
        overflow: "hidden",
      }} className="panels">
        {/* Editor */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <MonacoEditor
            height="100%"
            language="arc"
            theme="arc-dark"
            value={code}
            onChange={(v) => setCode(v || "")}
            onMount={handleEditorMount}
            beforeMount={handleEditorBeforeMount}
            options={{
              fontSize: 14,
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              padding: { top: 12 },
              lineNumbers: "on",
              renderLineHighlight: "line",
              tabSize: 2,
              automaticLayout: true,
            }}
          />
        </div>

        {/* Divider */}
        <div style={{ width: "1px", background: "var(--border)" }} />

        {/* Output */}
        <div style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-secondary)",
        }}>
          <div style={{
            padding: "8px 16px",
            borderBottom: "1px solid var(--border)",
            fontSize: "13px",
            color: "var(--text-dim)",
            display: "flex",
            justifyContent: "space-between",
          }}>
            <span>Output</span>
            {execTime !== null && (
              <span style={{ color: "var(--success)", fontSize: "12px" }}>
                {execTime}ms
              </span>
            )}
          </div>
          <div style={{
            flex: 1,
            padding: "12px 16px",
            overflow: "auto",
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontSize: "13px",
            whiteSpace: "pre-wrap",
            lineHeight: 1.6,
          }}>
            {running && (
              <span style={{ color: "var(--text-dim)" }}>Running...</span>
            )}
            {!running && output && (
              <span>{output}</span>
            )}
            {!running && error && (
              <span style={{ color: "var(--error)" }}>{error}</span>
            )}
            {!running && !output && !error && execTime === null && (
              <span style={{ color: "var(--text-dim)" }}>
                Press ▶ Run or Ctrl+Enter to execute your code
              </span>
            )}
            {!running && !output && !error && execTime !== null && (
              <span style={{ color: "var(--text-dim)" }}>(no output)</span>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media (max-width: 768px) {
          .panels {
            flex-direction: column !important;
          }
        }
      `}</style>
    </div>
  );
}
