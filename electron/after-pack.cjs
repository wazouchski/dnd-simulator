const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== "win32") {
    return;
  }

  const iconPath = path.join(context.packager.projectDir, "build", "icon.ico");
  const executablePath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  const rceditPath = path.join(context.packager.projectDir, "node_modules", "electron-winstaller", "vendor", "rcedit.exe");

  if (!fs.existsSync(iconPath) || !fs.existsSync(executablePath) || !fs.existsSync(rceditPath)) {
    return;
  }

  execFileSync(rceditPath, [executablePath, "--set-icon", iconPath], {
    stdio: "inherit"
  });
};
