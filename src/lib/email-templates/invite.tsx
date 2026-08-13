import * as React from 'react'
import { Heading, Text } from '@react-email/components'
import { Cta, EmailShell, styles } from './_layout'

interface InviteEmailProps {
  siteName?: string
  siteUrl?: string
  recipient?: string
  confirmationUrl?: string
}

export const InviteEmail = ({
  siteName = 'ClassLab',
  siteUrl = 'https://classlab.in',
  recipient,
  confirmationUrl = 'https://classlab.in',
}: InviteEmailProps) => (
  <EmailShell
    siteName={siteName}
    siteUrl={siteUrl}
    preview={`You've been invited to ${siteName}`}
    footerNote="Invites are personal — please don't forward this email."
  >
    <Heading style={styles.h1}>You're invited to {siteName}</Heading>
    <Text style={styles.text}>
      Someone added {recipient ? recipient : 'you'} to {siteName} — a focused study
      space with live rooms, watch parties, shared notes and exam communities.
    </Text>
    <Cta href={confirmationUrl} label="Accept invitation" />
    <Text style={{ ...styles.small, marginTop: '22px' }}>
      Not expecting this? You can ignore the invite.
    </Text>
  </EmailShell>
)

export default InviteEmail
