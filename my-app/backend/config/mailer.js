import nodemailer from "nodemailer";

function getMailConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  const missing = [];

  if (!host) missing.push("SMTP_HOST");
  if (!port) missing.push("SMTP_PORT");
  if (!user) missing.push("SMTP_USER");
  if (!pass) missing.push("SMTP_PASS");
  if (!from) missing.push("SMTP_FROM");

  if (missing.length > 0) {
    throw new Error(
      `Mungojnë konfigurimet SMTP: ${missing.join(", ")}`
    );
  }

  return {
    host,
    port,
    user,
    pass,
    from,
  };
}

function createTransporter() {
  const config = getMailConfig();

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    requireTLS: config.port === 587,

    auth: {
      user: config.user,
      pass: config.pass,
    },

    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });
}

export async function sendPasswordResetCode({
  email,
  code,
  userName,
}) {
  const config = getMailConfig();
  const transporter = createTransporter();

  return transporter.sendMail({
    from: config.from,
    to: email,
    subject: "Kodi për ndryshimin e fjalëkalimit – myOrder",

    text: [
      `Përshëndetje ${userName || ""},`,
      "",
      `Kodi yt i verifikimit është: ${code}`,
      "",
      "Kodi skadon pas 10 minutash.",
      "Nëse nuk e kërkove këtë ndryshim, mos e përdor kodin.",
    ].join("\n"),

    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
        <h2>Ndryshim fjalëkalimi</h2>

        <p>Përshëndetje ${userName || ""},</p>

        <p>Kodi yt i verifikimit është:</p>

        <div style="
          font-size:32px;
          font-weight:800;
          letter-spacing:8px;
          padding:18px;
          text-align:center;
          background:#f3f6fb;
          border-radius:12px;
        ">
          ${code}
        </div>

        <p>Kodi skadon pas 10 minutash.</p>
      </div>
    `,
  });
}