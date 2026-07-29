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
- `src/features/internship-programs/components/intern-registration.tsx` — dropdown 11 posisi + info sesi seleksi.
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
- CI/CD GitHub Actions untuk type check otomatis sebelum merge ke main.
- 2 database terpisah (development & production) untuk isolasi data.

**Last Updated:** 2026-07-29
**Session Status:** bcrypt migration, seed protection, position dropdown, intern selection info, profile completeness 21 fields, admin add intern/mentor, intern start/end dates, cert sequence fix — semua implemented dan verified.
