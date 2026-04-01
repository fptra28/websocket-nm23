# Market WebSocket

Server Node.js untuk stream data market Yahoo Finance dengan dua opsi konsumsi:

- WebSocket untuk push realtime
- Polling HTTP untuk tarik data berkala

## Install

```powershell
npm.cmd install
```

## Jalankan

```powershell
node server.js
```

Default:

- Demo page: `http://localhost:3001`
- WebSocket: `ws://localhost:3001`
- Polling: `http://localhost:3001/api/market`
- Interval cache/broadcast: `5000 ms`

## Endpoint

- `GET /api/info` -> metadata koneksi
- `GET /api/market` -> snapshot market untuk polling

Contoh polling:

```js
const res = await fetch("http://localhost:3001/api/market");
const data = await res.json();
console.log(data);
```

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

Kalau dua env utama di atas ada, server otomatis naik sebagai `wss://` dan endpoint polling ikut pindah ke `https://`.

## Catatan

Kode memakai `fetch` bawaan Node.js, jadi tidak perlu `node-fetch`.
