import { sendBroadcastEmail } from '@/lib/email/send.functions'

export interface SendEmailArgs {
  templateName: string
  recipientEmail: string
  idempotencyKey?: string
  templateData?: Record<string, unknown>
}

/** Sends one branded email to one recipient through the app's email service. */
export async function sendTransactionalEmail(args: SendEmailArgs) {
  return sendBroadcastEmail({
    data: {
      recipientEmail: args.recipientEmail,
      idempotencyKey: args.idempotencyKey,
      templateData: args.templateData,
    },
  })
}
