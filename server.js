const fs = require("node:fs");
const http = require("node:http");
const https = require("node:https");
const path = require("node:path");
const { WebSocketServer, WebSocket } = require("ws");

const PORT = Number(process.env.PORT || 3001);
const INTERVAL_MS = Number(process.env.INTERVAL_MS || 5000);

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

function createServer() {
  const tlsOptions = loadTlsOptions();
  const requestHandler = (_req, res) => {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(
      JSON.stringify({
        name: "market-websocket",
        protocol: tlsOptions ? "wss" : "ws",
        port: PORT,
        interval_ms: INTERVAL_MS,
        symbols
      })
    );
  };

  const server = tlsOptions
    ? https.createServer(tlsOptions, requestHandler)
    : http.createServer(requestHandler);

  return {
    server,
    secure: Boolean(tlsOptions)
  };
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

const { server, secure } = createServer();
const wss = new WebSocketServer({ server });

async function broadcast() {
  if (wss.clients.size === 0) {
    return;
  }

  const data = await fetchAll();
  const payload = JSON.stringify({
    type: "market",
    data,
    at: new Date().toISOString()
  });

  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
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
      symbols
    })
  );

  try {
    const data = await fetchAll();
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "market",
          data,
          at: new Date().toISOString()
        })
      );
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
