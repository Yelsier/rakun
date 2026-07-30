import { defineMailTemplate } from '../mail'
import type { PasswordResetMailProps } from './accountRecovery'

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[character] ?? character,
  )

export const passwordResetMailTemplate =
  defineMailTemplate<PasswordResetMailProps>({
    subject: 'Reset your Rakun manager password',
    render: ({ expiresAt, resetUrl, user }) => {
      const recipient = user.name?.trim() || user.email
      const expiresAtText = expiresAt.toUTCString()
      const safeRecipient = escapeHtml(recipient)
      const safeResetUrl = escapeHtml(resetUrl)

      return {
        text: [
          `Hello ${recipient},`,
          'We received a request to reset your Rakun Manager password.',
          `Choose a new password: ${resetUrl}`,
          `This single-use link expires on ${expiresAtText}.`,
          'If you did not request this change, you can safely ignore this email. Your password will remain unchanged.',
        ].join('\n\n'),
        html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Reset your Rakun manager password</title>
  </head>
  <body style="background-color:#f7f8f7;color:#141a1f;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;margin:0;padding:0;">
    <div style="display:none;font-size:1px;color:#f7f8f7;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Reset your Rakun manager password</div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f7f8f7;border-collapse:collapse;width:100%;">
      <tr>
        <td align="center" style="padding:40px 12px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="background-color:#ffffff;border:1px solid #e2e6e9;border-collapse:separate;border-radius:8px;max-width:600px;width:100%;">
            <tr>
              <td style="border-bottom:1px solid #edf0f2;padding:20px 28px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" bgcolor="#2abb67" width="32" height="32" style="background-color:#2abb67;border-radius:8px;color:#ffffff;font-size:16px;font-weight:700;line-height:32px;text-align:center;">R</td>
                    <td style="color:#141a1f;font-size:16px;font-weight:700;line-height:24px;padding-left:10px;">Rakun <span style="color:#67737e;font-weight:500;">Manager</span></td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:34px 32px 32px;">
                <p style="color:#219150;font-size:12px;font-weight:700;letter-spacing:.08em;line-height:18px;margin:0 0 10px;text-transform:uppercase;">Account security</p>
                <h1 style="color:#141a1f;font-size:28px;font-weight:700;line-height:36px;margin:0 0 22px;">Reset your password</h1>
                <p style="color:#46515b;font-size:15px;line-height:24px;margin:0 0 12px;">Hello ${safeRecipient},</p>
                <p style="color:#46515b;font-size:15px;line-height:24px;margin:0 0 12px;">We received a request to reset your manager password. Use the button below to choose a new one.</p>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">
                  <tr>
                    <td align="center" bgcolor="#2abb67" style="background-color:#2abb67;border-radius:8px;">
                      <a href="${safeResetUrl}" style="color:#ffffff;display:inline-block;font-size:14px;font-weight:700;line-height:20px;padding:12px 22px;text-align:center;text-decoration:none;">Choose new password</a>
                    </td>
                  </tr>
                </table>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f0f2f4;border:1px solid #e2e6e9;border-radius:8px;margin:0 0 24px;width:100%;">
                  <tr>
                    <td style="padding:15px 17px;">
                      <p style="color:#141a1f;font-size:14px;font-weight:700;line-height:20px;margin:0;">Single-use security link</p>
                      <p style="color:#67737e;font-size:13px;line-height:20px;margin:4px 0 0;">This link can only be used once and expires on ${expiresAtText}.</p>
                    </td>
                  </tr>
                </table>
                <p style="color:#67737e;font-size:13px;line-height:20px;margin:0 0 6px;">If the button does not work, copy and paste this address into your browser:</p>
                <p style="font-size:13px;line-height:20px;margin:0;word-wrap:break-word;"><a href="${safeResetUrl}" style="color:#219150;text-decoration:underline;">${safeResetUrl}</a></p>
                <p style="border-top:1px solid #edf0f2;color:#67737e;font-size:13px;line-height:20px;margin:28px 0 0;padding-top:20px;">If you did not request this change, you can safely ignore this email. Your password will remain unchanged.</p>
              </td>
            </tr>
            <tr>
              <td style="background-color:#f7f8f7;border-top:1px solid #edf0f2;padding:17px 28px;">
                <p style="color:#8f99a3;font-size:12px;line-height:18px;margin:0;">This message was sent automatically by Rakun Manager.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
      }
    },
  })
