import { supabase } from '@/integrations/supabase/client'

export interface SendEmailArgs {
  templateName: string
  recipientEmail: string
  idempotencyKey?: string
  templateData?: Record<string, unknown>
}

/** Sends one branded email to one recipient through the app's email service. */
export async function sendTransactionalEmail(args: SendEmailArgs) {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('You need to be signed in to send email.')

  const res = await fetch('/lovable/email/transactional/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(args),
  })

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    throw new Error((json['error'] as string) || `Send failed (${res.status})`)
  }
  return json
}
