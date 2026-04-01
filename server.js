const fs = require("node:fs");
const http = require("node:http");
const https = require("node:https");
const path = require("node:path");
const { WebSocketServer, WebSocket } = require("ws");

const PORT = Number(process.env.PORT || 3001);
const INTERVAL_MS = Number(process.env.INTERVAL_MS || 5000);
const publicDir = path.join(__dirname, "public");
const indexPath = path.join(publicDir, "index.html");

const symbols = [
  "^JKSE",
  "^JKLQ45",
  "BBCA.JK",
  "BBRI.JK",
  "BBNI.JK",
  "BMRI.JK",
  "TLKM.JK",
  "ASII.JK",
  "UNVR.JK",
  "ICBP.JK"
];

let latestMarketPayload = null;
let lastFetchedAt = 0;
let inFlightMarketPromise = null;

function resolvePath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.join(__dirname, filePath);
}

function loadTlsOptions() {
  const keyPath = process.env.SSL_KEY_PATH;
  const certPath = process.env.SSL_CERT_PATH;
  const caPath = process.env.SSL_CA_PATH;

  if (!keyPath && !certPath && !caPath) {
    return null;
  }

  if (!keyPath || !certPath) {
    throw new Error("SSL_KEY_PATH dan SSL_CERT_PATH harus diisi bersamaan untuk mode WSS.");
  }

  const options = {
    key: fs.readFileSync(resolvePath(keyPath)),
    cert: fs.readFileSync(resolvePath(certPath))
  };

  if (caPath) {
    options.ca = fs.readFileSync(resolvePath(caPath));
  }

  if (process.env.SSL_PASSPHRASE) {
    options.passphrase = process.env.SSL_PASSPHRASE;
  }

  return options;
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function serveIndexHtml(res) {
  fs.readFile(indexPath, (error, file) => {
    if (error) {
      sendJson(res, 500, { error: "Gagal memuat halaman demo" });
      return;
    }

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(file);
  });
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

async function fetchAll() {
  return Promise.all(symbols.map((symbol) => fetchSymbol(symbol)));
}

async function getMarketPayload() {
  const now = Date.now();

  if (latestMarketPayload && now - lastFetchedAt < INTERVAL_MS) {
    return latestMarketPayload;
  }

  if (inFlightMarketPromise) {
    return inFlightMarketPromise;
  }

  inFlightMarketPromise = (async () => {
    const data = await fetchAll();
    const payload = {
      type: "market",
      data,
      at: new Date().toISOString()
    };

    latestMarketPayload = payload;
    lastFetchedAt = Date.now();

    return payload;
  })();

  try {
    return await inFlightMarketPromise;
  } finally {
    inFlightMarketPromise = null;
  }
}

const tlsOptions = loadTlsOptions();
const secure = Boolean(tlsOptions);

async function handleRequest(req, res) {
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method Not Allowed" });
    return;
  }

  const baseUrl = `${secure ? "https" : "http"}://${req.headers.host || `localhost:${PORT}`}`;
  const url = new URL(req.url || "/", baseUrl);

  if (url.pathname === "/" || url.pathname === "/index.html") {
    serveIndexHtml(res);
    return;
  }

  if (url.pathname === "/api/info") {
    sendJson(res, 200, {
      name: "market-websocket",
      ws_protocol: secure ? "wss" : "ws",
      ws_url: `${secure ? "wss" : "ws"}://${req.headers.host || `localhost:${PORT}`}`,
      polling_url: `${secure ? "https" : "http"}://${req.headers.host || `localhost:${PORT}`}/api/market`,
      port: PORT,
      interval_ms: INTERVAL_MS,
      symbols
    });
    return;
  }

  if (url.pathname === "/api/market") {
    const payload = await getMarketPayload();
    sendJson(res, 200, {
      ...payload,
      transport: "polling"
    });
    return;
  }

  sendJson(res, 404, { error: "Not Found" });
}

const requestListener = (req, res) => {
  handleRequest(req, res).catch((error) => {
    console.error("Request error:", error.message);
    sendJson(res, 500, { error: "Internal Server Error" });
  });
};

const server = secure
  ? https.createServer(tlsOptions, requestListener)
  : http.createServer(requestListener);

const wss = new WebSocketServer({ server });

async function broadcast() {
  if (wss.clients.size === 0) {
    return;
  }

  const payload = await getMarketPayload();
  const message = JSON.stringify(payload);

  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

const intervalId = setInterval(() => {
  broadcast().catch((error) => {
    console.error("Broadcast error:", error.message);
  });
}, INTERVAL_MS);

wss.on("connection", async (ws) => {
  console.log("Client connected");

  ws.send(
    JSON.stringify({
      type: "info",
      message: "connected to market websocket",
      protocol: secure ? "wss" : "ws",
      interval_ms: INTERVAL_MS,
      polling_url: "/api/market",
      symbols
    })
  );

  try {
    const payload = await getMarketPayload();
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  } catch (error) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "error",
          message: error.message
        })
      );
    }
  }

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

server.listen(PORT, () => {
  console.log(`${secure ? "WSS" : "WS"} running on port`, PORT);
  console.log(`Polling endpoint ready at ${secure ? "https" : "http"}://localhost:${PORT}/api/market`);
});

function shutdown() {
  clearInterval(intervalId);
  wss.close(() => {
    server.close(() => {
      process.exit(0);
    });
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
