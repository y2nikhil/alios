import * as React from 'react'
import { Heading, Hr, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { Cta, EmailShell, styles } from './_layout'

export type BroadcastBlock =
  | { type: 'p'; text: string }
  | { type: 'h'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'bullet'; text: string }
  | { type: 'divider' }

export interface BroadcastProps {
  heading?: string
  intro?: string
  blocks?: Array<BroadcastBlock>
  ctaLabel?: string
  ctaUrl?: string
  signoff?: string
  previewText?: string
  footerNote?: string
}

const BroadcastEmail = ({
  heading = 'A note from ClassLab',
  intro,
  blocks = [],
  ctaLabel,
  ctaUrl,
  signoff = '— Team ClassLab',
  previewText,
  footerNote,
}: BroadcastProps) => (
  <EmailShell
    preview={previewText || intro || heading}
    {...(footerNote ? { footerNote } : {})}
  >
    <Heading style={styles.h1}>{heading}</Heading>
    {intro ? <Text style={styles.text}>{intro}</Text> : null}
    {blocks.map((block, i) => {
      if (block.type === 'divider') return <Hr key={i} style={styles.divider} />
      if (block.type === 'h')
        return (
          <Text key={i} style={styles.h2}>
            {block.text}
          </Text>
        )
      if (block.type === 'quote')
        return (
          <Text key={i} style={styles.quote}>
            {block.text}
          </Text>
        )
      if (block.type === 'bullet')
        return (
          <Text key={i} style={styles.bullet}>
            •&nbsp;&nbsp;{block.text}
          </Text>
        )
      return (
        <Text key={i} style={styles.text}>
          {block.text}
        </Text>
      )
    })}
    {ctaLabel && ctaUrl ? <Cta href={ctaUrl} label={ctaLabel} showFallback={false} /> : null}
    {signoff ? (
      <Text style={{ ...styles.text, marginTop: '26px', marginBottom: 0 }}>{signoff}</Text>
    ) : null}
  </EmailShell>
)

export const template = {
  component: BroadcastEmail,
  subject: (data: Record<string, any>) =>
    (data?.['subject'] as string) || 'A note from ClassLab',
  displayName: 'Custom ClassLab email',
  previewData: {
    heading: 'We are hiring interns',
    intro: 'We are opening three community intern seats at ClassLab this month.',
    blocks: [
      { type: 'bullet', text: 'Run watch parties and focus rooms' },
      { type: 'bullet', text: 'Moderate exam communities' },
    ],
    ctaLabel: 'Apply now',
    ctaUrl: 'https://classlab.in',
  },
} satisfies TemplateEntry

export default BroadcastEmail
