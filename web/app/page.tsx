import { getRateCard } from "@/lib/rate-card";
import { HeroDemo, Playground } from "@/components/Playground";
import { CopyButton } from "@/components/CopyButton";

export const revalidate = 3600;

const ORIGIN = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "https://santander-calc.vercel.app";
const STUDIO = process.env.NEXT_PUBLIC_STUDIO_URL || "https://santander-calc.sanity.studio";

const pct = (f: number) => `${(f * 100).toLocaleString("fr-BE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
const eur = (n: number) => `${n.toLocaleString("fr-BE")} €`;
const dmy = (iso: string) => iso.split("-").reverse().join("/");

const REACT_SNIPPET = `import { SantanderCalcButton } from "santander-calc";

<SantanderCalcButton total={cart.total} lang="fr" />`;

const LIQUID_SNIPPET = `Online Store → Customize → Add block → Apps
→ “Santander calculator”
   Amount: Product price  |  Cart total`;

export default async function Home() {
  const result = await getRateCard();

  return (
    <>
      <header className="topbar">
        <div className="wrap topbar-inner">
          <span className="brand">
            <span className="brand-mark" aria-hidden="true" />
            Santander <span className="brand-sub">Credit Calculator</span>
          </span>
          <nav className="topnav">
            <a href="#rates">Rates</a>
            <a href="#try">Try it</a>
            <a href="#integrate">Integrate</a>
            <a className="btn btn--ghost" href={STUDIO}>
              Rate Studio ↗
            </a>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">For Santander partner shops · Belgium</p>
              <h1>Show customers what paying in instalments really costs.</h1>
              <p className="lead">
                A month-by-month repayment schedule for Santander’s revolving credit, with the TAEG, the legal notice and the mandatory
                warning built in. One line of code on any site, a block in Shopify, and rates that Santander updates itself.
              </p>
              <div className="hero-actions">
                <a className="btn btn--primary" href="#integrate">
                  Add it to your shop
                </a>
                <a className="btn btn--ghost" href="#try">
                  Try the widget
                </a>
              </div>
              <ul className="facts">
                <li>
                  <strong>10 KB</strong> gzipped, no iframe
                </li>
                <li>
                  <strong>FR · NL · EN · DE</strong>
                </li>
                <li>
                  <strong>Live rates</strong> from Santander
                </li>
              </ul>
            </div>
            <div className="hero-demo">
              <HeroDemo />
            </div>
          </div>
        </section>

        <section id="rates" className="section">
          <div className="wrap">
            <div className="section-head">
              <h2>Rates in force</h2>
              <p>
                Santander edits these in the Rate Studio. Every change is checked against the rules below before it can be published,
                and reaches every shop within a minute.
              </p>
            </div>

            {result.status === "ok" ? (
              <>
                <div className="rates">
                  {result.card.tiers.map((t) => (
                    <article key={t.id} className="rate">
                      <p className="rate-tier">
                        Credit limit {t.limitMin <= 0 ? `up to ${eur(t.limitMax)}` : `${eur(t.limitMin)} – ${eur(t.limitMax)}`}
                      </p>
                      <p className="rate-taeg">
                        {pct(t.aprRepresentative)} <span>TAEG</span>
                      </p>
                      <dl>
                        <div>
                          <dt>Debit rate (variable)</dt>
                          <dd>{pct(t.aprNominal)}</dd>
                        </div>
                        <div>
                          <dt>Card fee</dt>
                          <dd>{pct(t.openFeeMonthly)} / month</dd>
                        </div>
                        <div>
                          <dt>Minimum payment</dt>
                          <dd>{eur(t.minPayment)}</dd>
                        </div>
                      </dl>
                    </article>
                  ))}
                  <aside className="rate rate--meta">
                    <p className="rate-tier">Valid from</p>
                    <p className="rate-taeg">{dmy(result.card.validFrom)}</p>
                    <p className="muted">
                      {result.source === "sanity" ? "Published in the Rate Studio." : "Served from the repository files until the Rate Studio is set up."}
                    </p>
                  </aside>
                </div>
                <ul className="guarantees">
                  <li>Monthly rate always computed from the TAEG — never typed by hand</li>
                  <li>TAEG must match the debit rate + card fee</li>
                  <li>Payment ladder must repay within the legal period</li>
                  <li>Santander’s reference simulations must match to the cent</li>
                </ul>
              </>
            ) : (
              <p className="callout">Rates are temporarily unavailable ({result.message}). The widget shows a notice instead of a schedule.</p>
            )}
          </div>
        </section>

        <section id="try" className="section section--tint">
          <div className="wrap">
            <div className="section-head">
              <h2>Try it on a cart</h2>
              <p>Change the total, language and style — the snippet updates with it.</p>
            </div>
            <Playground origin={ORIGIN} />
          </div>
        </section>

        <section id="integrate" className="section">
          <div className="wrap">
            <div className="section-head">
              <h2>Integrate in minutes</h2>
              <p>Same widget, same rates, wherever your shop runs. Existing v1 script tags keep working unchanged.</p>
            </div>
            <div className="cards">
              <article className="card">
                <h3>Any website</h3>
                <p>WordPress, PrestaShop, Magento, plain HTML: paste one script tag where the button should appear.</p>
                <pre>
                  <code>{`<script src="${ORIGIN}/v2/loader.js"\n  data-total="1250" data-lang="fr"></script>`}</code>
                </pre>
                <CopyButton text={`<script src="${ORIGIN}/v2/loader.js" data-total="1250" data-lang="fr"></script>`} />
              </article>
              <article className="card">
                <h3>React & Next.js</h3>
                <p>
                  <code>npm install santander-calc</code> — works in Server Components, renders on the client.
                </p>
                <pre>
                  <code>{REACT_SNIPPET}</code>
                </pre>
                <CopyButton text={REACT_SNIPPET} />
              </article>
              <article className="card">
                <h3>Shopify</h3>
                <p>Install the Santander app, then add the block to the product or cart page. Cart drawers are covered by an app embed.</p>
                <pre>
                  <code>{LIQUID_SNIPPET}</code>
                </pre>
              </article>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="wrap footer-inner">
          <span>Attention, emprunter de l’argent coûte aussi de l’argent.</span>
          <span className="muted">
            API: <a href="/api/rate-card">/api/rate-card</a> · Built by 1367 Studio
          </span>
        </div>
      </footer>
    </>
  );
}
