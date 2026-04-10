/**
 * CLEAN MODEL: Transactional email via Resend; platform does not hold funds.
 * See: docs/dual-entity-operating-boundary.md
 *
 * All automated emails route through this module — do not call Resend directly.
 */

import { getPrismaSystem } from '@/src/lib/prisma-system';

export type SendEmailParams = {
  to: string;
  subject: string;
  bodyMarkdown: string;
  templateId?: string;
  data?: Record<string, unknown>;
  /** Used for NotificationLog (defaults if omitted). */
  log?: {
    entityType: string;
    entityId: string;
    type: string;
  };
};

function markdownToBasicHtml(md: string): string {
  const escaped = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const paragraphs = escaped.split(/\n\n+/).map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`);
  return paragraphs.join('\n');
}

export async function sendEmail({
  to,
  subject,
  bodyMarkdown,
  templateId,
  data,
  log,
}: SendEmailParams): Promise<void> {
  const isProd = process.env.NODE_ENV === 'production';
  const meta = { templateId, ...(data ?? {}) };

  if (!isProd) {
    console.info('[emailService:dev]', { to, subject, bodyMarkdown, ...meta });
  } else {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      console.error('[emailService] RESEND_API_KEY missing in production');
    } else {
      const from =
        process.env.RESEND_FROM_EMAIL ??
        process.env.MAIL_FROM_ADDRESS ??
        'onboarding@resend.dev';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          html: markdownToBasicHtml(bodyMarkdown),
        }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.error('[emailService] Resend error', res.status, errText);
      }
    }
  }

  const prisma = getPrismaSystem();
  const entityType = log?.entityType ?? 'email';
  const entityId = log?.entityId ?? templateId ?? 'generic';
  const type = log?.type ?? (isProd ? 'sent' : 'dev_log');

  await prisma.notificationLog.create({
    data: {
      entityType,
      entityId,
      type,
      recipient: to,
      metadata: meta as object,
    },
  });
}
