export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    service: "JUNO Attendance API",
    message: "API is running"
  });
}
