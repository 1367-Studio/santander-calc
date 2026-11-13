import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy policy — Santander Credit Calculator",
  description: "How the Santander Credit Calculator (website widget and Shopify app) handles data.",
  robots: { index: true },
};

const UPDATED = "13 November 2026";

export default function Privacy() {
  return (
    <main className="wrap" style={{ maxWidth: 760, padding: "64px 0 96px", lineHeight: 1.65 }}>
      <p className="eyebrow">Santander Credit Calculator</p>
      <h1 style={{ fontSize: 40, lineHeight: 1.1, margin: "0 0 8px" }}>Privacy policy</h1>
      <p className="muted">Last updated: {UPDATED}</p>

      <p>
        This policy covers the Santander Credit Calculator: the Shopify app, the website widget (script tag and React component) and this
        website. They are published and operated by <strong>1367 Studio</strong> (“we”).
      </p>

      <h2>In short</h2>
      <p>
        The calculator works out a repayment schedule in the shopper’s browser. It does not collect, store or sell personal data about
        merchants or shoppers, and it does not use cookies or trackers.
      </p>

      <h2>Shopify app</h2>
      <ul>
        <li>
          <strong>No Admin API access.</strong> The app requests no access scopes, so it cannot read your products, orders, customers or
          store settings.
        </li>
        <li>
          <strong>Amounts stay in the browser.</strong> The calculator reads the product price or cart total from your storefront page and
          calculates the schedule in the shopper’s browser. Nothing is sent to us.
        </li>
        <li>
          <strong>Admin page.</strong> When you open the app in your Shopify admin, Shopify gives the page a short-lived session token. We
          check it to confirm the request comes from your store and keep nothing.
        </li>
        <li>
          <strong>Privacy webhooks.</strong> Shopify sends us customer data requests, customer redaction and shop redaction requests. We hold
          no customer or shop data, so we acknowledge them and there is nothing to export or delete.
        </li>
      </ul>

      <h2>Rates</h2>
      <p>
        To show current rates, the shopper’s browser downloads the public rate card from our server (santander-calc.vercel.app). Like any
        web request, this exposes the browser’s IP address and user agent to our hosting provider, Vercel, which may keep them in
        short-lived technical logs for security and reliability. We don’t combine these logs with other data or use them to identify anyone.
      </p>

      <h2>Service providers</h2>
      <ul>
        <li>Vercel Inc. — hosting of this website and the rate API.</li>
        <li>Sanity AS — storage of the published rates (no personal data).</li>
        <li>Shopify — app installation and the session tokens described above.</li>
      </ul>

      <h2>Credit applications</h2>
      <p>
        The calculator shows a simulation only. It does not collect applications, credit details or identity documents. If a shopper applies
        for credit, that happens directly with Santander under its own privacy policy.
      </p>

      <h2>Your rights and contact</h2>
      <p>
        Under the GDPR you can ask us about any data we hold about you. In practice the calculator holds none, but write to us at{" "}
        <a href="mailto:contact@1367studio.com">contact@1367studio.com</a> with any question and we’ll answer within 30 days. You can also
        complain to your data protection authority.
      </p>

      <h2>Changes</h2>
      <p>If this policy changes, we’ll update the date at the top of this page.</p>
    </main>
  );
}
