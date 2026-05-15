const { app, BrowserWindow } = require("electron");
const crypto = require("node:crypto");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const { URL } = require("node:url");

const repoRoot = path.join(__dirname, "..");
const staticRoot = path.join(repoRoot, "out");
const assetDir = path.join(repoRoot, "quickstart-assets");
const htmlPath = path.join(assetDir, "quickstart.html");
const pdfPath = path.join(repoRoot, "quickstart.pdf");
const releasePdfPath = path.join(repoRoot, "release-current", "quickstart.pdf");
const installerPath = path.join(repoRoot, "release-current", "DND-Character-Balance-Tester-Friend-Test-Setup.exe");

const screenshotFiles = {
  home: path.join(assetDir, "01-app-home.png"),
  import: path.join(assetDir, "02-import-box.png"),
  play: path.join(assetDir, "03-play-screen.png")
};

app.on("window-all-closed", (event) => {
  event.preventDefault();
});

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

function resolveStaticFile(root, requestUrl) {
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

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      const filePath = resolveStaticFile(staticRoot, request.url || "/");
      if (!filePath) {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Not found");
        return;
      }

      response.writeHead(200, {
        "Cache-Control": "no-store, max-age=0",
        "Content-Type": contentTypeFor(filePath)
      });
      fs.createReadStream(filePath).pipe(response);
    });

    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      const address = server.address();
      resolve({ server, url: `http://127.0.0.1:${address.port}/` });
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(win, expression, timeoutMs = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const found = await win.webContents.executeJavaScript(`Boolean(${expression})`);
    if (found) {
      return;
    }
    await sleep(150);
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

async function clickText(win, text) {
  const didClick = await win.webContents.executeJavaScript(`
    (() => {
      const text = ${JSON.stringify(text)};
      const elements = Array.from(document.querySelectorAll("button, a, summary, label"));
      const target = elements.find((element) => {
        const disabled = "disabled" in element && element.disabled;
        return !disabled && element.textContent && element.textContent.trim().includes(text);
      });
      if (!target) return false;
      target.scrollIntoView({ block: "center", inline: "center" });
      target.click();
      return true;
    })()
  `);

  if (!didClick) {
    throw new Error(`Could not click element containing: ${text}`);
  }
}

async function saveScreenshot(win, filePath) {
  await sleep(350);
  const image = await win.webContents.capturePage();
  await fsp.writeFile(filePath, image.toPNG());
}

async function captureAppScreenshots(appUrl) {
  const win = new BrowserWindow({
    width: 1360,
    height: 900,
    show: false,
    backgroundColor: "#100805",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  await win.loadURL(`${appUrl}?quickstart-pdf=${Date.now()}`);
  await waitFor(win, "document.body.innerText.includes('D&D Beyond import')");
  await win.webContents.executeJavaScript("window.scrollTo(0, 0)");
  await saveScreenshot(win, screenshotFiles.home);

  await win.webContents.executeJavaScript(`
    (() => {
      const heading = Array.from(document.querySelectorAll("h3")).find((node) => node.textContent.includes("D&D Beyond import"));
      const box = heading ? heading.closest("div") : null;
      if (box) {
        box.style.outline = "4px solid #41d88a";
        box.style.boxShadow = "0 0 0 6px rgba(65, 216, 138, 0.25), 0 0 28px rgba(65, 216, 138, 0.5)";
        box.scrollIntoView({ block: "center", inline: "center" });
      }
    })()
  `);
  await saveScreenshot(win, screenshotFiles.import);

  await win.webContents.executeJavaScript("window.scrollTo(0, 0)");
  await clickText(win, "Load sample");
  await clickText(win, "Begin simulation");
  await waitFor(win, "document.body.innerText.includes('Step into the fight') || document.body.innerText.includes('Start scene')");
  await win.webContents.executeJavaScript("window.scrollTo(0, 0)");
  await saveScreenshot(win, screenshotFiles.play);

  win.destroy();
}

function imageDataUrl(filePath) {
  const data = fs.readFileSync(filePath).toString("base64");
  return `data:image/png;base64,${data}`;
}

function formatBytes(bytes) {
  const mib = bytes / 1024 / 1024;
  return `${bytes.toLocaleString("en-US")} bytes, about ${Math.round(mib)} MB`;
}

function sha256For(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex").toUpperCase();
}

async function buildGuideHtml() {
  const installer = fs.statSync(installerPath);
  const home = imageDataUrl(screenshotFiles.home);
  const importShot = imageDataUrl(screenshotFiles.import);
  const play = imageDataUrl(screenshotFiles.play);

  return buildInfographicGuideHtml({ installer, home, importShot, play });

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Friend Test Quickstart</title>
  <style>
    @page { size: Letter; margin: 0.55in; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #211711;
      background: #f9f3e7;
      font-family: "Segoe UI", Arial, sans-serif;
      font-size: 11.5pt;
      line-height: 1.38;
    }
    h1, h2, h3 { margin: 0; line-height: 1.1; }
    h1 { font-size: 28pt; color: #5b1d18; }
    h2 {
      margin-top: 22px;
      padding: 8px 10px;
      border-left: 6px solid #7a241f;
      color: #fff6df;
      background: linear-gradient(90deg, #5b1d18, #24120e);
      font-size: 16pt;
    }
    p { margin: 8px 0; }
    ol, ul { margin: 8px 0 8px 24px; padding: 0; }
    li { margin: 4px 0; }
    code {
      padding: 1px 4px;
      border-radius: 3px;
      color: #103b2a;
      background: #e8f5e9;
      font-family: Consolas, "Courier New", monospace;
      font-size: 10pt;
    }
    .cover {
      min-height: 8.7in;
      padding: 36px;
      border: 2px solid #7a241f;
      background:
        linear-gradient(135deg, rgba(122, 36, 31, 0.12), rgba(28, 72, 57, 0.08)),
        #fffaf0;
      page-break-after: always;
    }
    .kicker {
      margin-bottom: 10px;
      color: #1c4839;
      font-size: 10pt;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .lead {
      max-width: 6.4in;
      margin: 14px 0 20px;
      color: #4a3428;
      font-size: 14pt;
    }
    .sendFile {
      margin: 20px 0;
      padding: 14px;
      border: 2px solid #1c4839;
      border-radius: 8px;
      background: #eef8ef;
    }
    .bigFile {
      display: block;
      margin-top: 6px;
      color: #143d2d;
      font-family: Consolas, "Courier New", monospace;
      font-size: 13pt;
      font-weight: 800;
      word-break: break-word;
    }
    .quickBox, .warningBox, .feedbackBox {
      margin: 12px 0;
      padding: 12px 14px;
      border: 1px solid #c69b52;
      border-radius: 8px;
      background: #fff6df;
    }
    .warningBox {
      border-color: #a53a31;
      background: #fff0ea;
    }
    .feedbackBox {
      border-color: #1c4839;
      background: #eef8ef;
    }
    .shot {
      width: 100%;
      margin: 10px 0 4px;
      border: 2px solid #24120e;
      border-radius: 8px;
      box-shadow: 0 8px 18px rgba(36, 18, 14, 0.18);
    }
    .caption {
      margin: 0 0 12px;
      color: #5f4939;
      font-size: 9.5pt;
      font-style: italic;
    }
    .pageBreak { page-break-before: always; }
    .twoCol {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .small {
      color: #5f4939;
      font-size: 9.5pt;
    }
  </style>
</head>
<body>
  <section class="cover">
    <div class="kicker">D&D Character Balance Tester</div>
    <h1>Friend Test Quickstart</h1>
    <p class="lead">Use this guide to open the test build, try the sample character, and import a Public D&D Beyond character without needing to know any developer tools.</p>
    <div class="sendFile">
      <strong>Send this one file:</strong>
      <span class="bigFile">release-current/DND-Character-Balance-Tester-Friend-Test-Setup.exe</span>
    </div>
    <div class="quickBox">
      <h3>Fastest Path</h3>
      <ol>
        <li>Double-click the setup file.</li>
        <li>If Windows warns you, click <strong>More info</strong>, then <strong>Run anyway</strong>.</li>
        <li>In the app, click <strong>Load sample</strong>.</li>
        <li>Click <strong>Begin simulation</strong>.</li>
      </ol>
    </div>
    <p class="small"><strong>Build:</strong> May 10, 2026 9:28 AM<br />
    <strong>Size:</strong> ${formatBytes(installer.size)}<br />
    <strong>Signing:</strong> self-signed test certificate</p>
  </section>

  <h2>1. Open The App</h2>
  <ol>
    <li>Download <strong>DND-Character-Balance-Tester-Friend-Test-Setup.exe</strong>.</li>
    <li>Double-click it.</li>
    <li>If Windows shows a warning, click <strong>More info</strong>, then <strong>Run anyway</strong>.</li>
    <li>Let the installer finish. The app should open in its own window.</li>
  </ol>
  <div class="warningBox">
    <strong>Why the warning appears:</strong> this is a personal test build with a self-signed certificate, not a public paid code-signing certificate yet.
  </div>

  <h2>2. First Test: Use The Sample</h2>
  <ol>
    <li>Click <strong>Load sample</strong>.</li>
    <li>Click <strong>Begin simulation</strong>.</li>
    <li>Try the playable encounter and batch odds.</li>
    <li>Write down anything confusing, boring, broken, or hard to read.</li>
  </ol>
  <img class="shot" src="${home}" alt="App home screen" />
  <p class="caption">The first screen is the character/loadout setup area. Use the sample first so you know the app opens correctly.</p>

  <h2 class="pageBreak">3. Import A D&D Beyond Character</h2>
  <p>The D&D Beyond character must be <strong>Public</strong> first. If it is not public, D&D Beyond may show <strong>Unauthorized Access Attempt</strong>.</p>
  <ol>
    <li>Open the app.</li>
    <li>Find the <strong>D&D Beyond import</strong> box.</li>
    <li>Click <strong>Copy import bookmark code</strong>.</li>
    <li>Open Brave, Chrome, or Edge.</li>
    <li>Press <strong>Ctrl + Shift + O</strong> to open Bookmark Manager.</li>
    <li>Right-click in the bookmark folder and choose <strong>Add new bookmark</strong>.</li>
    <li>Name it <strong>Send to D&D Simulator</strong>.</li>
    <li>Paste the copied code into the <strong>URL</strong> box.</li>
    <li>Open the Public D&D Beyond character sheet while logged in.</li>
    <li>Click the <strong>Send to D&D Simulator</strong> bookmark.</li>
  </ol>
  <div class="warningBox">
    <strong>Important:</strong> do not paste the import code into the browser address bar. It goes into a bookmark's URL box.
  </div>
  <img class="shot" src="${importShot}" alt="D&D Beyond import box" />
  <p class="caption">The green-highlighted import box is the one to use for the bookmark code.</p>

  <h2>4. Check The Imported Sheet</h2>
  <p>Before simulating, check that these look right:</p>
  <div class="twoCol">
    <ul>
      <li>character name</li>
      <li>class and level</li>
      <li>HP and AC</li>
      <li>weapons</li>
    </ul>
    <ul>
      <li>spells</li>
      <li>armor and shield</li>
      <li>skills</li>
      <li>anything important to the build</li>
    </ul>
  </div>
  <p>If something is missing, write it down. This test is especially about improving full character imports.</p>

  <h2 class="pageBreak">5. Play The Encounter</h2>
  <p>After setup, click <strong>Begin simulation</strong>. The play screen lets the tester choose actions and see the combat unfold instead of only reading a result.</p>
  <img class="shot" src="${play}" alt="Playable encounter screen" />
  <p class="caption">This screen is where replayable, character-driven choices will keep improving.</p>

  <h2>6. What Feedback Helps Most</h2>
  <div class="feedbackBox">
    <ul>
      <li>Where did you get stuck?</li>
      <li>Did any button wording confuse you?</li>
      <li>Did D&D Beyond import your weapons, spells, armor, and skills correctly?</li>
      <li>Did the playable encounter feel fun enough to replay?</li>
      <li>What did you expect the app to do that it did not do?</li>
    </ul>
  </div>

  <h2>7. What It Installs</h2>
  <p>It installs the desktop app like a normal Windows app. It does not install Node.js, npm, Next.js, React, Git, MySQL, browser extensions, D&D Beyond credentials, services, or drivers.</p>
  <p>It includes Electron, Chromium, the app's built files, the local import helper, and starter SRD monster data.</p>
</body>
</html>`;
}

function buildInfographicGuideHtml({ installer, home, importShot, play }) {
  const installerHash = sha256For(installerPath);
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Friend Test Infographic Quickstart</title>
  <style>
    @page { size: Letter; margin: 0.35in; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #251710;
      background: #f7eddb;
      font-family: "Segoe UI", Arial, sans-serif;
      font-size: 10.4pt;
      line-height: 1.26;
    }
    h1, h2, h3, p { margin: 0; }
    h1 {
      max-width: 5.2in;
      color: #fff4d6;
      font-size: 28pt;
      line-height: 0.98;
      text-transform: uppercase;
    }
    h2 { color: #fff4d6; font-size: 14pt; }
    h3 { color: #421711; font-size: 12pt; line-height: 1.12; }
    ol, ul { margin: 0; padding: 0; }
    li { margin: 3px 0; }
    .sheet {
      min-height: 10.25in;
      padding: 0.2in;
      border: 3px solid #4b1713;
      border-radius: 18px;
      background:
        linear-gradient(135deg, rgba(255, 244, 214, 0.98), rgba(239, 222, 190, 0.98)),
        #fff7e6;
      box-shadow: inset 0 0 0 2px rgba(198, 155, 82, 0.34);
      page-break-after: always;
    }
    .sheet:last-child { page-break-after: auto; }
    .hero {
      display: grid;
      grid-template-columns: 1fr 1.68in;
      gap: 18px;
      align-items: center;
      margin-bottom: 14px;
      padding: 18px;
      border-radius: 15px;
      color: #fff4d6;
      background:
        radial-gradient(circle at 82% 40%, rgba(65, 216, 138, 0.36), transparent 36%),
        linear-gradient(135deg, #5b1d18, #170b08 72%);
      box-shadow: 0 10px 28px rgba(36, 18, 14, 0.22);
    }
    .kicker {
      margin-bottom: 7px;
      color: #8fedb8;
      font-size: 8.5pt;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .hero p {
      margin-top: 10px;
      color: #f7dca3;
      font-size: 12pt;
      line-height: 1.28;
    }
    .badge {
      display: grid;
      width: 1.58in;
      height: 1.58in;
      place-items: center;
      border: 3px solid #f1c76b;
      border-radius: 999px;
      color: #170b08;
      background: radial-gradient(circle, #fff4d6, #d99b43 68%, #7a241f);
      font-weight: 800;
      text-align: center;
      text-transform: uppercase;
      box-shadow: 0 0 0 5px rgba(241, 199, 107, 0.2);
    }
    .badge span { display: block; font-size: 30pt; line-height: 0.86; }
    .fileCard {
      display: grid;
      grid-template-columns: 0.84in 1fr 1.05in;
      gap: 12px;
      align-items: center;
      margin-bottom: 12px;
      padding: 12px;
      border: 2px solid #1c4839;
      border-radius: 14px;
      background: #eaf8ef;
    }
    .fileIcon {
      display: grid;
      height: 0.78in;
      place-items: center;
      border-radius: 12px;
      color: #fff4d6;
      background: linear-gradient(135deg, #1c4839, #0b2119);
      font-size: 16pt;
      font-weight: 900;
    }
    .fileName {
      color: #113727;
      font-family: Consolas, "Courier New", monospace;
      font-size: 10.6pt;
      font-weight: 900;
      line-height: 1.18;
      word-break: break-word;
    }
    .sizePill {
      justify-self: end;
      padding: 8px;
      border-radius: 9px;
      color: #fff4d6;
      background: #7a241f;
      font-weight: 900;
      text-align: center;
    }
    .flow {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 9px;
      margin: 12px 0;
    }
    .step {
      min-height: 1.22in;
      padding: 11px;
      border: 2px solid #c69b52;
      border-radius: 13px;
      background: #fffaf0;
    }
    .stepNumber {
      display: inline-grid;
      width: 30px;
      height: 30px;
      margin-bottom: 7px;
      place-items: center;
      border-radius: 999px;
      color: #fff4d6;
      background: #5b1d18;
      font-weight: 900;
    }
    .step p { margin-top: 4px; color: #5f4939; font-size: 9.4pt; }
    .callout {
      margin: 9px 0 12px;
      padding: 10px 12px;
      border: 2px solid #a53a31;
      border-radius: 13px;
      color: #471813;
      background: #fff0ea;
      font-weight: 700;
    }
    .grid2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      align-items: start;
    }
    .panel {
      padding: 12px;
      border: 2px solid #c69b52;
      border-radius: 14px;
      background: #fffaf0;
    }
    .panel.dark {
      color: #fff4d6;
      border-color: #1c4839;
      background: linear-gradient(135deg, #1c4839, #0f1f1a);
    }
    .panel.dark h3 { color: #fff4d6; }
    .panel.dark p, .panel.dark li { color: #dcefd9; }
    .panel p, .panel li { color: #5f4939; font-size: 9.5pt; }
    .checkGrid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 7px;
      margin-top: 8px;
      list-style: none;
    }
    .checkGrid li {
      padding: 6px 8px;
      border-radius: 8px;
      background: rgba(28, 72, 57, 0.1);
      color: #143d2d;
      font-weight: 800;
    }
    .shot {
      width: 100%;
      display: block;
      border: 2px solid #24120e;
      border-radius: 13px;
      box-shadow: 0 8px 18px rgba(36, 18, 14, 0.18);
    }
    .shotTall {
      max-height: 3.05in;
      object-fit: cover;
      object-position: top;
    }
    .caption {
      margin-top: 5px;
      color: #5f4939;
      font-size: 8.5pt;
      font-style: italic;
    }
    .laneTitle {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin: 14px 0 8px;
      padding: 8px 12px;
      border-radius: 12px;
      color: #fff4d6;
      background: linear-gradient(90deg, #5b1d18, #170b08);
    }
    .laneTitle span {
      color: #8fedb8;
      font-size: 8.5pt;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .importFlow {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-top: 8px;
    }
    .mini {
      padding: 10px;
      border: 2px solid #1c4839;
      border-radius: 12px;
      background: #eaf8ef;
    }
    .mini strong { display: block; color: #143d2d; font-size: 10.5pt; }
    .mini p { margin-top: 4px; color: #456050; font-size: 8.9pt; }
    .hash {
      margin-top: 7px;
      color: #5f4939;
      font-size: 7.5pt;
      word-break: break-all;
    }
    .footer {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 12px;
    }
    .feedback {
      list-style: none;
      margin-top: 8px;
    }
    .feedback li {
      margin: 5px 0;
      padding: 6px 8px;
      border-left: 5px solid #8fedb8;
      border-radius: 7px;
      background: rgba(255, 244, 214, 0.11);
    }
  </style>
</head>
<body>
  <section class="sheet">
    <div class="hero">
      <div>
        <div class="kicker">D&D Character Balance Tester</div>
        <h1>Friend Test Quickstart</h1>
        <p>One installer. One sample test. One D&D Beyond import path. Write down anything that feels confusing.</p>
      </div>
      <div class="badge"><div><span>5</span>minute start</div></div>
    </div>

    <div class="fileCard">
      <div class="fileIcon">EXE</div>
      <div>
        <h3>Send this one file</h3>
        <div class="fileName">release-current/DND-Character-Balance-Tester-Friend-Test-Setup.exe</div>
        <div class="hash">SHA256: ${installerHash}</div>
      </div>
      <div class="sizePill">${Math.round(installer.size / 1024 / 1024)} MB<br />installer</div>
    </div>

    <div class="flow">
      <div class="step">
        <div class="stepNumber">1</div>
        <h3>Double-click setup</h3>
        <p>Open <strong>DND-Character-Balance-Tester-Friend-Test-Setup.exe</strong>.</p>
      </div>
      <div class="step">
        <div class="stepNumber">2</div>
        <h3>Pass Windows warning</h3>
        <p>Click <strong>More info</strong>, then <strong>Run anyway</strong>.</p>
      </div>
      <div class="step">
        <div class="stepNumber">3</div>
        <h3>Load sample</h3>
        <p>Click <strong>Load sample</strong> so you can test without D&D Beyond first.</p>
      </div>
      <div class="step">
        <div class="stepNumber">4</div>
        <h3>Begin simulation</h3>
        <p>Try the playable encounter and batch odds.</p>
      </div>
    </div>

    <div class="callout">Windows may say Unknown Publisher because this is a self-signed personal test build. That is expected for now.</div>

    <div class="grid2">
      <div>
        <img class="shot shotTall" src="${home}" alt="App setup screen" />
        <p class="caption">Start with the sample character before importing anything.</p>
      </div>
      <div class="panel dark">
        <h3>What to check first</h3>
        <ul class="checkGrid">
          <li>Name</li>
          <li>Class</li>
          <li>Level</li>
          <li>HP</li>
          <li>AC</li>
          <li>Weapons</li>
          <li>Spells</li>
          <li>Skills</li>
        </ul>
        <p style="margin-top:8px;">Missing sheet data is useful feedback, especially for caster-heavy characters.</p>
      </div>
    </div>
  </section>

  <section class="sheet">
    <div class="laneTitle">
      <h2>D&D Beyond Import Path</h2>
      <span>Public sheet required</span>
    </div>

    <div class="grid2">
      <div>
        <img class="shot" src="${importShot}" alt="D&D Beyond import box" />
        <p class="caption">Use the green-highlighted import box in the app.</p>
      </div>
      <div class="panel">
        <h3>Import Setup</h3>
        <div class="importFlow">
          <div class="mini">
            <strong>Public</strong>
            <p>Set the D&D Beyond character to Public first.</p>
          </div>
          <div class="mini">
            <strong>Copy</strong>
            <p>Click <strong>Copy import bookmark code</strong>.</p>
          </div>
          <div class="mini">
            <strong>Bookmark</strong>
            <p>Paste it into a bookmark URL field.</p>
          </div>
        </div>
        <div class="callout" style="margin-bottom:0;">Do not paste the import code into the address bar.</div>
      </div>
    </div>

    <div class="flow">
      <div class="step">
        <div class="stepNumber">1</div>
        <h3>Open bookmarks</h3>
        <p>In Brave, Chrome, or Edge, press <strong>Ctrl + Shift + O</strong>.</p>
      </div>
      <div class="step">
        <div class="stepNumber">2</div>
        <h3>Add bookmark</h3>
        <p>Name it <strong>Send to D&D Simulator</strong>.</p>
      </div>
      <div class="step">
        <div class="stepNumber">3</div>
        <h3>Paste URL</h3>
        <p>Paste the copied code into the bookmark's <strong>URL</strong> box.</p>
      </div>
      <div class="step">
        <div class="stepNumber">4</div>
        <h3>Click bookmark</h3>
        <p>Open the D&D Beyond sheet, then click the bookmark.</p>
      </div>
    </div>

    <div class="laneTitle">
      <h2>Play, Then Report What Felt Wrong</h2>
      <span>Tester notes matter</span>
    </div>

    <div class="grid2">
      <div>
        <img class="shot shotTall" src="${play}" alt="Playable encounter screen" />
        <p class="caption">Playable mode should feel clear enough to replay, not just calculate results.</p>
      </div>
      <div class="panel dark">
        <h3>Best feedback</h3>
        <ul class="feedback">
          <li>Where did you get stuck?</li>
          <li>Which button wording was confusing?</li>
          <li>Were weapons, spells, armor, and skills correct?</li>
          <li>Did the playable encounter feel fun enough?</li>
          <li>What did you expect that did not happen?</li>
        </ul>
      </div>
    </div>

    <div class="footer">
      <div class="panel">
        <h3>It does not install</h3>
        <p>Node.js, npm, Next.js, React, Git, MySQL, browser extensions, D&D Beyond credentials, services, or drivers.</p>
      </div>
      <div class="panel">
        <h3>It includes</h3>
        <p>Electron, Chromium, the built app files, the local import helper, and starter SRD monster data.</p>
      </div>
    </div>
  </section>
</body>
</html>`;
}

async function printPdf() {
  const html = await buildGuideHtml();
  await fsp.writeFile(htmlPath, html, "utf8");

  const win = new BrowserWindow({
    width: 1100,
    height: 1400,
    show: false,
    backgroundColor: "#f9f3e7",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  await win.loadFile(htmlPath);
  await sleep(500);
  const pdf = await win.webContents.printToPDF({
    marginsType: 0,
    pageSize: "Letter",
    printBackground: true,
    landscape: false
  });
  await fsp.writeFile(pdfPath, pdf);
  await fsp.copyFile(pdfPath, releasePdfPath);
  console.log(`Wrote ${pdfPath}`);
  console.log(`Wrote ${releasePdfPath}`);
  win.destroy();
}

async function main() {
  if (!fs.existsSync(staticRoot)) {
    throw new Error("Static output folder not found. Run npm.cmd run build first.");
  }
  if (!fs.existsSync(installerPath)) {
    throw new Error("Friend-test installer not found. Build release-current installer first.");
  }

  await fsp.mkdir(assetDir, { recursive: true });
  const { server, url } = await startStaticServer();

  try {
    await app.whenReady();
    await captureAppScreenshots(url);
    await printPdf();
  } finally {
    server.close();
    app.quit();
  }
}

main().catch((error) => {
  console.error(error);
  app.quit();
  process.exitCode = 1;
});
