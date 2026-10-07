export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { qrPayload, users } = req.body || {};

    if (!qrPayload) {
      return res.status(400).json({
        error: "QR payload is required."
      });
    }

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({
        error: "At least one connected account is required."
      });
    }

    if (users.length > 4) {
      return res.status(400).json({
        error: "Maximum four accounts are supported."
      });
    }

    /*
     * AUTHORIZED JUNO INTEGRATION POINT
     *
     * The actual attendance request belongs here.
     *
     * This should use the official/authorized JUNO
     * authentication and attendance interface supplied
     * for your project.
     */

    return res.status(501).json({
      error: "JUNO attendance API is not configured yet."
    });

  } catch (error) {
    return res.status(500).json({
      error: "Attendance request failed."
    });
  }
}
