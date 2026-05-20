import GuestSession from "../models/GuestSession.js";

export async function guestGuardIfClient(req, res, next) {
  if (req.body?.fromClient !== true) return next();

  try {
    const sessionToken = String(req.headers["x-guest-session"] || "").trim();

    if (!sessionToken) {
      return res.status(401).json({
        message: "Sesioni mungon. Ju lutem skanoni përsëri QR.",
      });
    }

    const session = await GuestSession.findOne({
      token: sessionToken,
      active: true,
    });

    if (!session) {
      return res.status(401).json({
        message: "Sesioni nuk u gjet. Ju lutem skanoni përsëri QR.",
      });
    }

    const now = new Date();

    if (!session.expiresAt || new Date(session.expiresAt) <= now) {
      return res.status(401).json({
        message: "Sesioni ka skaduar. Ju lutem skanoni përsëri QR.",
      });
    }

    const bodyBusinessId = String(req.body?.businessId || "").trim();
    const bodySourceType = String(req.body?.sourceType || "")
      .trim()
      .toLowerCase();
    const bodySourceNumber = String(req.body?.sourceNumber || "")
      .trim()
      .toUpperCase();

    const sessionBusinessId = String(session.businessId || "").trim();
    const sessionSourceType = String(session.sourceType || "")
      .trim()
      .toLowerCase();
    const sessionSourceNumber = String(session.sourceNumber || "")
      .trim()
      .toUpperCase();

    if (sessionBusinessId !== bodyBusinessId) {
      return res.status(403).json({
        message: "Business i pavlefshëm.",
      });
    }

    if (sessionSourceType !== bodySourceType) {
      return res.status(403).json({
        message: "Burimi i pavlefshëm.",
      });
    }

    if (sessionSourceNumber !== bodySourceNumber) {
      return res.status(403).json({
        message: "Numri i burimit nuk përputhet.",
      });
    }

    session.lastSeenAt = now;
    session.expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

    await session.save();

    req.guestSession = session;
    return next();
  } catch (err) {
    console.error("guestGuardIfClient error:", err);
    return res.status(500).json({
      message: "Gabim serveri.",
    });
  }
}