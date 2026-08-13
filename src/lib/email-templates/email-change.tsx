import * as React from 'react'
import { Heading, Text } from '@react-email/components'
import { Cta, EmailShell, styles } from './_layout'

interface EmailChangeEmailProps {
  siteName?: string
  siteUrl?: string
  oldEmail?: string
  newEmail?: string
  confirmationUrl?: string
}

export const EmailChangeEmail = ({
  siteName = 'ClassLab',
  siteUrl = 'https://classlab.in',
  oldEmail,
  newEmail,
  confirmationUrl = 'https://classlab.in',
}: EmailChangeEmailProps) => (
  <EmailShell
    siteName={siteName}
    siteUrl={siteUrl}
    preview={`Confirm your new ${siteName} email address`}
    footerNote="Your address only changes after you confirm."
  >
    <Heading style={styles.h1}>Confirm your new email</Heading>
    <Text style={styles.text}>
      You asked to move your {siteName} account
      {oldEmail ? ` from ${oldEmail}` : ''}
      {newEmail ? ` to ${newEmail}` : ''}. Confirm to finish the change.
    </Text>
    <Cta href={confirmationUrl} label="Confirm new email" />
    <Text style={{ ...styles.small, marginTop: '22px' }}>
      Didn't request this? Ignore this email and contact us — nothing will change.
    </Text>
  </EmailShell>
)

export default EmailChangeEmail
