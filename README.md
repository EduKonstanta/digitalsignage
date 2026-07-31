# KE Digital Signage

Aplikasi digital signage berbasis Next.js, Prisma, dan SQLite/libSQL untuk
pengelolaan jadwal, pengumuman, media, playlist, serta layar informasi.

## Menjalankan secara lokal

```powershell
Copy-Item .env.example .env
npm ci
npm run db:push
npm run db:seed
npm run dev
```

Buka `http://localhost:3000`. Petunjuk deployment produksi dan command manual
tersedia di [DEPLOYMENT.md](./DEPLOYMENT.md).
