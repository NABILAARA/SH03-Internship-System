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
