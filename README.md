# Market Polling for Vercel

Project ini sudah diubah ke polling-only supaya cocok untuk Vercel.

## Struktur

- `index.html` -> halaman demo polling
- `api/info.js` -> metadata endpoint
- `api/market.js` -> snapshot market
- `api/_lib/market.js` -> shared logic fetch Yahoo Finance

## Endpoint

- `GET /api/info`
- `GET /api/market`

Contoh:

```js
const res = await fetch("https://your-app.vercel.app/api/market");
const data = await res.json();
console.log(data);
```

## Local Dev

Jalankan dengan Vercel CLI:

```powershell
vercel dev
```

Kalau CLI belum ada:

```powershell
npm.cmd install -g vercel
```

## Konfigurasi

- `INTERVAL_MS` -> default `5000`

Endpoint `api/market` mengirim header cache `s-maxage` sesuai `INTERVAL_MS` agar polling lebih efisien di Vercel.
