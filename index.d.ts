import * as React from "react";

export type Lang = "fr" | "en" | "nl" | "de";

export interface SantanderCalcChange {
  amount: number;
  /** Code of the credit-limit tier used, e.g. "A" */
  tier: string;
  firstPayment: number;
  months: number;
}

export interface SantanderCalcButtonProps {
  /** Amount to finance, in euros */
  total: number;
  /** Language — default: "fr" */
  lang?: Lang;
  /** Accent colour — default: Santander red */
  primary?: string;
  /** Popup background colour */
  bg?: string;
  /** Popup header background — default: same as primary */
  headerBg?: string;
  /** Popup header text colour — default: white */
  headerFg?: string;
  /** Button label — default: translated "Voir l'échéancier" */
  btnText?: string;
  /** CSS class on the host element; style the button with ::part(button) */
  className?: string;
  /** Inline styles on the host element */
  style?: React.CSSProperties;
  /** Show the schedule in the page instead of a button + popup */
  embed?: boolean;
  /** Width, e.g. "100%" — default: auto (button) / 100% (embed) */
  width?: string;
  /** Base URL of the rate API — default: the hosted Santander calculator */
  api?: string;
  /** Called whenever the schedule is recalculated */
  onChange?: (change: SantanderCalcChange) => void;
}

export declare function SantanderCalcButton(props: SantanderCalcButtonProps): React.JSX.Element;
