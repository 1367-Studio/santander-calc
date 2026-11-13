#!/usr/bin/env node
// Creates the first `rateCard` document in Sanity from the rates the widget
// serves today (revolving_bands_0_1250.json + revolving_bands_1251_5000.json),
// including the safety checks (maximum repayment period + reference
// simulations). Run once when switching to the v2 Rate Studio.
//
// Refuses to run if any rateCard already exists — after that, the Studio is
// the source of truth and this script must never overwrite it.
//
//   node --env-file=.env scripts/seed-rate-card.mjs [--dry-run]
//
// Env: SANITY_PROJECT_ID, SANITY_DATASET, SANITY_WRITE_TOKEN (Editor role)

import {createClient} from '@sanity/client'
import {readFileSync} from 'node:fs'
import {rateCardDocFromLegacy} from '../widget/src/legacy-doc.ts'
import {rateCardFromDoc} from '../widget/src/ratecard.ts'

const dryRun = process.argv.includes('--dry-run')
const load = (f) => JSON.parse(readFileSync(new URL(`../${f}`, import.meta.url), 'utf8'))

const doc = rateCardDocFromLegacy(load('revolving_bands_0_1250.json'), load('revolving_bands_1251_5000.json'))
const {errors} = rateCardFromDoc(doc)
if (errors.length) {
  console.error('The current rates fail the v2 checks — not seeding:\n  ' + errors.join('\n  '))
  process.exit(1)
}

const seed = {
  ...doc,
  _id: `rateCard-${doc.validFrom}`,
  _type: 'rateCard',
  changeNote: 'Migrated from the v1 JSON files (rates of 27/05/2025)',
  tiers: doc.tiers.map((t) => ({
    _type: 'rateTier',
    _key: `tier-${t.code}`,
    ...t,
    examples: t.examples.map((e, i) => ({_type: 'example', _key: `ex-${t.code}-${i}`, ...e})),
  })),
}

if (dryRun) {
  console.log(JSON.stringify(seed, null, 2))
  process.exit(0)
}

for (const name of ['SANITY_PROJECT_ID', 'SANITY_DATASET', 'SANITY_WRITE_TOKEN']) {
  if (!process.env[name]) {
    console.error(`Missing env var ${name}`)
    process.exit(1)
  }
}
const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  token: process.env.SANITY_WRITE_TOKEN,
  apiVersion: '2025-02-19',
  useCdn: false,
})

const existing = await client.fetch('count(*[_type == "rateCard"])')
if (existing > 0) {
  console.error(`${existing} rate card(s) already exist in Sanity — refusing to overwrite. Edit them in the Studio instead.`)
  process.exit(1)
}
await client.create(seed)
console.log(`Created ${seed._id} (valid from ${seed.validFrom}). Open the Studio to review it.`)
