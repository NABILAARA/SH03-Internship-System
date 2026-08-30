import nodemailer from "nodemailer";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST || "smtp.gmail.com",
  port: Number(process.env.EMAIL_SERVER_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export const sendEmail = async (options: SendEmailOptions) => {
  if (!process.env.EMAIL_FROM || !process.env.EMAIL_PASSWORD) {
    console.warn("Email configuration is missing. Skipping email sending.");
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: `"LEXA Internship System" <${process.env.EMAIL_FROM}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    console.log("Message sent: %s", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};

export const sendApprovalEmail = async (to: string, name: string) => {
  const subject = "Pendaftaran Magang Disetujui - LEXA Internship";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
      <h2 style="color: #2563eb; text-align: center;">Selamat! Pendaftaran Anda Disetujui</h2>
      <p>Halo <strong>${name}</strong>,</p>
      <p>Kami dengan senang hati menginformasikan bahwa pendaftaran Anda di <strong>LEXA Internship System</strong> telah disetujui oleh Admin.</p>
      <p>Anda sekarang dapat login ke sistem menggunakan email dan password yang Anda buat saat pendaftaran.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Login Sekarang</a>
      </div>
      <p>Jika ada pertanyaan, jangan ragu untuk menghubungi kami.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="color: #64748b; font-size: 12px; text-align: center;">Email ini dikirim otomatis oleh LEXA Internship System. Mohon untuk tidak membalas email ini.</p>
    </div>
  `;
  return sendEmail({ to, subject, html });
};

export const sendRejectionEmail = async (to: string, name: string, reason?: string) => {
  const subject = "Update Status Pendaftaran - LEXA Internship";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
      <h2 style="color: #dc2626; text-align: center;">Informasi Status Pendaftaran</h2>
      <p>Halo <strong>${name}</strong>,</p>
      <p>Terima kasih atas minat Anda untuk bergabung di <strong>LEXA Internship System</strong>.</p>
      <p>Setelah melakukan evaluasi, dengan berat hati kami sampaikan bahwa pendaftaran Anda saat ini belum dapat kami setujui.</p>
      ${reason ? `<div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;"><p style="margin: 0; color: #991b1b;"><strong>Alasan Penolakan:</strong><br/>${reason}</p></div>` : ""}
      <p>Kami menghargai antusiasme Anda dan berharap kesuksesan untuk perjalanan karir Anda selanjutnya.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="color: #64748b; font-size: 12px; text-align: center;">Email ini dikirim otomatis oleh LEXA Internship System. Mohon untuk tidak membalas email ini.</p>
    </div>
  `;
  return sendEmail({ to, subject, html });
};

export const sendPasswordResetEmail = async (to: string, name: string, resetUrl: string) => {
  const subject = "Reset Password - LEXA Internship System";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
      <h2 style="color: #2563eb; text-align: center;">Reset Password Akun Anda</h2>
      <p>Halo <strong>${name}</strong>,</p>
      <p>Kami menerima permintaan untuk mereset password akun LEXA Internship System Anda.</p>
      <p>Klik tombol di bawah untuk membuat password baru. Link ini hanya berlaku selama <strong>1 jam</strong>.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          Reset Password Saya
        </a>
      </div>
      <p style="color: #64748b; font-size: 13px;">Atau salin dan tempel link berikut di browser Anda:</p>
      <p style="background: #f1f5f9; padding: 10px; border-radius: 6px; word-break: break-all; font-size: 12px; color: #475569;">${resetUrl}</p>
      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; color: #92400e; font-size: 13px;">
          <strong>Penting:</strong> Jika Anda tidak meminta reset password, abaikan email ini. Password Anda tidak akan berubah.
        </p>
      </div>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="color: #64748b; font-size: 12px; text-align: center;">Email ini dikirim otomatis oleh LEXA Internship System. Mohon untuk tidak membalas email ini.</p>
    </div>
  `;
  return sendEmail({ to, subject, html });
};

export const sendSelectionSessionEmail = async (
  to: string,
  name: string,
  session: {
    title: string;
    type: string;
    scheduledAt: Date;
    method: string;
    location?: string | null;
    meetingLink?: string | null;
    interviewerName?: string | null;
    notes?: string | null;
  },
  programTitle: string,
  position: string | null
) => {
  const typeLabel: Record<string, string> = {
    ADMINISTRATION:  "Seleksi Administrasi",
    INTERVIEW:       "Wawancara",
    TECHNICAL_TEST:  "Tes Teknis",
    HR_INTERVIEW:    "Wawancara HR",
    FINAL_INTERVIEW: "Wawancara Final",
    OTHER:           "Sesi Seleksi",
  };

  const label = typeLabel[session.type] ?? "Sesi Seleksi";

  const tanggal = new Date(session.scheduledAt).toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
  const jam = new Date(session.scheduledAt).toLocaleTimeString("id-ID", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta"
  });

  const locationInfo = session.method === "ONLINE"
    ? session.meetingLink
      ? `<a href="${session.meetingLink}" style="color: #2563eb;">${session.meetingLink}</a>`
      : "Link meeting akan diinformasikan lebih lanjut."
    : session.location || "Lokasi akan diinformasikan lebih lanjut.";

  const subject = `Undangan ${label} – LEXA Internship System`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
      <h2 style="color: #2563eb; text-align: center;">Undangan ${label}</h2>

      <p>Halo <strong>${name}</strong>,</p>
      <p>
        Terima kasih atas minat Anda untuk bergabung di program magang <strong>LEXA Software House</strong>.
        Kami dengan senang hati mengundang Anda untuk mengikuti tahap selanjutnya dalam proses seleksi.
      </p>

      <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 16px 20px; margin: 24px 0; border-radius: 4px;">
        <p style="margin: 0 0 8px; font-weight: bold; color: #1e40af; font-size: 15px;">Detail ${label}</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
          <tr><td style="padding: 4px 0; width: 130px; color: #64748b;">Program</td><td style="padding: 4px 0;"><strong>${programTitle}</strong></td></tr>
          ${position ? `<tr><td style="padding: 4px 0; color: #64748b;">Posisi</td><td style="padding: 4px 0;"><strong>${position}</strong></td></tr>` : ""}
          <tr><td style="padding: 4px 0; color: #64748b;">Jenis</td><td style="padding: 4px 0;">${label}</td></tr>
          <tr><td style="padding: 4px 0; color: #64748b;">Hari & Tanggal</td><td style="padding: 4px 0;">${tanggal}</td></tr>
          <tr><td style="padding: 4px 0; color: #64748b;">Pukul</td><td style="padding: 4px 0;">${jam} WIB</td></tr>
          <tr><td style="padding: 4px 0; color: #64748b;">Metode</td><td style="padding: 4px 0;">${session.method === "ONLINE" ? "Online" : "Offline / Tatap Muka"}</td></tr>
          <tr><td style="padding: 4px 0; color: #64748b;">${session.method === "ONLINE" ? "Link Meeting" : "Lokasi"}</td><td style="padding: 4px 0;">${locationInfo}</td></tr>
          ${session.interviewerName ? `<tr><td style="padding: 4px 0; color: #64748b;">Pewawancara</td><td style="padding: 4px 0;">${session.interviewerName}</td></tr>` : ""}
        </table>
      </div>

      ${session.notes ? `
      <div style="background-color: #fefce8; border-left: 4px solid #eab308; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
        <p style="margin: 0; color: #713f12; font-size: 13px;"><strong>Catatan dari Tim Seleksi:</strong><br/>${session.notes}</p>
      </div>` : ""}

      <p>Mohon untuk <strong>hadir tepat waktu</strong> dan mempersiapkan diri sebaik mungkin. Pastikan koneksi internet Anda stabil jika sesi dilakukan secara online.</p>

      <p>Jika ada pertanyaan atau kendala, silakan hubungi tim kami sesegera mungkin.</p>

      <p>Kami berharap yang terbaik untuk Anda. Semangat!</p>

      <div style="text-align: center; margin: 28px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/intern/internship-registration"
          style="background-color: #2563eb; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          Lihat Status Pendaftaran Saya
        </a>
      </div>

      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="color: #64748b; font-size: 12px; text-align: center;">
        Email ini dikirim otomatis oleh LEXA Internship System. Mohon untuk tidak membalas email ini.
      </p>
    </div>
  `;

  return sendEmail({ to, subject, html });
};
