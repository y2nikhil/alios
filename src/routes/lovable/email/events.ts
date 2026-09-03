import { createEmailWebhookHandler } from '@lovable.dev/email-js'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'

type Reason = 'bounce' | 'complaint' | 'unsubscribe'

const LOG_STATUS: Record<Reason, string> = {
  bounce: 'bounced',
  complaint: 'complained',
  unsubscribe: 'suppressed',
}

const LOG_MESSAGE: Record<Reason, string> = {
  bounce: 'Permanent bounce — email address is invalid or rejected',
  complaint: 'Spam complaint — recipient marked email as spam',
  unsubscribe: 'Recipient unsubscribed',
}

async function record(
  supabase: SupabaseClient<any, any>,
  reason: Reason,
  recipient: string,
  messageId: string | null,
  eventId: string,
) {
  const normalizedEmail = recipient.toLowerCase()

  const { error: suppressError } = await supabase
    .from('suppressed_emails')
    .upsert({ email: normalizedEmail, reason, metadata: null }, { onConflict: 'email' })

  if (suppressError) {
    console.error('Failed to upsert suppressed email', {
      code: suppressError.code,
      message: suppressError.message,
      event_id: eventId,
    })
    throw new Error('Failed to record suppression')
  }

  const { error: insertError } = await supabase.from('email_send_log').insert({
    message_id: messageId,
    template_name: 'system',
    recipient_email: normalizedEmail,
    status: LOG_STATUS[reason],
    error_message: LOG_MESSAGE[reason],
    metadata: null,
  })

  if (insertError) {
    console.error('Failed to insert email_send_log', {
      code: insertError.code,
      message: insertError.message,
      event_id: eventId,
    })
    throw new Error('Failed to record email event')
  }
}

export const Route = createFileRoute("/lovable/email/events")({
  server: {
    handlers: {
      POST: ({ request }) => {
        const apiKey = process.env['LOVABLE_API_KEY']
        const supabaseUrl = import.meta.env['VITE_SUPABASE_URL']
        const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']
        if (!apiKey || !supabaseUrl || !supabaseServiceKey) {
          console.error('Missing required environment variables')
          return Response.json({ error: 'Server configuration error' }, { status: 500 })
        }

        const supabase: SupabaseClient<any, any> = createClient(supabaseUrl, supabaseServiceKey)

        const handler = createEmailWebhookHandler({
          apiKey,
          on: {
            'email.bounced': async (event) => {
              await record(
                supabase,
                'bounce',
                event.data.recipient,
                event.data.message_id ?? null,
                event.event_id,
              )
            },
            'email.complaint': async (event) => {
              await record(
                supabase,
                'complaint',
                event.data.recipient,
                event.data.message_id ?? null,
                event.event_id,
              )
            },
            'email.unsubscribed': async (event) => {
              await record(
                supabase,
                'unsubscribe',
                event.data.recipient,
                event.data.message_id ?? null,
                event.event_id,
              )
            },
          },
        })
        return handler(request)
      },
    },
  },
})
