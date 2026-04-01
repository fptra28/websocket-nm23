const INTERVAL_MS = Number(process.env.INTERVAL_MS || 5000);

const symbols = [
  "^JKSE",
  "^JKLQ45",
  "BBCA.JK",
  "BBRI.JK",
  "BBNI.JK",
  "BMRI.JK",
  "BUMI.JK",
  "TLKM.JK",
  "GOTO.JK",
  "ANTM.JK",
  "ASII.JK",
  "UNVR.JK",
  "ICBP.JK"
];

async function fetchSymbol(symbol) {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const json = await response.json();
    const meta = json?.chart?.result?.[0]?.meta;

    if (!meta) {
      throw new Error("Meta data tidak tersedia");
    }

    const price = Number(meta.regularMarketPrice);
    const prev = Number(meta.previousClose);
    const diff = price - prev;
    const changePercent = prev ? (diff / prev) * 100 : 0;

    return {
      symbol,
      price,
      change: Number(diff.toFixed(2)),
      change_percent: Number(changePercent.toFixed(2)),
      high: Number(meta.regularMarketDayHigh),
      low: Number(meta.regularMarketDayLow)
    };
  } catch (error) {
    return {
      symbol,
      error: true,
      message: error.message
    };
  }
}

async function getMarketPayload() {
  return {
    type: "market",
    transport: "polling",
    interval_ms: INTERVAL_MS,
    at: new Date().toISOString(),
    data: await Promise.all(symbols.map((symbol) => fetchSymbol(symbol)))
  };
}

module.exports = {
  INTERVAL_MS,
  symbols,
  getMarketPayload
};
