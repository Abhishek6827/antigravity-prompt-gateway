import * as vscode from "vscode";
import * as http from "http";

let server: http.Server | null = null;

export function activate(context: vscode.ExtensionContext) {
  startServer(context);

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

/* ── Server lifecycle ── */

function getPort(): number {
  return vscode.workspace
    .getConfiguration("promptGatewayBridge")
    .get<number>("port", 9877);
}

function startServer(context: vscode.ExtensionContext) {
  if (server) {
    vscode.window.showInformationMessage("Prompt Gateway bridge is already running.");
    return;
  }

  const port = getPort();

  server = http.createServer(async (req, res) => {
    /* CORS — allow requests from the Prompt Gateway web app */
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

    /* Health check */
    if (req.method === "GET" && (req.url === "/" || req.url === "/health")) {
      respond(res, 200, { status: "running", port });
      return;
    }

    respond(res, 404, { error: "Not found" });
  });

  server.listen(port, "127.0.0.1", () => {
    vscode.window.showInformationMessage(
      `Prompt Gateway bridge listening on http://127.0.0.1:${port}`,
    );
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      vscode.window.showErrorMessage(
        `Port ${port} is in use. Change promptGatewayBridge.port in settings.`,
      );
    } else {
      vscode.window.showErrorMessage(`Bridge server error: ${err.message}`);
    }
    server = null;
  });

  context.subscriptions.push({ dispose: stopServer });
}

function stopServer() {
  if (server) {
    server.close();
    server = null;
    vscode.window.showInformationMessage("Prompt Gateway bridge stopped.");
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
