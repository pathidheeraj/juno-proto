export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { email } = req.body || {};

    if (!email) {
      return res.status(400).json({
        error: "Student email is required."
      });
    }

    /*
     * JUNO AUTHENTICATION INTEGRATION POINT
     *
     * Do NOT put a JUNO password here.
     *
     * Your professor/university should provide an
     * authorized authentication/API mechanism.
     *
     * Once provided, this function can redirect the
     * student to the official authentication flow.
     */

    return res.status(501).json({
      error: "JUNO authentication is not configured yet.",
      email
    });

  } catch (error) {
    return res.status(500).json({
      error: "Unable to start JUNO connection."
    });
  }
}
