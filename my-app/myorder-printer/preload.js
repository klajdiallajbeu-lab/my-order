// preload.js — ura e sigurt mes UI-së dhe Electron-it
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("printerAPI", {
  listPrinters: () => ipcRenderer.invoke("printers:list"),

  getConfig: () => ipcRenderer.invoke("config:get"),
  saveConfig: (cfg) => ipcRenderer.invoke("config:set", cfg),

  printHtml: (html, deviceName) =>
    ipcRenderer.invoke("print:html", { html, deviceName }),
});