import type { Lang } from "./types.ts";

/**
 * Built-in copy. Everything here except `close`, `unavailable` and
 * `chartLabel` is carried over verbatim from v1 as reviewed by Santander
 * (Lieselot, May 2026) — change it only with their sign-off.
 *
 * `warning`, `title`, `legalUpTo` and `legalBetween` can be overridden per
 * language from the Studio; the values below are the fallback.
 * Legal placeholders: {min} {max} {taeg} {rate} {fee} {date}; [[…]] = bold.
 */
export interface Strings {
  warning: string;
  title: string;
  button: string;
  amountLabel: string;
  creditLimitLabel: string;
  creditLimitChanged: (label: string) => string;
  teaser: (amount: string) => string;
  statFirst: string;
  statMonths: string;
  colMonths: string;
  colAmount: string;
  roundingNote: string;
  dateLabel: string;
  emptyCart: string;
  tooHigh: string;
  unavailable: string;
  close: string;
  chartLabel: string;
  legalUpTo: string;
  legalBetween: string;
  dateSep: "/" | ".";
}

export const STRINGS: Record<Lang, Strings> = {
  fr: {
    warning: "Attention, emprunter de l’argent coûte aussi de l’argent.",
    title: "Ouverture de crédit",
    button: "Voir l’échéancier",
    amountLabel: "Montant à financer",
    creditLimitLabel: "Limite de crédit",
    creditLimitChanged: (l) => `Tranche modifiée automatiquement → ${l}`,
    teaser: (a) => `Ou à partir de ${a}/mois avec paiement échelonné.`,
    statFirst: "1ère mensualité",
    statMonths: "Nombre de mois",
    colMonths: "Mois",
    colAmount: "Somme",
    roundingNote: "Sous réserve d'erreurs d'arrondi.",
    dateLabel: "Date de ce calcul",
    emptyCart: "Votre panier est vide. Ajoutez des articles pour voir un échéancier.",
    tooHigh: "Montant supérieur au plafond configuré.",
    unavailable: "Le calculateur est momentanément indisponible.",
    close: "Fermer",
    chartLabel: "Évolution des mensualités",
    legalUpTo:
      "Pour une [[ouverture de crédit à durée indéterminée]] jusqu'à [[{max}]] avec un [[Taux Annuel Effectif Global (TAEG)]] de [[{taeg}%]] (taux débiteur [[variable]] : {rate}% et frais de carte {fee}% par mois du capital restant dû). Taux valable au {date}.",
    legalBetween:
      "Pour une [[ouverture de crédit à durée indéterminée]] entre [[{min}]] et [[{max}]] avec un [[Taux Annuel Effectif Global (TAEG)]] de [[{taeg}%]] (taux débiteur [[variable]] : {rate}% et frais de carte {fee}% par mois du capital restant dû). Taux valable au {date}.",
    dateSep: "/",
  },
  en: {
    warning: "Warning: borrowing money also costs money.",
    title: "Revolving credit",
    button: "See schedule",
    amountLabel: "Amount to finance",
    creditLimitLabel: "Credit limit",
    creditLimitChanged: (l) => `Range auto-adjusted → ${l}`,
    teaser: (a) => `Or from ${a}/month with instalments.`,
    statFirst: "First payment",
    statMonths: "Total months",
    colMonths: "Months",
    colAmount: "Amount",
    roundingNote: "Figures are subject to rounding errors.",
    dateLabel: "Date of this calculation",
    emptyCart: "Your cart is empty. Add items to see a schedule.",
    tooHigh: "Amount above the configured ceiling.",
    unavailable: "The calculator is temporarily unavailable.",
    close: "Close",
    chartLabel: "Monthly payments over time",
    legalUpTo:
      "For an [[open-ended credit line]] up to [[{max}]] with an [[Annual Percentage Rate (APR)]] of [[{taeg}%]] ([[variable]] borrowing rate: {rate}% and card fee {fee}% per month on the outstanding balance). Rate valid on {date}.",
    legalBetween:
      "For an [[open-ended credit line]] between [[{min}]] and [[{max}]] with an [[Annual Percentage Rate (APR)]] of [[{taeg}%]] ([[variable]] borrowing rate: {rate}% and card fee {fee}% per month on the outstanding balance). Rate valid on {date}.",
    dateSep: "/",
  },
  nl: {
    warning: "Let op, geld lenen kost ook geld.",
    title: "Kredietopening",
    button: "Schema bekijken",
    amountLabel: "Te financieren bedrag",
    creditLimitLabel: "Kredietlimiet",
    creditLimitChanged: (l) => `Schijf automatisch aangepast → ${l}`,
    teaser: (a) => `Of vanaf ${a}/maand met gespreid betalen.`,
    statFirst: "1e betaling",
    statMonths: "Aantal maanden",
    colMonths: "Maanden",
    colAmount: "Bedrag",
    roundingNote: "Afrondingsverschillen voorbehouden.",
    dateLabel: "Datum van deze berekening",
    emptyCart: "Uw winkelwagen is leeg. Voeg items toe om een schema te zien.",
    tooHigh: "Bedrag boven de ingestelde limiet.",
    unavailable: "De calculator is tijdelijk niet beschikbaar.",
    close: "Sluiten",
    chartLabel: "Verloop van de maandelijkse betalingen",
    legalUpTo:
      "Voor een [[kredietopening van onbepaalde duur]] tot en met [[{max}]] met een [[Jaarlijks Kostenpercentage (JKP)]] van [[{taeg}%]] ([[variabele]] debetrente {rate}% en kaartkosten {fee}% per maand op het openstaand saldo). Tarief geldig op {date}.",
    legalBetween:
      "Voor een [[kredietopening van onbepaalde duur]] tussen [[{min}]] en [[{max}]] met een [[Jaarlijks Kostenpercentage (JKP)]] van [[{taeg}%]] ([[variabele]] debetrente {rate}% en kaartkosten {fee}% per maand op het openstaand saldo). Tarief geldig op {date}.",
    dateSep: "/",
  },
  de: {
    warning: "Achtung: Geld leihen kostet ebenfalls Geld.",
    title: "Rahmenkredit",
    button: "Plan anzeigen",
    amountLabel: "Finanzierungsbetrag",
    creditLimitLabel: "Kreditlimit",
    creditLimitChanged: (l) => `Tranche automatisch angepasst → ${l}`,
    teaser: (a) => `Oder ab ${a}/Monat mit Ratenzahlung.`,
    statFirst: "1. Monatsrate",
    statMonths: "Anzahl Monate",
    colMonths: "Monate",
    colAmount: "Betrag",
    roundingNote: "Angaben können Rundungsfehler enthalten.",
    dateLabel: "Datum dieser Berechnung",
    emptyCart: "Ihr Warenkorb ist leer. Fügen Sie Artikel hinzu, um einen Plan zu sehen.",
    tooHigh: "Betrag über dem konfigurierten Limit.",
    unavailable: "Der Rechner ist vorübergehend nicht verfügbar.",
    close: "Schließen",
    chartLabel: "Verlauf der Monatsraten",
    legalUpTo:
      "Für eine [[unbefristete Kreditlinie]] bis zu [[{max}]] mit einem [[effektiven Jahreszins (APR)]] von [[{taeg}%]] ([[variabler]] Sollzinssatz: {rate}% und Kartenentgelt {fee}% pro Monat auf den offenen Saldo). Zinssatz gültig am {date}.",
    legalBetween:
      "Für eine [[unbefristete Kreditlinie]] zwischen [[{min}]] und [[{max}]] mit einem [[effektiven Jahreszins (APR)]] von [[{taeg}%]] ([[variabler]] Sollzinssatz: {rate}% und Kartenentgelt {fee}% pro Monat auf den offenen Saldo). Zinssatz gültig am {date}.",
    dateSep: ".",
  },
};

export function resolveLang(input: string | null | undefined): Lang {
  const l = (input || "").slice(0, 2).toLowerCase();
  return (["fr", "en", "nl", "de"] as const).find((x) => x === l) ?? "fr";
}
