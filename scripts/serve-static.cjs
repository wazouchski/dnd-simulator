const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { URL } = require("node:url");

const root = path.join(__dirname, "..", "out");
const portArgIndex = process.argv.findIndex((arg) => arg === "--port");
const port =
  portArgIndex >= 0 && process.argv[portArgIndex + 1]
    ? Number(process.argv[portArgIndex + 1])
    : Number(process.env.PORT || 3001);

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
}

function sendNoStore(response) {
  response.setHeader("Cache-Control", "no-store, max-age=0");
  response.setHeader("Pragma", "no-cache");
}

function resolveStaticFile(requestUrl) {
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

  const shouldFallbackToIndex =
    !decodedPath.startsWith("/_next/") &&
    !decodedPath.includes(".") &&
    !decodedPath.startsWith("/api/");

  if (shouldFallbackToIndex) {
    candidates.push(path.join(root, "index.html"));
  }

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

function handleImportEvents(request, response) {
  sendCors(response);
  response.writeHead(200, {
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "Content-Type": "text/event-stream; charset=utf-8",
    "X-Accel-Buffering": "no"
  });
  response.write(": static preview connected\n\n");
  request.on("close", () => response.end());
}

function handleRequest(request, response) {
  const url = new URL(request.url || "/", "http://127.0.0.1");

  if (request.method === "OPTIONS") {
    sendCors(response);
    response.writeHead(204);
    response.end();
    return;
  }

  if (url.pathname === "/api/import/events" && request.method === "GET") {
    sendNoStore(response);
    handleImportEvents(request, response);
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    sendCors(response);
    sendNoStore(response);
    response.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ ok: false }));
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Method not allowed");
    return;
  }

  const filePath = resolveStaticFile(request.url || "/");
  if (!filePath) {
    sendNoStore(response);
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  sendNoStore(response);
  response.writeHead(200, { "Content-Type": contentTypeFor(filePath) });
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  fs.createReadStream(filePath).pipe(response);
}

if (!fs.existsSync(root)) {
  console.error("Static output folder not found. Run npm.cmd run build first.");
  process.exit(1);
}

http.createServer(handleRequest).listen(port, "127.0.0.1", () => {
  console.log(`Static preview listening at http://127.0.0.1:${port}/`);
});
