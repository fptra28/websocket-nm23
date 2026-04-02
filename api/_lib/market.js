const INTERVAL_MS = Number(process.env.INTERVAL_MS || 1000);

const symbols = [
  "^JKSE",
  "^JKLQ45",
  "IDX30.JK",
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

function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function firstFinite(values) {
  if (!Array.isArray(values)) {
    return null;
  }

  for (const value of values) {
    const number = toFiniteNumber(value);
    if (number !== null) {
      return number;
    }
  }

  return null;
}

function lastFinite(values) {
  if (!Array.isArray(values)) {
    return null;
  }

  for (let index = values.length - 1; index >= 0; index -= 1) {
    const number = toFiniteNumber(values[index]);
    if (number !== null) {
      return number;
    }
  }

  return null;
}

function maxFinite(values) {
  if (!Array.isArray(values)) {
    return null;
  }

  let max = null;
  for (const value of values) {
    const number = toFiniteNumber(value);
    if (number === null) {
      continue;
    }

    if (max === null || number > max) {
      max = number;
    }
  }

  return max;
}

function minFinite(values) {
  if (!Array.isArray(values)) {
    return null;
  }

  let min = null;
  for (const value of values) {
    const number = toFiniteNumber(value);
    if (number === null) {
      continue;
    }

    if (min === null || number < min) {
      min = number;
    }
  }

  return min;
}

function round2(value) {
  return value === null ? null : Number(value.toFixed(2));
}

async function fetchSymbol(symbol) {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const json = await response.json();
    const result = json?.chart?.result?.[0];
    const meta = result?.meta;

    if (!meta) {
      throw new Error("Meta data tidak tersedia");
    }

    const quote = result?.indicators?.quote?.[0];
    const open = toFiniteNumber(meta.regularMarketOpen) ?? firstFinite(quote?.open);
    const high = toFiniteNumber(meta.regularMarketDayHigh) ?? maxFinite(quote?.high);
    const low = toFiniteNumber(meta.regularMarketDayLow) ?? minFinite(quote?.low);
    const marketPrice = toFiniteNumber(meta.regularMarketPrice);
    const prevClose = toFiniteNumber(meta.previousClose) ?? toFiniteNumber(meta.chartPreviousClose);
    const intradayClose = lastFinite(quote?.close) ?? marketPrice;
    const close = prevClose ?? intradayClose;
    const price = marketPrice ?? intradayClose ?? close;
    const diff = price !== null && close !== null ? price - close : null;
    const changePercent = diff !== null && close ? (diff / close) * 100 : null;

    return {
      symbol,
      open: round2(open),
      high: round2(high),
      low: round2(low),
      close: round2(close),
      price: round2(price),
      previous_close: round2(prevClose),
      change: diff === null ? null : Number(diff.toFixed(2)),
      change_percent: changePercent === null ? null : Number(changePercent.toFixed(2))
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
