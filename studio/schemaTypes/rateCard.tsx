import {defineArrayMember, defineField, defineType} from 'sanity'
import {parseLadder} from '../../widget/src/ladder.ts'
import {rateCardFromDoc, tierFromDoc, type RateCardDoc, type TierDoc} from '../../widget/src/ratecard.ts'

// Every check below calls the same functions the public API and the widget
// use (widget/src/ratecard.ts), so the Studio refuses exactly what the API
// would refuse — and nothing it accepts can compute a wrong schedule.

const LANGS = [
  {id: 'fr', title: 'Français'},
  {id: 'nl', title: 'Nederlands'},
  {id: 'en', title: 'English'},
  {id: 'de', title: 'Deutsch'},
] as const

const today = () => new Intl.DateTimeFormat('en-CA', {timeZone: 'Europe/Brussels'}).format(new Date())
const eur = (n?: number) => (typeof n === 'number' ? `${n.toLocaleString('fr-BE')} €` : '?')
const dmy = (iso?: string) => (iso ? iso.split('-').reverse().join('/') : 'no date')

const percentField = (name: string, title: string, description: string, initialValue?: number) =>
  defineField({
    name,
    title,
    type: 'number',
    description,
    initialValue,
    validation: (rule) => rule.required().min(0).max(50),
  })

const tier = defineArrayMember({
  name: 'rateTier',
  title: 'Credit-limit tier',
  type: 'object',
  fieldsets: [
    {name: 'limits', title: 'Credit limit', options: {columns: 3}},
    {name: 'rates', title: 'Rates (as published by Santander)', options: {columns: 3}},
    {name: 'checks', title: 'Safety checks', options: {collapsible: true, collapsed: false}},
  ],
  fields: [
    defineField({
      name: 'code',
      title: 'Code',
      type: 'string',
      fieldset: 'limits',
      description: 'Short internal code, e.g. A.',
      validation: (rule) => rule.required().max(4),
    }),
    defineField({name: 'limitMin', title: 'From (€)', type: 'number', fieldset: 'limits', initialValue: 0, validation: (r) => r.required().min(0)}),
    defineField({name: 'limitMax', title: 'Up to (€)', type: 'number', fieldset: 'limits', validation: (r) => r.required().positive()}),

    percentField('aprRepresentative', 'TAEG / JKP (%)', 'e.g. 16.49. The monthly rate used in the schedule is computed from this value — it is never typed by hand.'),
    percentField('aprNominal', 'Debit rate (%)', 'Variable nominal rate, e.g. 15.12. Must be consistent with the TAEG and the card fee.'),
    percentField('openFeeMonthly', 'Card fee (% / month)', 'Monthly fee on the outstanding balance, e.g. 0.10.', 0.1),

    defineField({
      name: 'minPayment',
      title: 'Minimum monthly payment (€)',
      type: 'number',
      initialValue: 25,
      validation: (r) => r.required().positive(),
    }),

    defineField({
      name: 'ladder',
      title: 'Payment ladder',
      type: 'text',
      rows: 12,
      description:
        "Santander's minimum-payment table: one line per step, three columns — balance from, balance to, monthly payment. Paste it straight from Excel (tabs, semicolons and decimal commas are fine).",
      validation: (rule) =>
        rule.required().custom((value?: string) => {
          if (!value) return true
          const {errors} = parseLadder(value)
          return errors.length ? errors.slice(0, 5).join('\n') : true
        }),
    }),

    defineField({
      name: 'maxMonths',
      title: 'Maximum repayment period (months)',
      type: 'number',
      fieldset: 'checks',
      description:
        'Every whole-euro amount in this tier is simulated; publishing is blocked if any would take longer to repay. Set it to the legal zeroing period agreed with Santander.',
      validation: (r) => r.required().integer().positive(),
    }),
    defineField({
      name: 'examples',
      title: 'Reference simulations',
      type: 'array',
      fieldset: 'checks',
      description:
        "Simulations from Santander's official tool for these exact rates. The calculator must reproduce each one to the cent, or the rate card can't be published. Add at least two per tier, including the credit limit itself.",
      of: [
        defineArrayMember({
          type: 'object',
          name: 'example',
          fields: [
            defineField({name: 'amount', title: 'Amount (€)', type: 'number', validation: (r) => r.required().positive()}),
            defineField({name: 'firstPayment', title: '1st payment (€)', type: 'number', validation: (r) => r.required().positive()}),
            defineField({name: 'months', title: 'Months', type: 'number', validation: (r) => r.required().integer().positive()}),
            defineField({name: 'lastPayment', title: 'Last payment (€)', type: 'number'}),
          ],
          preview: {
            select: {amount: 'amount', firstPayment: 'firstPayment', months: 'months', lastPayment: 'lastPayment'},
            prepare: ({amount, firstPayment, months, lastPayment}) => ({
              title: `${eur(amount)} → ${eur(firstPayment)} first, ${months ?? '?'} months`,
              subtitle: lastPayment != null ? `last payment ${eur(lastPayment)}` : undefined,
            }),
          },
        }),
      ],
      validation: (r) => r.required().min(2),
    }),
  ],
  validation: (rule) =>
    rule.custom((value?: TierDoc) => {
      if (!value) return true
      const {errors} = tierFromDoc(value, 0)
      // Ladder syntax errors are already shown on the ladder field itself.
      const rest = errors.filter((e) => !e.startsWith('Payment ladder:'))
      return rest.length ? rest.join('\n') : true
    }),
  preview: {
    select: {code: 'code', limitMin: 'limitMin', limitMax: 'limitMax', taeg: 'aprRepresentative', nominal: 'aprNominal'},
    prepare: ({code, limitMin, limitMax, taeg, nominal}) => ({
      title: `${code ?? '?'} · ${limitMin ? `${eur(limitMin)} – ${eur(limitMax)}` : `up to ${eur(limitMax)}`}`,
      subtitle: `TAEG ${taeg ?? '?'} % · debit rate ${nominal ?? '?'} %`,
    }),
  },
})

export default defineType({
  name: 'rateCard',
  title: 'Rate card',
  type: 'document',
  groups: [
    {name: 'rates', title: 'Rates', default: true},
    {name: 'texts', title: 'Texts'},
  ],
  fields: [
    defineField({
      name: 'validFrom',
      title: 'Valid from',
      type: 'date',
      group: 'rates',
      options: {dateFormat: 'DD/MM/YYYY'},
      description:
        'The day these rates take effect (Brussels time), printed in the legal text as "Taux valable au …". To schedule a rate change, create a new rate card with a future date: it goes live by itself that morning. Past rate cards stay as history.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'changeNote',
      title: 'What changed',
      type: 'string',
      group: 'rates',
      description: 'For the audit trail, e.g. "New rates from Santander, e-mail of 28/11/2026".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'tiers',
      title: 'Credit-limit tiers',
      type: 'array',
      group: 'rates',
      of: [tier],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'content',
      title: 'Texts (optional overrides)',
      type: 'object',
      group: 'texts',
      description:
        'Leave a field empty to keep the built-in text reviewed by Santander. Legal sentences can use {min} {max} {taeg} {rate} {fee} {date}; wrap words in [[double brackets]] to print them in bold.',
      fields: LANGS.map((lang) =>
        defineField({
          name: lang.id,
          title: lang.title,
          type: 'object',
          options: {collapsible: true, collapsed: lang.id !== 'fr'},
          fields: [
            defineField({name: 'warning', title: 'Mandatory warning', type: 'string'}),
            defineField({name: 'title', title: 'Title', type: 'string'}),
            defineField({name: 'legalUpTo', title: 'Legal sentence — tier starting at 0 €', type: 'text', rows: 4}),
            defineField({name: 'legalBetween', title: 'Legal sentence — other tiers', type: 'text', rows: 4}),
          ],
        }),
      ),
    }),
  ],
  validation: (rule) =>
    rule.custom((doc?: RateCardDoc) => {
      if (!doc) return true
      // Tier-level problems are reported on each tier; show the rest here.
      const errors = rateCardFromDoc({...doc, _id: doc._id || 'new'}).errors.filter((e) => !e.startsWith('Tier '))
      return errors.length ? errors.join('\n') : true
    }),
  orderings: [{title: 'Valid from (newest first)', name: 'validFromDesc', by: [{field: 'validFrom', direction: 'desc'}]}],
  preview: {
    select: {validFrom: 'validFrom', note: 'changeNote', t0: 'tiers.0.aprRepresentative', t1: 'tiers.1.aprRepresentative'},
    prepare: ({validFrom, note, t0, t1}) => {
      const scheduled = validFrom && validFrom > today()
      return {
        title: `${scheduled ? '🕒 ' : ''}Rates valid from ${dmy(validFrom)}`,
        subtitle: [[t0, t1].filter((v) => v != null).map((v) => `${v} %`).join(' · '), note].filter(Boolean).join(' — '),
      }
    },
  },
})
