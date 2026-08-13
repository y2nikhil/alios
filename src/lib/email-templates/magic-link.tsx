import * as React from 'react'
import { Heading, Text } from '@react-email/components'
import { Cta, EmailShell, styles } from './_layout'

interface MagicLinkEmailProps {
  siteName?: string
  siteUrl?: string
  recipient?: string
  confirmationUrl?: string
}

export const MagicLinkEmail = ({
  siteName = 'ClassLab',
  siteUrl = 'https://classlab.in',
  recipient,
  confirmationUrl = 'https://classlab.in',
}: MagicLinkEmailProps) => (
  <EmailShell
    siteName={siteName}
    siteUrl={siteUrl}
    preview={`Your one-time login link for ${siteName}`}
    footerNote="This link expires shortly and can only be used once."
  >
    <Heading style={styles.h1}>Your login link</Heading>
    <Text style={styles.text}>
      Tap the button below to sign in{recipient ? ` as ${recipient}` : ''}. No password
      needed.
    </Text>
    <Cta href={confirmationUrl} label="Sign in to ClassLab" />
    <Text style={{ ...styles.small, marginTop: '22px' }}>
      If you didn't request this link, ignore this email — your account stays safe.
    </Text>
  </EmailShell>
)

export default MagicLinkEmail
