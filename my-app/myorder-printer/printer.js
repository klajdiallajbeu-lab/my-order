const { io } = require("socket.io-client");

const SERVER_URL = "https://myorderal.com";

// Printer Key i biznesit (vendoset një herë gjatë instalimit).
const PRINTER_KEY = "VENDOS-PRINTER-KEY-KETU";

let socket = null;

const setStatus = (text) => {
  const el = document.getElementById("status");
  if (el) el.innerText = text;
};

/**
 * 1) Merr printerToken (JWT me role "printer") nga backend-i me Printer Key.
 * 2) Lidhet me Socket.IO duke dërguar token-in te handshake (auth.token).
 *    Serveri e fut vetë te room-i privat i biznesit — s'ka nevojë të dërgohet
 *    businessId nga klienti.
 */
async function start() {
  try {
    setStatus("⏳ Duke u lidhur...");

    const res = await fetch(`${SERVER_URL}/api/printer/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ printerKey: PRINTER_KEY }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Connect failed (${res.status})`);
    }

    const { printerToken, businessName } = await res.json();

    socket = io(SERVER_URL, {
      transports: ["websocket"],
      auth: { token: printerToken },
    });

    socket.on("connect", () => {
      console.log("🟢 Connected:", businessName || "");
      setStatus(`🟢 Connected — ${businessName || ""}`);

      // Serveri e injoron payload-in dhe përdor businessId-në e token-it.
      socket.emit("joinBusiness");
    });

    socket.on("disconnect", () => {
      console.log("🔴 Disconnected");
      setStatus("🔴 Disconnected");
    });

    socket.on("table:invoice", (payload) => {
      console.log("🖨️ Faturë për printim:", payload);
      // TODO: logjika e printimit (QZ Tray / ESC-POS)
    });
  } catch (err) {
    console.error("❌ Printer connect error:", err.message);
    setStatus(`❌ ${err.message}`);
  }
}

start();