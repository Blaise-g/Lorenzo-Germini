"use client";

// PROTOTYPE — the subscribe module (#10 decision 5), as pixels (#13).
//
// Mechanics: a GET form whose action IS the Substack subscribe page, so the
// browser builds `?email=<urlencoded>` itself and Substack prefills its own
// form. No third-party script, no cookies, no blocked endpoint — and it still
// works with JS off, which is why the action/method are real rather than a
// window.location.assign.
//
// #10's constraints, all load-bearing here:
//   - client leaf only
//   - it CANNOT confirm the signup → copy promises a handoff, never success
//   - a real <label>, not a placeholder alone
//   - invalid + empty states
//   - ~30–40% text-expansion budget for IT copy (render with ?it=on to check)
//
// Delete with the rest of src/components/prototype/ only when the Phase 2 §2.6
// homepage swap merges.

import { useId, useState } from "react";
import { SUBSTACK_BASE, t } from "./warm-print";

type Copy = {
  heading: string;
  standfirst: string;
  label: string;
  placeholder: string;
  button: string;
  handoff: string;
  errorEmpty: string;
  errorInvalid: string;
};

const EN: Copy = {
  heading: "Get the essays by email",
  standfirst:
    "Frontier AI, startups, and the business consequences of both. Roughly fortnightly, no other list.",
  label: "Email address",
  placeholder: "you@company.com",
  button: "Continue on Substack →",
  handoff:
    "Opens Substack with your address filled in — you confirm the subscription there.",
  errorEmpty: "Enter an email address to continue.",
  errorInvalid: "That doesn’t look like an email address.",
};

/* Italian, for the text-expansion budget. Measured on the rendered page rather
   than estimated: see the notes for the per-string ratios. */
const IT: Copy = {
  heading: "Ricevi i saggi via email",
  standfirst:
    "AI di frontiera, startup e le conseguenze economiche di entrambe. Circa ogni due settimane, nessun’altra lista.",
  label: "Indirizzo email",
  placeholder: "tu@azienda.com",
  button: "Continua su Substack →",
  handoff:
    "Apre Substack con il tuo indirizzo già inserito — la conferma la dai lì.",
  errorEmpty: "Inserisci un indirizzo email per continuare.",
  errorInvalid: "Non sembra un indirizzo email valido.",
};

/* Deliberately permissive: the authority on whether an address exists is
   Substack's own confirmation email, so this only catches obvious typos. */
const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function SubscribeModule({ lang = "en" }: { lang?: "en" | "it" }) {
  const c = lang === "it" ? IT : EN;
  const id = useId();
  const inputId = `${id}-email`;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <section
      aria-labelledby={`${id}-heading`}
      className={`${t.projectRule} mt-20 border-ink/70`}
    >
      <div className="max-w-[34rem]">
        <h2
          id={`${id}-heading`}
          className="font-display text-2xl leading-snug"
        >
          {c.heading}
        </h2>
        <p className={`mt-3 text-base leading-relaxed ${t.body}`}>
          {c.standfirst}
        </p>

        <form
          action={`${SUBSTACK_BASE}/subscribe`}
          method="get"
          target="_blank"
          rel="noopener noreferrer"
          noValidate
          onSubmit={(e) => {
            const email = value.trim();
            if (!email) {
              e.preventDefault();
              setError(c.errorEmpty);
              return;
            }
            if (!LOOKS_LIKE_EMAIL.test(email)) {
              e.preventDefault();
              setError(c.errorInvalid);
              return;
            }
            setError(null);
            /* no preventDefault: the browser navigates to
               <pub>.substack.com/subscribe?email=<urlencoded> itself */
          }}
          className="mt-7"
        >
          <label
            htmlFor={inputId}
            className={`block ${t.meta} ${t.faint}`}
          >
            {c.label}
          </label>
          {/* #13: `flex flex-wrap` never wrapped — min-w-0 flex-1 let the
              input shrink instead, to 133px at 375, truncating the placeholder
              mid-word. Stacked below sm, side by side above it. */}
          <div className="mt-2 flex flex-col items-stretch gap-3 sm:flex-row sm:items-start">
            <input
              id={inputId}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={value}
              placeholder={c.placeholder}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${errorId} ${hintId}` : hintId}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError(null);
              }}
              className={`min-w-0 border-b-2 bg-transparent px-1 py-2 text-base placeholder:text-faint focus-visible:outline-none sm:flex-1 ${
                error
                  ? "border-accent"
                  : "border-border focus-visible:border-accent"
              }`}
            />
            <button
              type="submit"
              className={`${t.meta} self-start shrink-0 border-b-2 pt-2 pb-2 ${t.accent} ${t.accentBorder} hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent`}
            >
              {c.button}
            </button>
          </div>
          {error ? (
            <p
              id={errorId}
              role="alert"
              className="mt-3 font-mono text-xs text-body"
            >
              {error}
            </p>
          ) : null}
          {/* The handoff promise. Never "you're subscribed" — this surface
              genuinely does not know, and cannot. */}
          <p id={hintId} className={`mt-3 text-[13px] leading-relaxed ${t.faint}`}>
            {c.handoff}
          </p>
        </form>
      </div>
    </section>
  );
}
