const { INTERVAL_MS, getMarketPayload } = require("./_lib/market");

module.exports = async (_req, res) => {
  try {
    const payload = await getMarketPayload();

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", `s-maxage=${Math.ceil(INTERVAL_MS / 1000)}, stale-while-revalidate=59`);
    res.statusCode = 200;
    res.end(JSON.stringify(payload));
  } catch (error) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.statusCode = 500;
    res.end(
      JSON.stringify({
        error: true,
        message: error.message
      })
    );
  }
};
