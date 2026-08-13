import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

export const brand = {
  ink: '#14140f',
  charcoal: '#1c1c18',
  gold: '#C9A227',
  goldSoft: '#F3E3AE',
  body: '#3f4149',
  muted: '#8a8d96',
  line: '#e8e6df',
  paper: '#ffffff',
  shell: '#f6f5f1',
}

export const font =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"

export const styles = {
  main: { backgroundColor: brand.shell, fontFamily: font, margin: 0, padding: '0' },
  container: {
    maxWidth: '560px',
    margin: '0 auto',
    padding: '32px 16px 40px',
  },
  card: {
    backgroundColor: brand.paper,
    border: `1px solid ${brand.line}`,
    borderRadius: '16px',
    overflow: 'hidden' as const,
  },
  header: {
    backgroundColor: brand.ink,
    padding: '22px 28px',
  },
  logo: {
    color: brand.paper,
    fontSize: '19px',
    fontWeight: 700 as const,
    letterSpacing: '-0.02em',
    margin: 0,
    textDecoration: 'none',
  },
  logoAccent: { color: brand.gold },
  tagline: {
    color: '#9a9891',
    fontSize: '12px',
    margin: '4px 0 0',
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
  },
  rule: {
    borderTop: `3px solid ${brand.gold}`,
    margin: 0,
    borderBottom: 'none',
    borderLeft: 'none',
    borderRight: 'none',
  },
  content: { padding: '32px 28px 28px' },
  h1: {
    fontSize: '24px',
    lineHeight: '1.25',
    fontWeight: 700 as const,
    color: brand.ink,
    margin: '0 0 14px',
    letterSpacing: '-0.02em',
  },
  h2: {
    fontSize: '17px',
    fontWeight: 700 as const,
    color: brand.ink,
    margin: '26px 0 8px',
  },
  text: {
    fontSize: '15px',
    lineHeight: '1.65',
    color: brand.body,
    margin: '0 0 16px',
  },
  small: { fontSize: '13px', lineHeight: '1.6', color: brand.muted, margin: '0 0 10px' },
  link: { color: '#8a6d10', textDecoration: 'underline' },
  buttonWrap: { margin: '26px 0 8px' },
  button: {
    backgroundColor: brand.gold,
    color: brand.ink,
    fontSize: '15px',
    fontWeight: 700 as const,
    borderRadius: '10px',
    padding: '14px 26px',
    textDecoration: 'none',
    display: 'inline-block',
  },
  fallback: {
    fontSize: '12px',
    lineHeight: '1.6',
    color: brand.muted,
    margin: '18px 0 0',
    wordBreak: 'break-all' as const,
  },
  note: {
    backgroundColor: '#fbf7e8',
    border: `1px solid ${brand.goldSoft}`,
    borderRadius: '10px',
    padding: '14px 16px',
    margin: '22px 0 0',
  },
  noteText: { fontSize: '13px', lineHeight: '1.6', color: '#6b5a17', margin: 0 },
  divider: { borderTop: `1px solid ${brand.line}`, margin: '28px 0 20px', borderBottom: 'none', borderLeft: 'none', borderRight: 'none' },
  quote: {
    borderLeft: `3px solid ${brand.gold}`,
    padding: '2px 0 2px 14px',
    margin: '0 0 16px',
    fontSize: '15px',
    lineHeight: '1.65',
    color: brand.ink,
    fontStyle: 'italic' as const,
  },
  bullet: {
    fontSize: '15px',
    lineHeight: '1.6',
    color: brand.body,
    margin: '0 0 8px',
    paddingLeft: '4px',
  },
  footer: { padding: '20px 28px 0', textAlign: 'center' as const },
  footerText: { fontSize: '12px', lineHeight: '1.6', color: brand.muted, margin: '0 0 6px' },
}

interface ShellProps {
  siteName?: string
  siteUrl?: string
  preview: string
  tagline?: string
  footerNote?: string
  children: React.ReactNode
}

/** Branded ClassLab email shell — dark header, gold rule, white content card. */
export const EmailShell = ({
  siteName = 'ClassLab',
  siteUrl = 'https://classlab.in',
  preview,
  tagline = 'Study together. Stay accountable.',
  footerNote,
  children,
}: ShellProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={styles.main}>
      <Container style={styles.container}>
        <Section style={styles.card}>
          <Section style={styles.header}>
            <Link href={siteUrl} style={styles.logo}>
              {siteName.replace(/Lab$/, '')}
              <span style={styles.logoAccent}>{siteName.endsWith('Lab') ? 'Lab' : ''}</span>
            </Link>
            <Text style={styles.tagline}>{tagline}</Text>
          </Section>
          <Hr style={styles.rule} />
          <Section style={styles.content}>{children}</Section>
        </Section>
        <Section style={styles.footer}>
          {footerNote ? <Text style={styles.footerText}>{footerNote}</Text> : null}
          <Text style={styles.footerText}>
            <Link href={siteUrl} style={styles.link}>
              {siteName}
            </Link>{' '}
            — focus rooms, watch parties and exam prep communities.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

interface CtaProps {
  href: string
  label: string
  showFallback?: boolean
}

export const Cta = ({ href, label, showFallback = true }: CtaProps) => (
  <>
    <Section style={styles.buttonWrap}>
      <Button style={styles.button} href={href}>
        {label}
      </Button>
    </Section>
    {showFallback ? (
      <Text style={styles.fallback}>
        Button not working? Paste this link into your browser:
        <br />
        {href}
      </Text>
    ) : null}
  </>
)

export default EmailShell
