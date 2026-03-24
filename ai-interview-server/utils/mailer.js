import nodemailer from "nodemailer";

export const sendMail = async (to, subject, text) => {
  try {
    if (!to || !subject || !text) {
      throw new Error("Missing required email parameters");
    }

    const transporter = nodemailer.createTransport({
      host: process.env.MAILTRAP_SMTP_HOST,
      port: process.env.MAILTRAP_SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.MAILTRAP_SMTP_USER,
        pass: process.env.MAILTRAP_SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: '"AI TMS" <no-reply@aitms.com>',
      to,
      subject,
      text,
      // html: `<p>${text}</p>` // optional HTML version
    });

    console.log("📤 Message sent:", info?.messageId || "No ID returned");
    return info;
  } catch (error) {
    console.error(" Mail error:", error.message);
    throw error;
  }
};
