import * as React from 'react'
import { Heading, Text } from '@react-email/components'
import { Cta, EmailShell, styles } from './_layout'

interface SignupEmailProps {
  siteName?: string
  siteUrl?: string
  recipient?: string
  confirmationUrl?: string
}

export const SignupEmail = ({
  siteName = 'ClassLab',
  siteUrl = 'https://classlab.in',
  recipient,
  confirmationUrl = 'https://classlab.in',
}: SignupEmailProps) => (
  <EmailShell
    siteName={siteName}
    siteUrl={siteUrl}
    preview={`Confirm your email and start studying on ${siteName}`}
    footerNote="You received this because someone signed up with this address."
  >
    <Heading style={styles.h1}>Welcome to {siteName}</Heading>
    <Text style={styles.text}>
      You're one click away from focus rooms, watch parties, shared mind maps and exam
      prep communities{recipient ? ` for ${recipient}` : ''}.
    </Text>
    <Cta href={confirmationUrl} label="Verify my email" />
    <Text style={styles.note as React.CSSProperties}>
      <span style={styles.noteText}>
        Once you're in: set your prep profile, punch an AUX and join your exam
        community — your study plan builds itself from there.
      </span>
    </Text>
    <Text style={{ ...styles.small, marginTop: '22px' }}>
      Didn't create an account? You can safely ignore this email.
    </Text>
  </EmailShell>
)

export default SignupEmail
