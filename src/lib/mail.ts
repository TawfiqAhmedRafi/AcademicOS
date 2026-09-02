import nodemailer from "nodemailer";

if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
  console.warn("WARNING: SMTP_EMAIL or SMTP_PASSWORD is not defined in .env.local");
}

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD, 
  },
});

export const sendOTP = async (to: string, otp: string) => {
  const mailOptions = {
    from: `"Academic OS Security" <${process.env.SMTP_EMAIL}>`,
    to,
    subject: "Academic OS - Password Reset OTP",
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f8fafc;">
        <h2 style="color: #002B49; text-align: center;">Academic OS</h2>
        <p style="color: #334155;">Hello,</p>
        <p style="color: #334155;">We received a request to reset your password. Use the 6-digit code below to proceed. This code is valid for <strong>10 minutes</strong>.</p>
        <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; border: 1px solid #cbd5e1;">
          <h1 style="letter-spacing: 6px; color: #F59E0B; margin: 0; font-size: 36px;">${otp}</h1>
        </div>
        <p style="color: #64748b; font-size: 12px; text-align: center;">If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  };
  await transporter.sendMail(mailOptions);
};