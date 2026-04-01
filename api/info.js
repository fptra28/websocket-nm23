const { INTERVAL_MS, symbols } = require("./_lib/market");

function buildBaseUrl(req) {
  const protocolHeader = req.headers["x-forwarded-proto"];
  const hostHeader = req.headers["x-forwarded-host"] || req.headers.host;
  const protocol = protocolHeader ? protocolHeader.split(",")[0] : "http";
  const host = hostHeader || "localhost:3000";

  return `${protocol}://${host}`;
}

module.exports = (req, res) => {
  const baseUrl = buildBaseUrl(req);

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.statusCode = 200;
  res.end(
    JSON.stringify({
      name: "market-polling",
      transport: "polling",
      polling_url: `${baseUrl}/api/market`,
      interval_ms: INTERVAL_MS,
      symbols
    })
  );
};
