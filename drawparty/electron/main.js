const { app, BrowserWindow } = require("electron");
const path = require("path");
const http = require("http");

function waitForServer(callback, attempts = 0) {
  if (attempts > 60) { console.error("Server failed to start"); return; }
  http.get("http://localhost:3000", () => callback())
    .on("error", () => setTimeout(() => waitForServer(callback, attempts + 1), 500));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
    icon: path.join(__dirname, "../public/drawparty.png"),
    title: "DrawParty",
  });
  win.loadURL("http://localhost:3000");
}

app.whenReady().then(() => {
  const isPacked = app.isPackaged;

  const standaloneDir = isPacked
    ? path.join(process.resourcesPath, "app.asar.unpacked", ".next", "standalone")
    : path.join(__dirname, "..", ".next", "standalone");

  const serverScript = path.join(standaloneDir, "server.js");

  process.env.PORT = "3000";
  process.env.HOSTNAME = "localhost";
  process.chdir(standaloneDir);

  require(serverScript);
  waitForServer(createWindow);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
