const { app, BrowserWindow, shell } = require("electron");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { URL } = require("node:url");

const preferredPort = Number(process.env.DND_SIM_PORT || 3217);
const maxImportBytes = 25 * 1024 * 1024;

let mainWindow;
let server;
let latestImport;
let importCounter = 0;
const eventClients = new Set();

function appIconPath() {
  const candidates = app.isPackaged
    ? [
        path.join(process.resourcesPath, "icon.ico"),
        path.join(process.resourcesPath, "build", "icon.ico")
      ]
    : [
        path.join(__dirname, "..", "build", "icon.ico"),
        path.join(__dirname, "..", "public", "artifact-d20.png")
      ];

  return candidates.find((candidate) => fs.existsSync(candidate));
}

function staticRoot() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "out");
  }

  return path.join(__dirname, "..", "out");
}

function contentTypeFor(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return (
    {
      ".css": "text/css; charset=utf-8",
      ".html": "text/html; charset=utf-8",
      ".ico": "image/x-icon",
      ".js": "text/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".map": "application/json; charset=utf-8",
      ".png": "image/png",
      ".svg": "image/svg+xml",
      ".txt": "text/plain; charset=utf-8",
      ".webp": "image/webp"
    }[extension] || "application/octet-stream"
  );
}

function sendCors(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Access-Control-Allow-Private-Network", "true");
}

function sendJson(response, statusCode, body) {
  sendCors(response);
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > maxImportBytes) {
        reject(new Error("Import payload is too large."));
        request.destroy();
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function normalizeImportPayload(payload) {
  if (payload && payload.type === "character-imported" && payload.character) {
    return payload;
  }

  if (payload && payload.character) {
    return {
      type: "character-imported",
      character: payload.character
    };
  }

  return undefined;
}

function broadcastImport(message) {
  const event = `event: character-imported\ndata: ${JSON.stringify(message)}\n\n`;
  for (const client of eventClients) {
    client.write(event);
  }
}

function focusWindow() {
  if (!mainWindow) {
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.focus();
}

async function handleImportPost(request, response) {
  try {
    const body = await readRequestBody(request);
    const parsed = JSON.parse(body);
    const normalized = normalizeImportPayload(parsed);

    if (!normalized) {
      sendJson(response, 400, { ok: false, error: "Unsupported import payload." });
      return;
    }

    latestImport = {
      ...normalized,
      id: `desktop-import-${Date.now()}-${importCounter++}`
    };
    broadcastImport(latestImport);
    focusWindow();
    sendJson(response, 200, { ok: true });
  } catch (error) {
    sendJson(response, 400, { ok: false, error: error instanceof Error ? error.message : "Import failed." });
  }
}

function handleImportEvents(request, response) {
  sendCors(response);
  response.writeHead(200, {
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "Content-Type": "text/event-stream; charset=utf-8",
    "X-Accel-Buffering": "no"
  });
  response.write(": connected\n\n");

  if (latestImport) {
    response.write(`event: character-imported\ndata: ${JSON.stringify(latestImport)}\n\n`);
  }

  eventClients.add(response);
  request.on("close", () => {
    eventClients.delete(response);
  });
}

function resolveStaticFile(requestUrl) {
  const root = staticRoot();
  const url = new URL(requestUrl, "http://127.0.0.1");
  const decodedPath = decodeURIComponent(url.pathname);
  const relativePath = decodedPath.replace(/^\/+/, "");
  const directPath = path.join(root, relativePath);
  const candidates = [];

  if (decodedPath.endsWith("/")) {
    candidates.push(path.join(root, relativePath, "index.html"));
  } else {
    candidates.push(directPath, path.join(directPath, "index.html"), `${directPath}.html`);
  }

  candidates.push(path.join(root, "index.html"));

  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (!resolved.startsWith(path.resolve(root))) {
      continue;
    }
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
      return resolved;
    }
  }

  return undefined;
}

function handleStaticRequest(request, response) {
  const filePath = resolveStaticFile(request.url || "/");
  if (!filePath) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, { "Content-Type": contentTypeFor(filePath) });
  fs.createReadStream(filePath).pipe(response);
}

function createServer() {
  return http.createServer((request, response) => {
    const url = new URL(request.url || "/", "http://127.0.0.1");

    if (request.method === "OPTIONS") {
      sendCors(response);
      response.writeHead(204);
      response.end();
      return;
    }

    if (url.pathname === "/api/import" && request.method === "POST") {
      void handleImportPost(request, response);
      return;
    }

    if (url.pathname === "/api/import/events" && request.method === "GET") {
      handleImportEvents(request, response);
      return;
    }

    if (url.pathname === "/api/import/latest" && request.method === "GET") {
      sendJson(response, 200, latestImport ? { ok: true, import: latestImport } : { ok: true });
      return;
    }

    if (request.method === "GET" || request.method === "HEAD") {
      handleStaticRequest(request, response);
      return;
    }

    response.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Method not allowed");
  });
}

function listen(port) {
  return new Promise((resolve, reject) => {
    const candidate = createServer();
    candidate.once("error", reject);
    candidate.listen(port, "127.0.0.1", () => {
      candidate.off("error", reject);
      server = candidate;
      resolve(port);
    });
  });
}

async function startLocalServer() {
  for (let offset = 0; offset < 20; offset += 1) {
    const port = preferredPort + offset;
    try {
      return await listen(port);
    } catch (error) {
      if (!error || error.code !== "EADDRINUSE") {
        throw error;
      }
    }
  }

  throw new Error(`No available local port from ${preferredPort} to ${preferredPort + 19}.`);
}

async function createWindow() {
  const port = await startLocalServer();
  const appUrl = `http://127.0.0.1:${port}/`;

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 960,
    minHeight: 680,
    show: false,
    title: "D&D Character Balance Tester",
    icon: appIconPath(),
    backgroundColor: "#10161d",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(appUrl)) {
      return { action: "allow" };
    }

    void shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith(appUrl)) {
      return;
    }

    event.preventDefault();
    void shell.openExternal(url);
  });

  await mainWindow.loadURL(appUrl);
}

app.whenReady().then(() => {
  app.setAppUserModelId("com.local.dnd-character-balance-tester");
  void createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  for (const client of eventClients) {
    client.end();
  }
  eventClients.clear();
  server?.close();
});
