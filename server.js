require("dotenv").config();

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const infoHandler = require("./api/info");
const marketHandler = require("./api/market");

const PORT = Number(process.env.PORT || 3001);
const indexPath = path.join(__dirname, "index.html");

function sendText(res, statusCode, contentType, body) {
  res.writeHead(statusCode, { "Content-Type": contentType });
  res.end(body);
}

function serveIndex(res) {
  fs.readFile(indexPath, (error, file) => {
    if (error) {
      sendText(res, 500, "text/plain; charset=utf-8", "Gagal memuat index.html");
      return;
    }

    sendText(res, 200, "text/html; charset=utf-8", file);
  });
}

const server = http.createServer((req, res) => {
  if (req.method !== "GET") {
    sendText(res, 405, "application/json; charset=utf-8", JSON.stringify({ error: "Method Not Allowed" }));
    return;
  }

  if (req.url === "/" || req.url === "/index.html") {
    serveIndex(res);
    return;
  }

  if (req.url === "/api/info") {
    infoHandler(req, res);
    return;
  }

  if (req.url === "/api/market") {
    Promise.resolve(marketHandler(req, res)).catch((error) => {
      sendText(
        res,
        500,
        "application/json; charset=utf-8",
        JSON.stringify({
          error: true,
          message: error.message
        })
      );
    });
    return;
  }

  sendText(res, 404, "application/json; charset=utf-8", JSON.stringify({ error: "Not Found" }));
});

server.listen(PORT, () => {
  console.log(`Local server running at http://localhost:${PORT}`);
});
