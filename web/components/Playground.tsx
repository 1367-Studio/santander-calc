"use client";

import { useEffect, useMemo, useState } from "react";
import { CopyButton } from "./CopyButton";

type Lang = "fr" | "nl" | "en" | "de";
type Mode = "button" | "inline";

const LANGS: Array<[Lang, string]> = [
  ["fr", "FR"],
  ["nl", "NL"],
  ["en", "EN"],
  ["de", "DE"],
];
const COLORS = ["#ec0000", "#111827", "#0f766e", "#7c3aed"];

/** Registers <santander-calc> from the widget source (same code as the CDN build). */
export function useSantanderCalc() {
  useEffect(() => {
    void import("../../widget/src/index.ts");
  }, []);
}

export function HeroDemo() {
  useSantanderCalc();
  return <santander-calc mode="inline" amount="1250" lang="fr" api="/" />;
}

export function Playground({ origin }: { origin: string }) {
  useSantanderCalc();
  const [amount, setAmount] = useState(899);
  const [lang, setLang] = useState<Lang>("fr");
  const [mode, setMode] = useState<Mode>("button");
  const [color, setColor] = useState(COLORS[0]);

  const snippet = useMemo(() => {
    const attrs = [
      `  src="${origin}/v2/loader.js"`,
      `  data-total="${amount}"`,
      `  data-lang="${lang}"`,
      color !== COLORS[0] ? `  data-primary="${color.slice(1)}"` : null,
      mode === "inline" ? `  data-embed="true"` : null,
    ].filter(Boolean);
    return `<script\n${attrs.join("\n")}>\n</script>`;
  }, [amount, lang, mode, color, origin]);

  return (
    <div className="playground">
      <div className="controls" aria-label="Widget settings">
        <label className="control">
          <span className="control-label">Cart total</span>
          <span className="range-row">
            <input type="range" min={50} max={5000} step={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            <output className="range-value">{amount.toLocaleString("fr-BE")} €</output>
          </span>
        </label>

        <div className="control">
          <span className="control-label">Language</span>
          <div className="chips" role="radiogroup" aria-label="Language">
            {LANGS.map(([value, label]) => (
              <button key={value} type="button" role="radio" aria-checked={lang === value} className="chip" onClick={() => setLang(value)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="control">
          <span className="control-label">Display</span>
          <div className="chips" role="radiogroup" aria-label="Display">
            {(["button", "inline"] as const).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={mode === m} className="chip" onClick={() => setMode(m)}>
                {m === "button" ? "Button + popup" : "Inline"}
              </button>
            ))}
          </div>
        </div>

        <div className="control">
          <span className="control-label">Accent colour</span>
          <div className="swatches" role="radiogroup" aria-label="Accent colour">
            {COLORS.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={color === c} aria-label={c} className="swatch" style={{ background: c }} onClick={() => setColor(c)} />
            ))}
          </div>
        </div>

        <div className="snippet">
          <div className="snippet-head">
            <span>Paste this where the button should appear</span>
            <CopyButton text={snippet} />
          </div>
          <pre>
            <code>{snippet}</code>
          </pre>
        </div>
      </div>

      <div className={`stage stage--${mode}`}>
        <div className="mock-cart" aria-hidden={mode === "inline" ? undefined : true}>
          <div className="mock-line">
            <span>Subtotal</span>
            <strong>{amount.toLocaleString("fr-BE", { minimumFractionDigits: 2 })} €</strong>
          </div>
          <div className="mock-checkout">Checkout</div>
        </div>
        <santander-calc key={mode} amount={amount} lang={lang} mode={mode} primary={color} api="/" width="100%" />
      </div>
    </div>
  );
}
