# santander-calc

Santander revolving credit calculator widget. Works in **plain HTML** and **React / Next.js**.

---

## How it works

The widget renders an inline button that opens a modal showing the revolving credit repayment schedule. All calculations happen in the browser — no backend required.

---

## Plain HTML

Drop the `<script>` tag wherever you want the button to appear:

```html
<script
  src="https://cdn.jsdelivr.net/npm/santander-calc/loader.js"
  data-total="1250"
  data-lang="fr">
</script>
```

### Available attributes

| Attribute | Description | Default |
|---|---|---|
| `data-total` | Total amount in euros | `0` |
| `data-lang` | Language: `fr` `en` `nl` `de` | `fr` |
| `data-primary` | Primary hex color | `#e60000` |
| `data-bg` | Modal background color (hex) | `#ffffff` |
| `data-header-bg` | Modal header background (hex) | same as primary |
| `data-header-fg` | Modal header text color (hex) | `#ffffff` |
| `data-btn-text` | Custom button label (overrides auto-translation) | auto-translated |
| `data-width` | Button width | `auto` |
| `data-height` | Button height | `50px` |

### Full example

```html
<script
  src="https://cdn.jsdelivr.net/npm/santander-calc/loader.js"
  data-total="2500"
  data-lang="fr"
  data-primary="#e60000"
  data-bg="#ffffff"
  data-header-bg="#e60000"
  data-header-fg="#ffffff"
  data-btn-text="Voir l'échéancier"
  data-width="100%">
</script>
```

### Platform examples

**Shopify Liquid:**
```liquid
<script
  src="https://cdn.jsdelivr.net/npm/santander-calc/loader.js"
  data-total="{{ cart.total_price | divided_by: 100.0 }}"
  data-lang="{{ request.locale.iso_code }}">
</script>
```

**PHP / WordPress:**
```php
<script
  src="https://cdn.jsdelivr.net/npm/santander-calc/loader.js"
  data-total="<?= $cart_total ?>"
  data-lang="<?= $locale ?>">
</script>
```

---

## React / Next.js

### Installation

```bash
npm install santander-calc
```

### Usage

```tsx
import { SantanderCalcButton } from "santander-calc";

export default function CartPage() {
  return (
    <div>
      <button>Checkout</button>
      <SantanderCalcButton total={1250} lang="fr" />
    </div>
  );
}
```

### Props

| Prop | Type | Description | Default |
|---|---|---|---|
| `total` | `number` | Total amount in euros | — |
| `lang` | `"fr" \| "en" \| "nl" \| "de"` | Language | `"fr"` |
| `primary` | `string` | Primary hex color | `"#e60000"` |
| `bg` | `string` | Modal background color | `"#ffffff"` |
| `headerBg` | `string` | Modal header background | same as primary |
| `headerFg` | `string` | Modal header text color | `"#ffffff"` |
| `btnText` | `string` | Custom button label | auto-translated |
| `className` | `string` | CSS class on the button | — |
| `style` | `object` | Inline styles on the button | — |

> **Button label** — The button text is automatically translated based on `lang`:
> `fr` → "Voir l'échéancier" · `en` → "See schedule" · `nl` → "Schema bekijken" · `de` → "Plan anzeigen"
> Use `btnText` to override with a fixed label regardless of language.

### Full example

```tsx
<SantanderCalcButton
  total={2500}
  lang="fr"
  primary="#e60000"
  bg="#ffffff"
  headerBg="#e60000"
  headerFg="#ffffff"
  btnText="Voir l'échéancier"
  className="my-button-class"
  style={{ marginTop: "12px", width: "100%" }}
/>
```

### Next.js (App Router)

The component already includes `"use client"` and can be imported directly in Server Components:

```tsx
// app/cart/page.tsx (Server Component)
import { SantanderCalcButton } from "santander-calc";

export default async function CartPage() {
  const cart = await getCart();
  return (
    <SantanderCalcButton total={cart.total} lang="fr" />
  );
}
```

---

## Supported languages

| Code | Language |
|---|---|
| `fr` | Français |
| `en` | English |
| `nl` | Nederlands |
| `de` | Deutsch |

---

## Amount ranges

The calculator automatically selects the correct repayment schedule based on the total:

| Range | Interval |
|---|---|
| A | € 0 – € 1,250 |
| B | € 1,250 – € 5,000 |
| C | € 5,001 + |

---

## License

UNLICENSED — private use only.
