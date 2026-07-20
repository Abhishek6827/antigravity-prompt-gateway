import * as vscode from "vscode";
import * as http from "http";
import * as fs from "fs";
import * as path from "path";

let server: http.Server | null = null;

export function activate(context: vscode.ExtensionContext) {
  /* 1. Start background bridge HTTP server */
  startServer(context);

  /* 2. Register Sidebar Webview View Provider */
  const provider = new PromptGatewayChatProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "prompt-gateway-bridge.chatView",
      provider,
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("promptGatewayBridge.startServer", () =>
      startServer(context),
    ),
    vscode.commands.registerCommand("promptGatewayBridge.stopServer", stopServer),
  );
}

export function deactivate() {
  stopServer();
}

/* ── Webview View Provider class ── */

class PromptGatewayChatProvider implements vscode.WebviewViewProvider {
  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ) {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    /* Listen to messages from webview */
    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.command) {
        case "refine": {
          try {
            const refined = await this._callRefinementApi(data.messages);
            webviewView.webview.postMessage({
              command: "refineResponse",
              data: refined,
            });
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Refinement failed.";
            webviewView.webview.postMessage({
              command: "refineError",
              error: msg,
            });
          }
          break;
        }
        case "sendToChat": {
          await vscode.commands.executeCommand("workbench.action.chat.open", {
            query: data.prompt,
            isPartialQuery: true,
          });
          vscode.window.showInformationMessage(
            "✨ Prompt sent to Chat — review and press Enter.",
          );
          break;
        }
      }
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const htmlPath = path.join(this._extensionUri.fsPath, "webview.html");
    let html = fs.readFileSync(htmlPath, "utf8");

    /* Map local resource paths if needed (currently completely CDN-based, but good practice) */
    return html;
  }

  private async _callRefinementApi(messages: any[]): Promise<any> {
    const targetUrl = "https://antigravity-prompt-gateway-ebon.vercel.app/api/refine";
    
    try {
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages }),
      });

      if (!response.ok) {
        const errJson = (await response.json().catch(() => ({}))) as any;
        throw new Error(errJson.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? `API Request failed: ${error.message}`
          : "Could not reach the Vercel refinement API.",
      );
    }
  }
}

/* ── Fallback Server lifecycle ── */

function getPort(): number {
  return vscode.workspace
    .getConfiguration("promptGatewayBridge")
    .get<number>("port", 9877);
}

function startServer(context: vscode.ExtensionContext) {
  if (server) {
    return;
  }

  const port = getPort();

  server = http.createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === "POST" && req.url === "/send-prompt") {
      try {
        const body = await readBody(req);
        const { prompt } = JSON.parse(body);

        if (typeof prompt !== "string" || !prompt.trim()) {
          respond(res, 400, { error: "Missing or empty 'prompt' field." });
          return;
        }

        await vscode.commands.executeCommand("workbench.action.chat.open", {
          query: prompt.trim(),
          isPartialQuery: true,
        });

        vscode.window.showInformationMessage(
          "✨ Prompt received from Gateway — review and press Enter to send.",
        );

        respond(res, 200, { ok: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        respond(res, 500, { error: message });
      }
      return;
    }

    if (req.method === "GET" && (req.url === "/" || req.url === "/health")) {
      respond(res, 200, { status: "running", port });
      return;
    }

    respond(res, 404, { error: "Not found" });
  });

  server.listen(port, "127.0.0.1");

  server.on("error", (err: NodeJS.ErrnoException) => {
    server = null;
  });

  context.subscriptions.push({ dispose: stopServer });
}

function stopServer() {
  if (server) {
    server.close();
    server = null;
  }
}

/* ── Helpers ── */

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}

function respond(res: http.ServerResponse, status: number, data: object) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}
