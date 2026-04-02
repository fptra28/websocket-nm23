const INTERVAL_MS = Number(process.env.INTERVAL_MS || 1000);

const symbols = [
  "ADRO.JK",
  "AKRA.JK",
  "AMRT.JK",
  "ANTM.JK",
  "ASII.JK",
  "BBCA.JK",
  "BBNI.JK",
  "BBRI.JK",
  "BMRI.JK",
  "BRPT.JK",
  "BUMI.JK",
  "CPIN.JK",
  "EMTK.JK",
  "EXCL.JK",
  "GOTO.JK",
  "ICBP.JK",
  "INCO.JK",
  "INDF.JK",
  "INKP.JK",
  "ISAT.JK",
  "JPFA.JK",
  "KLBF.JK",
  "MBMA.JK",
  "MDKA.JK",
  "MEDC.JK",
  "PGAS.JK",
  "PGEO.JK",
  "PTBA.JK",
  "TLKM.JK",
  "UNVR.JK"
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
