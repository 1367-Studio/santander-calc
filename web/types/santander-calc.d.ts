import type { DetailedHTMLProps, HTMLAttributes } from "react";

type SantanderCalcAttributes = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  amount?: string | number;
  lang?: string;
  mode?: "button" | "inline" | "open";
  label?: string;
  primary?: string;
  bg?: string;
  "header-bg"?: string;
  "header-fg"?: string;
  font?: string;
  width?: string;
  api?: string;
  "rate-card-url"?: string;
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "santander-calc": SantanderCalcAttributes;
    }
  }
}
