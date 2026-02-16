import * as path from "path";
import { workspace, ExtensionContext } from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  // The LSP server is in the compiler directory
  const serverModule = context.asAbsolutePath(
    path.join("..", "..", "compiler", "src", "lsp.ts")
  );

  const serverOptions: ServerOptions = {
    run: {
      module: serverModule,
      transport: TransportKind.ipc,
      runtime: "tsx",
    },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      runtime: "tsx",
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
