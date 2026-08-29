import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendInviteEmailInput {
  to: string;
  name: string;
  token: string;
  version?: number;
}

export interface SendResetPasswordEmailInput {
  to: string;
  name: string;
  token: string;
}

export async function sendInviteEmail(
  input: SendInviteEmailInput
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteUrl = `${appUrl}/convite?token=${input.token}`;
  
  const versionText = input.version ? ` (versão ${input.version})` : "";
  
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || "noreply@example.com",
    to: input.to,
    subject: `Convite para ser Líder - Gestão Eleitoral${versionText}`,
    html: `
      <h1>Olá ${input.name},</h1>
      <p>Você foi convidado para ser um Líder na plataforma Gestão Eleitoral.</p>
      <p>Para definir sua senha e acessar o painel, clique no link abaixo:</p>
      <p><a href="${inviteUrl}">Definir minha senha</a></p>
      <p>Este link expira em 48 horas.</p>
      <p>Se você não solicitou este convite, ignore este e-mail.</p>
    `,
    text: `Olá ${input.name},\n\nVocê foi convidado para ser um Líder na plataforma Gestão Eleitoral.\n\nPara definir sua senha e acessar o painel, acesse:\n${inviteUrl}\n\nEste link expira em 48 horas.\n\nSe você não solicitou este convite, ignore este e-mail.`,
  });

  if (error) {
    console.error("Error sending invite email:", error);
    throw new Error("Failed to send invite email");
  }
}

export async function sendResetPasswordEmail(
  input: SendResetPasswordEmailInput
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const resetUrl = `${appUrl}/redefinir-senha?token=${input.token}`;
  
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || "noreply@example.com",
    to: input.to,
    subject: "Redefinição de Senha - Gestão Eleitoral",
    html: `
      <h1>Olá ${input.name},</h1>
      <p>Você solicitou a redefinição da sua senha.</p>
      <p>Para definir uma nova senha, clique no link abaixo:</p>
      <p><a href="${resetUrl}">Redefinir minha senha</a></p>
      <p>Este link expira em 48 horas.</p>
      <p>Se você não solicitou a redefinição, ignore este e-mail.</p>
    `,
    text: `Olá ${input.name},\n\nVocê solicitou a redefinição da sua senha.\n\nPara definir uma nova senha, acesse:\n${resetUrl}\n\nEste link expira em 48 horas.\n\nSe você não solicitou a redefinição, ignore este e-mail.`,
  });

  if (error) {
    console.error("Error sending reset password email:", error);
    throw new Error("Failed to send reset password email");
  }
}