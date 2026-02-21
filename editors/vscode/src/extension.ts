import * as path from "path";
import { workspace, ExtensionContext, window } from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";

let client: LanguageClient;

function findLspServer(context: ExtensionContext): string | null {
  // 1. Check if arc-lang is bundled with the extension
  const bundled = context.asAbsolutePath(path.join("server", "lsp.js"));
  try {
    require.resolve(bundled);
    return bundled;
  } catch {}

  // 2. Try to find arc-lang npm package (global or local install)
  try {
    const arcLangPath = require.resolve("arc-lang/dist/lsp.js");
    return arcLangPath;
  } catch {}

  // 3. Check workspace node_modules
  const workspaceFolders = workspace.workspaceFolders;
  if (workspaceFolders) {
    for (const folder of workspaceFolders) {
      const localPath = path.join(
        folder.uri.fsPath,
        "node_modules",
        "arc-lang",
        "dist",
        "lsp.js"
      );
      try {
        require.resolve(localPath);
        return localPath;
      } catch {}
    }
  }

  // 4. Fallback to relative path (development mode)
  const devPath = context.asAbsolutePath(
    path.join("..", "..", "compiler", "dist", "lsp.js")
  );
  try {
    require.resolve(devPath);
    return devPath;
  } catch {}

  return null;
}

export function activate(context: ExtensionContext) {
  const serverModule = findLspServer(context);

  if (!serverModule) {
    window.showWarningMessage(
      "Arc Language Server not found. Install arc-lang globally (npm install -g arc-lang) for full IntelliSense support. Syntax highlighting will still work."
    );
    return;
  }

  const serverOptions: ServerOptions = {
    run: {
      module: serverModule,
      transport: TransportKind.ipc,
    },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
    },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "file", language: "arc" }],
    synchronize: {
      fileEvents: workspace.createFileSystemWatcher("**/*.arc"),
    },
  };

  client = new LanguageClient(
    "arcLanguageServer",
    "Arc Language Server",
    serverOptions,
    clientOptions
  );

  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) return undefined;
  return client.stop();
}
