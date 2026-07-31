# Deployment Manual

## Verifikasi sebelum deployment

Jalankan dari root proyek:

```powershell
npm ci
npm run verify
```

Perintah `verify` menjalankan type-check, unit test, Prisma Client generation,
dan production build.

## Deployment manual ke Vercel

Vercel memiliki filesystem sementara. Gunakan database libSQL/Turso untuk
production; jangan menggunakan file `dev.db` sebagai database production.

### 1. Siapkan database Turso

Instal dan login ke Turso CLI, lalu buat database:

```powershell
turso auth login
turso db create digitalsignage
turso db show digitalsignage --url
turso db tokens create digitalsignage
```

Simpan URL dan token yang dihasilkan. Buat SQL dari schema Prisma lalu
terapkan ke database Turso:

```powershell
npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script |
  Set-Content -Encoding utf8 prisma/schema.sql
Get-Content prisma/schema.sql -Raw | turso db shell digitalsignage
```

Untuk mengisi data awal, set environment variable hanya pada sesi terminal
saat ini:

```powershell
$env:TURSO_DATABASE_URL="<URL_DATABASE_TURSO>"
$env:TURSO_AUTH_TOKEN="<TOKEN_DATABASE_TURSO>"
$env:SEED_ADMIN_EMAIL="<EMAIL_ADMIN>"
$env:SEED_ADMIN_PASSWORD="<PASSWORD_ADMIN_YANG_KUAT>"
npm run db:seed
```

Jangan gunakan password bawaan untuk production. Hapus variable sensitif dari
sesi terminal dan file SQL sementara setelah database berhasil dibuat:

```powershell
Remove-Item Env:TURSO_AUTH_TOKEN
Remove-Item Env:SEED_ADMIN_PASSWORD
Remove-Item -LiteralPath prisma/schema.sql
```

### 2. Link proyek dan atur environment Vercel

```powershell
npm install --global vercel
vercel login
vercel link
vercel env add TURSO_DATABASE_URL production --sensitive
vercel env add TURSO_AUTH_TOKEN production --sensitive
vercel env add AUTH_SECRET production --sensitive
vercel env add APP_URL production
```

Masukkan nilai masing-masing saat diminta. `APP_URL` harus berisi URL production
lengkap, misalnya `https://digitalsignage.example.com`.

Tambahkan variable integrasi lain dari `.env.example` jika fitur tersebut
digunakan.

### 3. Preview dan production

```powershell
vercel deploy
vercel deploy --prod
```

Untuk deployment production langsung:

```powershell
npm run verify
vercel deploy --prod
```

## Deployment manual ke server Node/VPS

Server harus memiliki Node.js, npm, dan direktori persisten untuk file SQLite.

```powershell
git clone https://github.com/EduKonstanta/digitalsignage.git
Set-Location digitalsignage
Copy-Item .env.example .env
npm ci
npm run db:push
npm run db:seed
npm run build
$env:NODE_ENV="production"
npm start
```

Untuk update berikutnya:

```powershell
git pull origin main
npm ci
npm run db:push
npm run build
npm start
```

Gunakan process manager seperti PM2 atau service manager sistem operasi agar
aplikasi otomatis hidup kembali setelah server restart.
