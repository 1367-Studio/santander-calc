"use client";

import { useState, useEffect } from "react";

const BASE_URL = "https://1367-studio.github.io/santander-calc/";

const LABELS = {
  fr: "Voir l'échéancier",
  en: "See schedule",
  nl: "Schema bekijken",
  de: "Plan anzeigen",
};

/**
 * SantanderCalcButton
 *
 * Renders an inline button that opens the Santander revolving credit
 * calculator modal in a full-screen iframe.
 *
 * Props:
 *   total      {number}  - Cart / product total in euros (required)
 *   lang       {string}  - Language: "fr" | "en" | "nl" | "de"  (default: "fr")
 *   primary    {string}  - Primary hex color                     (default: "#e60000")
 *   bg         {string}  - Modal background color                (default: "#ffffff")
 *   headerBg   {string}  - Modal header background               (default: primary)
 *   headerFg   {string}  - Modal header text color               (default: "#ffffff")
 *   btnText    {string}  - Override button label
 *   className  {string}  - CSS class applied to the <button>
 *   style      {object}  - Inline styles applied to the <button>
 *
 * Usage:
 *   import { SantanderCalcButton } from "./SantanderCalcButton";
 *   <SantanderCalcButton total={1250} lang="fr" />
 */
export function SantanderCalcButton({
  total,
  lang = "fr",
  primary = "#e60000",
  bg = "#ffffff",
  headerBg,
  headerFg = "#ffffff",
  btnText,
  className,
  style,
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Listen for close message from the iframe
  useEffect(() => {
    if (!isOpen) return;
    const handleMessage = (e) => {
      if (e.data === "sr:close") setIsOpen(false);
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isOpen]);

  const params = new URLSearchParams({
    total:     String(total),
    lang,
    primary,
    bg,
    headerBg:  headerBg || primary,
    headerFg,
    autoopen:  "true",
  });

  const label = btnText || LABELS[lang] || LABELS.fr;

  const defaultStyle = {
    display:         "inline-block",
    backgroundColor: primary,
    color:           "#fff",
    border:          "none",
    borderRadius:    "4px",
    padding:         "12px 24px",
    fontSize:        "16px",
    fontWeight:      600,
    lineHeight:      1.2,
    cursor:          "pointer",
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={className}
        style={{ ...defaultStyle, ...style }}
      >
        {label}
      </button>

      {isOpen && (
        <iframe
          src={`${BASE_URL}?${params}`}
          allowTransparency
          style={{
            position:   "fixed",
            inset:      0,
            width:      "100%",
            height:     "100%",
            border:     "none",
            zIndex:     2147483647,
            background: "transparent",
          }}
        />
      )}
    </>
  );
}
