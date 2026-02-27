import * as React from "react";

export interface SantanderCalcButtonProps {
  /** Total amount in euros */
  total: number;
  /** Language: "fr" | "en" | "nl" | "de" — default: "fr" */
  lang?: "fr" | "en" | "nl" | "de";
  /** Primary hex color — default: "#e60000" */
  primary?: string;
  /** Modal background color — default: "#ffffff" */
  bg?: string;
  /** Modal header background — default: same as primary */
  headerBg?: string;
  /** Modal header text color — default: "#ffffff" */
  headerFg?: string;
  /** Custom button label — default: auto-translated */
  btnText?: string;
  /** CSS class applied to the button */
  className?: string;
  /** Inline styles applied to the button */
  style?: React.CSSProperties;
}

export declare function SantanderCalcButton(
  props: SantanderCalcButtonProps
): React.JSX.Element;
