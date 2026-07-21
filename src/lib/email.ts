import { Resend } from 'resend';

export async function sendDocumentEmail({
  to, subject, text, filename, pdf,
}: {
  to: string; subject: string; text: string; filename: string; pdf: Buffer;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? 'I&S General Supplies <onboarding@resend.dev>',
    to,
    subject,
    text,
    attachments: [{ filename, content: pdf }],
  });
  if (error) throw new Error(`Email send failed: ${error.message}`);
}
