import qz from "qz-tray";

window.qz = qz;

qz.security.setCertificatePromise((resolve, reject) => {
  fetch("/api/qz-certificate", { cache: "no-store" })
    .then((res) => res.text())
    .then((cert) => {
      cert = cert.replace(/\\n/g, "\n").replace(/"/g, "").trim();
      resolve(cert);
    })
    .catch(reject);
});

qz.security.setSignatureAlgorithm("SHA512");

qz.security.setSignaturePromise((toSign) => {
  return (resolve, reject) => {
    const token =
      sessionStorage.getItem("token") ||
      localStorage.getItem("token") ||
      "";

    fetch("/api/qz-sign", {
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