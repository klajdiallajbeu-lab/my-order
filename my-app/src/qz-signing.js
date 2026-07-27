import qz from "qz-tray";

// Në aplikacionin Electron s'ka origjinë web, ndaj URL-t duhet ABSOLUTE.
const SERVER_URL = "https://myorderal.com";

window.qz = qz;

/**
 * Certifikata merret vetë nga serveri — asnjë vendosje manuale në QZ Tray.
 * URL absolute sepse në Electron "/api/..." nuk zgjidhet dot.
 */
qz.security.setCertificatePromise((resolve, reject) => {
  fetch(`${SERVER_URL}/api/qz-certificate`, { cache: "no-store" })
    .then((res) => res.text())
    .then((cert) => {
      cert = cert.replace(/\\n/g, "\n").replace(/"/g, "").trim();
      resolve(cert);
    })
    .catch(reject);
});

qz.security.setSignatureAlgorithm("SHA512");

/**
 * Nënshkrimi bëhet nga backend-i me çelësin privat.
 * Token-i: te printeri përdoret "printerToken" (jo token-i i menaxherit).
 */
qz.security.setSignaturePromise((toSign) => {
  return (resolve, reject) => {
    const token =
      localStorage.getItem("printerToken") ||
      localStorage.getItem("token") ||
      "";

    fetch(`${SERVER_URL}/api/qz-sign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ request: toSign }),
    })
      .then((res) => res.json())
      .then((data) => resolve(data.signature))
      .catch(reject);
  };
});

export default qz;