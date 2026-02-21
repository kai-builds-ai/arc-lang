"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const path = __importStar(require("path"));
const vscode_1 = require("vscode");
const node_1 = require("vscode-languageclient/node");
let client;
function findLspServer(context) {
    // 1. Check if arc-lang is bundled with the extension
    const bundled = context.asAbsolutePath(path.join("server", "lsp.js"));
    try {
        require.resolve(bundled);
        return bundled;
    }
    catch { }
    // 2. Try to find arc-lang npm package (global or local install)
    try {
        const arcLangPath = require.resolve("arc-lang/dist/lsp.js");
        return arcLangPath;
    }
    catch { }
    // 3. Check workspace node_modules
    const workspaceFolders = vscode_1.workspace.workspaceFolders;
    if (workspaceFolders) {
        for (const folder of workspaceFolders) {
            const localPath = path.join(folder.uri.fsPath, "node_modules", "arc-lang", "dist", "lsp.js");
            try {
                require.resolve(localPath);
                return localPath;
            }
            catch { }
        }
    }
    // 4. Fallback to relative path (development mode)
    const devPath = context.asAbsolutePath(path.join("..", "..", "compiler", "dist", "lsp.js"));
    try {
        require.resolve(devPath);
        return devPath;
    }
    catch { }
    return null;
}
function activate(context) {
    const serverModule = findLspServer(context);
    if (!serverModule) {
        vscode_1.window.showWarningMessage("Arc Language Server not found. Install arc-lang globally (npm install -g arc-lang) for full IntelliSense support. Syntax highlighting will still work.");
        return;
    }
    const serverOptions = {
        run: {
            module: serverModule,
            transport: node_1.TransportKind.ipc,
        },
        debug: {
            module: serverModule,
            transport: node_1.TransportKind.ipc,
        },
    };
    const clientOptions = {
        documentSelector: [{ scheme: "file", language: "arc" }],
        synchronize: {
            fileEvents: vscode_1.workspace.createFileSystemWatcher("**/*.arc"),
        },
    };
    client = new node_1.LanguageClient("arcLanguageServer", "Arc Language Server", serverOptions, clientOptions);
    client.start();
}
function deactivate() {
    if (!client)
        return undefined;
    return client.stop();
}
//# sourceMappingURL=extension.js.map