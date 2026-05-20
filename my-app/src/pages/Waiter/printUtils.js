// =========================
// FORMAT NUMBER
// =========================
const formatNumber = (n) =>
  (Number(n) || 0).toLocaleString("sq-AL");


// =========================
// ALIGN LEFT + RIGHT (thermal printer)
// =========================
const lineLR = (left, right, width = 32) => {
  const l = String(left);
  const r = String(right);

  if (l.length + r.length >= width) {
    return l + " " + r;
  }

  const spaces = " ".repeat(width - l.length - r.length);
  return l + spaces + r;
};


// =========================
// CENTER TEXT
// =========================
const centerText = (text, width = 32) => {
  const t = String(text);
  if (t.length >= width) return t;

  const space = Math.floor((width - t.length) / 2);
  return " ".repeat(space) + t;
};


// =========================
// BUILD SHIFT PRINT
// =========================
export const buildShiftPrint = (data) => {
  const dt = new Date(data.closedAt);

  const dateStr = dt.toLocaleDateString("sq-AL");
  const timeStr = dt.toLocaleTimeString("sq-AL", {
    hour: "2-digit",
    minute: "2-digit",
  });

  let text = "";

  // HEADER
  text += centerText("MYORDER") + "\n";
  text += centerText("XHIRO DITORE") + "\n\n";

  text += `Kamarjeri: ${data.waiterName || "-" }\n`;
  text += `Data: ${dateStr} ${timeStr}\n`;

  text += "--------------------------------\n";

  // PRODUCTS
  data.products.forEach((p) => {
    const left = `${p.qty}x ${p.name}`;
    const right = `${formatNumber(p.total)} ALL`;

    text += lineLR(left, right) + "\n";
  });

  text += "--------------------------------\n";

  // TOTAL
  text += lineLR("TOTAL", `${formatNumber(data.total)} ALL`) + "\n";

  if (data.tables !== undefined) {
    text += `Tavolina: ${data.tables}\n`;
  }

  text += "\n";
  text += centerText("Ju Faleminderit!") + "\n\n\n";

  return text;
};


// =========================
// PRINT SHIFT (QZ)
// =========================
export const printShift = async (data) => {
  try {
    if (!window.qz) {
      throw new Error("QZ Tray nuk është i lidhur");
    }

    const text = buildShiftPrint(data);

    const printers = await window.qz.printers.find();

    if (!printers || printers.length === 0) {
      throw new Error("Nuk u gjet printer");
    }

    const printer = printers[0]; // mund ta ndryshosh me emër fiks

    const config = window.qz.configs.create(printer);

    await window.qz.print(config, [
      {
        type: "raw",
        format: "plain",
        data: text,
      },
    ]);

    console.log("✅ Printim i suksesshëm");

  } catch (err) {
    console.error("❌ Print error:", err);
  }
};