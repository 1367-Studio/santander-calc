import {createElement, useEffect, useMemo, useRef, useState} from 'react'
import {Badge, Box, Button, Card, Flex, Heading, Stack, Text, TextInput} from '@sanity/ui'
import type {UserViewComponent} from 'sanity/structure'
import {buildSchedule} from '../../widget/src/calc.ts'
import {rateCardFromDoc, tierFromDoc, type RateCardDoc} from '../../widget/src/ratecard.ts'
import '../../widget/src/index.ts' // registers <santander-calc>

const LANGS = ['fr', 'nl', 'en', 'de'] as const
const cell = {padding: '10px 12px', textAlign: 'left' as const, borderBottom: '1px solid var(--card-border-color)'}
const eur = (n: number) => `${n.toLocaleString('fr-BE', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €`

/**
 * "Preview & checks" tab of a rate card: runs every safety check on the
 * current draft, shows the official reference simulations next to what the
 * calculator gives, and renders the real widget with the draft's rates —
 * exactly what shoppers will see once published.
 */
export const RateCardPreview: UserViewComponent = ({document}) => {
  const doc = document.displayed as unknown as RateCardDoc
  const {card, errors} = useMemo(() => rateCardFromDoc({...doc, _id: doc._id || 'draft'}), [doc])
  const [lang, setLang] = useState<(typeof LANGS)[number]>('fr')
  const [amount, setAmount] = useState('1000')
  const widget = useRef<HTMLElement & {rateCard: unknown}>(null)

  useEffect(() => {
    if (widget.current && card) widget.current.rateCard = card
  }, [card])

  const rows = (doc.tiers || []).flatMap((t, i) => {
    const {tier} = tierFromDoc(t, i)
    return (t.examples || [])
      .filter((ex) => Number(ex.amount) > 0)
      .map((ex) => {
        const s = tier.ladder.length && Number.isFinite(tier.monthlyRate) ? buildSchedule(Number(ex.amount), tier).payments : []
        const got = {first: s[0], months: s.length, last: s[s.length - 1]}
        const ok =
          s.length > 0 &&
          (ex.firstPayment == null || Math.abs(got.first - ex.firstPayment) < 0.001) &&
          (ex.months == null || got.months === ex.months) &&
          (ex.lastPayment == null || Math.abs(got.last - ex.lastPayment) < 0.001)
        return {tier: tier.id, ex, got, ok}
      })
  })

  return (
    <Box padding={4}>
      <Stack gap={5}>
        {errors.length ? (
          <Card padding={4} radius={3} tone="critical" border>
            <Stack gap={3}>
              <Heading size={1}>Can’t be published yet</Heading>
              <Text size={1}>Shoppers will keep seeing the current rates until these are fixed:</Text>
              <Stack gap={2} as="ul" style={{margin: 0, paddingLeft: 18}}>
                {errors.map((e) => (
                  <Text key={e} size={1} as="li">
                    {e}
                  </Text>
                ))}
              </Stack>
            </Stack>
          </Card>
        ) : (
          <Card padding={4} radius={3} tone="positive" border>
            <Stack gap={2}>
              <Heading size={1}>All checks pass</Heading>
              <Text size={1} muted>
                Rates are consistent, the ladder repays within the maximum period, and every reference simulation matches to the cent.
              </Text>
            </Stack>
          </Card>
        )}

        <Stack gap={3}>
          <Heading size={1}>Reference simulations</Heading>
          {rows.length ? (
            <Card radius={3} border overflow="hidden">
              <table style={{width: '100%', borderCollapse: 'collapse'}}>
                <thead>
                  <tr>
                    {['Tier · amount', 'Official 1st payment', 'Calculator', 'Months (official / calc.)', 'Last payment (official / calc.)', ''].map((h) => (
                      <th key={h} style={cell}>
                        <Text size={1} weight="semibold" muted>
                          {h}
                        </Text>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({tier, ex, got, ok}, i) => (
                    <tr key={i}>
                      <td style={cell}>
                        <Text size={1}>
                          {tier} · {eur(Number(ex.amount))}
                        </Text>
                      </td>
                      <td style={cell}>
                        <Text size={1}>{ex.firstPayment != null ? eur(ex.firstPayment) : '—'}</Text>
                      </td>
                      <td style={cell}>
                        <Text size={1}>{got.first != null ? eur(got.first) : '—'}</Text>
                      </td>
                      <td style={cell}>
                        <Text size={1}>
                          {ex.months ?? '—'} / {got.months || '—'}
                        </Text>
                      </td>
                      <td style={cell}>
                        <Text size={1}>
                          {ex.lastPayment != null ? eur(ex.lastPayment) : '—'} / {got.last != null ? eur(got.last) : '—'}
                        </Text>
                      </td>
                      <td style={cell}>
                        <Badge tone={ok ? 'positive' : 'critical'}>{ok ? 'Match' : 'Mismatch'}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ) : (
            <Text size={1} muted>
              No reference simulations yet — add them on each tier.
            </Text>
          )}
        </Stack>

        <Stack gap={3}>
          <Heading size={1}>What shoppers will see</Heading>
          <Flex gap={2} align="center" wrap="wrap">
            {LANGS.map((l) => (
              <Button key={l} text={l.toUpperCase()} mode={lang === l ? 'default' : 'ghost'} onClick={() => setLang(l)} />
            ))}
            <Box style={{width: 160}}>
              <TextInput value={amount} onChange={(e) => setAmount(e.currentTarget.value)} inputMode="decimal" aria-label="Amount" />
            </Box>
          </Flex>
          {card ? (
            <Box style={{maxWidth: 600}}>
              {createElement('santander-calc', {ref: widget, mode: 'inline', amount, lang, 'rate-card-url': 'none'})}
            </Box>
          ) : (
            <Text size={1} muted>
              The preview appears once the checks above pass.
            </Text>
          )}
        </Stack>
      </Stack>
    </Box>
  )
}
