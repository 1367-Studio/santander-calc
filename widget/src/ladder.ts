import type { LadderStep } from "./types.ts";

/**
 * The ladder is edited in the Studio as plain text so Santander can paste it
 * straight from Excel: one step per line, three columns (min, max, payment),
 * separated by tabs, semicolons or whitespace. Decimal commas are accepted.
 *
 *   0        441,70   25
 *   441,71   485,80   27,5
 */
export function parseLadder(text: string): { steps: LadderStep[]; errors: string[] } {
  const steps: LadderStep[] = [];
  const errors: string[] = [];

  (text || "").split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;
    const cols = line
      .split(/\t|;|\s+/)
      .map((c) => c.trim().replace(/[€\s]/g, ""))
      .filter(Boolean);
    if (cols.length !== 3) {
      errors.push(`Line ${i + 1}: expected 3 columns (min, max, payment), got ${cols.length}`);
      return;
    }
    const [min, max, payment] = cols.map(parseLocaleNumber);
    if ([min, max, payment].some((n) => !Number.isFinite(n))) {
      errors.push(`Line ${i + 1}: "${line}" contains a value that is not a number`);
      return;
    }
    steps.push({ min, max, payment });
  });

  errors.push(...validateLadder(steps));
  return { steps, errors };
}

export function serializeLadder(steps: LadderStep[]): string {
  return steps.map((s) => `${s.min}\t${s.max}\t${s.payment}`).join("\n");
}

/** Structural checks: ascending, non-overlapping, gap-free (to the cent), positive payments. */
export function validateLadder(steps: LadderStep[]): string[] {
  const errors: string[] = [];
  if (!steps.length) return ["The ladder is empty"];
  steps.forEach((s, i) => {
    const n = i + 1;
    if (s.max < s.min) errors.push(`Step ${n}: max (${s.max}) is below min (${s.min})`);
    if (s.payment <= 0) errors.push(`Step ${n}: payment must be positive`);
    const prev = steps[i - 1];
    if (!prev) return;
    if (s.min <= prev.max) errors.push(`Step ${n}: starts at ${s.min} but step ${n - 1} ends at ${prev.max} (overlap)`);
    // Steps are contiguous when the next one starts one cent (or one euro, for
    // integer bounds) after the previous one ends.
    else if (s.min - prev.max > 1.0001) errors.push(`Step ${n}: gap between ${prev.max} and ${s.min}`);
    if (s.payment < prev.payment) errors.push(`Step ${n}: payment ${s.payment} is lower than the previous step (${prev.payment})`);
  });
  return errors;
}

function parseLocaleNumber(s: string): number {
  // "1.234,56" -> 1234.56 ; "1,234.56" -> 1234.56 ; "27,5" -> 27.5
  // Ladder values never have 3 decimals, so "2.000" / "2,000" are thousands.
  if (/^\d{1,3}([.,]\d{3})+$/.test(s)) return Number(s.replace(/[.,]/g, ""));
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  let normalized = s;
  if (lastComma > lastDot) normalized = s.replace(/\./g, "").replace(",", ".");
  else if (lastDot > lastComma) normalized = s.replace(/,/g, "");
  return normalized === "" ? NaN : Number(normalized);
}
