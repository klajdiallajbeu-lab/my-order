import nodemailer from "nodemailer";

export const sendBusinessRequest = async (req, res) => {
  try {
    const {
      businessName,
      businessType,
      tables,
      rooms,
      umbrellas,
      contactNumber,
      email,
      message,
    } = req.body;

    console.log("BODY:", req.body);
    console.log("MAIL_USER:", process.env.MAIL_USER);
    console.log("MAIL_TO:", process.env.MAIL_TO);
    console.log("MAIL_PASS exists:", !!process.env.MAIL_PASS);

    if (!businessName || !businessType || !contactNumber || !email) {
      return res.status(400).json({
        message: "Plotëso fushat kryesore.",
      });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    await transporter.verify();
    console.log("SMTP OK");

    const mailText = `
Kërkesë e re biznesi

Emri i biznesit: ${businessName}
Lloji i biznesit: ${businessType}
Numri i tavolinave: ${tables || 0}
Numri i dhomave: ${rooms || 0}
Numri i çadrave: ${umbrellas || 0}
Numër kontakti: ${contactNumber}
Email: ${email}

Mesazh:
${message || "-"}
    `;

    await transporter.sendMail({
      from: process.env.MAIL_USER,
      to: process.env.MAIL_TO,
      subject: `Kërkesë e re - ${businessName}`,
      html: `
<div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:20px;">
  <div style="max-width:600px; margin:auto; background:#ffffff; border-radius:12px; padding:24px;">
    
    <h2 style="color:#1e293b; margin-bottom:10px;">
      Kërkesë e re biznesi
    </h2>

    <p style="color:#64748b; margin-bottom:20px;">
      Një biznes i ri ka kërkuar aktivizim në platformë.
    </p>

    <div style="border-top:1px solid #e2e8f0; padding-top:16px;">
      <p><strong>Emri i biznesit:</strong> ${businessName}</p>
      <p><strong>Lloji:</strong> ${businessType}</p>
      <p><strong>Tavolina:</strong> ${tables || 0}</p>
      <p><strong>Dhomat:</strong> ${rooms || 0}</p>
      <p><strong>Çadrat:</strong> ${umbrellas || 0}</p>
      <p><strong>Kontakti:</strong> ${contactNumber}</p>
      <p><strong>Email:</strong> ${email}</p>
    </div>

    <div style="margin-top:20px; padding:16px; background:#f8fafc; border-radius:8px;">
      <strong>Mesazh:</strong>
      <p style="margin-top:8px;">${message || "-"}</p>
    </div>

    <div style="margin-top:24px; text-align:center;">
      <span style="font-size:12px; color:#94a3b8;">
        myOrder System
      </span>
    </div>

  </div>
</div>
`
    });

    return res.status(200).json({
      message: "Kërkesa u dërgua me sukses.",
    });
  } catch (error) {
    console.error("sendBusinessRequest FULL ERROR:", error);

    return res.status(500).json({
      message: error.message || "Gabim në server gjatë dërgimit të kërkesës.",
    });
  }
};