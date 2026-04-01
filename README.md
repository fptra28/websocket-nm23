# Market WebSocket

WebSocket server Node.js untuk broadcast data market Yahoo Finance tiap 5 detik.

## Install

```powershell
npm.cmd install
```

## Jalankan

```powershell
node server.js
```

Default:

- WebSocket: `ws://localhost:3001`
- Interval: `5000 ms`

## Konfigurasi

- `PORT` -> default `3001`
- `INTERVAL_MS` -> default `5000`

## WSS

Kalau nanti mau `wss://`, isi env berikut:

- `SSL_KEY_PATH`
- `SSL_CERT_PATH`
- `SSL_CA_PATH` optional
- `SSL_PASSPHRASE` optional

Contoh:

```powershell
$env:SSL_KEY_PATH="certs\localhost-key.pem"
$env:SSL_CERT_PATH="certs\localhost.pem"
node server.js
```

Kalau dua env utama di atas ada, server otomatis naik sebagai `wss://`.

## Payload

Client akan menerima:

- `type: "info"` saat connect
- `type: "market"` berisi array quote market

## Catatan

Kode memakai `fetch` bawaan Node.js, jadi tidak perlu `node-fetch`.
