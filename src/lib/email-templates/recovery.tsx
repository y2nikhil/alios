import * as React from 'react'
import { Heading, Text } from '@react-email/components'
import { Cta, EmailShell, styles } from './_layout'

interface RecoveryEmailProps {
  siteName?: string
  siteUrl?: string
  recipient?: string
  confirmationUrl?: string
}

export const RecoveryEmail = ({
  siteName = 'ClassLab',
  siteUrl = 'https://classlab.in',
  recipient,
  confirmationUrl = 'https://classlab.in',
}: RecoveryEmailProps) => (
  <EmailShell
    siteName={siteName}
    siteUrl={siteUrl}
    preview={`Reset your ${siteName} password`}
    footerNote="For your security, this link expires soon."
  >
    <Heading style={styles.h1}>Reset your password</Heading>
    <Text style={styles.text}>
      We got a request to reset the password for
      {recipient ? ` ${recipient}` : ' your account'}. Choose a new one below.
    </Text>
    <Cta href={confirmationUrl} label="Set a new password" />
    <Text style={{ ...styles.small, marginTop: '22px' }}>
      Didn't ask for this? Ignore this email and your current password stays active.
    </Text>
  </EmailShell>
)

export default RecoveryEmail
