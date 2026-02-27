"use client";

import { useState, useEffect, createElement } from "react";

const BASE_URL = "https://1367-studio.github.io/santander-calc/";

const LABELS = {
  fr: "Voir l'échéancier",
  en: "See schedule",
  nl: "Schema bekijken",
  de: "Plan anzeigen",
};

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

  useEffect(() => {
    if (!isOpen) return;
    const handleMessage = (e) => {
      if (e.data === "sr:close") setIsOpen(false);
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isOpen]);

  const params = new URLSearchParams({
    total:    String(total),
    lang,
    primary,
    bg,
    headerBg: headerBg || primary,
    headerFg,
    autoopen: "true",
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

  return createElement(
    "span",
    null,
    createElement(
      "button",
      {
        type:      "button",
        onClick:   () => setIsOpen(true),
        className,
        style:     { ...defaultStyle, ...style },
      },
      label
    ),
    isOpen &&
      createElement("iframe", {
        src:              `${BASE_URL}?${params}`,
        allowTransparency: true,
        style: {
          position:   "fixed",
          inset:      0,
          width:      "100%",
          height:     "100%",
          border:     "none",
          zIndex:     2147483647,
          background: "transparent",
        },
      })
  );
}
