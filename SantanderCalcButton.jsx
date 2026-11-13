"use client";

import { createElement, useEffect, useRef } from "react";

/**
 * React wrapper around the <santander-calc> web component. Same props as v1,
 * so existing integrations keep working; the widget now renders in the page
 * (Shadow DOM) instead of a full-screen iframe.
 *
 * Style the button from your own CSS with `santander-calc::part(button)`.
 */
export function SantanderCalcButton({
  total,
  lang = "fr",
  primary,
  bg,
  headerBg,
  headerFg,
  btnText,
  className,
  style,
  embed = false,
  width,
  api,
  onChange,
}) {
  const ref = useRef(null);

  // Registers the custom element in the browser only (safe for SSR).
  useEffect(() => {
    import("./dist/index.js");
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !onChange) return;
    const handler = (e) => onChange(e.detail);
    el.addEventListener("santander-calc:change", handler);
    return () => el.removeEventListener("santander-calc:change", handler);
  }, [onChange]);

  return createElement("santander-calc", {
    ref,
    amount: total != null ? String(total) : undefined,
    lang,
    mode: embed ? "inline" : undefined,
    primary,
    bg,
    "header-bg": headerBg,
    "header-fg": headerFg,
    label: btnText,
    width: width ?? (embed ? "100%" : undefined),
    api,
    className,
    style,
  });
}
