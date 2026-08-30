# LEXA Internship Management System - Project Continuation Guide

## Project Overview

- **Stack:** Next.js 15, TypeScript 5.7, PostgreSQL/Supabase, Prisma ORM, NextAuth 5 (JWT).
- **Repository:** `ndiecyber/SH03-Internship-System` (`main`).
- **Local URL:** `http://localhost:3000`.
- **Roles:** `ADMIN`, `INTERN`, `MENTOR`.

## Current Session Status — 2026-07-22

### Newly Completed: Selection, Intern Profile, and Google Drive Tracking

1. **Structured application workflow**
   - `Application.status` is now an `ApplicationStatus` enum: `PENDING`, `IN_REVIEW`, `INTERVIEW`, `ACCEPTED`, `REJECTED`, and `WITHDRAWN`.
   - Existing application data was migrated safely: `approved` to `ACCEPTED`, `rejected` to `REJECTED`, `review` to `IN_REVIEW`, and remaining values to `PENDING`.
   - Admin can add a selection session from `/admin/applicants`; applicant details display the session history.

2. **Selection sessions**
   - New `SelectionSession` model is related to an `Application` and optionally to the admin/interviewer.
   - It stores title, type, schedule, online/offline method, location or meeting link, interviewer, notes, score, result notes, and status.
   - Supported types: Administration, Interview, Technical Test, HR Interview, Final Interview, and Other.
   - Supported statuses: Scheduled, Completed, Cancelled, and Rescheduled.

3. **Accepted applicant becomes an Intern without duplicate accounts**
   - Admin acceptance now asks for confirmation.
   - The existing applicant `User` is updated to `role: INTERN` and `approvalStatus: APPROVED`; no new account is created.
   - If the intern has no mentor assignment, the first approved mentor is assigned when available.
   - Application history remains stored and access to Intern features follows the existing role guards.

4. **Expanded Intern profile**
   - `/intern/profile` now includes Personal Information, Education, Skill & Portfolio, and read-only Internship Information sections.
   - Intern-editable information includes contact, address, education, portfolio/LinkedIn, GitHub username, skills, bio, organization experience, and work/project experience.
   - Administrative internship fields remain Admin-controlled.
   - A profile-completion percentage helps Interns identify incomplete information.

5. **Google Drive registration tracking**
   - Intern records now track Google Drive registration status, folder URL, folder ID, registration timestamp, and the admin ID that recorded it.
   - `/admin/interns` has a Google Drive status column and filter.
   - New route: `/admin/google-drive-interns`, listing Interns whose Google Drive status is not yet registered.
   - Admin can register an Intern by saving the Google Drive folder URL and optional folder ID. This is intentionally internal tracking only; no Google Drive API credentials are needed.

### Existing Features

- Registration approval workflow (`PENDING`, `APPROVED`, `REJECTED`).
- Role-based middleware and route guards.
- Session persistence: 7-day JWT session, 24-hour server refresh, 5-minute client session refresh.
- Admin, Intern, and Mentor dashboards; internship program registration; logbooks; evaluations; certificates; announcements; and mentor assignments.
- Existing dashboard/user-list polling pattern for real-time updates.

## Routes

### Admin

- `/admin/dashboard`
- `/admin/applicants` — application review and selection sessions
- `/admin/interns` — intern list, mentor assignment, and Google Drive filter
- `/admin/google-drive-interns` — Interns not yet recorded in Google Drive
- `/admin/mentors`
- `/admin/internship-programs`
- `/admin/monitoring`
- `/admin/reports`
- `/admin/announcements`
- `/admin/settings`

### Intern

- `/intern/dashboard`
- `/intern/internship-registration`
- `/intern/logbook`
- `/intern/progress`
- `/intern/certificate`
- `/intern/announcements`
- `/intern/profile`

### Mentor

- `/mentor/dashboard`
- `/mentor/assigned-interns`
- `/mentor/logbook-review`
- `/mentor/evaluation`
- `/mentor/announcements`
- `/mentor/profile`

## Database Status

Key models include `User`, `Application`, `SelectionSession`, `InternshipProgram`, `MentorIntern`, `Logbook`, `Evaluation`, `Certificate`, and `Announcement`.

Applied migrations:

- `20260702051631_init`
- `20260702084439_extend_schema`
- `20260707120641_add_registration_approval`
- `20260722100000_application_selection_and_intern_profile` — applied successfully to Supabase on 2026-07-22.

Important schema files:

- `prisma/schema.prisma`
- `prisma/migrations/20260722100000_application_selection_and_intern_profile/migration.sql`

## Key Implementation Files

- `src/features/admin/services/applicant.actions.ts` — application statuses and selection-session actions.
- `src/features/admin/components/applicant-manager.tsx` — applicant review, selection form, and history.
- `src/features/admin/services/user-management.actions.ts` — intern list queries, mentor assignment, and Google Drive registration action.
- `src/features/admin/components/google-drive-interns.tsx` — Google Drive registration UI.
- `src/features/profile/services/profile.actions.ts` — intern profile reads and updates.
- `src/features/profile/components/profile-form.tsx` — expanded profile sections.
- `src/lib/navigation/role-navigation.ts` — Admin Google Drive navigation item.

## Verification Performed

- `npx prisma generate` — passed.
- `npx prisma migrate deploy` — passed; latest migration applied.
- `npx tsc --noEmit` — passed.
- `npm run build` — passed.

The production build still emits the known non-blocking dynamic-server-usage messages for protected routes, because authentication reads request headers during static-generation analysis.

## How to Continue

```bash
npm run dev
npx prisma migrate deploy
npm run build
```

Use `npx prisma migrate deploy` for existing environments. Do not run `prisma migrate reset` except on a disposable development database.

## Recommended Manual Tests

1. Register an Intern, approve the account, create an application, add a selection session, then accept the application.
2. Confirm the same account can access Intern routes and appears in Admin Interns.
3. Complete the Intern profile and verify the completion percentage changes.
4. In Admin Interns, filter `Google Drive: Belum`; register a Drive folder; confirm the Intern disappears from `/admin/google-drive-interns`.
5. Verify mentor assignment and existing logbook, evaluation, certificate, and session-persistence flows still work.

## Possible Next Enhancements

- UI controls for editing/completing/rescheduling individual selection sessions and recording final scores/results.
- Admin profile-detail page and Admin-only editing of internship placement fields.
- Google Drive API integration to create folders automatically after credentials are configured.
- Email notifications for selection-session scheduling and rescheduling.
- WebSocket-based real-time updates, comments/feedback, certificate PDF generation, and progress analytics.

**Last Updated:** 2026-07-22
**Session Status:** Core selection, intern-profile, and Google Drive tracking features are implemented and verified.

---

## Current Session Status — 2026-07-29

### Newly Completed

#### 1. Password Hashing — Upgrade ke bcrypt
- Seluruh password di database sekarang menggunakan **bcrypt** (cost factor 12) dengan salt unik per user.
- Sebelumnya menggunakan PBKDF2 dengan salt statis — sudah dimigrasikan seluruhnya.
- `src/utils/hash.ts` — `hashPassword()` dan `verifyPassword()` sekarang pure bcrypt.
- Fallback legacy PBKDF2 sudah dihapus setelah semua akun berhasil dimigrasikan.

#### 2. Keamanan Registrasi — Hapus Role ADMIN dari Form Publik
- Dropdown role pada halaman register tidak lagi menampilkan pilihan `ADMIN`.
- Validasi Zod di `auth.schema.ts` diubah: `z.enum(["MENTOR", "INTERN"])` — role `ADMIN` tidak bisa dikirim dari client manapun.

#### 3. Seed Database — Proteksi Data Real
- `prisma/seed.ts` kini memiliki **guard berlapis** sebelum `deleteMany()`:
  1. Wajib set `SEED_DEFAULT_PASSWORD` di `.env` — kalau tidak ada, seed langsung berhenti.
  2. Cek apakah ada akun pengguna nyata di database — jika ada, seed **diblokir** dengan pesan error lengkap berisi daftar nama akun dan jumlah data yang akan terhapus.
- Tidak ada bypass atau override — satu-satunya cara seed bisa jalan adalah database benar-benar bebas dari akun real.

#### 4. Dropdown Posisi yang Dilamar — Form Pendaftaran Intern
- Halaman `/intern/internship-registration` kini memiliki dropdown **12 posisi**:
  UI/UX Designer, Frontend Web Developer, Backend Engineer, QA/Software Tester & Documentation, Repository E-Prints, Social Media Specialist, Corporate Identity Designer, AI & Security Engineer, DevOps Engineer, AI/LM Engineer, Academic Publishing Intern, Branding and Graphic Designer.
- Field `position` ditambahkan ke model `Application` (migration `20260728000000_add_position_to_application`).
- Posisi wajib dipilih sebelum submit pendaftaran maupun kirim ulang.
- Saat admin accept applicant, posisi otomatis ter-copy ke `internshipPosition` di profil user.
- Posisi tampil di tabel dan detail modal `/admin/applicants` dan `/admin/interns`.

#### 5. Info Seleksi Real-time di Halaman Pendaftaran Intern
- Halaman `/intern/internship-registration` menampilkan informasi sesi seleksi:
  - Status: Pending, Sedang Direview, Tahap Seleksi, Diterima, Ditolak, Ditarik.
  - Kalau status `IN_REVIEW` atau `INTERVIEW`, muncul kotak info ungu berisi jadwal seleksi lengkap: tanggal, jam, metode online/offline, link meeting klikable, nama pewawancara, catatan.
  - Riwayat sesi yang sudah selesai beserta skor juga ditampilkan.
- `getInternApplications()` sekarang include `selectionSessions` dengan semua field.

#### 6. Persen Kelengkapan Profil Intern — 21 Field
- Completeness card di `/intern/profile` dihitung dari **21 field** (sebelumnya hanya 8):
  - Informasi Pribadi: 9 field (nama, panggilan, telepon, tempat/tgl lahir, gender, alamat, kota, provinsi).
  - Pendidikan: 7 field (institusi, fakultas, prodi, NIM, semester, tahun masuk, tahun lulus).
  - Skill & Portfolio: 5 field (portfolio URL, LinkedIn, skills, GitHub, bio).
- UI: 3 mini progress bar berwarna per section, responsif 1 kolom mobile / 3 kolom desktop.

#### 7. Admin Lihat Profil Lengkap Intern & Applicant
- Detail modal di `/admin/interns` dan `/admin/applicants` menampilkan 4 section profil:
  Informasi Pribadi, Pendidikan, Skill & Portfolio, Informasi Internship.
- **Mulai** = `application.createdAt` (tanggal daftar program → On Going dimulai).
- **Selesai** = `certificate.issuedAt` (tanggal sertifikat terbit → Completed).

#### 8. Filter Upcoming & On Going — Logika Diperbaiki
- **Upcoming** = ACCEPTED + belum ada mentor yang di-assign.
- **On Going** = ACCEPTED + sudah ada mentor yang di-assign.
- Sebelumnya logikanya salah (upcoming = belum pernah daftar sama sekali).

#### 9. Admin Tambah Intern Langsung
- Tombol `Add Intern` di `/admin/interns` berfungsi penuh.
- Admin mengisi: Nama, Email, Password, Program Magang, Posisi, Mentor (opsional — auto-assign jika kosong).
- Akun intern langsung `APPROVED`, application langsung `ACCEPTED` — status langsung **On Going**.

#### 10. Admin Tambah Mentor Langsung
- Tombol `Add Mentor` di `/admin/mentors` berfungsi penuh.
- Admin mengisi: Nama, Email, Password.
- Akun mentor langsung `APPROVED` — aktif seketika dan langsung bisa di-assign ke intern.

#### 11. Nomor Sertifikat — Selalu Naik, Tidak Mundur
- Sebelumnya menggunakan `count()` — jika ada sertifikat yang dihapus, nomor bisa duplikat.
- Sekarang menggunakan `findFirst({ orderBy: { certNumber: "desc" } })` untuk ambil angka tertinggi + 1.

#### 12. Connection Pool Supabase — Diperbaiki
- `DATABASE_URL` diperbarui: `connection_limit=5&pool_timeout=20` (sebelumnya `connection_limit=1`).
- Menyelesaikan error `P2024` connection pool timeout.

---

## Updated Routes

### Admin (tambahan)
- `/admin/interns` — tambah intern langsung, filter Upcoming/On Going/Completed, profil lengkap dengan tanggal mulai/selesai
- `/admin/mentors` — tambah mentor langsung
- `/admin/applicants` — profil lengkap applicant dengan posisi yang dilamar

### Intern (tambahan)
- `/intern/internship-registration` — dropdown 12 posisi + info sesi seleksi real-time
- `/intern/profile` — completeness 21 field dengan 3 mini progress bar

---

## Updated Database Status

Applied migrations (tambahan sejak 2026-07-22):
- `20260728000000_add_position_to_application` — field `position` di model `Application`.

Model di schema (belum dipakai aktif, tabel kosong):
- `PasswordResetToken` — disiapkan untuk fitur lupa password, migration sudah applied.

---

## Updated Key Implementation Files

- `src/utils/hash.ts` — pure bcrypt, hashPassword & verifyPassword.
- `src/features/auth/schemas/auth.schema.ts` — role enum hanya MENTOR & INTERN.
- `prisma/seed.ts` — guard proteksi data real sebelum deleteMany.
- `src/features/internship-programs/services/application.actions.ts` — field position di applyForProgramAction & resubmitApplicationAction.
- `src/features/internship-programs/components/intern-registration.tsx` — dropdown 12 posisi + info sesi seleksi.
- `src/features/profile/components/profile-form.tsx` — completeness 21 field dengan 3 sub-bar.
- `src/features/admin/components/user-list-container.tsx` — detail profil lengkap, tanggal mulai/selesai dari application & certificate.
- `src/features/admin/components/user-list.tsx` — logika status Upcoming/On Going/Completed.
- `src/features/admin/components/mentor-list-container.tsx` — form tambah mentor berfungsi.
- `src/features/admin/services/user-management.actions.ts` — addInternByAdminAction, addMentorByAdminAction.
- `src/features/admin/services/applicant.actions.ts` — saat ACCEPTED, internshipPosition di-copy dari application.position.
- `src/features/mentor/services/evaluation.actions.ts` — cert number sequence pakai max bukan count.

---

## How to Continue

```bash
npm run dev
npx prisma migrate deploy
npm run build
```

**PENTING:** Jangan jalankan `npx prisma db seed` selama ada data pengguna nyata di database.
Seed akan diblokir otomatis oleh guard, tapi tetap harus berhati-hati.

---

## Possible Next Enhancements (Updated)

- Fitur lupa password via email reset link (sempat diimplementasikan lalu di-rollback karena masalah teknis, bisa dikerjakan ulang dengan fire-and-forget email).
- Security headers di `next.config.ts` (X-Frame-Options, CSP, Referrer-Policy).
- Rate limiting untuk endpoint login dan register.
- Proteksi IDOR di `evaluation.actions.ts` — verifikasi mentor hanya bisa nilai intern yang di-assign ke dia.
- `getPublishedAnnouncements()` — ambil role dari session, bukan dari parameter client.
- Supabase Storage untuk upload foto profil dan CV.


**Last Updated:** 2026-07-29
**Session Status:** bcrypt migration, seed protection, position dropdown, intern selection info, profile completeness 21 fields, admin add intern/mentor, intern start/end dates, cert sequence fix — semua implemented dan verified, penyesuaian header table interns page pada admin.

---

## Session Update — 2026-07-29 (Lanjutan)

### Perubahan Tambahan

#### 13. Urutan Kolom Tabel Interns — Diperbarui
- Header tabel di `/admin/interns` diubah urutannya menjadi:
  **Intern → Program → Google Drive → Mentor → Status → Attendance → Action**
- File: `src/features/admin/components/user-list.tsx`

**Last Updated:** 2026-07-29 (lanjutan)

---

## Current Session Status — 2026-08-15

### Newly Completed

#### 1. Rate Limiting Login — Upstash Redis
- Login rate limit: **5 attempt per 15 menit per IP** menggunakan Upstash Redis (sliding window).
- Implementasi via `loginAction` server action di `src/features/auth/services/auth.actions.ts`.
- `auth-card.tsx` diupdate: login sekarang memanggil `loginAction` bukan `signIn()` langsung dari client.
- Pesan error rate limit muncul di UI: `"Terlalu banyak percobaan login. Akses diblokir selama X menit."`
- Library: `@upstash/ratelimit` + `@upstash/redis`.
- Environment variables wajib: `UPSTASH_REDIS_REST_URL` dan `UPSTASH_REDIS_REST_TOKEN`.
- File: `src/lib/ratelimit.ts`, `src/features/auth/services/auth.actions.ts`, `src/features/auth/components/auth-card.tsx`.

#### 2. Next.js Security Patches
- Upgrade Next.js dari `^15.0.3` ke `15.3.8` (versi patched untuk CVE-2025-66478, CVE-2025-55183, CVE-2025-67779).
- `eslint-config-next` disesuaikan ke `15.3.8`.
- Turbopack diaktifkan via `--turbopack` flag di dev script.
- `next.config.ts` ditambahkan (sebelumnya kosong).

#### 3. Tambah Field `projectProgress` ke Model `Logbook`
- Field baru: `projectProgress Int @default(0)` — estimasi progress keseluruhan proyek oleh intern (0–100%).
- Migration: `20260815100000_add_project_progress_to_logbook` — applied ke Supabase.
- **Berbeda dari `progress`** (progress tugas hari ini) — `projectProgress` adalah estimasi keseluruhan proyek magang.
- File: `prisma/schema.prisma`, migration SQL, `src/features/logbook/services/logbook.actions.ts`.

#### 4. UI Slider Kedua di Form Logbook Intern
- Form logbook di `/intern/logbook` sekarang memiliki **2 slider**:
  - Biru: "Progress Tugas Hari Ini" — per-logbook daily progress (wajib 100% untuk submit).
  - Ungu: "Estimasi Progress Keseluruhan Proyek" — disimpan sebagai `projectProgress`.
- Slider ungu juga ada di form **resubmit** (edit & kirim ulang logbook yang ditolak).
- Draft localStorage include `projectProgress`.
- File: `src/features/logbook/components/intern-logbook.tsx`.

#### 5. Konsistensi Tampilan `projectProgress` di Seluruh Sistem
- **Riwayat logbook intern** (`/intern/logbook`): hanya tampil bar ungu `projectProgress` (bar biru dihapus).
- **Halaman progress intern** (`/intern/progress`): big number dan bar ungu menampilkan `latestProjectProgress` (dari logbook terakhir), bukan rata-rata. Timeline logbook hanya bar ungu.
- **Dashboard intern** (`/intern/dashboard`): card "Overall Progress" menampilkan `projectProgress` dari logbook terakhir. Activity feed menampilkan `X% Overall Project`.
- **Logbook review mentor** (`/mentor/logbook-review`): bar biru dihapus, hanya bar ungu `projectProgress`.
- **Assigned interns mentor** (`/mentor/assigned-interns`): Last 5 Logbooks menampilkan bar ungu `projectProgress`.
- **Monitoring admin** (`/admin/monitoring`): kolom Progress menampilkan bar ungu `projectProgress`.

#### 6. Perbaikan Dashboard Intern
- Card "Logbooks Sent" sekarang menampilkan **total** semua logbook yang pernah dikirim (bukan hanya weekly).
- Card "Overall Progress" menggantikan "Average Progress" — nilai dari `projectProgress` logbook terakhir.
- Tombol "Message" di card Your Mentor dihapus (tidak ada fungsi).
- Widget "Mid-Term Evaluation" di sidebar dihapus.

#### 7. Profile Intern — Perbaikan Label & Nilai
- Label "Supervisor" diganti ke **"Mentor"**.
- Nilai "Mentor" sekarang diambil dari relasi `internRelation → mentor.name` (nama asli mentor yang di-assign), bukan field `supervisorName`.
- Field "Dokumen" sekarang dinamis: **COMPLETE** (hijau) jika 21 field profil terisi semua, **INCOMPLETE** (amber) jika belum.
- File: `src/features/profile/components/profile-form.tsx`, `src/features/profile/services/profile.actions.ts`.

#### 8. Dashboard Mentor — Schedule Sync
- Tombol "Schedule Sync" yang sebelumnya tidak berfungsi (`<button>` kosong) sekarang menjadi `<Link>` ke `/mentor/announcements`.

#### 9. Admin Dashboard — Tasks & To Do
- Semua 5 task sebelumnya menggunakan data hardcoded atau tidak relevan.
- Sekarang **4 task dari data real DB**, hanya tampil kalau count > 0:
  1. "Review pending applications" → `pendingApprovals` → `/admin/applicants`
  2. "Review pending logbooks" → `pendingLogbooks` → `/admin/monitoring`
  3. "Assign mentor to interns" → `internsWithoutMentor` → `/admin/interns`
  4. "Interns not yet evaluated" → `internsNotEvaluated` → `/admin/interns`
- Kalau semua 0 → tampil "✓ All caught up! Nothing pending."
- Setiap task adalah link clickable dengan hover effect.
- Link "View All" diperbaiki dari `/admin/reports` ke `/admin/monitoring`.
- File: `src/features/admin/services/dashboard.actions.ts`, `src/features/admin/components/admin-dashboard.tsx`, `src/app/(dashboard)/admin/dashboard/page.tsx`.

#### 10. Search Input `maxLength`
- Semua search input di seluruh sistem ditambahkan `maxLength={100}`:
  - `mentor-assignment.tsx`, `mentor-list-container.tsx`, `registration-history.tsx`, `mentor-logbook-review.tsx`, `assigned-interns-list.tsx`.

#### 11. Build Fixes (Vercel)
- Hapus unused variable `totalLogs`, `weeklyLogs`, `programs` prop dari `MentorListContainer`.
- Fix ESLint error `no-unused-vars` di `intern/dashboard/page.tsx`.
- Fix TypeScript build error di `mentor-list-container.tsx` (unused `Program` interface dan `programs` prop).
- `tsconfig.json` — `jsx` diset ke `preserve` (required by Next.js 15).

#### 12. Login Page — Strip Credentials dari URL
- `src/app/(public)/login/page.tsx` diupdate: kalau ada `email` atau `password` di query params, di-redirect ke `/login` yang bersih.
- Mencegah credentials masuk ke server logs dan browser history.

---

## Updated Database Status

Applied migrations (tambahan sejak 2026-07-29):
- `20260815100000_add_project_progress_to_logbook` — field `projectProgress Int @default(0)` di model `Logbook`.

---

## Updated Key Implementation Files

- `src/lib/ratelimit.ts` — Upstash Redis rate limiter config (loginRatelimit, 5/15m sliding window).
- `src/features/auth/services/auth.actions.ts` — `loginAction` dengan rate limit + credentials verification.
- `src/features/auth/components/auth-card.tsx` — pakai `loginAction` untuk login.
- `src/features/logbook/services/logbook.actions.ts` — `createLogbookAction` & `resubmitLogbookAction` terima `projectProgress`.
- `src/features/logbook/components/intern-logbook.tsx` — slider kedua ungu + riwayat hanya bar ungu.
- `src/features/logbook/components/mentor-logbook-review.tsx` — hanya bar ungu `projectProgress`.
- `src/features/intern/services/progress.actions.ts` — select `projectProgress`, expose `latestProjectProgress`.
- `src/features/intern/components/intern-progress.tsx` — big number & bar dari `latestProjectProgress`, timeline hanya bar ungu.
- `src/app/(dashboard)/intern/dashboard/page.tsx` — Overall Progress dari logbook terakhir, total logbooks sent, hapus message button & mid-term widget.
- `src/features/mentor/components/assigned-interns-list.tsx` — Last 5 Logbooks pakai `projectProgress`.
- `src/features/admin/components/admin-monitoring.tsx` — kolom progress pakai `projectProgress` (ungu).
- `src/features/admin/services/dashboard.actions.ts` — tambah `internsWithoutMentor` & `internsNotEvaluated`.
- `src/features/admin/components/admin-dashboard.tsx` — Tasks & To Do dari data real DB.
- `src/features/profile/components/profile-form.tsx` — label Mentor, nilai dari relasi, Dokumen dinamis.
- `src/features/profile/services/profile.actions.ts` — include `internRelation → mentor.name`.
- `src/app/(public)/login/page.tsx` — strip credentials dari URL.
- `next.config.ts` — konfigurasi dasar Next.js 15.
- `package.json` — Next.js 15.3.8, Turbopack enabled, `@upstash/ratelimit`, `@upstash/redis`.

---

## Environment Variables Wajib (Tambahan)

```env
UPSTASH_REDIS_REST_URL="https://your-db.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token"
```

Wajib di-set di Vercel Environment Variables dan `.env` lokal. Tanpa ini, login akan error 500.

---

## How to Continue

```bash
npm run dev
npx prisma migrate deploy
npm run build
```

**PENTING:**
- Jangan jalankan `prisma db seed` selama ada data pengguna nyata.
- `DATABASE_URL` di Vercel wajib punya `connection_limit=5&pool_timeout=20`.
- `UPSTASH_REDIS_REST_URL` dan `UPSTASH_REDIS_REST_TOKEN` wajib ada di Vercel env vars.

---

## Possible Next Enhancements

- Backup database sebelum migrasi apapun.
- Tambah field `startDate DateTime?` dan `endDate DateTime?` ke `InternshipProgram` (plan sudah ada, belum dieksekusi).
- Security headers di `next.config.ts` (CSP, X-Frame-Options, Referrer-Policy).
- Fitur lupa password via email reset link.
- WebSocket real-time updates untuk logbook review.
- Google Drive API auto-create folder.

**Last Updated:** 2026-08-15
**Session Status:** Rate limiting Upstash Redis, projectProgress field + UI konsisten di seluruh sistem, dashboard fixes, profile fixes, Tasks & To Do real data — semua implemented dan verified.

---

## Session Update — 2026-08-17 (Lanjutan dari 2026-08-15)

### Perubahan Tambahan

#### 1. Monitoring Page — 4 Stat Cards
- Halaman `/admin/monitoring` sekarang memiliki **4 stat card** di atas tabel logbook:
  - Total Logbook, Pending Review, Approved, Rejected.
- Data real-time dari DB, konsisten dengan filter tabel di bawahnya.
- File: `src/features/admin/components/admin-monitoring.tsx`.

#### 2. Reports Page — Dibangun Ulang dengan Data Real
- Halaman `/admin/reports` sebelumnya berisi data hardcoded atau placeholder.
- Sekarang menggunakan **`reports.actions.ts`** yang fetch data langsung dari DB:
  - Summary cards: Total Intern, Completion Rate, Total Logbook, Sertifikat Terbit.
  - Distribusi status intern: On Going, Upcoming, Completed (dengan progress bar).
  - Ringkasan logbook: Approved, Pending, Rejected + rata-rata project progress.
  - Tabel ringkasan per program: jumlah pelamar, diterima, ditolak, pending, seleksi.
  - Tabel sertifikat diterbitkan: nomor sertifikat, nama intern, program, tanggal terbit + export CSV.
  - Pending registrations: tabel dengan tombol Approve/Reject inline.
  - Riwayat registrasi: filter, search, pagination, detail modal, export CSV.
- Komponen baru: `admin-reports-new.tsx` (menggantikan `admin-reports.tsx` yang dihapus).
- File lama `admin-reports.tsx` dihapus setelah digantikan sepenuhnya.

#### 3. Konsistensi Count di Reports dengan Halaman Lain
- **Total Intern** di Reports = `ongoing + upcoming + completed` — sama persis dengan halaman Interns.
- **Total Lamaran** per program = `pending + accepted + rejected` — sama dengan halaman Applicants (tidak termasuk `IN_REVIEW` dan `INTERVIEW`).
- Kolom **Seleksi** ditambahkan di tabel per program untuk menampilkan jumlah yang sedang dalam proses seleksi secara transparan.
- `internOngoing/upcoming/completed` di-reuse untuk menghindari query ganda.

#### 4. Cleanup
- File `admin-reports.tsx` (versi lama dengan data hardcoded) dihapus dari codebase.
- Label "Progress" diubah menjadi "Overall Progress" di beberapa tempat.
- `tsconfig.json` — `jsx` diset ke `preserve` agar kompatibel dengan Next.js 15.

---

## Updated Key Implementation Files (2026-08-17)

- `src/features/admin/services/reports.actions.ts` — server action baru, fetch semua data Reports dari DB.
- `src/features/admin/components/admin-reports-new.tsx` — komponen Reports baru dengan 6 section real data.
- `src/app/(dashboard)/admin/reports/page.tsx` — gunakan `getReportsData()` dan `AdminReportsNew`.
- `src/features/admin/components/admin-monitoring.tsx` — 4 stat cards di atas tabel logbook.

---

## Known Issues / Perlu Diperhatikan

- `reports.actions.ts` menggunakan `ApplicationStatus` enum dari Prisma (`PENDING`, `ACCEPTED`, `REJECTED`, `IN_REVIEW`, `INTERVIEW`) — **berbeda** dari string `"pending"/"approved"/"rejected"` yang dipakai di logbook dan beberapa action lain. Pastikan konsistensi saat menambah fitur terkait Application.
- Kolom `projectProgress` belum terhubung ke tampilan Reports (hanya dipakai di logbook review dan progress intern).

**Last Updated:** 2026-08-17
**Session Status:** Reports page dibangun ulang dengan data real, 4 stat cards di monitoring, konsistensi count diperbaiki — semua implemented dan verified.

---

## Session Update — 2026-08-17 (Sesi Lanjutan)

### Perubahan dari commit `5153ee2` hingga `b3b13c8`

#### 1. Fix: Programs Covered Count di Halaman Mentors
- Card **"Programs Covered"** di halaman `/admin/mentors` sebelumnya selalu menampilkan `0` karena menghitung dari `mentor.applications` — field yang tidak relevan untuk role mentor.
- Sekarang dihitung dari program unik milik intern-intern yang aktif (`ACCEPTED`) yang di-assign ke semua mentor.
- `getUsersByRole` untuk role `MENTOR` sekarang include `applications` dari setiap intern (filter `status: "ACCEPTED"`, ambil `program.title`).
- File: `src/features/admin/components/mentor-list-container.tsx`, `src/features/admin/services/user-management.actions.ts`.

#### 2. Feat: Info Lengkap Sesi Seleksi di Detail Modal Applicants
- Section **Riwayat Seleksi** di detail modal `/admin/applicants` sebelumnya hanya tampil judul, tipe, tanggal, status, skor, dan result notes.
- Sekarang menampilkan informasi lengkap per sesi:
  - Status badge berwarna (Scheduled biru, Completed hijau, Cancelled merah, Rescheduled amber).
  - **Metode** (Online/Offline).
  - **Link Meeting** yang bisa diklik (kalau Online) — atau **Lokasi** (kalau Offline).
  - **Nama Pewawancara**.
  - **Catatan** sesi dan **Hasil** / result notes.
- Optimistic update saat tambah sesi baru juga diperbarui untuk include field `location`, `meetingLink`, `interviewerName`.
- File: `src/features/admin/components/applicant-manager.tsx`.

#### 3. Fix: Task To Do — Label dan Link Pending Registrations
- Task "Review pending applications" di panel **Tasks & To Do** dashboard admin:
  - Label diubah menjadi **"Approve pending registrations"** — lebih akurat karena ini tentang approval akun, bukan review lamaran program.
  - Link diubah dari `/admin/applicants` → **`/admin/reports`** — sesuai halaman yang handle approval registrasi akun.
- File: `src/features/admin/components/admin-dashboard.tsx`.

#### 4. Feat: Fitur Lupa Password dengan Email SMTP
- Flow lengkap reset password via email:
  1. Halaman `/forgot-password` — input email, kirim request reset.
  2. Email dikirim via SMTP dengan link `{APP_URL}/reset-password/{token}`, berlaku **1 jam**.
  3. Halaman `/reset-password/[token]` — validasi token on mount, form password baru dengan show/hide toggle + indikator match, auto redirect ke `/login` setelah sukses.
- **Keamanan:** anti email enumeration (selalu return success), token lama diinvalidate saat request baru, token sekali pakai (`used: true`), transaksi atomic update password + invalidate token.
- Model baru: `PasswordResetToken` di Prisma schema.
- Migration baru: `20260817000000_add_password_reset_token` — applied ke Supabase.
- Link **"Lupa password?"** ditambahkan di bawah tombol submit pada halaman login (hanya tampil di mode login).
- Route `/forgot-password` dan `/reset-password` ditambahkan ke allowed public paths di `lib/auth/config.ts`.
- File:
  - `prisma/schema.prisma` — model `PasswordResetToken` + relasi ke `User`.
  - `prisma/migrations/20260817000000_add_password_reset_token/migration.sql`
  - `src/features/auth/services/forgot-password.actions.ts` — 3 server actions: `forgotPasswordAction`, `validateResetTokenAction`, `resetPasswordAction`.
  - `src/services/email.ts` — fungsi `sendPasswordResetEmail`.
  - `src/app/(public)/forgot-password/page.tsx`
  - `src/app/(public)/reset-password/[token]/page.tsx`
  - `src/features/auth/components/auth-card.tsx` — tambah link "Lupa password?".
  - `src/lib/auth/config.ts` — tambah allowed public paths.

---

## Environment Variables Wajib (Tambahan)

```env
NEXT_PUBLIC_APP_URL="https://your-domain.com"  # atau http://localhost:3000 untuk lokal
```

Wajib di-set agar link reset password di email mengarah ke URL yang benar.

---

## Updated Key Implementation Files (Sesi Lanjutan 2026-08-17)

- `src/features/admin/components/mentor-list-container.tsx` — programs covered dari intern aktif.
- `src/features/admin/services/user-management.actions.ts` — include applications intern dalam mentorRelations.
- `src/features/admin/components/applicant-manager.tsx` — detail sesi seleksi lengkap.
- `src/features/admin/components/admin-dashboard.tsx` — label dan link task approval diperbaiki.
- `src/features/auth/services/forgot-password.actions.ts` — 3 server actions lupa password.
- `src/services/email.ts` — template email reset password.
- `src/app/(public)/forgot-password/page.tsx` — halaman request reset.
- `src/app/(public)/reset-password/[token]/page.tsx` — halaman set password baru.
- `src/features/auth/components/auth-card.tsx` — link lupa password di login.
- `src/lib/auth/config.ts` — public paths untuk forgot/reset password.

**Last Updated:** 2026-08-17 (Sesi Lanjutan)
**Session Status:** Programs covered fix, selection session detail lengkap, task todo link fix, fitur lupa password via SMTP — semua implemented, tested, dan verified.
