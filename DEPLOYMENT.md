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
vercel env add AUTH_SECRET production --sensitive --scope konstanta-education
vercel env add APP_URL production --scope konstanta-education
```

Masukkan nilai masing-masing saat diminta. `APP_URL` harus berisi URL production
lengkap, misalnya `https://digitalsignage.example.com`.

Tambahkan variable integrasi lain dari `.env.example` jika fitur tersebut
digunakan.

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

## Memasangkan layar TV

1. Buka dashboard admin dari laptop, lalu masuk ke **Daftar Layar Display**.
2. Klik **Tambah Layar TV**, pilih cabang/ruangan, lalu simpan kode pairing 6 digit.
3. Di browser TV atau Android TV, buka `https://<DOMAIN>/display`.
4. Klik **Pasangkan Layar**, masukkan kode 6 digit, lalu tekan **Pasangkan**.
5. Klik **Aktifkan Audio** satu kali agar browser mengizinkan suara media dan voice announcement.

Kode berlaku 15 menit dan hanya dapat dipakai sekali. Jika kedaluwarsa atau TV
diganti, klik **Kode Pairing** atau **Pasangkan Ulang** pada kartu layar di dashboard.
Pairing ulang mencabut token TV lama. Setelah pairing berhasil, TV memakai nama,
cabang, jadwal, dan playlist milik layar tersebut serta tampil `ONLINE` di dashboard.
