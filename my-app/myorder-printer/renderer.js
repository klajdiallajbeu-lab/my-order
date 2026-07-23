/* renderer.js — logjika e UI-së së printerit
   Lidhet me myOrder, ruan konfigurimin dhe printon te printeri i duhur. */

const { io } = require("socket.io-client");

const SERVER_URL = "https://myorderal.com";

let socket = null;
let printers = [];
let config = { printerKey: "", printers: { banak: "", kuzhine: "", fature: "" } };
const recentOrders = [];

/* ---------- ndihmës ---------- */

const $ = (id) => document.getElementById(id);

const setStatus = (state, text) => {
  const pill = $("statusPill");
  pill.className = `status-pill ${state}`;
  $("statusText").innerText = text;
};

const setMsg = (kind, text) => {
  const el = $("connectMsg");
  el.className = `msg ${kind}`;
  el.innerHTML =
    kind === "ok" ? `✅ ${text}` : kind === "err" ? `⚠️ ${text}` : text;
};

const nowTime = () =>
  new Date().toLocaleTimeString("sq-AL", {
    hour: "2-digit",
    minute: "2-digit",
  });

const esc = (v) =>
  String(v ?? "").replace(/[&<>]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"
  );

/* ---------- printerat e sistemit ---------- */

async function loadPrinters() {
  printers = await window.printerAPI.listPrinters();

  const selects = [
    ["pBanak", "banak"],
    ["pKuzhine", "kuzhine"],
    ["pFature", "fature"],
  ];

  for (const [selId, key] of selects) {
    const sel = $(selId);
    sel.innerHTML = "";

    const none = document.createElement("option");
    none.value = "";
    none.textContent = printers.length
      ? "— Zgjidh printerin —"
      : "S'u gjet asnjë printer";
    sel.appendChild(none);

    for (const p of printers) {
      const opt = document.createElement("option");
      opt.value = p.name;
      opt.textContent = p.displayName + (p.isDefault ? "  (parazgjedhur)" : "");
      sel.appendChild(opt);
    }

    sel.value = config.printers?.[key] || "";
  }

  refreshSummary();
}

function refreshSummary() {
  $("sBanak").innerText = config.printers?.banak || "—";
  $("sKuzhine").innerText = config.printers?.kuzhine || "—";
  $("sFature").innerText = config.printers?.fature || "—";
}

/* ---------- porositë e fundit ---------- */

function addOrder(label) {
  recentOrders.unshift({ label, time: nowTime() });
  if (recentOrders.length > 12) recentOrders.pop();

  const list = $("ordersList");

  if (recentOrders.length === 0) {
    list.innerHTML = '<div class="empty">Nuk ka porosi ende.</div>';
    return;
  }

  list.innerHTML = recentOrders
    .map(
      (o) => `
      <div class="order">
        <span class="order-icon">🧾</span>
        <span class="order-name">${esc(o.label)}</span>
        <span class="order-time">${esc(o.time)}</span>
      </div>`
    )
    .join("");
}

/* ---------- ndërtimi i faturës ---------- */

function buildReceiptHtml(payload) {
  const items = Array.isArray(payload?.items) ? payload.items : [];

  const rows = items
    .map((it) => {
      const qty = Number(it.qty || it.quantity || 1);
      const name = esc(it.name || it.productName || "Produkt");
      const price = Number(it.price || 0) * qty;

      return `<tr>
        <td>${qty} x ${name}</td>
        <td class="r">${price.toLocaleString("sq-AL")}</td>
      </tr>`;
    })
    .join("");

  const total = Number(
    payload?.totalALL ?? payload?.total ?? 0
  ).toLocaleString("sq-AL");

  const place =
    payload?.sourceNumber != null
      ? `${payload?.sourceType || "Tavolina"} ${payload.sourceNumber}`
      : payload?.tableName || "—";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page { margin: 0; }
    body { width: 72mm; margin: 0; padding: 4mm 3mm;
           font-family: "Courier New", monospace; font-size: 12px; color: #000; }
    h1 { margin: 0 0 2mm; font-size: 16px; text-align: center; letter-spacing: 1px; }
    .sub { text-align: center; font-size: 11px; margin-bottom: 3mm; }
    hr { border: 0; border-top: 1px dashed #000; margin: 2mm 0; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 1mm 0; vertical-align: top; }
    .r { text-align: right; white-space: nowrap; }
    .total { font-size: 14px; font-weight: bold; }
    .foot { margin-top: 4mm; text-align: center; font-size: 11px; }
  </style></head><body>
    <h1>${esc(payload?.businessName || "MYORDER")}</h1>
    <div class="sub">${esc(place)} · ${nowTime()}</div>
    <hr />
    <table>${rows || '<tr><td colspan="2">—</td></tr>'}</table>
    <hr />
    <table><tr class="total"><td>TOTALI</td><td class="r">${total} ALL</td></tr></table>
    <div class="foot">Faleminderit!</div>
  </body></html>`;
}

async function printTo(target, html, label) {
  const deviceName = config.printers?.[target] || "";

  const res = await window.printerAPI.printHtml(html, deviceName);

  if (!res?.success) {
    console.error("Print error:", res?.reason);
    setMsg("err", `Printimi dështoi (${target}): ${res?.reason || "gabim"}`);
  }

  addOrder(label);
}

/* ---------- lidhja me serverin ---------- */

async function connect() {
  const key = $("printerKey").value.trim();

  if (!key) {
    setMsg("err", "Vendos Printer Key.");
    return;
  }

  $("btnConnect").disabled = true;
  setStatus("offline", "Duke u lidhur…");
  setMsg("wait", "Duke u lidhur me myOrder…");

  try {
    const res = await fetch(`${SERVER_URL}/api/printer/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ printerKey: key }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Lidhja dështoi (${res.status})`);
    }

    const { printerToken, businessName } = await res.json();

    $("bizName").innerText = businessName || "—";

    config = await window.printerAPI.saveConfig({ printerKey: key });

    if (socket) socket.disconnect();

    socket = io(SERVER_URL, {
      transports: ["websocket"],
      auth: { token: printerToken },
    });

    socket.on("connect", () => {
      setStatus("online", "Online");
      setMsg("ok", "Lidhur me sukses me myOrder");
      socket.emit("joinBusiness");
    });

    socket.on("disconnect", () => {
      setStatus("offline", "Offline");
      setMsg("err", "Lidhja u ndërpre. Provo përsëri.");
    });

    socket.on("connect_error", (e) => {
      setStatus("offline", "Offline");
      setMsg("err", `Gabim lidhjeje: ${e.message}`);
    });

    // Faturë për tavolinë/dhomë/çadër
    socket.on("table:invoice", (payload) => {
      const label = payload?.sourceNumber
        ? `${payload.sourceType || "Tavolina"} ${payload.sourceNumber}`
        : "Faturë";

      printTo("fature", buildReceiptHtml(payload), label);
    });

    // Porosi e re -> banak / kuzhinë sipas destinacionit
    socket.on("orders:created", (payload) => {
      const label = payload?.sourceNumber
        ? `${payload.sourceType || "Tavolina"} ${payload.sourceNumber}`
        : "Porosi e re";

      const items = Array.isArray(payload?.items) ? payload.items : [];

      const bar = items.filter((i) => i.destination === "banak");
      const kitchen = items.filter((i) => i.destination !== "banak");

      if (bar.length) {
        printTo("banak", buildReceiptHtml({ ...payload, items: bar }), label);
      }

      if (kitchen.length) {
        printTo(
          "kuzhine",
          buildReceiptHtml({ ...payload, items: kitchen }),
          label
        );
      }
    });

    socket.on("waiter:shift-report", (payload) => {
      printTo("fature", buildReceiptHtml(payload), "Xhiro kamarieri");
    });
  } catch (err) {
    setStatus("offline", "Offline");
    setMsg("err", err.message);
  } finally {
    $("btnConnect").disabled = false;
  }
}

/* ---------- ngjarjet ---------- */

$("btnConnect").addEventListener("click", connect);

$("btnTest").addEventListener("click", async () => {
  const html = buildReceiptHtml({
    businessName: $("bizName").innerText || "MYORDER",
    sourceType: "TEST",
    sourceNumber: "1",
    items: [
      { name: "Test produkti", qty: 1, price: 100 },
      { name: "Kafe", qty: 2, price: 70 },
    ],
    total: 240,
  });

  await printTo("fature", html, "Test Print");
  setMsg("ok", "Test print u dërgua te printeri i faturës.");
});

$("btnSavePrinters").addEventListener("click", async () => {
  config = await window.printerAPI.saveConfig({
    printers: {
      banak: $("pBanak").value,
      kuzhine: $("pKuzhine").value,
      fature: $("pFature").value,
    },
  });

  refreshSummary();
  setMsg("ok", "Printerat u ruajtën.");
});

/* ---------- nisja ---------- */

(async function init() {
  config = await window.printerAPI.getConfig();

  $("printerKey").value = config.printerKey || "";

  await loadPrinters();

  // Lidhje automatike nëse çelësi është ruajtur më parë
  if (config.printerKey) connect();
})();