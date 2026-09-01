"use client";

import { useState } from "react";
import { User, KeyRound, Mail, CheckCircle, AlertCircle, Shield, Github, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signIn } from "next-auth/react";
import { updateProfileAction, changePasswordAction, changeEmailAction, updateInternProfileAction } from "../services/profile.actions";
import { useRouter } from "next/navigation";
import { AvatarEditModal } from "@/components/shared/avatar-edit-modal";

type ProfileFormProps = {
  user: {
    id: string;
    name: string | null;
    email: string;
    image?: string | null;
    role: string;
    createdAt: Date;
    approvalStatus: string;
    githubUsername?: string | null;
    nickname?: string | null;
    phone?: string | null;
    gender?: string | null;
    birthPlace?: string | null;
    birthDate?: Date | null;
    address?: string | null;
    city?: string | null;
    province?: string | null;
    institution?: string | null;
    faculty?: string | null;
    studyProgram?: string | null;
    studentId?: string | null;
    semester?: number | null;
    entryYear?: number | null;
    graduationYear?: number | null;
    portfolioUrl?: string | null;
    linkedinUrl?: string | null;
    skills?: string | null;
    bio?: string | null;
    organizationExperience?: string | null;
    workExperience?: string | null;
    internshipPosition?: string | null;
    internshipStatus?: string | null;
    supervisorName?: string | null;
    documentStatus?: string | null;
    accounts?: { providerAccountId: string }[];
    internRelation?: { mentor: { name: string | null } } | null;
  };
};

// ── Helpers ───────────────────────────────────────────────────

const inputClass =
  "w-full rounded-lg border border-input bg-background py-2.5 px-3.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition";

function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      {/* Card header stripe */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border/60 bg-muted/30">
        <div className="shrink-0">{icon}</div>
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      {/* Card body */}
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// Removed FormRow as we will use specific grids for each section

function Field({
  label,
  id,
  hint,
  children,
}: {
  label: string;
  id?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      {id ? (
        <label htmlFor={id} className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {label}
        </label>
      ) : (
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      )}
      {children}
      {hint && <p className="text-[11px] text-muted-foreground/60">{hint}</p>}
    </div>
  );
}

function Alert({ type, message }: { type: "error" | "success"; message: string }) {
  const cls =
    type === "error"
      ? "bg-red-50 border-red-100 text-red-600 dark:bg-red-950/40 dark:border-red-900 dark:text-red-400"
      : "bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-400";
  const Icon = type === "error" ? AlertCircle : CheckCircle;
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm ${cls}`}>
      <Icon className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────

export function ProfileForm({ user }: Readonly<ProfileFormProps>) {
  const router = useRouter();

  const [name, setName] = useState(user.name ?? "");
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState(false);

  // ── Avatar state ──
  const [avatarImage, setAvatarImage] = useState<string | null>(user.image ?? null);

  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [currentEmail, setCurrentEmail] = useState(user.email);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  const isGithubConnected = user.accounts && user.accounts.length > 0;
  const [githubLoading, setGithubLoading] = useState(false);
  const [internData, setInternData] = useState({
    name: user.name ?? "", nickname: user.nickname ?? "", phone: user.phone ?? "", gender: user.gender ?? "",
    birthPlace: user.birthPlace ?? "", birthDate: user.birthDate ? new Date(user.birthDate).toISOString().slice(0, 10) : "",
    address: user.address ?? "", city: user.city ?? "", province: user.province ?? "", institution: user.institution ?? "",
    faculty: user.faculty ?? "", studyProgram: user.studyProgram ?? "", studentId: user.studentId ?? "",
    semester: user.semester?.toString() ?? "", entryYear: user.entryYear?.toString() ?? "", graduationYear: user.graduationYear?.toString() ?? "",
    portfolioUrl: user.portfolioUrl ?? "", linkedinUrl: user.linkedinUrl ?? "", githubUsername: user.githubUsername ?? "",
    skills: user.skills ?? "", bio: user.bio ?? "", organizationExperience: user.organizationExperience ?? "", workExperience: user.workExperience ?? "",
  });
  const [internLoading, setInternLoading] = useState(false);
  const [internMessage, setInternMessage] = useState<string | null>(null);

  const joinedDate = new Date(user.createdAt).toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
  });

  const roleLabel =
    user.role === "MENTOR" ? "Mentor" : user.role === "INTERN" ? "Intern" : user.role;

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameLoading(true); setNameError(null); setNameSuccess(false);
    try {
      const res = await updateProfileAction({ name });
      if (res.error) setNameError(res.error);
      else { setNameSuccess(true); router.refresh(); setTimeout(() => setNameSuccess(false), 3000); }
    } catch { setNameError("Terjadi kesalahan jaringan atau server."); }
    finally { setNameLoading(false); }
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailLoading(true); setEmailError(null); setEmailSuccess(false);
    try {
      const res = await changeEmailAction({ newEmail, currentPassword: emailPassword });
      if (res.error) setEmailError(res.error);
      else {
        setEmailSuccess(true); setCurrentEmail(newEmail); setNewEmail(""); setEmailPassword("");
        router.refresh(); setTimeout(() => setEmailSuccess(false), 4000);
      }
    } catch { setEmailError("Terjadi kesalahan jaringan atau server."); }
    finally { setEmailLoading(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwLoading(true); setPwError(null); setPwSuccess(false);
    try {
      const res = await changePasswordAction({ currentPassword, newPassword, confirmPassword });
      if (res.error) setPwError(res.error);
      else {
        setPwSuccess(true); setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
        setTimeout(() => setPwSuccess(false), 4000);
      }
    } catch { setPwError("Terjadi kesalahan jaringan atau server."); }
    finally { setPwLoading(false); }
  };

  const handleConnectGithub = async () => {
    setGithubLoading(true);
    try { await signIn("github", { callbackUrl: window.location.href }); }
    catch { setGithubLoading(false); }
  };

  // ── Completeness — 21 field total ─────────────────────────
  const personalFields = [
    internData.name,        // 1. Nama lengkap
    internData.nickname,    // 2. Nama panggilan
    internData.phone,       // 3. Nomor telepon
    internData.birthPlace,  // 4. Tempat lahir
    internData.birthDate,   // 5. Tanggal lahir
    internData.gender,      // 6. Jenis kelamin
    internData.address,     // 7. Alamat lengkap
    internData.city,        // 8. Kota/Kabupaten
    internData.province,    // 9. Provinsi
  ];
  const educationFields = [
    internData.institution,   // 10. Institusi
    internData.faculty,       // 11. Fakultas
    internData.studyProgram,  // 12. Program studi
    internData.studentId,     // 13. NIM
    internData.semester,      // 14. Semester
    internData.entryYear,     // 15. Tahun masuk
    internData.graduationYear,// 16. Tahun lulus
  ];
  const skillFields = [
    internData.portfolioUrl,  // 17. Portfolio URL
    internData.linkedinUrl,   // 18. LinkedIn URL
    internData.skills,        // 19. Skills
    internData.githubUsername,// 20. GitHub username
    internData.bio,           // 21. Tentang diri
  ];

  const allFields      = [...personalFields, ...educationFields, ...skillFields];
  const TOTAL          = allFields.length; // 21
  const filledTotal    = allFields.filter(Boolean).length;
  const completeness   = Math.round((filledTotal / TOTAL) * 100);

  const personalFilled  = personalFields.filter(Boolean).length;
  const educationFilled = educationFields.filter(Boolean).length;
  const skillFilled     = skillFields.filter(Boolean).length;

  const personalPct  = Math.round((personalFilled  / personalFields.length)  * 100);
  const educationPct = Math.round((educationFilled / educationFields.length) * 100);
  const skillPct     = Math.round((skillFilled     / skillFields.length)     * 100);
  const updateInternField = (key: keyof typeof internData, value: string) => setInternData(current => ({ ...current, [key]: value }));
  const handleInternProfileSave = async (event: React.FormEvent) => {
    event.preventDefault(); setInternLoading(true); setInternMessage(null);
    const numeric = (value: string) => value ? Number(value) : null;
    const result = await updateInternProfileAction({ ...internData, semester: numeric(internData.semester), entryYear: numeric(internData.entryYear), graduationYear: numeric(internData.graduationYear) });
    setInternLoading(false); setInternMessage(result.error ?? "Profil intern berhasil disimpan.");
    if (!result.error) router.refresh();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-6 sm:px-6">

      {/* ── Profile Banner ─────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 px-6 py-6 text-white shadow-lg">
        <div className="pointer-events-none absolute -top-10 -right-10 h-44 w-44 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-white/5" />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="relative shrink-0">
            <AvatarEditModal
              currentImage={avatarImage}
              name={user.name}
              email={user.email}
              onAvatarChange={(url) => setAvatarImage(url)}
            />
            <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-400 border-2 border-white" />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <h1 className="text-xl font-extrabold tracking-tight truncate">{user.name ?? "Belum ada nama"}</h1>
            <p className="text-blue-200 text-sm truncate">{currentEmail}</p>
            <div className="flex flex-wrap gap-2 pt-0.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 border border-white/25 px-2.5 py-0.5 text-xs font-bold">
                <Shield className="h-3 w-3" /> {roleLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 text-blue-200 text-xs">
                <CalendarDays className="h-3 w-3" /> Bergabung {joinedDate}
              </span>
            </div>
          </div>
        </div>
      </div>

      {user.role === "INTERN" && (
        <form onSubmit={handleInternProfileSave} className="space-y-5">
          {/* ── Completeness Card ── */}
          <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 space-y-3">
            {/* Header row */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <p className="font-semibold text-blue-900">Kelengkapan profil</p>
                <p className="text-xs text-blue-700 mt-0.5">
                  {filledTotal} dari {TOTAL} informasi terisi
                </p>
              </div>
              <span className={`text-2xl font-extrabold ${completeness === 100 ? "text-emerald-600" : "text-blue-600"}`}>
                {completeness}%
              </span>
            </div>

            {/* Bar keseluruhan */}
            <div className="h-2.5 w-full rounded-full bg-blue-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${completeness === 100 ? "bg-emerald-500" : "bg-blue-600"}`}
                style={{ width: `${completeness}%` }}
              />
            </div>

            {/* Sub-bar per section — 1 kolom di mobile, 3 kolom di sm+ */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Informasi Pribadi */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">Informasi Pribadi</span>
                  <span className="text-slate-400">{personalFilled}/{personalFields.length}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${personalPct}%` }}
                  />
                </div>
              </div>

              {/* Pendidikan */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">Pendidikan</span>
                  <span className="text-slate-400">{educationFilled}/{educationFields.length}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-violet-500 transition-all duration-500"
                    style={{ width: `${educationPct}%` }}
                  />
                </div>
              </div>

              {/* Skill & Portfolio */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">Skill & Portfolio</span>
                  <span className="text-slate-400">{skillFilled}/{skillFields.length}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-slate-600 transition-all duration-500"
                    style={{ width: `${skillPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
          <SectionCard icon={<User className="h-4 w-4 text-blue-600" />} title="Informasi Pribadi" description="Data kontak dan domisili yang dapat Anda perbarui">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[["Nama lengkap", "name"], ["Nama panggilan", "nickname"], ["Nomor telepon", "phone"], ["Tempat lahir", "birthPlace"], ["Kota/Kabupaten", "city"], ["Provinsi", "province"]].map(([label, key]) => <Field key={key} label={label}><input className={inputClass} value={internData[key as keyof typeof internData]} onChange={e => updateInternField(key as keyof typeof internData, e.target.value)} /></Field>)}
              <Field label="Tanggal lahir"><input type="date" className={inputClass} value={internData.birthDate} onChange={e => updateInternField("birthDate", e.target.value)} /></Field>
              <Field label="Jenis kelamin"><select className={inputClass} value={internData.gender} onChange={e => updateInternField("gender", e.target.value)}><option value="">Pilih</option><option>Laki-laki</option><option>Perempuan</option><option>Lainnya</option></select></Field>
              <div className="sm:col-span-2"><Field label="Alamat lengkap"><textarea className={inputClass} rows={2} value={internData.address} onChange={e => updateInternField("address", e.target.value)} /></Field></div>
            </div>
          </SectionCard>
          <SectionCard icon={<CalendarDays className="h-4 w-4 text-violet-600" />} title="Pendidikan" description="Informasi akademik untuk kebutuhan administrasi">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[["Institusi/Universitas", "institution"], ["Fakultas", "faculty"], ["Program studi", "studyProgram"], ["NIM", "studentId"], ["Semester", "semester"], ["Tahun masuk", "entryYear"], ["Perkiraan tahun lulus", "graduationYear"]].map(([label, key]) => <Field key={key} label={label}><input type={key.includes("Year") || key === "semester" ? "number" : "text"} className={inputClass} value={internData[key as keyof typeof internData]} onChange={e => updateInternField(key as keyof typeof internData, e.target.value)} /></Field>)}
            </div>
          </SectionCard>
          <SectionCard icon={<Github className="h-4 w-4 text-slate-700" />} title="Skill & Portfolio" description="Tautan profesional dan pengalaman Anda">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Field label="Portfolio URL"><input className={inputClass} value={internData.portfolioUrl} onChange={e => updateInternField("portfolioUrl", e.target.value)} /></Field><Field label="LinkedIn URL"><input className={inputClass} value={internData.linkedinUrl} onChange={e => updateInternField("linkedinUrl", e.target.value)} /></Field><Field label="Skills"><input className={inputClass} placeholder="React, Figma, ..." value={internData.skills} onChange={e => updateInternField("skills", e.target.value)} /></Field><Field label="GitHub username"><input className={inputClass} value={internData.githubUsername} onChange={e => updateInternField("githubUsername", e.target.value)} /></Field><div className="sm:col-span-2"><Field label="Tentang diri"><textarea className={inputClass} rows={2} value={internData.bio} onChange={e => updateInternField("bio", e.target.value)} /></Field></div></div>
          </SectionCard>
          <SectionCard icon={<Shield className="h-4 w-4 text-amber-600" />} title="Informasi Internship" description="Data penempatan dikelola oleh Admin">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <p><span className="text-muted-foreground">Posisi:</span> {user.internshipPosition ?? "Belum ditentukan"}</p>
              <p><span className="text-muted-foreground">Mentor:</span> {user.internRelation?.mentor?.name ?? "Belum ditentukan"}</p>
              <p>
                <span className="text-muted-foreground">Dokumen:</span>{" "}
                <span className={`font-semibold ${completeness === 100 ? "text-emerald-600" : "text-amber-600"}`}>
                  {completeness === 100 ? "COMPLETE" : "INCOMPLETE"}
                </span>
              </p>
            </div>
          </SectionCard>
          {internMessage && <Alert type={internMessage.includes("berhasil") ? "success" : "error"} message={internMessage} />}
          <Button type="submit" disabled={internLoading} className="bg-blue-600 hover:bg-blue-700 text-white">{internLoading ? "Menyimpan..." : "Simpan Profil Intern"}</Button>
        </form>
      )}

      {/* ── Edit Name ─────────────────────────────────────── */}
      <SectionCard
        icon={<div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center"><User className="h-4 w-4 text-blue-600 dark:text-blue-400" /></div>}
        title="Edit Nama"
        description="Perbarui nama tampilan akun Anda"
      >
        <form onSubmit={handleUpdateName}>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <Field label="Nama Lengkap" id="profile-name">
                <input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Masukkan nama lengkap..."
                  className={inputClass}
                />
              </Field>
            </div>
            <Button type="submit" disabled={nameLoading} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm h-[42px] w-full sm:w-48 shrink-0">
              {nameLoading ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
          {(nameError || nameSuccess) && (
            <div className="mt-4 flex gap-3">
              {nameError && <Alert type="error" message={nameError} />}
              {nameSuccess && <Alert type="success" message="Nama berhasil diperbarui!" />}
            </div>
          )}
        </form>
      </SectionCard>

      {/* ── Change Email ──────────────────────────────────── */}
      <SectionCard
        icon={<div className="h-8 w-8 rounded-lg bg-sky-50 dark:bg-sky-950/40 flex items-center justify-center"><Mail className="h-4 w-4 text-sky-600 dark:text-sky-400" /></div>}
        title="Ganti Email"
        description={`Email aktif: ${currentEmail}`}
      >
        <form onSubmit={handleChangeEmail}>
          <div className="flex flex-col xl:flex-row gap-4 items-end">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <Field label="Email Baru" id="new-email">
                <input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="contoh@gmail.com"
                  className={inputClass}
                />
              </Field>
              <Field label="Konfirmasi dengan Password" id="email-password">
                <input
                  id="email-password"
                  type="password"
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  placeholder="Password saat ini..."
                  className={inputClass}
                />
              </Field>
            </div>
            <Button type="submit" disabled={emailLoading} className="bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm h-[42px] w-full xl:w-48 shrink-0">
              {emailLoading ? "Memproses..." : "Ganti Email"}
            </Button>
          </div>
          {(emailError || emailSuccess) && (
            <div className="mt-4 flex gap-3">
              {emailError && <Alert type="error" message={emailError} />}
              {emailSuccess && <Alert type="success" message="Email berhasil diubah!" />}
            </div>
          )}
        </form>
      </SectionCard>

      {/* ── Change Password ───────────────────────────────── */}
      <SectionCard
        icon={<div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center"><KeyRound className="h-4 w-4 text-amber-600 dark:text-amber-400" /></div>}
        title="Ganti Password"
        description="Minimal 8 karakter, kombinasi huruf dan angka"
      >
        <form onSubmit={handleChangePassword}>
          <div className="flex flex-col xl:flex-row gap-4 items-end">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
              <Field label="Password Saat Ini" id="current-password">
                <input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Password saat ini..."
                  className={inputClass}
                />
              </Field>
              <Field label="Password Baru" id="new-password">
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 karakter..."
                  className={inputClass}
                />
              </Field>
              <Field label="Konfirmasi Password" id="confirm-password">
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password baru..."
                  className={inputClass}
                />
              </Field>
            </div>
            <Button type="submit" disabled={pwLoading} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm h-[42px] w-full xl:w-48 shrink-0">
              {pwLoading ? "Memproses..." : "Ganti Password"}
            </Button>
          </div>
          {(pwError || pwSuccess) && (
            <div className="mt-4 flex gap-3">
              {pwError && <Alert type="error" message={pwError} />}
              {pwSuccess && <Alert type="success" message="Password berhasil diubah!" />}
            </div>
          )}
        </form>
      </SectionCard>

      {/* ── GitHub ────────────────────────────────────────── */}
      <SectionCard
        icon={<div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><Github className="h-4 w-4 text-slate-700 dark:text-slate-300" /></div>}
        title="Koneksi GitHub"
        description="Hubungkan akun untuk membaca commit dari repo private dan kolaborasi"
      >
        {isGithubConnected ? (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-900">
            <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-400">Akun GitHub Terhubung</p>
              <p className="text-xs text-emerald-600/80 dark:text-emerald-500 mt-0.5">Fitur logbook otomatis sudah aktif sepenuhnya.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-100 dark:bg-amber-950/40 dark:border-amber-900 flex-1">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">Belum Terhubung</p>
                <p className="text-xs text-amber-700/80 dark:text-amber-500 mt-0.5">
                  Login dengan GitHub agar sistem dapat membaca repository kolaborasi Anda.
                </p>
              </div>
            </div>
            <Button
              onClick={handleConnectGithub}
              disabled={githubLoading}
              className="bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-semibold text-sm h-[42px] w-full sm:w-48 flex items-center justify-center gap-2 shrink-0 ml-auto"
            >
              <Github className="h-4 w-4" />
              {githubLoading ? "Menghubungkan..." : "Hubungkan GitHub"}
            </Button>
          </div>
        )}
      </SectionCard>

    </div>
  );
}
