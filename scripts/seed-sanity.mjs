#!/usr/bin/env node
// One-time (or re-runnable) seed: pushes the CURRENT revolving_bands_*.json
// values into Sanity as revolvingRateBand documents, so the Studio starts
// populated with today's real numbers instead of empty fields.
//
// Safe to re-run — it upserts by a deterministic _id per fileKey, so running
// it twice just overwrites the same 4 documents rather than duplicating them.
// Only run this BEFORE anyone has started editing rates by hand in the
// Studio — after that, Sanity is the source of truth and this would stomp
// on real edits.
//
// Env vars required: SANITY_PROJECT_ID, SANITY_DATASET, SANITY_WRITE_TOKEN
// (a token with write access — Studio → API → Tokens → create one with
// "Editor" permission)
//
// Usage:
//   node --env-file=.env scripts/seed-sanity.mjs

import {createClient} from '@sanity/client'
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(__dirname, '..')

const BANDS = [
  {fileKey: '0_1250', fileName: 'revolving_bands_0_1250.json', label: 'Band A — up to €1,250'},
  {fileKey: '0_2500', fileName: 'revolving_bands_0_2500.json', label: 'Band B — up to €2,500'},
  {fileKey: '0_5001', fileName: 'revolving_bands_0_5001.json', label: 'Band C — up to €5,001'},
  {
    fileKey: '1251_5000',
    fileName: 'revolving_bands_1251_5000.json',
    label: 'Band B (duplicate) — €1,251 to €5,000',
  },
]

function requireEnv(name) {
  const v = process.env[name]
  if (!v) {
    console.error(`Missing required env var: ${name}`)
    process.exit(1)
  }
  return v
}

function parseDateFromLegalLine(legalLine) {
  const match = legalLine?.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (!match) return undefined
  const [, dd, mm, yyyy] = match
  return `${yyyy}-${mm}-${dd}`
}

const client = createClient({
  projectId: requireEnv('SANITY_PROJECT_ID'),
  dataset: requireEnv('SANITY_DATASET'),
  apiVersion: process.env.SANITY_API_VERSION || new Date().toISOString().slice(0, 10),
  token: requireEnv('SANITY_WRITE_TOKEN'),
  useCdn: false,
})

async function main() {
  const tx = client.transaction()

  for (const band of BANDS) {
    const data = JSON.parse(readFileSync(path.join(repoRoot, band.fileName), 'utf8'))

    tx.createOrReplace({
      _id: `revolvingRateBand-${band.fileKey}`,
      _type: 'revolvingRateBand',
      fileKey: band.fileKey,
      label: band.label,
      aprRepresentative: +(data.apr_representative * 100).toFixed(4),
      aprNominal: +(data.apr_nominal * 100).toFixed(4),
      openFeeMonthly: +(data.open_fee_monthly * 100).toFixed(4),
      rateValidFrom: parseDateFromLegalLine(data.legal_lines?.[0]),
      legalLineFr: data.legal_lines?.[0] || '',
    })

    console.log(`Queued ${band.fileName} -> revolvingRateBand-${band.fileKey}`)
  }

  await tx.commit()
  console.log('\nSeeded 4 revolvingRateBand documents in Sanity.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
