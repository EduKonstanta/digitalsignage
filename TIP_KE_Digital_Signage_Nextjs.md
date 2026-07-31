
# TECHNICAL IMPLEMENTATION PLAN (TIP)

## KE Digital Signage — Next.js Responsive PWA

**Versi Dokumen:** 1.0  
**Tanggal Penyusunan:** 28 Juli 2026  
**Organisasi:** Konstanta Education  
**Dokumen Acuan:** PRD KE Digital Signage v1.0 dan Template TIP CAMD  
**Status:** Siap digunakan sebagai panduan prompting dan implementasi  
**Bahasa:** Bahasa Indonesia  
**Tagline Produk:** Grow · Innovative · Engage

> **Keputusan platform penting:** Walaupun kebutuhan awal menyebut “mobile app”, PRD mendefinisikan produk sebagai sistem digital signage berbasis web untuk TV, Android TV, TV Box, desktop, tablet, dan mobile. Karena itu implementasi diposisikan sebagai **responsive web application + Progressive Web App (PWA)** berbasis Next.js, bukan aplikasi native Expo/React Native. Pendekatan ini tetap memberikan pengalaman seperti aplikasi pada mobile, sekaligus memenuhi kebutuhan fullscreen/kiosk pada TV.

---


## 0. Starter Template

Tidak ada starter repository atau base project yang dilampirkan. Fase 0 untuk clone starter **dilewati**. Implementasi dimulai dari Fase 1 dengan project Next.js baru.

### Fase 0 — Clone & Verifikasi Starter Template
- **Scope**: Tidak berlaku karena starter template tidak tersedia.
- **Definition of Done**: Tidak diperlukan.
- **Status**: [x] Dilewati / N/A

---


## 1. Project Overview

### 1.1 Ringkasan Produk

**KE Digital Signage** adalah sistem informasi operasional real-time yang memiliki dua antarmuka utama:

1. **Admin Dashboard** untuk mengelola jadwal, data akademik, pengumuman, media, running text, playlist, perangkat, integrasi Google Sheets, preview, audit log, dan emergency broadcast.
2. **Display Application** yang bersifat read-only dan berjalan fullscreen/kiosk pada TV atau browser perangkat display. Display harus tetap menampilkan cache terakhir saat offline.

### 1.2 Target Platform

- Smart TV dengan browser modern.
- Android TV dan Android TV Box.
- Mini PC/laptop melalui HDMI.
- Desktop dan laptop untuk Admin Dashboard.
- Tablet dan mobile untuk monitoring, preview, serta operasi admin terbatas.
- Resolusi prioritas: 1920×1080 landscape 16:9.
- Resolusi tambahan: 1280×720, 1366×768, dan 3840×2160.

### 1.3 Tujuan Utama MVP

- Admin dapat login dan mengelola seluruh konten inti.
- Jadwal kelas dapat dibuat, diubah, dipublish, dan ditampilkan real-time.
- Display dapat dipasangkan melalui pairing code.
- Layar dapat menjalankan playlist dan mode jadwal secara otomatis.
- Pengumuman, media, dan running text dapat ditargetkan ke layar tertentu.
- Emergency broadcast dapat mengambil alih layar dan dikembalikan ke state sebelumnya.
- Display tetap berguna saat internet putus melalui PWA dan IndexedDB cache.
- Google Sheets dapat menjadi sumber sinkronisasi jadwal.
- Dashboard dapat memonitor heartbeat dan status online/offline perangkat.

### 1.4 Keputusan Arsitektur MVP

- **Satu repository Next.js full-stack** untuk mempercepat MVP dan meminimalkan koordinasi antarservice.
- **App Router** digunakan untuk route admin, display, route handler REST, dan Server Actions yang sesuai.
- **PostgreSQL** menjadi source of truth.
- **Prisma ORM** untuk schema, migration, dan akses data type-safe.
- **Redis** untuk pub/sub event, rate limit, cache sementara, lock, dan BullMQ.
- **Server-Sent Events (SSE)** dipilih untuk event satu arah dari server ke display; acknowledgement dan heartbeat tetap melalui REST. Polling digunakan sebagai fallback.
- **S3-compatible object storage** untuk gambar, video, audio, thumbnail, dan asset cache.
- **Service Worker + IndexedDB** untuk offline shell dan cache konten display.
- **Docker-based deployment** agar SSE, worker, Redis, dan process jangka panjang dapat dikontrol. Arsitektur tidak bergantung pada serverless function berumur pendek.

### 1.5 Batas MVP

Tidak termasuk: drag-and-drop layout editor lanjutan, screenshot remote perangkat, multi-role selain Admin, AI summarization, analitik impresi, integrasi LMS/presensi, multilingual signage, dan native mobile binary.

### 1.6 Cara Menggunakan AI dalam Development

AI digunakan sebagai pair programmer untuk menghasilkan kode per fase, membuat test, memeriksa schema, dan membantu debugging. Setiap prompt hanya boleh mengerjakan satu fase. Developer wajib menjalankan lint, type-check, test, migration, dan uji browser sebelum menandai fase selesai.

### 1.7 Prinsip Implementasi

- TV-first, tetapi admin tetap mobile-responsive.
- Display read-only dan tidak bergantung pada session Admin.
- Tidak ada layar kosong; selalu ada loading state, cached state, empty state, atau fallback.
- Status jadwal dihitung oleh domain service yang sama pada server dan client.
- Semua publish menghasilkan event versioned dan dapat diulang secara idempotent.
- Emergency memiliki prioritas tertinggi dan membutuhkan konfirmasi dua langkah.
- File dan embed diperlakukan sebagai input tidak tepercaya.

---

## 2. Tech Stack & Dependencies

| Area | Teknologi | Versi Rekomendasi | Alasan |
|---|---|---|---|
| Runtime | Node.js | 24 LTS | Runtime produksi stabil dan didukung untuk aplikasi Next.js. |
| Framework | Next.js | 16.x Active LTS | App Router, Server Components, Route Handlers, optimasi asset, dan satu codebase full-stack. |
| UI Library | React | 19.2.x | Komponen UI admin dan display dengan ekosistem matang. |
| Bahasa | TypeScript | 7.x | Strict typing untuk model, API contract, event, dan komponen. |
| Package Manager | pnpm | 10.x | Install cepat, lockfile deterministik, dan workspace-friendly. |
| Styling | Tailwind CSS | 4.3.x | Design token, responsive UI, dan viewport-based display scaling. |
| UI Primitives | Radix UI / shadcn/ui | latest stable compatible | Aksesibilitas dan komponen admin yang dapat dikustomisasi. |
| Icons | Lucide React | latest stable compatible | Ikon konsisten dan ringan. |
| Forms | React Hook Form | 7.x | Form kompleks dengan performa baik. |
| Validation | Zod | 4.x | Schema bersama untuk server, client, environment, dan import data. |
| Server State | TanStack Query | 5.x | Refetch, cache, mutation, dan monitoring data dinamis. |
| Local UI State | Zustand | 5.x | State kecil seperti preview simulator, playlist draft, dan display runtime. |
| Table | TanStack Table | 8.x | Data table headless dengan filter, sort, dan pagination. |
| Drag & Drop | dnd-kit | latest stable compatible | Pengurutan item playlist yang aksesibel. |
| Date/Time | date-fns + date-fns-tz | 4.x / latest | Perhitungan jadwal dan timezone cabang. |
| Auth | Auth.js / next-auth | 5.x | Session cookie aman, credential login, dan route protection. |
| Password | argon2 | latest stable | Hash password sesuai security requirement. |
| Database | PostgreSQL | 18.x | Relasional, transaksi, JSONB, indeks, dan scale yang memadai. |
| ORM | Prisma ORM | 7.x | Schema, migration, seed, transaksi, dan client type-safe. |
| Cache/Event | Redis | 8.x | Pub/sub, lock, cache, rate limiting, dan presence. |
| Queue | BullMQ | 5.x | Job sinkronisasi, media processing, dan voice queue. |
| Object Storage | S3-compatible + AWS SDK v3 | latest stable | Upload presigned, metadata, dan CDN-friendly. |
| PWA | Serwist | latest stable compatible | Service worker, precache app shell, dan runtime caching. |
| IndexedDB | Dexie | 4.x | Cache konfigurasi, playlist, schedules, media manifest, dan sync metadata. |
| Realtime Client | EventSource API | native browser | SSE sederhana dan efisien untuk event server-ke-display. |
| CSV/Spreadsheet | Papa Parse | 5.x | Parsing CSV dan preview import. |
| Google Sheets | googleapis | latest stable | Mengambil data Sheets melalui service account/OAuth sesuai deployment. |
| Media | HTML5 video/audio | native browser | Kompatibilitas luas pada browser TV dengan fallback. |
| QR Code | qrcode | 1.x | Membuat QR code pada display dan pairing. |
| Unit Test | Vitest | latest stable compatible | Test domain service, mapper, validator, dan utilities. |
| Component Test | Testing Library | latest stable compatible | Test perilaku komponen dan aksesibilitas. |
| E2E | Playwright | latest stable compatible | Uji login, publish, pairing, display, offline, dan emergency. |
| Lint/Format | ESLint + Prettier | latest stable compatible | Konsistensi dan quality gate. |
| Logging | Pino | 9.x | Structured logging dan korelasi request/job/device. |
| Observability | OpenTelemetry + Sentry | latest stable | Error tracking, trace, dan monitoring produksi. |
| Container | Docker + Docker Compose | current stable | Local stack dan deployment reproduktif. |

### 2.1 Catatan Versi

- Versi di atas adalah baseline saat TIP disusun. Gunakan patch terbaru dalam major yang sama setelah melewati test suite.
- Semua dependency harus dikunci melalui `pnpm-lock.yaml`.
- Dependabot atau Renovate dijalankan terjadwal, tetapi upgrade major tidak boleh otomatis merge.
- Package display harus diaudit terhadap kompatibilitas browser Android TV dan WebView lama.

### 2.2 Environment Variables Minimum

```env
NODE_ENV=development
APP_URL=http://localhost:3000
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
AUTH_SECRET=...
AUTH_TRUST_HOST=true
REDIS_URL=redis://...
S3_ENDPOINT=...
S3_REGION=auto
S3_BUCKET=...
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_PUBLIC_BASE_URL=...
GOOGLE_SERVICE_ACCOUNT_JSON=...
ENCRYPTION_KEY=...
CRON_SECRET=...
SENTRY_DSN=...
```

Rahasia tidak boleh masuk ke repository. Buat `.env.example` hanya dengan nama key dan contoh aman.

---


## 3. Struktur Folder Project

```text
ke-digital-signage/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/[token]/page.tsx
│   ├── (admin)/
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── schedules/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   ├── calendar/page.tsx
│   │   │   └── [id]/edit/page.tsx
│   │   ├── academic/
│   │   │   ├── branches/page.tsx
│   │   │   ├── rooms/page.tsx
│   │   │   ├── tutors/page.tsx
│   │   │   ├── subjects/page.tsx
│   │   │   ├── programs/page.tsx
│   │   │   └── classes/page.tsx
│   │   ├── content/
│   │   │   ├── announcements/page.tsx
│   │   │   ├── media/page.tsx
│   │   │   ├── running-text/page.tsx
│   │   │   ├── voice/page.tsx
│   │   │   └── templates/page.tsx
│   │   ├── playlists/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/edit/page.tsx
│   │   ├── screens/
│   │   │   ├── page.tsx
│   │   │   ├── pairing/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── integrations/
│   │   │   ├── page.tsx
│   │   │   └── google-sheets/[id]/page.tsx
│   │   ├── emergency/page.tsx
│   │   ├── preview/page.tsx
│   │   ├── activity-logs/page.tsx
│   │   └── settings/page.tsx
│   ├── display/
│   │   ├── page.tsx
│   │   ├── pair/page.tsx
│   │   └── preview/[screenId]/page.tsx
│   ├── api/v1/
│   │   ├── auth/...
│   │   ├── schedules/...
│   │   ├── announcements/...
│   │   ├── media/...
│   │   ├── running-texts/...
│   │   ├── voice/...
│   │   ├── playlists/...
│   │   ├── screens/...
│   │   ├── display/...
│   │   ├── integrations/...
│   │   ├── emergency/...
│   │   └── events/stream/route.ts
│   ├── manifest.ts
│   ├── layout.tsx
│   ├── globals.css
│   ├── error.tsx
│   ├── not-found.tsx
│   └── loading.tsx
├── components/
│   ├── ui/                       # Primitive shadcn/Radix
│   ├── admin/                    # Sidebar, header, tables, forms
│   ├── display/                  # Schedule board, ticker, overlay
│   ├── forms/                    # Field wrappers dan domain form
│   ├── media/                    # Uploader, player, thumbnail
│   └── feedback/                 # Empty/error/loading states
├── features/
│   ├── auth/
│   ├── academic/
│   ├── schedules/
│   ├── announcements/
│   ├── media/
│   ├── running-text/
│   ├── voice/
│   ├── playlists/
│   ├── screens/
│   ├── display-runtime/
│   ├── integrations/
│   ├── emergency/
│   └── audit/
│       ├── actions.ts            # Server Actions bila cocok
│       ├── api.ts                # Client API wrapper
│       ├── schemas.ts            # Zod schema
│       ├── types.ts              # Domain types
│       ├── queries.ts            # Prisma/read models
│       └── components/           # Feature-level components
├── lib/
│   ├── auth.ts
│   ├── db.ts
│   ├── redis.ts
│   ├── queue.ts
│   ├── storage.ts
│   ├── logger.ts
│   ├── env.ts
│   ├── permissions.ts
│   ├── api-response.ts
│   ├── rate-limit.ts
│   ├── crypto.ts
│   └── constants.ts
├── domain/
│   ├── schedule-status.ts
│   ├── content-priority.ts
│   ├── playlist-resolver.ts
│   ├── targeting.ts
│   ├── device-presence.ts
│   └── time-drift.ts
├── workers/
│   ├── index.ts
│   ├── google-sheets-sync.worker.ts
│   ├── media-metadata.worker.ts
│   ├── voice.worker.ts
│   └── cleanup.worker.ts
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── public/
│   ├── brand/
│   ├── icons/
│   ├── offline/
│   └── sw.js                     # Generated oleh Serwist
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── fixtures/
│   └── e2e/
├── scripts/
│   ├── create-admin.ts
│   ├── seed-demo.ts
│   ├── check-storage.ts
│   └── check-display-compat.ts
├── middleware.ts
├── next.config.ts
├── serwist.config.ts
├── playwright.config.ts
├── vitest.config.ts
├── docker-compose.yml
├── Dockerfile
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── eslint.config.mjs
├── .env.example
└── README.md
```

### 3.1 Aturan Penempatan Kode

- `app/` hanya untuk routing, layout, loading/error boundary, dan komposisi halaman.
- `features/` berisi use case spesifik fitur; jangan menaruh semua logika di `page.tsx`.
- `domain/` harus bebas dari React dan Prisma agar mudah diuji.
- `components/ui/` tidak mengetahui domain bisnis.
- `lib/` berisi adapter/infrastruktur bersama.
- `workers/` dijalankan sebagai process terpisah dari web server.
- Akses Prisma hanya dari server modules; jangan pernah import Prisma Client pada client component.
- Semua file client diberi `'use client'` hanya jika benar-benar membutuhkan state/effect/browser API.

---

## 4. Data Model & Storage

### 4.1 Keputusan Storage

Aplikasi membutuhkan authentication, sinkronisasi antarperangkat, data real-time, audit, relasi kompleks, dan banyak layar. Karena itu **AsyncStorage tidak digunakan sebagai storage utama** dan **Supabase bukan keputusan default**. Storage dipisah sebagai berikut:

- **PostgreSQL**: source of truth seluruh data bisnis.
- **Redis**: cache sementara, pub/sub SSE, presence, lock, rate limit, dan BullMQ.
- **S3-compatible storage**: file media, thumbnail, audio, subtitle.
- **IndexedDB (Dexie) pada Display**: cache lokal konfigurasi, jadwal, playlist, pengumuman, ticker, dan manifest media.
- **Cache Storage API/Service Worker**: app shell dan response statis.
- **Cookie HttpOnly**: token session Admin; bukan localStorage.

### 4.2 Model Inti

| Model | Field Utama | Keterangan |
|---|---|---|
| Admin | id, name, email, passwordHash, isActive, lastLoginAt, createdAt, updatedAt | Akun Admin tunggal-role untuk dashboard. |
| AuthSession | id, adminId, sessionTokenHash, expiresAt, revokedAt, ipAddress, userAgent | Session server-side; cookie hanya menyimpan token opaque. |
| PasswordResetToken | id, adminId, tokenHash, expiresAt, usedAt | Reset password sekali pakai. |
| Branch | id, name, code, address, timezone, isActive, createdAt, updatedAt | Cabang dan timezone operasional. |
| Room | id, branchId, name, floor, capacity, status, aliases, createdAt, updatedAt | Ruangan dan variasi nama untuk mapping. |
| Tutor | id, name, displayName, title, photoUrl, aliases, isActive, createdAt, updatedAt | KangGuru/tutor yang tampil pada jadwal. |
| Program | id, name, level, color, isActive, createdAt, updatedAt | Program seperti ELC, SNBT, TKA. |
| Class | id, programId, name, academicYear, isActive, createdAt, updatedAt | Rombongan/kelas dalam program. |
| Subject | id, name, shortName, icon, aliases, isActive | Mata pelajaran. |
| Schedule | id, branchId, programId, classId, subjectId, tutorId, roomId, startAt, endAt, manualStatus, notes, sourceType, sourceReference, sourceVersion, publishedAt, createdAt, updatedAt, archivedAt | Jadwal dan sumber sinkronisasi. |
| Announcement | id, title, slug, summary, body, category, priority, icon, imageUrl, startsAt, endsAt, status, createdById, publishedAt, archivedAt | Pengumuman terjadwal dan prioritas. |
| MediaAsset | id, name, mediaType, storageKey, fileUrl, externalUrl, thumbnailUrl, durationSeconds, width, height, fileSize, mimeType, orientation, subtitleUrl, audioEnabled, expiresAt, tags, status, checksum | Asset internal/eksternal. |
| RunningText | id, text, speed, separator, priority, startsAt, endsAt, status, createdById | Antrean ticker. |
| VoiceAnnouncement | id, text, audioUrl, openingAudioUrl, voiceName, language, volume, repetitions, intervalSeconds, scheduledAt, priority, status, createdById | Voice queue dan metadata playback. |
| VoicePlaybackLog | id, voiceAnnouncementId, screenId, playbackStatus, startedAt, completedAt, errorMessage, attempt | Acknowledgement pemutaran per layar. |
| Playlist | id, name, description, priority, isActive, version, createdById, createdAt, updatedAt | Container urutan konten. |
| PlaylistItem | id, playlistId, contentType, contentId, sequence, durationSeconds, transition, volume, startsAt, endsAt, daysOfWeek, timeRules, conditions, isEnabled | Aturan tayang tiap item. |
| Screen | id, deviceId, deviceTokenHash, pairingCodeHash, pairingExpiresAt, name, branchId, roomId, floor, resolution, orientation, playlistId, templateKey, status, lastSeenAt, lastSyncAt, currentContent, appVersion, volumeDefault, metadata, revokedAt | Identitas dan state perangkat. |
| ScreenGroup | id, name, description, createdAt | Pengelompokan layar. |
| ScreenGroupMember | groupId, screenId | Relasi many-to-many. |
| ScreenAssignment | id, targetType, targetId, contentType, contentId, priority, startsAt, endsAt | Target konten ke screen/group/branch/room. |
| EmergencyBroadcast | id, title, instruction, severity, icon, voiceEnabled, audioUrl, startsAt, endedAt, createdById, status, version | Konten takeover prioritas tertinggi. |
| Integration | id, provider, name, credentialsEncrypted, configuration, status, lastSyncAt, createdAt, updatedAt | Konfigurasi Google Sheets dan sumber lain. |
| IntegrationMapping | id, integrationId, sourceField, targetField, transformationRule, defaultValue, sequence | Mapping field eksternal. |
| SyncRun | id, integrationId, status, startedAt, finishedAt, insertedCount, updatedCount, skippedCount, errorCount, cursor, summary | Riwayat proses sinkronisasi. |
| SyncError | id, syncRunId, sourceRow, field, code, message, rawData | Error per baris yang dapat ditinjau Admin. |
| ActivityLog | id, actorId, action, entityType, entityId, beforeData, afterData, ipAddress, requestId, createdAt | Audit trail perubahan Admin. |
| DeviceHeartbeat | id, screenId, connectionStatus, currentContent, memoryUsage, storageUsage, appVersion, clientTime, serverReceivedAt, timeDriftSeconds | Monitoring perangkat dan drift waktu. |
| DisplayEvent | id, organizationVersion, eventType, targetType, targetId, payload, createdAt, expiresAt | Event versioned untuk SSE/polling recovery. |
| SystemSetting | key, value, updatedById, updatedAt | Konfigurasi seperti threshold segera dimulai. |

### 4.3 Enum Minimum

- `ScheduleManualStatus`: NONE, DELAYED, CANCELLED, MOVED_ROOM, ONLINE.
- `ComputedScheduleStatus`: SCHEDULED, STARTING_SOON, IN_PROGRESS, COMPLETED, DELAYED, CANCELLED, MOVED_ROOM, ONLINE.
- `ContentStatus`: DRAFT, SCHEDULED, PUBLISHED, EXPIRED, ARCHIVED.
- `ScreenStatus`: UNPAIRED, ONLINE, OFFLINE, DEGRADED, REVOKED.
- `MediaType`: IMAGE, VIDEO, AUDIO, YOUTUBE, GOOGLE_DRIVE, GOOGLE_SLIDES, CANVA, WEB_EMBED.
- `ContentType`: SCHEDULE_LAYOUT, ANNOUNCEMENT, MEDIA, COUNTDOWN, WELCOME, EXAMINATION.
- `TargetType`: SCREEN, SCREEN_GROUP, BRANCH, ROOM, ALL.
- `EmergencySeverity`: INFO, WARNING, CRITICAL.
- `SyncConflictPolicy`: EXTERNAL_WINS, INTERNAL_WINS, LAST_WRITE_WINS, REQUIRE_REVIEW.

### 4.4 Indeks dan Constraint Penting

- Unique index pada `Admin.email`, `Screen.deviceId`, `Announcement.slug`.
- Composite index `Schedule(branchId, startAt, endAt)` dan `Schedule(roomId, startAt)`.
- Constraint `endAt > startAt`.
- Composite index `Announcement(status, startsAt, endsAt)`.
- Composite index `PlaylistItem(playlistId, sequence)` dan unique sequence per playlist.
- Composite index `DeviceHeartbeat(screenId, serverReceivedAt DESC)`.
- TTL cleanup melalui worker untuk pairing code, reset token, DisplayEvent, dan heartbeat lama.
- Foreign key deletion policy ditentukan eksplisit; data historis penting menggunakan soft delete/archivedAt.

### 4.5 Pola Akses Data

- Halaman admin read-heavy menggunakan Server Components atau query server langsung.
- Mutation sensitif menggunakan Route Handler/Server Action dengan auth, Zod, transaksi, dan audit log.
- Display mengambil satu **resolved display configuration** agar tidak melakukan banyak request kecil.
- Semua payload display memiliki `configVersion`, `generatedAt`, `validUntil`, dan checksum/etag.
- Display menyimpan payload sukses terakhir di IndexedDB secara atomik.
- Event SSE membawa `eventId` dan `configVersion`; display dapat meminta delta atau full config setelah reconnect.

### 4.6 Retensi Data

- Activity log: minimum 1 tahun.
- Heartbeat detail: 30–90 hari, lalu agregasi.
- Playback/error log: minimum 90 hari.
- Sync run dan error: minimum 180 hari.
- Media expired tidak langsung dihapus; masuk status archived dan dibersihkan melalui kebijakan retention.

---

## 5. Screen & Navigasi Map

| Route | Screen | Komponen Utama | Diakses dari | Navigasi ke |
|---|---|---|---|---|
| /login | Login Admin | Logo, email, password, submit, error state | Public / redirect middleware | /dashboard, /forgot-password |
| /forgot-password | Lupa Password | Email form, status terkirim | /login | /login |
| /reset-password/[token] | Reset Password | Password baru, konfirmasi, token validation | Link email | /login |
| /dashboard | Dashboard | KPI cards, kelas aktif, layar status, masalah integrasi, aktivitas | Login/sidebar | Semua modul admin |
| /schedules | Daftar Jadwal | Table, filter, date range, status, bulk action | Sidebar/dashboard | New, edit, calendar, sync |
| /schedules/new | Tambah Jadwal | ScheduleForm, conflict warning, target screen, publish dialog | Daftar jadwal | /schedules, preview |
| /schedules/[id]/edit | Edit Jadwal | ScheduleForm, history, duplicate/archive | Daftar jadwal | /schedules, preview |
| /schedules/calendar | Kalender Jadwal | Day/week calendar, status legend | Daftar jadwal | Edit jadwal |
| /academic/branches | Cabang | DataTable, modal form, active toggle | Sidebar | Rooms, schedules |
| /academic/rooms | Ruangan | Table, branch filter, form, aliases | Sidebar/branch | Schedules |
| /academic/tutors | Tutor | Table, photo, aliases, status | Sidebar | Schedules |
| /academic/subjects | Mata Pelajaran | Table, icon, short name, aliases | Sidebar | Schedules |
| /academic/programs | Program | Table, color, level | Sidebar | Classes |
| /academic/classes | Kelas | Table, program/year filter | Sidebar/program | Schedules |
| /content/announcements | Pengumuman | Cards/table, form drawer, priority, date window, publish | Sidebar | Preview |
| /content/media | Media Library | Uploader, grid/list, metadata, validation, expiry | Sidebar | Playlist, preview |
| /content/running-text | Running Text | Queue table, form, speed, target, pause | Sidebar | Preview |
| /content/voice | Voice Information | Text/audio form, preview, queue, playback status | Sidebar | Preview |
| /content/templates | Template Tampilan | Template cards, activate/preview | Sidebar | Preview |
| /playlists | Daftar Playlist | Table/cards, active status, duplicate | Sidebar | New/edit |
| /playlists/new | Buat Playlist | Builder, item library, ordering, schedule, target | Playlist list | Preview, list |
| /playlists/[id]/edit | Edit Playlist | Builder dan version history | Playlist list | Preview, list |
| /screens | Daftar Layar | Device cards/table, online/offline, last seen, command | Sidebar/dashboard | Pairing, detail |
| /screens/pairing | Pairing Admin | Pairing code input, location form, playlist | Screen list | Screen detail |
| /screens/[id] | Detail Layar | Metadata, heartbeat chart, active content, remote commands | Screen list | Preview, list |
| /integrations | Integrasi | Provider cards, status, last sync | Sidebar/dashboard | Google Sheets detail |
| /integrations/google-sheets/[id] | Google Sheets Setup | Source config, sheet selection, mapping, preview, sync log | Integrations | Schedules, sync log |
| /emergency | Emergency Broadcast | Severity, title, instruction, target, voice, confirmation | Sidebar/dashboard | Dashboard/display preview |
| /preview | Preview Simulator | Resolution selector, time simulation, offline/emergency toggle | Sidebar/forms | Related edit screen |
| /activity-logs | Log Aktivitas | Filter, entity diff, actor, export | Sidebar | Entity detail |
| /settings | Pengaturan | Branding, timezone, threshold, security, retention | Sidebar | Dashboard |
| /display | Display Runtime | Resolved layout, schedule, media, ticker, clock, offline indicator | Direct URL/paired device | /display/pair bila belum paired |
| /display/pair | Pairing Screen | Pairing code, QR, expiry countdown, retry | Unpaired display | /display setelah paired |
| /display/preview/[screenId] | Display Preview | Display renderer dalam mode simulasi | Admin preview | Kembali ke admin |

### 5.1 Aturan Navigasi dan Guard

- Route `(admin)` wajib session Admin aktif.
- Route `(auth)` mengarahkan Admin yang sudah login ke `/dashboard`.
- Route `/display` menggunakan device token, bukan session Admin.
- Device token disimpan di IndexedDB dan direpresentasikan dalam cookie/device storage yang tidak dapat digunakan sebagai Admin token.
- Display yang belum paired selalu masuk `/display/pair`.
- Jika device direvoke, display menghapus token dan kembali ke pairing.
- Tombol Emergency selalu terlihat pada sidebar tetapi halaman memerlukan re-auth/konfirmasi sebelum publish.
- Mobile admin menggunakan sidebar drawer; fitur inti tetap dapat diakses tanpa hover.

### 5.2 Deep Link dan Query State

Filter table disimpan pada query string, misalnya:

```text
/schedules?date=2026-07-28&branch=jakarta&status=IN_PROGRESS
/screens?status=OFFLINE
/activity-logs?entity=Schedule&action=UPDATE
```

Hal ini membuat halaman dapat dibagikan, di-refresh, dan di-debug tanpa kehilangan filter.

---

## 6. Implementation Phases

### 6.1 Aturan Eksekusi Fase

- Kerjakan satu fase per sesi prompting.
- Jangan menandai fase selesai hanya karena kode berhasil digenerate.
- Jalankan cara uji mandiri dan seluruh Definition of Done.
- Bila ditemukan pekerjaan baru, masukkan ke Findings Log; jangan diam-diam memperbesar scope fase.
- Fase yang bergantung pada layanan eksternal boleh menggunakan adapter/mock, tetapi kontraknya harus final sebelum lanjut.
- Status awal seluruh fase adalah **Belum**.

### Fase 1 — Bootstrap Repository Next.js
- **Scope**: Membuat project Next.js TypeScript baru, pnpm, lint, format, env validation dasar, dan script quality gate. Belum membuat UI atau database.
- **Estimasi waktu**: ~25 menit prompting + testing
- **File yang dibuat/dimodifikasi**:
  - `package.json`
  - `pnpm-lock.yaml`
  - `tsconfig.json`
  - `next.config.ts`
  - `eslint.config.mjs`
  - `.prettierrc`
  - `.env.example`
  - `lib/env.ts`
  - `README.md`
- **Definition of Done**:
  - [ ] `pnpm dev` berjalan tanpa error
  - [ ] `pnpm lint` dan `pnpm typecheck` lulus
  - [ ] Environment invalid menghasilkan pesan jelas
  - [ ] Repository memiliki commit awal bersih
- **Cara uji mandiri**: Jalankan dev server, lint, type-check, dan production build kosong.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 2 — Route Groups dan Layout Dasar
- **Scope**: Membuat route group auth, admin, dan display beserta placeholder page, loading, error, not-found, serta middleware skeleton. Tidak membuat visual final.
- **Estimasi waktu**: ~25 menit prompting + testing
- **Ketergantungan**: Fase 1
- **File yang dibuat/dimodifikasi**:
  - `app/layout.tsx`
  - `app/(auth)/login/page.tsx`
  - `app/(admin)/layout.tsx`
  - `app/(admin)/dashboard/page.tsx`
  - `app/display/page.tsx`
  - `app/loading.tsx`
  - `app/error.tsx`
  - `app/not-found.tsx`
  - `middleware.ts`
- **Definition of Done**:
  - [ ] Semua route placeholder dapat dibuka
  - [ ] Error boundary dapat diuji dengan error sengaja
  - [ ] Tidak ada import server-only ke client
- **Cara uji mandiri**: Buka `/login`, `/dashboard`, `/display`, dan route 404.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 3 — Design Tokens dan Global Theme
- **Scope**: Menerapkan font, warna Konstanta, spacing, radius, shadow, typography, CSS variables, dan utility untuk TV scaling. Tidak membuat komponen domain.
- **Estimasi waktu**: ~25 menit prompting + testing
- **Ketergantungan**: Fase 1
- **File yang dibuat/dimodifikasi**:
  - `app/globals.css`
  - `app/layout.tsx`
  - `lib/constants.ts`
  - `components/ui/theme-provider.tsx`
- **Definition of Done**:
  - [ ] Token warna sesuai PRD tersedia
  - [ ] Kontras dasar dapat dibaca
  - [ ] Font memiliki fallback
  - [ ] Utility `display-scale` bekerja di 720p, 1080p, dan 4K
- **Cara uji mandiri**: Gunakan halaman demo token sementara dan cek tiga viewport.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 4 — Primitive UI dan Feedback States
- **Scope**: Membuat komponen Button, Input, Select, Dialog, Sheet, Card, Badge, Skeleton, EmptyState, ErrorState, dan ConfirmDialog berbasis Radix/shadcn.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 3
- **File yang dibuat/dimodifikasi**:
  - `components/ui/button.tsx`
  - `components/ui/input.tsx`
  - `components/ui/select.tsx`
  - `components/ui/dialog.tsx`
  - `components/ui/sheet.tsx`
  - `components/ui/card.tsx`
  - `components/ui/badge.tsx`
  - `components/ui/skeleton.tsx`
  - `components/feedback/empty-state.tsx`
  - `components/feedback/error-state.tsx`
  - `components/feedback/confirm-dialog.tsx`
- **Definition of Done**:
  - [ ] Komponen dapat dirender terisolasi
  - [ ] Keyboard focus terlihat
  - [ ] Dialog dapat ditutup dengan Escape
  - [ ] Tidak ada warna sebagai satu-satunya pembeda status
- **Cara uji mandiri**: Buat halaman dev sementara dan lakukan keyboard-only test.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 5 — Admin Shell UI
- **Scope**: Membuat sidebar responsif, header, breadcrumb, search placeholder, profile menu, dan navigation config. UI only tanpa auth atau data.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 4
- **File yang dibuat/dimodifikasi**:
  - `components/admin/admin-sidebar.tsx`
  - `components/admin/admin-header.tsx`
  - `components/admin/breadcrumbs.tsx`
  - `components/admin/mobile-nav.tsx`
  - `lib/navigation.ts`
  - `app/(admin)/layout.tsx`
- **Definition of Done**:
  - [ ] Sidebar desktop dan drawer mobile bekerja
  - [ ] Active route terlihat
  - [ ] Emergency item mudah ditemukan
  - [ ] Layout tidak horizontal overflow pada 375px
- **Cara uji mandiri**: Uji viewport desktop, tablet, dan mobile dengan seluruh menu.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 6 — Display Shell dan Viewport Scaling
- **Scope**: Membuat struktur fullscreen display, header branding, clock placeholder, connection indicator, content grid, dan running ticker slot. UI only memakai data dummy.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 3
- **File yang dibuat/dimodifikasi**:
  - `components/display/display-shell.tsx`
  - `components/display/display-header.tsx`
  - `components/display/brand-logo.tsx`
  - `components/display/digital-clock.tsx`
  - `components/display/connection-indicator.tsx`
  - `components/display/running-ticker.tsx`
  - `app/display/page.tsx`
- **Definition of Done**:
  - [ ] Layout 16:9 tidak overflow
  - [ ] Teks utama terbaca pada 720p dan 1080p
  - [ ] Tidak ada tombol edit
  - [ ] Kursor dapat disembunyikan pada display mode
- **Cara uji mandiri**: Screenshot 1280×720, 1366×768, 1920×1080, dan 3840×2160.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 7 — Database dan Prisma Initialization
- **Scope**: Menyiapkan PostgreSQL lokal, Prisma 7, database client singleton, konfigurasi migration, dan health check. Belum membuat seluruh model bisnis.
- **Estimasi waktu**: ~25 menit prompting + testing
- **Ketergantungan**: Fase 1
- **File yang dibuat/dimodifikasi**:
  - `docker-compose.yml`
  - `prisma/schema.prisma`
  - `prisma.config.ts`
  - `lib/db.ts`
  - `app/api/health/route.ts`
  - `package.json`
- **Definition of Done**:
  - [ ] PostgreSQL lokal hidup
  - [ ] Migration kosong berhasil
  - [ ] Health endpoint memeriksa database
  - [ ] Prisma client tidak dibuat berulang saat hot reload
- **Cara uji mandiri**: Jalankan Docker, migrate, generate, dan GET `/api/health`.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 8 — Schema Identity dan Master Akademik
- **Scope**: Menambahkan model Admin, session/reset token, Branch, Room, Tutor, Program, Class, Subject beserta enum dan indeks.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 7
- **File yang dibuat/dimodifikasi**:
  - `prisma/schema.prisma`
  - `prisma/migrations/*`
  - `prisma/seed.ts`
- **Definition of Done**:
  - [ ] Migration berhasil pada database kosong
  - [ ] Foreign key dan unique constraint sesuai
  - [ ] Seed membuat satu admin dummy dan master data
  - [ ] Rollback strategy tercatat
- **Cara uji mandiri**: Reset database, migrate, seed, dan inspect melalui Prisma Studio.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 9 — Schema Konten dan Jadwal
- **Scope**: Menambahkan Schedule, Announcement, MediaAsset, RunningText, VoiceAnnouncement, VoicePlaybackLog, Playlist, dan PlaylistItem.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 8
- **File yang dibuat/dimodifikasi**:
  - `prisma/schema.prisma`
  - `prisma/migrations/*`
  - `prisma/seed.ts`
- **Definition of Done**:
  - [ ] Semua relasi konten valid
  - [ ] Constraint waktu diterapkan melalui validation/database yang sesuai
  - [ ] Seed membuat jadwal dan konten dummy
  - [ ] Query jadwal berdasarkan rentang waktu cepat pada seed
- **Cara uji mandiri**: Migrate dan jalankan query fixture jadwal/playlists.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 10 — Schema Device, Realtime, Integrasi, dan Audit
- **Scope**: Menambahkan Screen, ScreenGroup, assignment, heartbeat, emergency, integration mapping, sync logs, activity log, display event, dan system setting.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 9
- **File yang dibuat/dimodifikasi**:
  - `prisma/schema.prisma`
  - `prisma/migrations/*`
  - `prisma/seed.ts`
- **Definition of Done**:
  - [ ] Seluruh model PRD MVP terwakili
  - [ ] Pairing code/token disimpan sebagai hash
  - [ ] Indeks heartbeat dan event tersedia
  - [ ] Seed membuat satu layar demo
- **Cara uji mandiri**: Migrate database kosong dan verifikasi schema/index.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 11 — Auth Domain dan Session Backend
- **Scope**: Menerapkan Argon2, Auth.js/session, login/logout/me, inactivity expiry, login audit, dan helper `requireAdmin`. Tanpa UI form final.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 8
- **File yang dibuat/dimodifikasi**:
  - `lib/auth.ts`
  - `lib/permissions.ts`
  - `features/auth/schemas.ts`
  - `features/auth/service.ts`
  - `app/api/v1/auth/login/route.ts`
  - `app/api/v1/auth/logout/route.ts`
  - `app/api/v1/auth/me/route.ts`
  - `middleware.ts`
- **Definition of Done**:
  - [ ] Credential valid membuat session HttpOnly
  - [ ] Credential salah tidak membocorkan detail
  - [ ] Session expired/revoked ditolak
  - [ ] Login sukses/gagal tercatat
  - [ ] Rate limit login dasar aktif
- **Cara uji mandiri**: Gunakan HTTP client untuk skenario valid, invalid, expired, dan revoked.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 12 — Login dan Route Guard UI
- **Scope**: Membuat halaman login, logout control, session bootstrap, redirect, dan error handling. Tidak mengerjakan reset password.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 11
- **File yang dibuat/dimodifikasi**:
  - `app/(auth)/login/page.tsx`
  - `features/auth/components/login-form.tsx`
  - `features/auth/api.ts`
  - `components/admin/admin-header.tsx`
  - `app/(admin)/layout.tsx`
- **Definition of Done**:
  - [ ] Admin dapat login dan logout
  - [ ] Route admin tidak dapat diakses tanpa session
  - [ ] Loading dan error state jelas
  - [ ] Form dapat digunakan dengan keyboard
- **Cara uji mandiri**: Uji login benar/salah, refresh session, logout, dan direct route.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 13 — Forgot dan Reset Password
- **Scope**: Membuat token reset, email adapter dummy/log pada development, halaman lupa/reset password, expiry, dan one-time use.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 11-12
- **File yang dibuat/dimodifikasi**:
  - `features/auth/password-reset.service.ts`
  - `lib/email.ts`
  - `app/api/v1/auth/forgot-password/route.ts`
  - `app/api/v1/auth/reset-password/route.ts`
  - `app/(auth)/forgot-password/page.tsx`
  - `app/(auth)/reset-password/[token]/page.tsx`
- **Definition of Done**:
  - [ ] Permintaan reset tidak mengungkap keberadaan email
  - [ ] Token hashed dan kedaluwarsa
  - [ ] Token hanya dapat dipakai sekali
  - [ ] Password baru dapat digunakan login
- **Cara uji mandiri**: Uji token valid, invalid, expired, reused, dan email tidak terdaftar.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 14 — API Contract dan Shared Error Handling
- **Scope**: Membuat envelope response, pagination, filter parser, error codes, request ID, Zod error mapper, dan audit helper. Tidak mengerjakan endpoint domain tertentu.
- **Estimasi waktu**: ~25 menit prompting + testing
- **Ketergantungan**: Fase 1 dan 11
- **File yang dibuat/dimodifikasi**:
  - `lib/api-response.ts`
  - `lib/request-context.ts`
  - `lib/errors.ts`
  - `lib/pagination.ts`
  - `lib/audit.ts`
  - `components/feedback/form-error.tsx`
- **Definition of Done**:
  - [ ] Semua error memiliki code dan requestId
  - [ ] Validation error memiliki path field
  - [ ] Pagination konsisten
  - [ ] Stack trace tidak bocor pada production
- **Cara uji mandiri**: Buat route contoh dan uji 200/400/401/404/409/500.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 15 — Branch dan Room API
- **Scope**: Membuat CRUD Branch/Room, filter, soft disable, alias mapping, dan validation. Belum membuat halaman admin.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 8 dan 14
- **File yang dibuat/dimodifikasi**:
  - `features/academic/branches/schemas.ts`
  - `features/academic/branches/queries.ts`
  - `features/academic/rooms/schemas.ts`
  - `features/academic/rooms/queries.ts`
  - `app/api/v1/branches/route.ts`
  - `app/api/v1/branches/[id]/route.ts`
  - `app/api/v1/rooms/route.ts`
  - `app/api/v1/rooms/[id]/route.ts`
- **Definition of Done**:
  - [ ] CRUD lulus
  - [ ] Room wajib memiliki branch valid
  - [ ] Duplikasi nama pada branch ditangani
  - [ ] Mutation menghasilkan activity log
- **Cara uji mandiri**: Integration test CRUD, filter, duplicate, dan unauthorized.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 16 — Branch dan Room Admin UI
- **Scope**: Membuat data table, filter cabang, modal form, status toggle, dan error/loading/empty state untuk cabang dan ruangan.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 15
- **File yang dibuat/dimodifikasi**:
  - `app/(admin)/academic/branches/page.tsx`
  - `app/(admin)/academic/rooms/page.tsx`
  - `features/academic/components/branch-form.tsx`
  - `features/academic/components/room-form.tsx`
  - `components/admin/data-table.tsx`
  - `components/admin/filter-bar.tsx`
- **Definition of Done**:
  - [ ] Admin dapat CRUD dari UI
  - [ ] Filter tersimpan pada URL
  - [ ] Optimistic state tidak menyebabkan data palsu
  - [ ] Mobile menampilkan card/list yang terbaca
- **Cara uji mandiri**: Uji keyboard, mobile, validation, delete/disable dengan data terkait.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 17 — Tutor dan Subject API
- **Scope**: Membuat CRUD Tutor/Subject, alias, status aktif, upload reference foto URL, dan validation.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 8 dan 14
- **File yang dibuat/dimodifikasi**:
  - `features/academic/tutors/*`
  - `features/academic/subjects/*`
  - `app/api/v1/tutors/route.ts`
  - `app/api/v1/tutors/[id]/route.ts`
  - `app/api/v1/subjects/route.ts`
  - `app/api/v1/subjects/[id]/route.ts`
- **Definition of Done**:
  - [ ] CRUD dan filter aktif bekerja
  - [ ] Alias dinormalisasi
  - [ ] Mutation diaudit
  - [ ] Data yang dipakai jadwal tidak hard-delete
- **Cara uji mandiri**: Integration test CRUD, alias, referential integrity.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 18 — Tutor dan Subject Admin UI
- **Scope**: Membuat tabel/form tutor dan mata pelajaran dengan foto/icon, aliases, dan active toggle.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 17
- **File yang dibuat/dimodifikasi**:
  - `app/(admin)/academic/tutors/page.tsx`
  - `app/(admin)/academic/subjects/page.tsx`
  - `features/academic/components/tutor-form.tsx`
  - `features/academic/components/subject-form.tsx`
- **Definition of Done**:
  - [ ] CRUD tersedia dari UI
  - [ ] Preview foto/icon aman
  - [ ] Error upload URL ditangani
  - [ ] Tampilan mobile tidak overflow
- **Cara uji mandiri**: Uji data kosong, nama panjang, gambar gagal, dan keyboard.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 19 — Program dan Class API
- **Scope**: Membuat CRUD Program/Class, academic year, color validation, status, dan filter program.
- **Estimasi waktu**: ~25 menit prompting + testing
- **Ketergantungan**: Fase 8 dan 14
- **File yang dibuat/dimodifikasi**:
  - `features/academic/programs/*`
  - `features/academic/classes/*`
  - `app/api/v1/programs/route.ts`
  - `app/api/v1/programs/[id]/route.ts`
  - `app/api/v1/classes/route.ts`
  - `app/api/v1/classes/[id]/route.ts`
- **Definition of Done**:
  - [ ] Class selalu terkait program
  - [ ] Academic year tervalidasi
  - [ ] Color token valid
  - [ ] Mutation diaudit
- **Cara uji mandiri**: Integration test CRUD dan relation guard.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 20 — Program dan Class Admin UI
- **Scope**: Membuat tabel/form program dan kelas, filter tahun ajaran, dan color preview.
- **Estimasi waktu**: ~25 menit prompting + testing
- **Ketergantungan**: Fase 19
- **File yang dibuat/dimodifikasi**:
  - `app/(admin)/academic/programs/page.tsx`
  - `app/(admin)/academic/classes/page.tsx`
  - `features/academic/components/program-form.tsx`
  - `features/academic/components/class-form.tsx`
- **Definition of Done**:
  - [ ] CRUD dari UI berfungsi
  - [ ] Filter program dan tahun ajaran bekerja
  - [ ] Color badge tetap kontras
  - [ ] Mobile view tersedia
- **Cara uji mandiri**: Uji data banyak, filter, validation, dan relasi program nonaktif.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 21 — Schedule Domain Status Engine
- **Scope**: Membuat pure function untuk computed status, override manual, threshold segera dimulai, timezone, dan clock drift. Hanya domain logic dan unit test.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 9
- **File yang dibuat/dimodifikasi**:
  - `domain/schedule-status.ts`
  - `domain/time-drift.ts`
  - `tests/unit/schedule-status.test.ts`
  - `tests/unit/time-drift.test.ts`
- **Definition of Done**:
  - [ ] Semua status PRD teruji
  - [ ] Boundary tepat pada start/end time
  - [ ] Timezone branch diperhitungkan
  - [ ] Manual override selalu konsisten
- **Cara uji mandiri**: Jalankan unit test table-driven untuk setiap status dan boundary.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 22 — Schedule API dan Conflict Detection
- **Scope**: Membuat list/detail/create/update/archive/duplicate, filter, bulk update dasar, dan deteksi konflik tutor/room/class.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 9, 14, 21
- **File yang dibuat/dimodifikasi**:
  - `features/schedules/schemas.ts`
  - `features/schedules/queries.ts`
  - `features/schedules/service.ts`
  - `app/api/v1/schedules/route.ts`
  - `app/api/v1/schedules/[id]/route.ts`
  - `app/api/v1/schedules/[id]/duplicate/route.ts`
  - `app/api/v1/schedules/conflicts/route.ts`
- **Definition of Done**:
  - [ ] CRUD dan duplicate bekerja
  - [ ] Conflict mengembalikan entitas dan waktu bertabrakan
  - [ ] Semua timestamp disimpan UTC
  - [ ] Publish/update diaudit
- **Cara uji mandiri**: Integration test overlap parsial, penuh, boundary, dan override.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 23 — Schedule List dan Filter UI
- **Scope**: Membuat daftar jadwal, date range, branch/status/program filters, pagination, status badge, bulk select, dan empty state. Belum membuat form edit.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 22
- **File yang dibuat/dimodifikasi**:
  - `app/(admin)/schedules/page.tsx`
  - `features/schedules/components/schedule-table.tsx`
  - `features/schedules/components/schedule-filters.tsx`
  - `components/admin/date-range-picker.tsx`
  - `components/admin/status-badge.tsx`
- **Definition of Done**:
  - [ ] Filter sinkron dengan URL
  - [ ] Status menggunakan ikon+teks+warna
  - [ ] Data 500 baris tetap responsif
  - [ ] Mobile menggunakan card list
- **Cara uji mandiri**: Uji kombinasi filter, pagination, refresh, dan viewport mobile.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 24 — Schedule Create/Edit Form UI
- **Scope**: Membuat form jadwal, combobox master data, date/time, notes, draft/publish dialog, dan conflict preview. Belum mengerjakan calendar view.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 16, 18, 20, 22
- **File yang dibuat/dimodifikasi**:
  - `app/(admin)/schedules/new/page.tsx`
  - `app/(admin)/schedules/[id]/edit/page.tsx`
  - `features/schedules/components/schedule-form.tsx`
  - `features/schedules/components/conflict-alert.tsx`
  - `components/admin/publish-dialog.tsx`
- **Definition of Done**:
  - [ ] Create/edit berhasil
  - [ ] Conflict terlihat sebelum publish
  - [ ] Form server error dipetakan ke field
  - [ ] Unsaved changes warning tersedia
- **Cara uji mandiri**: Uji create draft, publish, conflict, edit, invalid date, dan leave form.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 25 — Schedule Calendar UI
- **Scope**: Membuat view harian/mingguan, legend status, navigasi tanggal, dan click-to-edit. UI menggunakan API jadwal yang sudah ada.
- **Estimasi waktu**: ~25 menit prompting + testing
- **Ketergantungan**: Fase 22-24
- **File yang dibuat/dimodifikasi**:
  - `app/(admin)/schedules/calendar/page.tsx`
  - `features/schedules/components/schedule-calendar.tsx`
  - `features/schedules/components/calendar-toolbar.tsx`
- **Definition of Done**:
  - [ ] Day/week view konsisten
  - [ ] Overlap dapat dibaca
  - [ ] Klik event menuju edit
  - [ ] Tidak perlu drag-drop pada MVP
- **Cara uji mandiri**: Uji jadwal padat, lintas hari, kelas dibatalkan, dan mobile.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 26 — Announcement API
- **Scope**: Membuat CRUD, publish, archive, active-window validation, priority, target assignment, dan auto-expired query.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 9, 10, 14
- **File yang dibuat/dimodifikasi**:
  - `features/announcements/schemas.ts`
  - `features/announcements/service.ts`
  - `app/api/v1/announcements/route.ts`
  - `app/api/v1/announcements/[id]/route.ts`
  - `app/api/v1/announcements/[id]/publish/route.ts`
  - `app/api/v1/announcements/[id]/archive/route.ts`
- **Definition of Done**:
  - [ ] Status transition valid
  - [ ] Tanggal aktif/berakhir tervalidasi
  - [ ] Target layar tersimpan
  - [ ] Publish menghasilkan event dan audit log
- **Cara uji mandiri**: Integration test draft→scheduled→published→expired→archived.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 27 — Announcement Admin UI
- **Scope**: Membuat list/card, form drawer, priority badge, image selector placeholder, target selector, preview ringkas, dan publish dialog.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 26
- **File yang dibuat/dimodifikasi**:
  - `app/(admin)/content/announcements/page.tsx`
  - `features/announcements/components/announcement-form.tsx`
  - `features/announcements/components/announcement-card.tsx`
  - `components/admin/screen-selector.tsx`
- **Definition of Done**:
  - [ ] CRUD/publish/archive tersedia
  - [ ] Judul panjang dan tanpa gambar tetap rapi
  - [ ] Target selector mendukung all/screen/group/branch
  - [ ] Preview sesuai data form
- **Cara uji mandiri**: Uji scheduled, expired, no image, long summary, dan mobile.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 28 — Object Storage dan Media Upload Backend
- **Scope**: Membuat adapter S3, presigned upload, MIME/size allowlist, metadata persistence, checksum, dan delete/archive. Belum membuat media UI.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 9 dan 14
- **File yang dibuat/dimodifikasi**:
  - `lib/storage.ts`
  - `features/media/schemas.ts`
  - `features/media/service.ts`
  - `app/api/v1/media/route.ts`
  - `app/api/v1/media/upload-url/route.ts`
  - `app/api/v1/media/complete-upload/route.ts`
  - `app/api/v1/media/[id]/route.ts`
  - `scripts/check-storage.ts`
- **Definition of Done**:
  - [ ] Upload hanya tipe/ukuran valid
  - [ ] Client tidak menerima secret storage
  - [ ] Metadata dan checksum tersimpan
  - [ ] File orphan dapat dibersihkan
- **Cara uji mandiri**: Uji image/video valid, MIME palsu, oversize, upload gagal, dan archive.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 29 — Media Library Admin UI
- **Scope**: Membuat uploader progress, grid/list, thumbnail, metadata editor, expiry, status, external URL, dan validation message.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 28
- **File yang dibuat/dimodifikasi**:
  - `app/(admin)/content/media/page.tsx`
  - `components/media/media-uploader.tsx`
  - `components/media/media-grid.tsx`
  - `components/media/media-card.tsx`
  - `features/media/components/media-form.tsx`
- **Definition of Done**:
  - [ ] Upload progress terlihat
  - [ ] Gambar/video dapat dipreview
  - [ ] Broken media memiliki fallback
  - [ ] External URL divalidasi
- **Cara uji mandiri**: Uji network lambat, cancel, duplicate file, portrait video, dan broken thumbnail.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 30 — Running Text API dan Resolver
- **Scope**: Membuat CRUD running text, schedule, target, queue ordering, length limit, separator, dan resolver active items.
- **Estimasi waktu**: ~25 menit prompting + testing
- **Ketergantungan**: Fase 9, 10, 14
- **File yang dibuat/dimodifikasi**:
  - `features/running-text/schemas.ts`
  - `features/running-text/service.ts`
  - `domain/targeting.ts`
  - `app/api/v1/running-texts/route.ts`
  - `app/api/v1/running-texts/[id]/route.ts`
  - `tests/unit/running-text-resolver.test.ts`
- **Definition of Done**:
  - [ ] Queue aktif terurut prioritas
  - [ ] Item terlalu panjang ditolak/diperingatkan
  - [ ] Target resolver benar
  - [ ] Publish menghasilkan event
- **Cara uji mandiri**: Unit/integration test time window, priority, multiple target.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 31 — Running Text Admin UI
- **Scope**: Membuat list/form, speed selector, live ticker preview, active window, target, pause/resume, dan ordering preview.
- **Estimasi waktu**: ~25 menit prompting + testing
- **Ketergantungan**: Fase 30
- **File yang dibuat/dimodifikasi**:
  - `app/(admin)/content/running-text/page.tsx`
  - `features/running-text/components/running-text-form.tsx`
  - `features/running-text/components/ticker-preview.tsx`
- **Definition of Done**:
  - [ ] Admin dapat CRUD dan pause
  - [ ] Preview speed dapat dilihat
  - [ ] Length warning jelas
  - [ ] Form mobile usable
- **Cara uji mandiri**: Uji item banyak, teks panjang, separator, dan status expired.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 32 — Playlist Domain dan API
- **Scope**: Membuat playlist CRUD, item CRUD/order, version increment, scheduling rules, validation content reference, duplicate, activate, dan resolver dasar. Tanpa builder UI.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 9, 26, 28, 30
- **File yang dibuat/dimodifikasi**:
  - `domain/playlist-resolver.ts`
  - `features/playlists/schemas.ts`
  - `features/playlists/service.ts`
  - `app/api/v1/playlists/route.ts`
  - `app/api/v1/playlists/[id]/route.ts`
  - `app/api/v1/playlists/[id]/activate/route.ts`
  - `app/api/v1/playlists/[id]/duplicate/route.ts`
  - `tests/unit/playlist-resolver.test.ts`
- **Definition of Done**:
  - [ ] Sequence deterministik
  - [ ] Content reference invalid ditolak
  - [ ] Activate menambah version dan event
  - [ ] Resolver menghormati hari/jam/tanggal
- **Cara uji mandiri**: Unit test time rules dan integration test CRUD/order/activate.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 33 — Playlist List dan Builder UI
- **Scope**: Membuat daftar playlist dan builder drag-drop dengan library item, duration, transition, volume, schedule, target, preview, serta save draft. Tidak menjalankan display runtime.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 27, 29, 31, 32
- **File yang dibuat/dimodifikasi**:
  - `app/(admin)/playlists/page.tsx`
  - `app/(admin)/playlists/new/page.tsx`
  - `app/(admin)/playlists/[id]/edit/page.tsx`
  - `components/admin/playlist-builder.tsx`
  - `features/playlists/components/playlist-item-editor.tsx`
  - `features/playlists/store.ts`
- **Definition of Done**:
  - [ ] Add/remove/reorder item bekerja
  - [ ] Keyboard reorder tersedia
  - [ ] Draft tidak hilang saat validation gagal
  - [ ] Total duration terlihat
  - [ ] Activate memerlukan konfirmasi
- **Cara uji mandiri**: Uji 20 item, reorder keyboard/mouse, invalid duration, dan duplicate.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 34 — Device Registration dan Pairing Backend
- **Scope**: Membuat display register, pairing code sementara, polling pairing status, admin pair, device token, unpair/revoke, dan rate limit.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 10 dan 14
- **File yang dibuat/dimodifikasi**:
  - `features/screens/pairing.service.ts`
  - `features/screens/schemas.ts`
  - `app/api/v1/display/register/route.ts`
  - `app/api/v1/display/pairing-status/route.ts`
  - `app/api/v1/screens/pair/route.ts`
  - `app/api/v1/screens/[id]/unpair/route.ts`
- **Definition of Done**:
  - [ ] Pairing code kedaluwarsa
  - [ ] Code tidak disimpan plaintext
  - [ ] Device menerima token hanya setelah paired
  - [ ] Unpair/revoke memutus akses
  - [ ] Brute force pairing dibatasi
- **Cara uji mandiri**: Integration test happy path, expiry, invalid code, reused code, revoke.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 35 — Display Pairing Screen UI
- **Scope**: Membuat layar pairing code/QR, expiry countdown, polling status, regenerate, offline state, dan transisi ke display setelah paired.
- **Estimasi waktu**: ~25 menit prompting + testing
- **Ketergantungan**: Fase 34 dan 6
- **File yang dibuat/dimodifikasi**:
  - `app/display/pair/page.tsx`
  - `features/screens/components/display-pairing.tsx`
  - `features/screens/device-storage.ts`
  - `components/display/pairing-code.tsx`
- **Definition of Done**:
  - [ ] Code dan QR terbaca dari jarak TV
  - [ ] Polling berhenti setelah paired
  - [ ] Expired code diregenerate
  - [ ] Device token tersimpan aman pada storage yang dipilih
- **Cara uji mandiri**: Uji unpaired, expired, network disconnect, paired, dan reload.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 36 — Screen Management Admin UI
- **Scope**: Membuat daftar/detail layar, pairing form, branch/room/playlist assignment, online badge placeholder, unpair/revoke, dan remote command buttons disabled-ready.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 34-35
- **File yang dibuat/dimodifikasi**:
  - `app/(admin)/screens/page.tsx`
  - `app/(admin)/screens/pairing/page.tsx`
  - `app/(admin)/screens/[id]/page.tsx`
  - `features/screens/components/device-card.tsx`
  - `features/screens/components/pair-device-form.tsx`
  - `features/screens/components/device-detail.tsx`
- **Definition of Done**:
  - [ ] Admin dapat menyelesaikan pairing
  - [ ] Device metadata terlihat
  - [ ] Revoke membutuhkan konfirmasi
  - [ ] Empty/offline states tersedia
- **Cara uji mandiri**: Pair satu perangkat dari dua browser dan uji revoke.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 37 — Resolved Display Configuration API
- **Scope**: Membuat endpoint authenticated-by-device untuk config/content gabungan, etag/version, target resolution, active emergency, schedule, announcement, ticker, playlist, dan media manifest.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 21, 26, 30, 32, 34
- **File yang dibuat/dimodifikasi**:
  - `domain/content-priority.ts`
  - `domain/targeting.ts`
  - `features/display-runtime/resolver.ts`
  - `app/api/v1/display/config/route.ts`
  - `app/api/v1/display/content/route.ts`
  - `tests/integration/display-config.test.ts`
- **Definition of Done**:
  - [ ] Device hanya menerima konten targetnya
  - [ ] Priority engine sesuai PRD
  - [ ] Payload memiliki version/etag
  - [ ] Revoked token ditolak
  - [ ] Config kosong tetap memiliki fallback branding
- **Cara uji mandiri**: Integration test beberapa target, priority, expired content, dan unauthorized.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 38 — Display Schedule Components
- **Scope**: Membuat ScheduleBoard, ScheduleRow, CurrentClassCard, NextClassCard, status badge, empty schedule, dan time updates memakai data fixture. UI only.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 6 dan 21
- **File yang dibuat/dimodifikasi**:
  - `components/display/schedule-board.tsx`
  - `components/display/schedule-row.tsx`
  - `components/display/schedule-status-badge.tsx`
  - `components/display/current-class-card.tsx`
  - `components/display/next-class-card.tsx`
  - `components/display/no-schedule.tsx`
- **Definition of Done**:
  - [ ] Maksimal 6–8 jadwal pada 1080p
  - [ ] Nama panjang tidak mematahkan layout
  - [ ] Status berubah dari clock fixture
  - [ ] Empty state branded
- **Cara uji mandiri**: Visual test status lengkap, jadwal panjang, 720p/1080p/4K.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 39 — Display Announcement dan Media Components
- **Scope**: Membuat AnnouncementCard/Carousel, PosterViewer, VideoPlayer, CountdownCard, QRCodeCard, media fallback, dan pagination indicator memakai fixture.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 6
- **File yang dibuat/dimodifikasi**:
  - `components/display/announcement-card.tsx`
  - `components/display/announcement-carousel.tsx`
  - `components/display/poster-viewer.tsx`
  - `components/display/video-player.tsx`
  - `components/display/countdown-card.tsx`
  - `components/display/qr-code-card.tsx`
  - `components/display/pagination-indicator.tsx`
- **Definition of Done**:
  - [ ] Carousel auto-advance dapat dijeda oleh emergency
  - [ ] Media gagal tidak menunjukkan broken icon
  - [ ] Video portrait letterbox rapi
  - [ ] Countdown tidak negatif
- **Cara uji mandiri**: Visual/media test gambar/video gagal, no image, portrait, dan long title.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 40 — Display Runtime State Machine
- **Scope**: Menyusun config API ke display renderer, playlist timer, transition, pause/resume, prefetch next item, restore index, dan priority interruption. Belum offline atau realtime.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 37-39
- **File yang dibuat/dimodifikasi**:
  - `features/display-runtime/store.ts`
  - `features/display-runtime/runtime.ts`
  - `features/display-runtime/components/display-renderer.tsx`
  - `app/display/page.tsx`
  - `tests/unit/display-runtime.test.ts`
- **Definition of Done**:
  - [ ] Playlist berjalan deterministik
  - [ ] Emergency hook dapat menginterupsi dan resume index
  - [ ] Item invalid dilewati
  - [ ] Timer dibersihkan saat unmount
  - [ ] Next item diprefetch
- **Cara uji mandiri**: Fake timer unit test dan browser test 10-minute accelerated playlist.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 41 — PWA App Shell dan Installability
- **Scope**: Menambahkan manifest, icons, Serwist service worker, offline navigation fallback, cache app shell, dan update strategy. Belum menyimpan data domain di IndexedDB.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 1-6
- **File yang dibuat/dimodifikasi**:
  - `app/manifest.ts`
  - `serwist.config.ts`
  - `next.config.ts`
  - `public/icons/*`
  - `public/offline/index.html`
  - `components/display/service-worker-status.tsx`
- **Definition of Done**:
  - [ ] Lighthouse mengenali PWA installable
  - [ ] App shell dibuka saat offline
  - [ ] Service worker update tidak loop
  - [ ] Admin dan display caching policy dibedakan
- **Cara uji mandiri**: Build production, install PWA, offline reload, dan service-worker update.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 42 — IndexedDB Display Cache
- **Scope**: Membuat Dexie schema, atomic save config, media manifest, last sync, migration, quota handling, dan cache read fallback.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 37 dan 41
- **File yang dibuat/dimodifikasi**:
  - `features/display-runtime/db.ts`
  - `features/display-runtime/cache.ts`
  - `features/display-runtime/cache-migrations.ts`
  - `components/display/last-sync-indicator.tsx`
  - `components/display/offline-fallback.tsx`
  - `tests/unit/display-cache.test.ts`
- **Definition of Done**:
  - [ ] Config sukses tersimpan atomik
  - [ ] Corrupt cache tidak membuat layar kosong
  - [ ] Schema migration teruji
  - [ ] Quota error memiliki fallback
  - [ ] Last sync tampil
- **Cara uji mandiri**: Offline/reload, corrupt record, migration, quota simulation.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 43 — Offline Runtime Integration
- **Scope**: Menghubungkan display runtime ke network-first config dengan timeout, IndexedDB fallback, skip media uncached, local clock status, dan branded offline indicator.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 40-42
- **File yang dibuat/dimodifikasi**:
  - `features/display-runtime/use-display-config.ts`
  - `features/display-runtime/network.ts`
  - `features/display-runtime/components/display-renderer.tsx`
  - `app/display/page.tsx`
- **Definition of Done**:
  - [ ] Layar tetap menampilkan data saat backend mati
  - [ ] Tidak ada browser error page
  - [ ] Media eksternal uncached dilewati
  - [ ] Reconnect memperbarui cache tanpa reset berlebihan
- **Cara uji mandiri**: Putus internet pada beberapa titik playlist lalu sambungkan kembali.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 44 — Redis Event Bus dan SSE Endpoint
- **Scope**: Menyiapkan Redis, event publisher, versioned DisplayEvent, SSE stream dengan auth device, keep-alive, Last-Event-ID, dan cleanup. Tanpa client integration.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 10, 34, 37
- **File yang dibuat/dimodifikasi**:
  - `lib/redis.ts`
  - `lib/event-bus.ts`
  - `features/display-runtime/events.ts`
  - `app/api/v1/events/stream/route.ts`
  - `docker-compose.yml`
  - `tests/integration/sse.test.ts`
- **Definition of Done**:
  - [ ] SSE hanya menerima event target sesuai device
  - [ ] Keep-alive mencegah idle timeout
  - [ ] Reconnect memakai Last-Event-ID
  - [ ] Event dapat direplay dalam retention window
  - [ ] Connection leak tidak terjadi
- **Cara uji mandiri**: Buka beberapa EventSource client, publish event, reconnect, dan revoke device.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 45 — Realtime Display Client
- **Scope**: Menghubungkan EventSource ke runtime, exponential backoff, visibility/network handling, polling fallback, acknowledgement REST, dan refresh config by version.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 44 dan 43
- **File yang dibuat/dimodifikasi**:
  - `features/display-runtime/realtime-client.ts`
  - `features/display-runtime/use-realtime.ts`
  - `app/api/v1/display/playback-log/route.ts`
  - `app/display/page.tsx`
- **Definition of Done**:
  - [ ] Publish muncul ≤5 detik pada jaringan lokal/staging
  - [ ] Reconnect otomatis
  - [ ] Duplicate event idempotent
  - [ ] Polling fallback aktif saat SSE gagal
  - [ ] Ack tidak memblokir rendering
- **Cara uji mandiri**: Kill/restart Redis/server, duplicate event, offline/online, dan dua layar berbeda.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 46 — Heartbeat dan Device Presence Backend
- **Scope**: Membuat heartbeat endpoint, time drift calculation, Redis presence TTL, persistence sampling, online/offline resolver, dan device status API.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 10 dan 34
- **File yang dibuat/dimodifikasi**:
  - `domain/device-presence.ts`
  - `domain/time-drift.ts`
  - `features/screens/heartbeat.service.ts`
  - `app/api/v1/display/heartbeat/route.ts`
  - `app/api/v1/screens/route.ts`
  - `app/api/v1/screens/[id]/route.ts`
  - `tests/unit/device-presence.test.ts`
- **Definition of Done**:
  - [ ] Heartbeat invalid ditolak
  - [ ] Online/offline berubah sesuai TTL
  - [ ] Time drift dicatat
  - [ ] Database tidak dibanjiri setiap heartbeat
  - [ ] Status dapat diquery Admin
- **Cara uji mandiri**: Fake clock heartbeat TTL, high-frequency calls, dan drift ± waktu.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 47 — Heartbeat Client dan Monitoring UI
- **Scope**: Mengirim heartbeat 30–60 detik dari display dan mengaktifkan status real-time, last seen, last sync, current content, drift warning pada admin.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 45-46
- **File yang dibuat/dimodifikasi**:
  - `features/display-runtime/use-heartbeat.ts`
  - `features/screens/components/device-status-badge.tsx`
  - `features/screens/components/device-detail.tsx`
  - `app/(admin)/screens/page.tsx`
  - `app/(admin)/screens/[id]/page.tsx`
  - `app/(admin)/dashboard/page.tsx`
- **Definition of Done**:
  - [ ] Dashboard menunjukkan online/offline akurat
  - [ ] Tab hidden tidak menghasilkan spam
  - [ ] Drift warning terlihat
  - [ ] Status refresh tanpa reload penuh
- **Cara uji mandiri**: Buka/tutup display, sleep tab, ubah clock fixture, dan lihat dashboard.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 48 — Remote Commands
- **Scope**: Membuat refresh, reload config, clear cache, mute/unmute, assign playlist, dan unpair command melalui event bus. Restart aplikasi diberi best-effort fallback.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 44-47
- **File yang dibuat/dimodifikasi**:
  - `features/screens/commands.service.ts`
  - `app/api/v1/screens/[id]/refresh/route.ts`
  - `app/api/v1/screens/[id]/clear-cache/route.ts`
  - `app/api/v1/screens/[id]/assign-playlist/route.ts`
  - `features/display-runtime/command-handler.ts`
  - `features/screens/components/remote-controls.tsx`
- **Definition of Done**:
  - [ ] Command ditargetkan tepat
  - [ ] Display mengirim acknowledgement
  - [ ] Clear cache tidak menghapus identity kecuali unpair
  - [ ] Command gagal memiliki timeout/status
  - [ ] Semua command diaudit
- **Cara uji mandiri**: Kirim tiap command ke satu layar dan pastikan layar lain tidak terpengaruh.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 49 — Emergency Backend dan State
- **Scope**: Membuat create/active/end/history, target, severity, two-step confirmation token, event priority, version, dan audit. Tanpa UI final/voice.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 10, 14, 44
- **File yang dibuat/dimodifikasi**:
  - `features/emergency/schemas.ts`
  - `features/emergency/service.ts`
  - `app/api/v1/emergency/route.ts`
  - `app/api/v1/emergency/active/route.ts`
  - `app/api/v1/emergency/[id]/end/route.ts`
  - `app/api/v1/emergency/history/route.ts`
  - `tests/integration/emergency.test.ts`
- **Definition of Done**:
  - [ ] Hanya satu emergency aktif per target yang sesuai kebijakan
  - [ ] Konfirmasi token wajib dan singkat
  - [ ] End menghasilkan event
  - [ ] History/audit lengkap
  - [ ] Unauthorized ditolak
- **Cara uji mandiri**: Activate/end, invalid confirmation, competing emergency, target subset.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 50 — Emergency Admin UI
- **Scope**: Membuat form severity/title/instruction/target/voice toggle, preview, dua dialog konfirmasi, active emergency banner, dan end action.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 49
- **File yang dibuat/dimodifikasi**:
  - `app/(admin)/emergency/page.tsx`
  - `features/emergency/components/emergency-form.tsx`
  - `features/emergency/components/emergency-confirmation.tsx`
  - `features/emergency/components/active-emergency-banner.tsx`
  - `components/admin/admin-sidebar.tsx`
- **Definition of Done**:
  - [ ] Admin memahami target sebelum publish
  - [ ] CRITICAL membutuhkan ketik kata konfirmasi
  - [ ] End emergency jelas
  - [ ] Mobile tetap mudah digunakan
  - [ ] Tidak ada accidental double submit
- **Cara uji mandiri**: Keyboard/mobile test activate dan end dengan berbagai severity.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 51 — Emergency Display Overlay dan Resume
- **Scope**: Membuat overlay fullscreen tanpa flicker, icon/text/time/location, priority takeover, pause media, restore previous playlist index, dan offline active-state handling.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 40, 45, 49
- **File yang dibuat/dimodifikasi**:
  - `components/display/emergency-overlay.tsx`
  - `features/display-runtime/emergency-controller.ts`
  - `features/display-runtime/components/display-renderer.tsx`
  - `tests/unit/emergency-controller.test.ts`
- **Definition of Done**:
  - [ ] Emergency tampil ≤5 detik online
  - [ ] Tidak ada blinking animation
  - [ ] Media berhenti/pause
  - [ ] Setelah end kembali ke item/waktu yang tepat
  - [ ] Emergency cached tetap konsisten saat koneksi putus
- **Cara uji mandiri**: Emergency saat image/video/ticker, end, reconnect, dan reload display.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 52 — Voice Queue Backend
- **Scope**: Membuat voice announcement CRUD/schedule/cancel, queue lock per screen, playback status, priority, collision prevention, dan provider interface. Browser speech/TTS provider hanya adapter.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 9, 10, 44
- **File yang dibuat/dimodifikasi**:
  - `features/voice/schemas.ts`
  - `features/voice/service.ts`
  - `workers/voice.worker.ts`
  - `app/api/v1/voice/route.ts`
  - `app/api/v1/voice/[id]/schedule/route.ts`
  - `app/api/v1/voice/[id]/cancel/route.ts`
  - `app/api/v1/voice/[id]/playback-status/route.ts`
  - `tests/unit/voice-queue.test.ts`
- **Definition of Done**:
  - [ ] Dua audio tidak berjalan bersamaan per screen
  - [ ] Emergency voice menang
  - [ ] Retry terbatas dan idempotent
  - [ ] Status per layar tercatat
  - [ ] Volume restore instruction tersedia
- **Cara uji mandiri**: Unit test collision, priority, retry, cancel, dan multi-screen.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 53 — Voice Admin dan Display Playback
- **Scope**: Membuat voice form/preview/queue UI serta display audio controller yang menurunkan volume media, memutar announcement, restore volume, dan ack hasil.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 52 dan 45
- **File yang dibuat/dimodifikasi**:
  - `app/(admin)/content/voice/page.tsx`
  - `features/voice/components/voice-form.tsx`
  - `features/voice/components/voice-queue-table.tsx`
  - `components/display/voice-queue.tsx`
  - `features/display-runtime/audio-controller.ts`
- **Definition of Done**:
  - [ ] Preview tidak mempublish
  - [ ] Autoplay policy ditangani pada device setup
  - [ ] Volume kembali setelah audio
  - [ ] Error tercatat tanpa menghentikan display
  - [ ] Emergency audio memiliki prioritas
- **Cara uji mandiri**: Uji browser autoplay blocked/allowed, video aktif, repeat, error audio, emergency.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 54 — Google Sheets Integration Configuration
- **Scope**: Membuat encrypted credential adapter, source URL/ID, sheet selector, header row, interval, conflict policy, dan connection test API. Belum mapping/sync.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 10 dan 14
- **File yang dibuat/dimodifikasi**:
  - `lib/crypto.ts`
  - `features/integrations/google-sheets/client.ts`
  - `features/integrations/schemas.ts`
  - `app/api/v1/integrations/route.ts`
  - `app/api/v1/integrations/google-sheets/test/route.ts`
  - `app/(admin)/integrations/page.tsx`
- **Definition of Done**:
  - [ ] Credential terenkripsi saat tersimpan
  - [ ] Connection test tidak menyimpan rahasia di log
  - [ ] Sheet list dapat diambil
  - [ ] Invalid permission memiliki pesan jelas
- **Cara uji mandiri**: Uji credential valid/invalid, spreadsheet hilang, dan permission denied.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 55 — Google Sheets Field Mapping UI
- **Scope**: Membuat preview rows, source-to-target mapping, transform config, default value, alias hints, validation report, dan save mapping. Belum menulis jadwal.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 54
- **File yang dibuat/dimodifikasi**:
  - `app/(admin)/integrations/google-sheets/[id]/page.tsx`
  - `components/admin/integration-mapper.tsx`
  - `features/integrations/google-sheets/preview.ts`
  - `features/integrations/google-sheets/transform.ts`
  - `tests/unit/google-sheets-transform.test.ts`
- **Definition of Done**:
  - [ ] Semua target field wajib terdeteksi
  - [ ] Tanggal/waktu preview benar
  - [ ] Transform dapat diuji per baris
  - [ ] Error menunjukkan row+field
  - [ ] Mapping tersimpan
- **Cara uji mandiri**: Gunakan fixture format tanggal/nama ruangan/tutor yang bervariasi.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 56 — Google Sheets Sync Worker
- **Scope**: Membuat BullMQ job, idempotent upsert, conflict policy, lock, cursor/source version, sync run/error log, schedule event publish, dan manual trigger. Tanpa dashboard log final.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 22, 44, 54-55
- **File yang dibuat/dimodifikasi**:
  - `lib/queue.ts`
  - `workers/index.ts`
  - `workers/google-sheets-sync.worker.ts`
  - `features/integrations/google-sheets/sync.service.ts`
  - `app/api/v1/schedules/sync/route.ts`
  - `tests/integration/google-sheets-sync.test.ts`
- **Definition of Done**:
  - [ ] Sync tidak menduplikasi data
  - [ ] Concurrent sync terkunci
  - [ ] Count insert/update/skip/error benar
  - [ ] Partial row error tidak menggagalkan seluruh batch
  - [ ] Perubahan publish event
- **Cara uji mandiri**: Fixture initial sync, repeat sync, changed row, deleted row policy, conflict, error row.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 57 — Sync Log dan Scheduling UI
- **Scope**: Menampilkan last sync, manual sync, interval, progress/status polling, count summary, row errors, retry, dan link ke jadwal hasil.
- **Estimasi waktu**: ~25 menit prompting + testing
- **Ketergantungan**: Fase 56
- **File yang dibuat/dimodifikasi**:
  - `features/integrations/components/sync-run-list.tsx`
  - `features/integrations/components/sync-error-table.tsx`
  - `features/integrations/components/sync-now-button.tsx`
  - `app/(admin)/integrations/google-sheets/[id]/page.tsx`
  - `app/(admin)/dashboard/page.tsx`
- **Definition of Done**:
  - [ ] Admin melihat hasil sync dengan jelas
  - [ ] Double trigger dicegah
  - [ ] Error row dapat diekspor/ditelusuri
  - [ ] Dashboard menunjukkan integrasi bermasalah
- **Cara uji mandiri**: Uji running/success/partial/failed dan retry.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 58 — Preview Simulator
- **Scope**: Membuat PreviewFrame dengan preset resolusi, data aktual/dummy, simulated time, offline, emergency, dense schedule, dan screen context. Tidak mengubah data produksi.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 38-43 dan 51
- **File yang dibuat/dimodifikasi**:
  - `app/(admin)/preview/page.tsx`
  - `app/display/preview/[screenId]/page.tsx`
  - `components/admin/preview-frame.tsx`
  - `features/display-runtime/preview-store.ts`
  - `tests/unit/preview-state.test.ts`
- **Definition of Done**:
  - [ ] Preset 720p/768p/1080p/4K/tablet/mobile tersedia
  - [ ] Simulasi tidak publish event
  - [ ] Time simulation memengaruhi status
  - [ ] Offline/emergency dapat diuji
  - [ ] Frame dapat fullscreen
- **Cara uji mandiri**: Coba semua preset dan state simulasi.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 59 — Dashboard Operational Summary
- **Scope**: Menghubungkan dashboard ke agregasi layar, jadwal hari ini, kelas aktif/berikutnya, pengumuman, playlist, expiring media, integration issue, emergency, dan recent activity.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 22, 26, 29, 32, 47, 49, 57
- **File yang dibuat/dimodifikasi**:
  - `features/dashboard/queries.ts`
  - `features/dashboard/types.ts`
  - `app/(admin)/dashboard/page.tsx`
  - `features/dashboard/components/*`
- **Definition of Done**:
  - [ ] KPI sesuai data database
  - [ ] Query tidak N+1
  - [ ] Setiap card memiliki empty/error state
  - [ ] Klik card menuju modul terkait
  - [ ] Dashboard mobile usable
- **Cara uji mandiri**: Uji database kosong, data normal, offline screens, active emergency.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 60 — Activity Log Viewer
- **Scope**: Membuat list/filter, before-after diff, actor/action/entity, request ID, pagination, dan detail drawer. Log bersifat read-only.
- **Estimasi waktu**: ~25 menit prompting + testing
- **Ketergantungan**: Fase 14 dan mutation fitur
- **File yang dibuat/dimodifikasi**:
  - `features/audit/queries.ts`
  - `app/api/v1/activity-logs/route.ts`
  - `app/(admin)/activity-logs/page.tsx`
  - `components/admin/audit-log-viewer.tsx`
  - `components/admin/json-diff.tsx`
- **Definition of Done**:
  - [ ] Filter bekerja
  - [ ] Sensitive field ter-redact
  - [ ] Diff dapat dibaca
  - [ ] Tidak ada edit/delete log dari UI
  - [ ] Pagination stabil
- **Cara uji mandiri**: Generate beberapa mutation dan verifikasi log/diff/redaction.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 61 — System Settings
- **Scope**: Membuat settings untuk branding, timezone default, starting-soon threshold, heartbeat interval, retention, upload limit, dan safe defaults. Tidak mengerjakan multi-tenant.
- **Estimasi waktu**: ~25 menit prompting + testing
- **Ketergantungan**: Fase 10, 14, 44
- **File yang dibuat/dimodifikasi**:
  - `features/settings/schemas.ts`
  - `features/settings/service.ts`
  - `app/api/v1/settings/route.ts`
  - `app/(admin)/settings/page.tsx`
- **Definition of Done**:
  - [ ] Settings tervalidasi
  - [ ] Perubahan tertentu menghasilkan event config
  - [ ] Nilai ekstrem ditolak
  - [ ] Audit log tersimpan
  - [ ] Default tetap bekerja jika key hilang
- **Cara uji mandiri**: Uji threshold, heartbeat interval, upload limit, dan missing settings.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 62 — Security Hardening
- **Scope**: Menerapkan CSP, CSRF strategy, secure headers, rate limit, embed allowlist/sandbox, upload content sniffing, session revoke UI/backend, and secret redaction.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 11, 28, 61
- **File yang dibuat/dimodifikasi**:
  - `middleware.ts`
  - `next.config.ts`
  - `lib/rate-limit.ts`
  - `lib/security-headers.ts`
  - `lib/embed-policy.ts`
  - `features/auth/session-management.ts`
  - `app/(admin)/settings/security/page.tsx`
- **Definition of Done**:
  - [ ] Security headers lulus audit
  - [ ] XSS sample tidak dieksekusi
  - [ ] Embed di luar allowlist ditolak
  - [ ] CSRF mutation ditolak
  - [ ] Admin dapat revoke session
  - [ ] Upload MIME palsu ditolak
- **Cara uji mandiri**: Jalankan security test fixtures untuk XSS, CSRF, brute force, MIME, iframe.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 63 — Structured Logging dan Observability
- **Scope**: Menambahkan Pino request/job logging, correlation ID, Sentry, OpenTelemetry basic trace, health/readiness, dan alert-friendly error categories.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 14, 44, 56
- **File yang dibuat/dimodifikasi**:
  - `lib/logger.ts`
  - `lib/telemetry.ts`
  - `instrumentation.ts`
  - `app/api/health/route.ts`
  - `app/api/readiness/route.ts`
  - `workers/index.ts`
- **Definition of Done**:
  - [ ] RequestId mengikuti API→job→event
  - [ ] Secret tidak masuk log
  - [ ] Unhandled error terkirim ke Sentry
  - [ ] Readiness gagal saat DB/Redis unavailable
  - [ ] Log JSON dapat dicari
- **Cara uji mandiri**: Simulasikan DB/Redis down, API error, worker error, dan periksa trace/log.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 64 — Unit Test Coverage Domain
- **Scope**: Melengkapi unit test status jadwal, priority engine, targeting, playlist resolver, cache migration, device presence, time drift, voice queue, dan mapping.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase domain terkait
- **File yang dibuat/dimodifikasi**:
  - `tests/unit/*`
  - `vitest.config.ts`
  - `package.json`
- **Definition of Done**:
  - [ ] Critical domain branch coverage ≥90%
  - [ ] Test tidak bergantung jaringan/waktu nyata
  - [ ] Fake clock digunakan
  - [ ] Semua test konsisten di CI
- **Cara uji mandiri**: Jalankan `pnpm test:unit` berulang dan dengan coverage.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 65 — Integration Test API dan Database
- **Scope**: Membuat isolated test database, migration per suite, API/service integration tests, auth fixtures, storage mock, Redis test container, dan cleanup.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase API terkait
- **File yang dibuat/dimodifikasi**:
  - `tests/integration/*`
  - `tests/fixtures/*`
  - `vitest.integration.config.ts`
  - `docker-compose.test.yml`
  - `scripts/test-db-reset.ts`
- **Definition of Done**:
  - [ ] Test dapat berjalan dari database kosong
  - [ ] Tidak ada state bocor antartest
  - [ ] Auth/validation/conflict/audit teruji
  - [ ] CI dapat menjalankan test secara reproducible
- **Cara uji mandiri**: Jalankan suite dua kali berturut-turut dan paralel sesuai kemampuan.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 66 — Playwright E2E Critical Flow
- **Scope**: Membuat E2E untuk login, master data, jadwal publish, pengumuman, media mock, playlist, pairing, realtime update, offline fallback, dan emergency.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 45, 51, 58
- **File yang dibuat/dimodifikasi**:
  - `playwright.config.ts`
  - `tests/e2e/auth.spec.ts`
  - `tests/e2e/schedule-display.spec.ts`
  - `tests/e2e/pairing.spec.ts`
  - `tests/e2e/offline.spec.ts`
  - `tests/e2e/emergency.spec.ts`
- **Definition of Done**:
  - [ ] Critical happy path lulus pada Chromium
  - [ ] Screenshot/video gagal tersimpan
  - [ ] Test data otomatis dibuat/dibersihkan
  - [ ] Offline dan SSE reconnect teruji
- **Cara uji mandiri**: Jalankan headless dan headed pada local production build.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 67 — Accessibility dan Keyboard QA
- **Scope**: Audit WCAG AA admin, focus order, labels, dialog, status badges, reduced motion, subtitle field, dan display non-audio dependency.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase UI lengkap
- **File yang dibuat/dimodifikasi**:
  - `components/**/*`
  - `tests/e2e/accessibility.spec.ts`
  - `docs/accessibility-checklist.md`
- **Definition of Done**:
  - [ ] Tidak ada critical axe violations
  - [ ] Semua form berlabel
  - [ ] Admin critical flows keyboard-only
  - [ ] Reduced-motion dihormati
  - [ ] Emergency tidak bergantung audio
- **Cara uji mandiri**: Axe scan + manual keyboard dan screen reader spot test.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 68 — Performance dan TV Compatibility QA
- **Scope**: Mengoptimalkan bundle, query, image/video preload, memory cleanup, burn-in mitigation, overscan safe area, browser fallback, dan long-run stability.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase display lengkap
- **File yang dibuat/dimodifikasi**:
  - `next.config.ts`
  - `features/display-runtime/*`
  - `components/display/*`
  - `scripts/check-display-compat.ts`
  - `docs/tv-test-matrix.md`
- **Definition of Done**:
  - [ ] First load display ≤4 detik pada target staging
  - [ ] Update ≤5 detik
  - [ ] Tidak ada memory growth kritis pada soak test
  - [ ] Tidak ada clipping overscan
  - [ ] Browser target memiliki fallback
- **Cara uji mandiri**: Lighthouse, bundle analysis, 4-hour accelerated soak, dan device matrix.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 69 — Docker Production Build dan CI
- **Scope**: Membuat multi-stage Dockerfile, web/worker services, migration job, CI lint/type/test/build, image scan, dan artifact tagging.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 63-66
- **File yang dibuat/dimodifikasi**:
  - `Dockerfile`
  - `docker-compose.yml`
  - `.github/workflows/ci.yml`
  - `.github/workflows/build-image.yml`
  - `scripts/start-production.sh`
- **Definition of Done**:
  - [ ] Image production berjalan non-root
  - [ ] Web dan worker terpisah
  - [ ] CI gagal pada lint/test/build error
  - [ ] Migration job eksplisit
  - [ ] Image memiliki version tag
- **Cara uji mandiri**: Build dari clean cache dan jalankan stack lokal production.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 70 — Staging Deployment dan Smoke Test
- **Scope**: Deploy staging dengan domain/SSL, managed PostgreSQL/Redis/storage, env secrets, backup, monitoring, dan smoke test end-to-end.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 69
- **File yang dibuat/dimodifikasi**:
  - `infra/staging/*`
  - `docs/deployment-staging.md`
  - `docs/runbook.md`
  - `tests/e2e/staging-smoke.spec.ts`
- **Definition of Done**:
  - [ ] Staging HTTPS aktif
  - [ ] Migration dan seed aman
  - [ ] Pairing device staging berhasil
  - [ ] Monitoring/backup diuji
  - [ ] Rollback image sebelumnya tersedia
- **Cara uji mandiri**: Run staging smoke, restore backup sample, dan rollback image.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 71 — Pilot TV dan UAT
- **Scope**: Menjalankan pilot satu layar/satu cabang, kiosk setup, autoplay, auto-start, network loss, power recovery, Admin UAT, dan defect log.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 70
- **File yang dibuat/dimodifikasi**:
  - `docs/tv-installation.md`
  - `docs/admin-guide.md`
  - `docs/uat-checklist.md`
  - `docs/pilot-findings.md`
- **Definition of Done**:
  - [ ] TV menyala kembali ke display setelah power cycle
  - [ ] Offline cache berfungsi
  - [ ] Admin menyelesaikan skenario tanpa developer
  - [ ] Critical defect = 0
  - [ ] UAT sign-off tercatat
- **Cara uji mandiri**: Uji fisik TV 43 inci dari jarak 2m dan 5m selama jam operasional.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

### Fase 72 — Production Rollout dan Handover
- **Scope**: Deploy production, buat admin resmi, pairing layar bertahap, backup/restore, alert, SOP emergency, training, release notes, dan rollback rehearsal.
- **Estimasi waktu**: ~30 menit prompting + testing
- **Ketergantungan**: Fase 71
- **File yang dibuat/dimodifikasi**:
  - `docs/production-checklist.md`
  - `docs/emergency-sop.md`
  - `docs/backup-restore.md`
  - `docs/release-notes-v1.md`
  - `README.md`
- **Definition of Done**:
  - [ ] Production sehat
  - [ ] Pilot dan layar tambahan paired
  - [ ] Admin terlatih
  - [ ] SOP emergency disetujui
  - [ ] Backup/restore dan rollback pernah diuji
  - [ ] Monitoring aktif
- **Cara uji mandiri**: Production smoke test dan simulasi rollback terkontrol.
- **Status**: [ ] Belum | [ ] Sedang | [ ] Selesai

---

## 7. Reusable Components

| Kelompok | Komponen | Digunakan pada |
|---|---|---|
| Admin Layout | AdminSidebar, AdminHeader, MobileNav, Breadcrumbs | Semua screen admin |
| Data & Filter | DataTable, FilterBar, DateRangePicker, TimePicker, Pagination, SortHeader | Jadwal, master data, layar, log |
| Form | FormField, FieldError, BranchSelector, ScreenSelector, MediaSelector, PublishDialog | Semua form domain |
| Feedback | LoadingState, Skeleton, EmptyState, ErrorState, ConfirmDialog, Toast | Seluruh aplikasi |
| Status | ScheduleStatusBadge, DeviceStatusBadge, ContentStatusBadge, PriorityBadge | Table/card/display |
| Media | MediaUploader, MediaCard, Thumbnail, PosterViewer, VideoPlayer, AudioPreview | Media, playlist, display |
| Playlist | PlaylistBuilder, PlaylistItemCard, PlaylistItemEditor, DurationSummary | Create/edit playlist |
| Integration | IntegrationCard, IntegrationMapper, SyncRunList, SyncErrorTable | Google Sheets |
| Display Foundation | DisplayShell, DisplayHeader, BrandLogo, DigitalClock, ConnectionIndicator, LastSyncIndicator | Semua mode display |
| Display Schedule | ScheduleBoard, ScheduleRow, CurrentClassCard, NextClassCard | Mode jadwal/kelas aktif |
| Display Content | AnnouncementCard, AnnouncementCarousel, CountdownCard, QrCodeCard, PaginationIndicator | Mode pengumuman/multimedia |
| Display Control | RunningTicker, VoiceQueue, EmergencyOverlay, OfflineFallback | Cross-mode display |
| Preview | PreviewFrame, ResolutionPreset, SimulationToolbar | Preview Admin |
| Audit | AuditLogViewer, JsonDiff, RequestIdLink | Log aktivitas |

### 7.1 Kontrak Komponen Display

Semua komponen display harus:

- menerima data serializable dan tidak melakukan fetch sendiri;
- memiliki state `loading`, `empty`, `error`, dan `stale` bila relevan;
- aman terhadap teks panjang;
- memakai ukuran berbasis design token/viewport, bukan angka acak per komponen;
- mendukung reduced motion;
- tidak menampilkan control admin;
- dapat dirender dalam PreviewFrame dan runtime produksi tanpa fork komponen.

### 7.2 Kontrak Komponen Form Admin

- Schema Zod menjadi sumber validasi utama.
- Error server dipetakan ke field atau form-level message.
- Tombol submit disabled saat pending.
- Destructive action selalu memakai ConfirmDialog.
- Publish action berbeda secara visual dari Save Draft.
- Form panjang memiliki unsaved-changes warning.

---


## 8. Chunking Guide — Cara Pakai TIP Saat Prompting

### 8.1 Sebelum Memulai Fase

1. Pastikan semua dependency fase sudah berstatus selesai.
2. Tempel hanya bagian TIP yang relevan agar konteks tidak terlalu besar.
3. Sertakan struktur folder, model terkait, kontrak API, dan Definition of Done fase.
4. Minta AI membuat plan file-level terlebih dahulu apabila fase menyentuh lebih dari lima file.
5. Setelah kode dibuat, jalankan test dan masukkan temuan ke Findings Log.

### 8.2 Template Prompt Implementasi

```text
Aku sedang mengerjakan KE Digital Signage, aplikasi responsive PWA berbasis Next.js.

Konteks arsitektur:
- Next.js App Router + TypeScript
- PostgreSQL + Prisma
- Redis/BullMQ
- Display menggunakan SSE, IndexedDB, dan PWA cache
- Admin menggunakan session HttpOnly

Bagian TIP yang relevan:
[tempel Project Overview ringkas]
[tempel Data Model yang terkait]
[tempel Screen Map yang terkait]

Sekarang kerjakan Fase [N] — [Nama Fase].

Scope fase ini:
[tempel Scope persis dari TIP]

File yang boleh dibuat/dimodifikasi:
[tempel daftar file]

Definition of Done:
[tempel checklist]

Batasan:
- Kerjakan fase ini saja.
- Jangan membuat fitur dari fase berikutnya.
- Gunakan strict TypeScript dan Zod.
- Pisahkan domain logic dari React/Prisma bila memungkinkan.
- Sertakan perintah install bila ada dependency baru.
- Sertakan langkah testing manual dan automated test yang relevan.
- Jangan mengubah kontrak yang sudah ditetapkan tanpa menjelaskan alasannya.
```

### 8.3 Template Prompt UI Only

```text
Kerjakan hanya UI untuk Fase [N]. Gunakan data fixture lokal.
Jangan membuat endpoint, migration, database query, atau integrasi real-time.
Pastikan komponen memiliki loading, empty, error, long-text, dan responsive state.
Target visual utama: TV 1920×1080 atau admin mobile/desktop sesuai fase.
```

### 8.4 Template Prompt Backend/API Only

```text
Kerjakan hanya backend/API untuk Fase [N].
Jangan membuat halaman atau komponen visual.
Gunakan Zod, requireAdmin/device auth, transaksi bila perlu, audit log, dan typed response.
Tambahkan test untuk happy path, invalid input, unauthorized, conflict, dan idempotency.
```

### 8.5 Template Prompt Debugging

```text
Aku sedang mengerjakan KE Digital Signage pada Fase [N] — [Nama Fase].

Error lengkap:
[paste error, stack trace, requestId, dan log terkait]

Perilaku yang diharapkan:
[jelaskan]

Langkah reproduksi:
1. ...
2. ...
3. ...

Kode terkait:
[paste file minimal yang relevan]

Konteks TIP:
[tempel data model, kontrak, dan Definition of Done fase]

Tolong:
1. Identifikasi root cause paling mungkin.
2. Bedakan fakta, hipotesis, dan data yang masih kurang.
3. Buat plan fix file-level.
4. Setelah plan, berikan patch minimal untuk fase ini saja.
5. Tambahkan regression test agar bug tidak kembali.
```

### 8.6 Template Prompt Code Review

```text
Review implementasi Fase [N] terhadap TIP berikut.
Fokus pada:
- kesesuaian scope;
- bug dan race condition;
- security;
- type safety;
- query N+1;
- cleanup timer/SSE/audio;
- offline/reconnect behavior;
- test coverage;
- pelanggaran Definition of Done.

Jangan menulis ulang seluruh project. Berikan temuan terurut Critical/High/Medium/Low dan patch minimal.
```

### 8.7 Quality Gate Per Fase

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration   # bila fase menyentuh API/DB
pnpm build              # minimal sebelum merge milestone
```

Untuk fase UI/display tambahkan screenshot pada resolusi target. Untuk fase realtime/offline, lakukan test dengan jaringan diputus dan server/Redis direstart.

---


## 9. Development Notes & Findings Log

Bagian ini harus diperbarui sepanjang pengembangan. Jangan menghapus histori keputusan; tambahkan baris baru dan kaitkan dengan fase.

### 9a. Keputusan Teknis

| Fase | Keputusan | Alasan |
|---|---|---|
| Perencanaan | Produk dibangun sebagai Next.js responsive PWA, bukan Expo/native | PRD menargetkan browser TV, kiosk, desktop, tablet, dan mobile dalam satu sistem. |
| Perencanaan | Satu Next.js full-stack repository untuk MVP | Mengurangi kompleksitas dan mempercepat implementasi; backend dapat dipisah setelah boundary stabil. |
| Perencanaan | SSE + REST acknowledgement + polling fallback | Mayoritas event bersifat server-ke-display; lebih sederhana daripada WebSocket untuk MVP. |
| Perencanaan | PostgreSQL sebagai source of truth, IndexedDB hanya cache display | Data membutuhkan auth, relasi, audit, multi-device sync, dan real-time. |
| Perencanaan | Deploy Docker, bukan serverless-only | SSE, worker, queue, dan long-running connection memerlukan runtime yang dapat dikontrol. |
| Perencanaan | Emergency memakai confirmation token dan state resume | Mengurangi aktivasi tidak sengaja dan memastikan playlist kembali tanpa reset. |

### 9b. Temuan & Isu

| Fase | Temuan | Prioritas (High/Med/Low) | Status |
|---|---|---|---|
| Perencanaan | Kompatibilitas autoplay audio berbeda pada browser TV; perlu provisioning device dan fallback visual | High | Backlog Fase 53/71 |
| Perencanaan | Browser Smart TV lama dapat membatasi Service Worker, IndexedDB, codec, atau SSE | High | Backlog Fase 68/71 |
| Perencanaan | Akses Google Sheets memerlukan keputusan service account vs OAuth organisasi | Medium | Putuskan sebelum Fase 54 |
| Perencanaan | Provider email reset password dan TTS belum dipilih | Medium | Gunakan adapter; pilih sebelum staging |
| Perencanaan | Kebijakan terhadap baris yang dihapus dari sumber Google Sheets perlu dikonfirmasi | Medium | Default: jangan hard-delete; tandai missing/review |
| Perencanaan | Restart aplikasi remote tidak selalu dapat dilakukan dari browser murni | Low | Best-effort reload; restart OS melalui device manager di luar MVP |

### 9c. Progress Tracker

| Fase | Status | Estimasi Waktu | Tanggal Selesai | Catatan |
|---|---|---|---|---|
| Fase 0 | Dilewati / N/A | — | 28 Juli 2026 | Tidak ada starter template |
| Fase 1 | Belum | ~25–30 menit | — | — |
| Fase 2 | Belum | ~25–30 menit | — | — |
| Fase 3 | Belum | ~25–30 menit | — | — |
| Fase 4 | Belum | ~25–30 menit | — | — |
| Fase 5 | Belum | ~25–30 menit | — | — |
| Fase 6 | Belum | ~25–30 menit | — | — |
| Fase 7 | Belum | ~25–30 menit | — | — |
| Fase 8 | Belum | ~25–30 menit | — | — |
| Fase 9 | Belum | ~25–30 menit | — | — |
| Fase 10 | Belum | ~25–30 menit | — | — |
| Fase 11 | Belum | ~25–30 menit | — | — |
| Fase 12 | Belum | ~25–30 menit | — | — |
| Fase 13 | Belum | ~25–30 menit | — | — |
| Fase 14 | Belum | ~25–30 menit | — | — |
| Fase 15 | Belum | ~25–30 menit | — | — |
| Fase 16 | Belum | ~25–30 menit | — | — |
| Fase 17 | Belum | ~25–30 menit | — | — |
| Fase 18 | Belum | ~25–30 menit | — | — |
| Fase 19 | Belum | ~25–30 menit | — | — |
| Fase 20 | Belum | ~25–30 menit | — | — |
| Fase 21 | Belum | ~25–30 menit | — | — |
| Fase 22 | Belum | ~25–30 menit | — | — |
| Fase 23 | Belum | ~25–30 menit | — | — |
| Fase 24 | Belum | ~25–30 menit | — | — |
| Fase 25 | Belum | ~25–30 menit | — | — |
| Fase 26 | Belum | ~25–30 menit | — | — |
| Fase 27 | Belum | ~25–30 menit | — | — |
| Fase 28 | Belum | ~25–30 menit | — | — |
| Fase 29 | Belum | ~25–30 menit | — | — |
| Fase 30 | Belum | ~25–30 menit | — | — |
| Fase 31 | Belum | ~25–30 menit | — | — |
| Fase 32 | Belum | ~25–30 menit | — | — |
| Fase 33 | Belum | ~25–30 menit | — | — |
| Fase 34 | Belum | ~25–30 menit | — | — |
| Fase 35 | Belum | ~25–30 menit | — | — |
| Fase 36 | Belum | ~25–30 menit | — | — |
| Fase 37 | Belum | ~25–30 menit | — | — |
| Fase 38 | Belum | ~25–30 menit | — | — |
| Fase 39 | Belum | ~25–30 menit | — | — |
| Fase 40 | Belum | ~25–30 menit | — | — |
| Fase 41 | Belum | ~25–30 menit | — | — |
| Fase 42 | Belum | ~25–30 menit | — | — |
| Fase 43 | Belum | ~25–30 menit | — | — |
| Fase 44 | Belum | ~25–30 menit | — | — |
| Fase 45 | Belum | ~25–30 menit | — | — |
| Fase 46 | Belum | ~25–30 menit | — | — |
| Fase 47 | Belum | ~25–30 menit | — | — |
| Fase 48 | Belum | ~25–30 menit | — | — |
| Fase 49 | Belum | ~25–30 menit | — | — |
| Fase 50 | Belum | ~25–30 menit | — | — |
| Fase 51 | Belum | ~25–30 menit | — | — |
| Fase 52 | Belum | ~25–30 menit | — | — |
| Fase 53 | Belum | ~25–30 menit | — | — |
| Fase 54 | Belum | ~25–30 menit | — | — |
| Fase 55 | Belum | ~25–30 menit | — | — |
| Fase 56 | Belum | ~25–30 menit | — | — |
| Fase 57 | Belum | ~25–30 menit | — | — |
| Fase 58 | Belum | ~25–30 menit | — | — |
| Fase 59 | Belum | ~25–30 menit | — | — |
| Fase 60 | Belum | ~25–30 menit | — | — |
| Fase 61 | Belum | ~25–30 menit | — | — |
| Fase 62 | Belum | ~25–30 menit | — | — |
| Fase 63 | Belum | ~25–30 menit | — | — |
| Fase 64 | Belum | ~25–30 menit | — | — |
| Fase 65 | Belum | ~25–30 menit | — | — |
| Fase 66 | Belum | ~25–30 menit | — | — |
| Fase 67 | Belum | ~25–30 menit | — | — |
| Fase 68 | Belum | ~25–30 menit | — | — |
| Fase 69 | Belum | ~25–30 menit | — | — |
| Fase 70 | Belum | ~25–30 menit | — | — |
| Fase 71 | Belum | ~25–30 menit | — | — |
| Fase 72 | Belum | ~25–30 menit | — | — |

### 9d. Definition of Ready Sebelum Memulai Coding

- Repository dan akses deployment tersedia.
- Logo serta asset brand final tersedia.
- Domain staging ditentukan.
- Database, Redis, dan object storage development tersedia.
- Keputusan provider email dan TTS dapat ditunda menggunakan adapter, tetapi interface disepakati.
- Contoh Google Sheet jadwal tersedia sebelum Fase 54.
- Minimal satu perangkat TV/TV Box tersedia sebelum Fase 68.

### 9e. Definition of Done Produk MVP

- Acceptance criteria Admin, Display, Real-Time, Offline, Emergency, Google Sheets, dan Log terpenuhi.
- Tidak ada critical/high security finding terbuka.
- Unit, integration, dan E2E critical flow lulus.
- Display pilot berjalan pada TV 43 inci dan pulih setelah listrik/koneksi putus.
- Admin dapat menjalankan operasional tanpa bantuan developer.
- Monitoring, backup, restore, rollback, dokumentasi, dan SOP emergency aktif.

---

## Lampiran A — Pemetaan Acceptance Criteria ke Fase

| Area | Acceptance Criteria Utama | Fase Verifikasi |
|---|---|---|
| Auth | Login/logout/reset/session aman | 11–13, 62, 66 |
| Jadwal | CRUD, status otomatis, conflict, display | 21–25, 37–40, 66 |
| Pengumuman | CRUD, schedule, publish, carousel | 26–27, 37, 39–40 |
| Media | Upload valid, playlist, fallback | 28–29, 33, 39–43 |
| Playlist | Builder, scheduling, runtime, prefetch | 32–33, 40 |
| Pairing | Register, pair, token, revoke | 34–36, 66 |
| Monitoring | Heartbeat, online/offline, drift | 46–47, 59 |
| Realtime | Update ≤5 detik, reconnect, polling | 44–45, 68 |
| Offline | App shell, IndexedDB, branded fallback | 41–43, 66, 71 |
| Emergency | Confirmation, takeover, resume | 49–51, 66, 71 |
| Voice | Queue, collision, volume restore, log | 52–53, 71 |
| Google Sheets | Mapping, sync, conflict, logs | 54–57 |
| Preview | Resolusi dan simulasi state | 58 |
| Audit/Security | Activity log, headers, CSRF, XSS, upload | 60, 62–63 |
| QA/Deployment | Accessibility, TV, performance, staging, pilot | 64–72 |

## Lampiran B — API Boundary MVP

- Admin API: session-authenticated REST/Server Actions.
- Display API: device-token-authenticated REST.
- Realtime: SSE `/api/v1/events/stream`.
- Heartbeat: `POST /api/v1/display/heartbeat`.
- Acknowledgement: playback/error/command ack melalui REST.
- Worker jobs: BullMQ untuk Google Sheets, media metadata, voice, cleanup.
- External integration tidak boleh langsung dipanggil dari browser display.

## Lampiran C — Backlog Pasca-MVP

- Screen group UI lanjutan dan bulk command.
- Google Calendar/Drive/Slides/YouTube/Canva production adapters.
- Screenshot perangkat dan remote device management agent.
- Native wrapper Android TV bila browser target tidak memadai.
- Template builder dan drag-drop layout editor.
- Multi-branch permissions dan role Editor/Akademik.
- Content impression analytics.
- LMS, presensi guru, dan academic system integration.
- AI-assisted announcement generation/summarization.
- Multilingual display.

**Akhir Dokumen**
