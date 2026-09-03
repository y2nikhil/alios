import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

export interface SendBroadcastInput {
  recipientEmail: string
  idempotencyKey?: string
  templateData?: Record<string, unknown>
}

function redactEmail(email: string | null | undefined): string {
  if (!email) return '***'
  const [localPart, domain] = email.split('@')
  if (!localPart || !domain) return '***'
  return `${localPart[0]}***@${domain}`
}

/**
 * Sends one branded ClassLab email (the "broadcast" template) to one recipient.
 * Admin/super-admin only. Delivery, retries and suppression are handled by
 * Lovable's managed email service.
 */
export const sendBroadcastEmail = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: SendBroadcastInput) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
    if (!roles?.some((r) => r.role === 'super_admin' || r.role === 'admin')) {
      throw new Error('Forbidden')
    }

    const recipient = (data.recipientEmail || '').trim()
    if (!recipient || !/^\S+@\S+\.\S+$/.test(recipient)) {
      throw new Error('A valid recipient email is required')
    }

    const { sendTemplateEmail } = await import('@/lib/email-templates/send-email')
    const templateName = 'broadcast'

    const logSend = async (status: string, errorMessage?: string) => {
      const { error } = await supabase.from('email_send_log').insert({
        message_id: null,
        template_name: templateName,
        recipient_email: recipient,
        status,
        error_message: errorMessage ?? null,
      })
      if (error) {
        console.error('Failed to write email_send_log', {
          code: error.code,
          message: error.message,
        })
      }
    }

    try {
      const result = await sendTemplateEmail(templateName, recipient, {
        templateData: (data.templateData ?? {}) as Record<string, any>,
        idempotencyKey: data.idempotencyKey ?? `${templateName}-${crypto.randomUUID()}`,
      })

      if (!result.sent) {
        await logSend('suppressed')
        console.log('Email suppressed', {
          templateName,
          recipient_redacted: redactEmail(recipient),
        })
        return { success: false, reason: 'recipient_suppressed' as const }
      }

      await logSend('sent')
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await logSend('failed', message.slice(0, 1000))
      throw new Error(message)
    }
  })
