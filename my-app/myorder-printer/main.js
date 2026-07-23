// main.js — procesi kryesor i Electron-it
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow = null;

/* ---------- ruajtja e konfigurimit ---------- */

const configPath = () =>
  path.join(app.getPath("userData"), "myorder-printer-config.json");

function readConfig() {
  try {
    const raw = fs.readFileSync(configPath(), "utf8");
    return JSON.parse(raw);
  } catch {
    return {
      printerKey: "",
      printers: { banak: "", kuzhine: "", fature: "" },
    };
  }
}

function writeConfig(cfg) {
  try {
    fs.writeFileSync(configPath(), JSON.stringify(cfg, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("Config save error:", err.message);
    return false;
  }
}

/* ---------- dritarja ---------- */

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 900,
    minHeight: 620,
    title: "MYORDER PRINTER",
    backgroundColor: "#eef2f9",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

/* ---------- IPC ---------- */

// Lista e printerëve të sistemit
ipcMain.handle("printers:list", async () => {
  if (!mainWindow) return [];

  try {
    const list = await mainWindow.webContents.getPrintersAsync();
    return list.map((p) => ({
      name: p.name,
      displayName: p.displayName || p.name,
      isDefault: Boolean(p.isDefault),
    }));
  } catch (err) {
    console.error("printers:list error:", err.message);
    return [];
  }
});

ipcMain.handle("config:get", () => readConfig());

ipcMain.handle("config:set", (_evt, cfg) => {
  const current = readConfig();
  const merged = {
    ...current,
    ...cfg,
    printers: { ...current.printers, ...(cfg?.printers || {}) },
  };
  return writeConfig(merged) ? merged : current;
});

/**
 * Printim i heshtur: hap një dritare të fshehur, ngarkon HTML-in e faturës
 * dhe e dërgon te printeri i caktuar.
 */
ipcMain.handle("print:html", async (_evt, { html, deviceName }) => {
  return new Promise((resolve) => {
    const win = new BrowserWindow({
      show: false,
      webPreferences: { offscreen: false },
    });

    const data = "data:text/html;charset=utf-8," + encodeURIComponent(html);

    win.loadURL(data);

    win.webContents.once("did-finish-load", () => {
      win.webContents.print(
        {
          silent: true,
          printBackground: false,
          deviceName: deviceName || undefined,
          margins: { marginType: "none" },
        },
        (success, reason) => {
          setTimeout(() => {
            if (!win.isDestroyed()) win.destroy();
          }, 600);

          resolve({ success, reason: reason || "" });
        }
      );
    });

    win.webContents.once("did-fail-load", (_e, _c, desc) => {
      if (!win.isDestroyed()) win.destroy();
      resolve({ success: false, reason: desc });
    });
  });
});