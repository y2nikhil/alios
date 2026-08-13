import * as React from 'react'
import { Heading, Section, Text } from '@react-email/components'
import { EmailShell, brand, styles } from './_layout'

interface ReauthEmailProps {
  siteName?: string
  siteUrl?: string
  token?: string
}

export const ReauthenticationEmail = ({
  siteName = 'ClassLab',
  siteUrl = 'https://classlab.in',
  token = '------',
}: ReauthEmailProps) => (
  <EmailShell
    siteName={siteName}
    siteUrl={siteUrl}
    preview={`Your ${siteName} verification code`}
    footerNote="Never share this code with anyone."
  >
    <Heading style={styles.h1}>Your verification code</Heading>
    <Text style={styles.text}>
      Enter this code in {siteName} to confirm it's really you.
    </Text>
    <Section style={codeBox}>
      <Text style={codeText}>{token}</Text>
    </Section>
    <Text style={{ ...styles.small, marginTop: '22px' }}>
      The code expires shortly. If you didn't request it, ignore this email.
    </Text>
  </EmailShell>
)

const codeBox = {
  backgroundColor: '#fbf7e8',
  border: `1px solid ${brand.goldSoft}`,
  borderRadius: '12px',
  padding: '18px',
  textAlign: 'center' as const,
  margin: '20px 0 0',
}
const codeText = {
  fontSize: '30px',
  fontWeight: 700 as const,
  letterSpacing: '0.32em',
  color: brand.ink,
  margin: 0,
  fontFamily: "'SFMono-Regular', Menlo, Consolas, monospace",
}

export default ReauthenticationEmail
