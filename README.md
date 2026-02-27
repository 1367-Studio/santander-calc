# santander-calc

Widget de calculadora de crédito rotativo Santander. Funciona em **HTML puro** e **React/Next.js**.

---

## Como funciona

O widget renderiza um botão inline que ao ser clicado abre um modal com o cronograma de parcelas do crédito rotativo. Todo o cálculo acontece no browser — sem backend.

---

## HTML puro

Cola o `<script>` onde quiseres que o botão apareça:

```html
<script
  src="https://cdn.jsdelivr.net/npm/santander-calc/loader.js"
  data-total="1250"
  data-lang="fr">
</script>
```

### Atributos disponíveis

| Atributo | Descrição | Padrão |
|---|---|---|
| `data-total` | Valor total em euros | `0` |
| `data-lang` | Idioma: `fr` `en` `nl` `de` | `fr` |
| `data-primary` | Cor primária (hex) | `#e60000` |
| `data-bg` | Cor de fundo do modal (hex) | `#ffffff` |
| `data-header-bg` | Cor de fundo do cabeçalho (hex) | igual ao primary |
| `data-header-fg` | Cor do texto do cabeçalho (hex) | `#ffffff` |
| `data-btn-text` | Texto personalizado do botão | tradução automática |
| `data-width` | Largura do botão | `auto` |
| `data-height` | Altura do botão | `50px` |
| `data-position` | Posição do botão (apenas modo fixed) | `bottom-right` |

### Exemplo com todas as opções

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

### Plataformas

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

### Instalação

```bash
npm install santander-calc
```

### Uso

```tsx
import { SantanderCalcButton } from "santander-calc";

export default function CartPage() {
  return (
    <div>
      <button>Finalizar compra</button>
      <SantanderCalcButton total={1250} lang="fr" />
    </div>
  );
}
```

### Props

| Prop | Tipo | Descrição | Padrão |
|---|---|---|---|
| `total` | `number` | Valor total em euros | — |
| `lang` | `"fr" \| "en" \| "nl" \| "de"` | Idioma | `"fr"` |
| `primary` | `string` | Cor primária (hex) | `"#e60000"` |
| `bg` | `string` | Cor de fundo do modal | `"#ffffff"` |
| `headerBg` | `string` | Cor de fundo do cabeçalho | igual ao primary |
| `headerFg` | `string` | Cor do texto do cabeçalho | `"#ffffff"` |
| `btnText` | `string` | Texto personalizado do botão | tradução automática |
| `className` | `string` | Classe CSS do botão | — |
| `style` | `object` | Estilos inline do botão | — |

### Exemplo com todas as props

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

O componente já inclui `"use client"` — pode ser importado diretamente em Server Components:

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

## Idiomas suportados

| Código | Idioma |
|---|---|
| `fr` | Français |
| `en` | English |
| `nl` | Nederlands |
| `de` | Deutsch |

---

## Faixas de valor

O calculador cobre automaticamente três faixas:

| Faixa | Intervalo |
|---|---|
| A | € 0 – € 1.250 |
| B | € 1.250 – € 5.000 |
| C | € 5.001 + |

---

## Licença

UNLICENSED — uso privado.
