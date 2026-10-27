import {defineField, defineType, useFormValue} from 'sanity'
import {Card, Text} from '@sanity/ui'

// The field itself has no visible cue when readOnly kicks in (no lock icon,
// no styling change) — this banner makes the "why can't I edit this" obvious
// instead of looking broken.
function FileKeyField(props: any) {
  const value = useFormValue(['fileKey'])
  return (
    <>
      {value ? (
        <Card padding={3} radius={2} tone="caution" marginBottom={2}>
          <Text size={1}>
            🔒 Locked — this document is already bound to <code>{String(value)}</code>. Create a
            new document if you need to target a different file.
          </Text>
        </Card>
      ) : null}
      {props.renderDefault(props)}
    </>
  )
}

// Written by the GitHub Action, never by a human — when the sync script's
// validation rejects this document's values, it patches lastSyncError /
// lastSyncErrorAt here so the rejection is visible right in the Studio
// instead of only in a GitHub Actions log nobody is watching. A later sync
// that passes validation clears both fields automatically, which makes this
// banner disappear on its own — no field rendered at all when there's no error.
function SyncErrorBanner() {
  const error = useFormValue(['lastSyncError']) as string | undefined
  const erroredAt = useFormValue(['lastSyncErrorAt']) as string | undefined
  if (!error) return null
  return (
    <Card padding={3} radius={2} tone="critical" marginBottom={3}>
      <Text size={1} weight="semibold">
        ❌ Last sync rejected this document{erroredAt ? ` (${new Date(erroredAt).toLocaleString()})` : ''}
      </Text>
      <Card marginTop={2}>
        <Text size={1}>{error}</Text>
      </Card>
      <Card marginTop={2}>
        <Text size={1} muted>
          Fix the value(s) above and publish again — the next successful sync clears this
          automatically.
        </Text>
      </Card>
    </Card>
  )
}

const FILE_KEYS = [
  {title: 'revolving_bands_0_1250.json (0 – 1,250 €)', value: '0_1250'},
  {title: 'revolving_bands_0_2500.json (0 – 2,500 €)', value: '0_2500'},
  {title: 'revolving_bands_0_5001.json (0 – 5,001 €)', value: '0_5001'},
  {title: 'revolving_bands_1251_5000.json (1,251 – 5,000 €)', value: '1251_5000'},
]

export default defineType({
  name: 'revolvingRateBand',
  title: 'Rate — Revolving Credit',
  type: 'document',

  fields: [
    defineField({
      name: 'lastSyncError',
      title: 'Sync status (set by the sync workflow)',
      type: 'string',
      readOnly: true,
      components: {field: SyncErrorBanner},
    }),

    defineField({
      name: 'lastSyncErrorAt',
      title: 'Sync error timestamp',
      type: 'datetime',
      readOnly: true,
      hidden: true,
    }),

    defineField({
      name: 'fileKey',
      title: 'Target JSON file',
      type: 'string',
      description:
        'Identifies which revolving_bands_*.json this document updates. Locked once set — ' +
        'pick it when creating the document, it cannot be changed afterwards (prevents two ' +
        'documents from ever pointing at the same file).',
      options: {list: FILE_KEYS, layout: 'dropdown'},
      readOnly: ({value}) => Boolean(value),
      components: {field: FileKeyField},
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'label',
      title: 'Label (internal use)',
      type: 'string',
      description: "Just to find your way around the Studio, doesn't appear on the site.",
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'aprRepresentative',
      title: 'APRC — Annual Percentage Rate of Charge (%)',
      type: 'number',
      description:
        'THE field Santander republishes when the rate changes. Example: 16.49 for 16.49%. ' +
        'monthly_rate is automatically recalculated from this single value — ' +
        'formula: (1 + APRC)^(1/12) − 1. Verified exact (18 decimals) against the 4 current files.',
      validation: (rule) => rule.required().min(0).max(100),
    }),

    defineField({
      name: 'aprNominal',
      title: 'Nominal annual debit rate (%)',
      type: 'number',
      description:
        'Displayed separately on the widget (and in the legal text). Does NOT enter the ' +
        'monthly_rate calculation (only the APRC does) — but Santander always publishes both ' +
        'together, so update them at the same time.',
      validation: (rule) => rule.required().min(0).max(100),
    }),

    defineField({
      name: 'openFeeMonthly',
      title: 'Monthly card fee (%)',
      type: 'number',
      description: 'Always 0.10 in the 4 current files. Change only if Santander changes this line.',
      initialValue: 0.1,
      validation: (rule) => rule.required().min(0).max(10),
    }),

    defineField({
      name: 'rateValidFrom',
      title: 'Rate valid from',
      type: 'date',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'publishToDevOnly',
      title: 'Test mode (do not publish to production)',
      type: 'boolean',
      initialValue: false,
      description:
        'When enabled, this edit only shows up on the test mirror ' +
        '(.../santander-calc/dev/) — the production sync skips this document ' +
        'while this is checked, so real clients never see the test value. ' +
        'Uncheck when you want it to actually go to production.',
    }),

    defineField({
      name: 'legalLineFr',
      title: 'Legal sentence (FR, static fallback)',
      type: 'text',
      rows: 4,
      description:
        'Text shown if data-use-i18n-legal="false". The other languages (EN/NL/DE) are generated ' +
        'automatically by the widget from the APRC/nominal rate above — only FR is stored here as ' +
        'free text, so re-read/correct it by hand after a rate change.',
      validation: (rule) => rule.required(),
    }),
  ],

  preview: {
    select: {
      title: 'label',
      subtitle: 'aprRepresentative',
      fileKey: 'fileKey',
      devOnly: 'publishToDevOnly',
      syncError: 'lastSyncError',
    },
    prepare({title, subtitle, fileKey, devOnly, syncError}) {
      return {
        title,
        subtitle: `APRC ${subtitle}% — ${fileKey}${devOnly ? ' — 🧪 DEV ONLY' : ''}${syncError ? ' — ❌ SYNC ERROR' : ''}`,
      }
    },
  },
})
