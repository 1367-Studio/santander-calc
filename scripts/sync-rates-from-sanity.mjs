#!/usr/bin/env node
// Pulls TAEG/Debetrente/legal text from Sanity and regenerates the
// revolving_bands_*.json files that GitHub Pages serves directly from this
// repo (https://1367-studio.github.io/santander-calc/). Note: these JSON
// files are NOT part of the published npm package (see package.json "files")
// — the widget's rate data is served exclusively via GitHub Pages, straight
// off whichever branch is checked out. So the only thing that needs to
// happen after this script writes new values is committing + pushing to
// main — Pages picks it up on its own (~1 min), no npm publish involved.
//
// Intentionally does NOT touch sub_ranges / payment_step / min_payment: those
// encode Santander's minimum-payment ladder, which is a separate policy from
// the interest rate and isn't derivable from the TAEG. If Santander ever
// changes that ladder too, it needs a fresh official repayment table and the
// derive_band_*.js / verify_band_*.js calibration scripts — not this script.
//
// Env vars required: SANITY_PROJECT_ID, SANITY_DATASET, SANITY_WRITE_TOKEN
// (needed even though this script mostly reads — see "error write-back" below)
// Optional: SANITY_API_VERSION (default: today)
//
// Usage:
//   node scripts/sync-rates-from-sanity.mjs [--dry-run] [--target=prod|dev]
//
// --target=prod (default): writes revolving_bands_*.json at the repo root
//   (the real production files), and SKIPS any band currently flagged
//   "publishToDevOnly" in Sanity — so a rate someone is still testing can
//   never leak into production through this path.
// --target=dev: writes into dev/revolving_bands_*.json instead (an isolated
//   mirror served at .../santander-calc/dev/), and includes EVERY band
//   regardless of the publishToDevOnly flag, so the dev mirror always shows
//   a complete, current picture — real values for untouched bands, test
//   values for whichever one is being edited.
//
// Error write-back: this runs unattended in CI with nobody watching the logs.
// If validation rejects a document's values, that document's lastSyncError /
// lastSyncErrorAt fields are patched in Sanity (not --dry-run) so whoever
// edited it sees a red banner right in the Studio instead of the change
// silently never shipping. Any document that passes validation has its error
// fields cleared, so a fixed value un-shows the banner on the next sync.

import {createClient} from '@sanity/client'
import {readFileSync, writeFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
import {monthlyRateFromApr} from './rate-formula.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.join(__dirname, '..')
const dryRun = process.argv.includes('--dry-run')
const targetArg = process.argv.find((a) => a.startsWith('--target='))
const target = targetArg ? targetArg.split('=')[1] : 'prod'
if (!['prod', 'dev'].includes(target)) {
  console.error(`Invalid --target="${target}" — must be "prod" or "dev"`)
  process.exit(1)
}
const outDir = target === 'dev' ? path.join(repoRoot, 'dev') : repoRoot

const FILE_BY_KEY = {
  '0_1250': 'revolving_bands_0_1250.json',
  '0_2500': 'revolving_bands_0_2500.json',
  '0_5001': 'revolving_bands_0_5001.json',
  '1251_5000': 'revolving_bands_1251_5000.json',
}

function requireEnv(name) {
  const v = process.env[name]
  if (!v) {
    console.error(`Missing required env var: ${name}`)
    process.exit(1)
  }
  return v
}

// Last line of defense before this can auto-publish unattended (CI runs this
// with no human reviewing the diff first). Only catches gross typos/mistakes
// (negative, zero, missing-decimal-point, >50% APR) — NOT a substitute for
// someone sanity-checking the number they typed in Sanity.
function validateRateFields(doc) {
  const errors = []
  const checkPercent = (name, value) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      errors.push(`${name} is not a finite number (got ${JSON.stringify(value)})`)
    } else if (value <= 0 || value >= 50) {
      errors.push(`${name} = ${value} is outside the sane 0–50% range`)
    }
  }
  checkPercent('aprRepresentative (TAEG)', doc.aprRepresentative)
  checkPercent('aprNominal (Debetrente)', doc.aprNominal)
  if (typeof doc.openFeeMonthly !== 'number' || doc.openFeeMonthly < 0 || doc.openFeeMonthly >= 5) {
    errors.push(`openFeeMonthly = ${doc.openFeeMonthly} is outside the sane 0–5% range`)
  }
  if (!doc.legalLineFr || !doc.legalLineFr.trim()) {
    errors.push('legalLineFr is empty')
  }
  return errors
}

const readClient = createClient({
  projectId: requireEnv('SANITY_PROJECT_ID'),
  dataset: requireEnv('SANITY_DATASET'),
  apiVersion: process.env.SANITY_API_VERSION || new Date().toISOString().slice(0, 10),
  token: process.env.SANITY_READ_TOKEN || process.env.SANITY_WRITE_TOKEN,
  useCdn: false, // always read fresh — this is a sync step, not a hot path
})

// Separate client for the error write-back — only touched when there's
// actually something to patch, so a local run without SANITY_WRITE_TOKEN set
// still works fine as long as validation passes.
function writeClient() {
  return createClient({
    projectId: process.env.SANITY_PROJECT_ID,
    dataset: process.env.SANITY_DATASET,
    apiVersion: process.env.SANITY_API_VERSION || new Date().toISOString().slice(0, 10),
    token: requireEnv('SANITY_WRITE_TOKEN'),
    useCdn: false,
  })
}

async function reportSyncErrors(docsWithErrors) {
  if (dryRun || !docsWithErrors.length) return
  const tx = writeClient().transaction()
  const now = new Date().toISOString()
  for (const {doc, errors} of docsWithErrors) {
    tx.patch(doc._id, {set: {lastSyncError: errors.join('; '), lastSyncErrorAt: now}})
  }
  await tx.commit()
}

async function clearSyncErrors(docs) {
  if (dryRun) return
  const docsWithError = docs.filter((d) => d.lastSyncError)
  if (!docsWithError.length) return
  const tx = writeClient().transaction()
  for (const doc of docsWithError) {
    tx.patch(doc._id, {unset: ['lastSyncError', 'lastSyncErrorAt']})
  }
  await tx.commit()
}

async function main() {
  const groqFilter =
    target === 'prod'
      ? `*[_type == "revolvingRateBand" && publishToDevOnly != true]`
      : `*[_type == "revolvingRateBand"]`
  const docs = await readClient.fetch(groqFilter)

  if (!docs.length) {
    console.error(
      target === 'prod'
        ? 'No revolvingRateBand documents found for production (all flagged publishToDevOnly, or none exist). Did you run seed-sanity.mjs?'
        : 'No revolvingRateBand documents found in Sanity. Did you run seed-sanity.mjs?',
    )
    process.exit(1)
  }

  // Validate every doc BEFORE writing anything — one bad value aborts the
  // whole sync rather than leaving some JSON files updated and others not.
  const perDocErrors = docs.map((doc) => ({doc, errors: validateRateFields(doc)}))
  const failing = perDocErrors.filter((d) => d.errors.length)

  if (failing.length) {
    console.error(
      'Refusing to sync — validation failed:\n' +
        failing.map(({doc, errors}) => `  [${doc.fileKey || doc._id}] ${errors.join('; ')}`).join('\n'),
    )
    await reportSyncErrors(failing)
    console.error(
      dryRun
        ? '(--dry-run: not writing error status back to Sanity)'
        : 'Wrote lastSyncError back to the offending document(s) in Sanity.',
    )
    process.exit(1)
  }

  // Every doc in this run is valid — clear any stale error banner left over
  // from a previous failed attempt.
  await clearSyncErrors(docs)

  console.log(`Target: ${target}  (writing into ${path.relative(repoRoot, outDir) || '.'}/)`)

  for (const doc of docs) {
    const fileName = FILE_BY_KEY[doc.fileKey]
    if (!fileName) {
      console.warn(`Skipping doc "${doc.label}" — unknown fileKey "${doc.fileKey}"`)
      continue
    }

    const filePath = path.join(outDir, fileName)
    const data = JSON.parse(readFileSync(filePath, 'utf8'))

    const aprRepresentative = doc.aprRepresentative / 100
    const aprNominal = doc.aprNominal / 100
    const openFeeMonthly = doc.openFeeMonthly / 100
    const monthlyRate = monthlyRateFromApr(aprRepresentative)

    console.log(`\n${fileName}${doc.publishToDevOnly ? '  [publishToDevOnly]' : ''}`)
    console.log(`  apr_representative : ${data.apr_representative} -> ${aprRepresentative}`)
    console.log(`  apr_nominal        : ${data.apr_nominal} -> ${aprNominal}`)
    console.log(`  open_fee_monthly   : ${data.open_fee_monthly} -> ${openFeeMonthly}`)
    console.log(`  monthly_rate       : ${data.monthly_rate} -> ${monthlyRate}`)
    console.log(`  sub_ranges         : unchanged (${data.sub_ranges.length} steps)`)

    data.apr_representative = aprRepresentative
    data.apr_nominal = aprNominal
    data.open_fee_monthly = openFeeMonthly
    data.monthly_rate = monthlyRate
    data.legal_lines = [doc.legalLineFr]

    if (!dryRun) {
      writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n')
    }
  }

  console.log(
    dryRun
      ? '\n--dry-run: no files were written.'
      : '\nDone. Review the diff, commit, and push to main — GitHub Pages redeploys on its own.',
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
