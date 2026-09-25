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

### Perintah deployment Windows yang direkomendasikan

Script deployment sudah dikunci berdasarkan nama team Vercel
`Konstanta Education` dengan scope `konstanta-education`. Script akan berhenti
bila scope tersebut tidak tersedia pada sesi login, sehingga deployment tidak
masuk ke akun pribadi atau team lain.

Target resmi:

- GitHub: `https://github.com/EduKonstanta/digitalsignage`
- Vercel: `https://vercel.com/konstanta-education`

Periksa akses akun tanpa melakukan link atau deployment:

```powershell
.\deploy-production.cmd --check
```

Jalankan deployment production lengkap:

```powershell
.\deploy-production.cmd
```

Script akan memverifikasi remote GitHub, akses team Vercel, environment wajib,
dependency, type-check, test, Prisma Client, dan production build sebelum
menjalankan `vercel deploy --prod`.

### Tombol deploy di GitHub (tanpa auto-deploy)

Commit dan push **tidak** lagi men-deploy otomatis: `vercel.json` memuat
`git.deploymentEnabled: false`. Deploy hanya terjadi saat tombol ditekan:

1. Buka `https://github.com/EduKonstanta/digitalsignage/actions` lalu pilih
   workflow **Deploy Manual**.
2. Klik **Run workflow**, pilih branch `main` (production hanya boleh dari `main`),
   pilih target `production` atau `preview`, lalu **Run workflow**.
3. Workflow menjalankan type-check, lint, dan test, lalu `vercel pull`,
   `vercel build`, dan `vercel deploy --prebuilt`. URL hasilnya ada di ringkasan run.

Tombol ini baru muncul setelah file `.github/workflows/deploy-manual.yml` ada di
branch `main`. Isi tiga secret di GitHub (Settings > Secrets and variables >
Actions > New repository secret) sebelum dipakai pertama kali:

| Secret | Isi |
| --- | --- |
| `VERCEL_TOKEN` | Token dari Vercel > Account Settings > Tokens, dengan akses ke team `konstanta-education` |
| `VERCEL_ORG_ID` | `orgId` di `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | `projectId` di `.vercel/project.json` |

`deploy-production.cmd` tetap bisa dipakai dari laptop dan tidak terpengaruh
`git.deploymentEnabled`. Untuk kembali ke auto-deploy, hapus blok `git` di
`vercel.json`.

### Google Sheets — sumber data live

Data akademik (cabang, ruangan, tutor, program, kelas, mata pelajaran, jadwal)
tidak disimpan di database sama sekali. Aplikasi membacanya langsung dari
spreadsheet berikut pada setiap permintaan (dengan cache singkat ~20 detik):

```text
https://docs.google.com/spreadsheets/d/11bzGZTSG8clR1WQ4E__ULUUnC-eMMeDDnap8mA-qmnw/edit
```

Pastikan spreadsheet dapat dibaca oleh siapa pun yang memiliki link — lokal dan
production membaca Sheet yang sama secara langsung, tanpa database akademik
atau credential yang berbeda.

`GOOGLE_SERVICE_ACCOUNT_JSON` bersifat opsional dan hanya meningkatkan
keandalan pembacaan (memakai Sheets API `batchGet` langsung, bukan endpoint
CSV publik). ID setiap baris dibentuk deterministik dari spreadsheet, tab, dan
kode/kunci baris, sehingga tetap sama pada lokal dan production tanpa perlu
disimpan di mana pun.

Urutan pemrosesan data adalah CABANG → PROGRAM → KELAS → RUANGAN → TUTOR →
MATA_PELAJARAN → JADWAL. Baris master hanya diproses saat berstatus
`SIAP SYNC`; jadwal juga harus memiliki status bentrok `AMAN`. Baris yang tidak
lolos ditahan (dicatat sebagai issue, ditampilkan di halaman Integrasi admin)
dan tidak ikut tampil di aplikasi.

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
vercel teams list
vercel link --scope konstanta-education --project digitalsignage
vercel env add TURSO_DATABASE_URL production --sensitive --scope konstanta-education
vercel env add TURSO_AUTH_TOKEN production --sensitive --scope konstanta-education
vercel env add ATTENDANCE_DEVICE_TOKEN production --sensitive --scope konstanta-education
vercel env add CRON_SECRET production --sensitive --scope konstanta-education
```

Masukkan nilai masing-masing saat diminta. Nilai acak dibuat dengan:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Empat variable di atas adalah yang minimum. Tambahkan berikut ini bila
notifikasi WhatsApp dipakai:

```powershell
vercel env add FONNTE_TOKEN production --sensitive --scope konstanta-education
vercel env add FONNTE_ENABLED production --scope konstanta-education
vercel env add FONNTE_WEBHOOK_SECRET production --sensitive --scope konstanta-education
```

`GOOGLE_SERVICE_ACCOUNT_JSON` bersifat opsional; tanpa itu data akademik dibaca
lewat endpoint CSV publik Sheet.

Variable `SEED_ADMIN_*` **tidak** perlu dipasang di Vercel — hanya skrip seed
yang membacanya, bukan aplikasi yang berjalan.

Environment variable yang baru ditambahkan tidak berlaku pada deployment yang
sudah berjalan; jalankan deploy ulang setelah mengisinya.

### 3. Preview dan production

```powershell
vercel deploy --scope konstanta-education
vercel deploy --prod --scope konstanta-education
```

Untuk deployment production langsung:

```powershell
npm run verify
vercel deploy --prod --scope konstanta-education
```

## Deployment manual ke server Node/VPS

Server harus memiliki Node.js, npm, dan direktori persisten untuk file SQLite.

```powershell
git clone https://github.com/EduKonstanta/digitalsignage.git
Set-Location digitalsignage
Copy-Item .env.example .env
npm ci
npm run db:push
```

Buka `.env` dan isi nilai-nilai yang masih berupa contoh — minimal
`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `ATTENDANCE_DEVICE_TOKEN`, dan
`CRON_SECRET`. Seed akan menolak jalan selama `SEED_ADMIN_PASSWORD` masih
berisi teks contoh bawaan.

```powershell
npm run db:seed
npm run build
$env:NODE_ENV="production"
npm start
```

Seed hanya membuat admin bila email tersebut belum ada. Menjalankannya ulang
tidak mengganti password admin yang sudah terlanjur dibuat — ganti lewat
aplikasi bila akun pertama sempat memakai password lemah.

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

## Presensi siswa dan Fonnte

Tambahkan secret berikut di environment deployment. Jangan menyimpan nilainya
di Git atau memasukkannya langsung ke source code:

```text
ATTENDANCE_DEVICE_TOKEN=<TOKEN_ACAK_PERANGKAT>
FONNTE_TOKEN=<DEVICE_TOKEN_FONNTE>
FONNTE_ENABLED=true
FONNTE_WEBHOOK_SECRET=<SECRET_ACAK_WEBHOOK>
```

Atur URL webhook pada perangkat Fonnte menjadi:

```text
https://<DOMAIN>/api/v1/integrations/fonnte/webhook?secret=<FONNTE_WEBHOOK_SECRET>
```

Pembaca RFID/QR mengirim presensi ke `POST /api/v1/attendance/tap` dengan
header `Authorization: Bearer <ATTENDANCE_DEVICE_TOKEN>` dan body berikut:

```json
{
  "cardUid": "UID-KARTU-SISWA",
  "deviceId": "KIOSK-LOBBY-01"
}
```

Jika `type` tidak dikirim, sistem memilih `CHECK_IN` atau `CHECK_OUT` berdasarkan
presensi terakhir siswa pada hari yang sama di zona waktu Asia/Jakarta.

Set `voiceGender` pada data siswa ke `MALE`, `FEMALE`, atau `AUTO` melalui API
siswa. Nilai eksplisit lebih aman daripada menebak gender berdasarkan nama.
Display akan memilih voice Indonesia yang paling sesuai; jika voice pria/wanita
tidak tersedia di browser kiosk, sistem memakai voice Indonesia bawaan dengan
penyesuaian pitch sebagai fallback.

Saat siswa tap masuk, TV menampilkan "<Nama> telah hadir di Konstanta Education" dan
mengucapkan sapaan ala anak Jaksel, mis. "<Nama> telah hadir di Konstanta Education.
Semangat belajar ya, ...". Sapaan hanya bunyi setelah **Aktifkan Audio** diklik sekali
di TV (aturan browser). Siswa dengan `voiceGender` `AUTO` memakai suara bawaan TV.

## Memasangkan layar TV

1. Buka dashboard admin dari laptop, lalu masuk ke **Layar TV**.
2. Klik **Tambah Layar TV**, pilih cabang/ruangan, lalu simpan.
3. Klik **Salin Alamat Display** pada kartu layar tersebut. Alamatnya berbentuk
   `https://<DOMAIN>/display?screen=SCR-XXXXXXXXXX`.
4. Di browser TV atau Android TV, buka alamat itu.
5. Klik **Aktifkan Audio** satu kali agar browser mengizinkan suara media dan voice announcement.

Tidak ada kode pairing. Tap kartu siswa langsung tampil di setiap layar yang membuka
`/display`. Parameter `?screen=` hanya menentukan nama, cabang, jadwal, dan playlist
milik layar itu serta membuat statusnya tampil `ONLINE` di dashboard. Tanpa parameter
itu, TV tetap jalan dengan konten bawaan (semua jadwal dan media terbit).

Endpoint `/api/v1/attendance/latest` dan `/api/v1/events/stream` terbuka tanpa login
karena dibaca langsung oleh `/display`. Keduanya hanya mengembalikan tap 2 menit
terakhir, tanpa UID kartu dan tanpa nomor telepon.
