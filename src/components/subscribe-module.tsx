"use client";

// The subscribe handoff (issue #25, spec §2.5). A GET form whose action IS the
// Substack subscribe page, so the browser builds `?email=<urlencoded>` itself
// and Substack prefills its own form. No third-party script, no cookies, no
// blocked endpoint — and it works with JS off, which is why the action/method
// are real rather than a window.location.assign.
//
// Validation is progressively enhanced: the markup ships `required` +
// `type="email"` so a JS-less browser still blocks empty and malformed
// submits natively; once hydrated, an effect sets `novalidate` and the submit
// handler takes over with the locked error copy and wired alert semantics.
//
// This surface cannot confirm a signup — the copy promises a handoff, never
// success, and there is deliberately no disabled or spinner state.

import { useEffect, useId, useState } from "react";
import { RESUME_DATA } from "@/data/resume-data";

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

/* Italian, for the ~30–40% text-expansion budget. Measured on the rendered
   page rather than estimated. */
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

const meta = "font-mono text-xs uppercase tracking-[0.12em]";

export function SubscribeModule({ lang = "en" }: { lang?: "en" | "it" }) {
  const c = lang === "it" ? IT : EN;
  const id = useId();
  const inputId = `${id}-email`;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  /* Without JS the browser's own required/email validation guards the submit;
     with it, the handler below owns the locked error copy instead of the
     browser bubbles. Flipped post-hydration so the server markup stays the
     no-JS-safe variant. */
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  return (
    <section
      aria-labelledby={`${id}-heading`}
      className="border-ink/70 mt-20 border-t-2 pt-4"
    >
      <div className="max-w-[34rem]">
        <h2 id={`${id}-heading`} className="font-display text-2xl leading-snug">
          {c.heading}
        </h2>
        <p className="text-body mt-3 text-base leading-relaxed">
          {c.standfirst}
        </p>

        <form
          noValidate={hydrated}
          action={`${RESUME_DATA.newsletter.url}/subscribe`}
          method="get"
          target="_blank"
          rel="noopener noreferrer"
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
          <label htmlFor={inputId} className={`text-faint block ${meta}`}>
            {c.label}
          </label>
          {/* flex-wrap cannot fire against min-w-0 flex-1: at 375 the field
              shrank to 133px and truncated the placeholder mid-word. Stacked
              below sm, side by side above it. */}
          <div className="mt-2 flex flex-col items-stretch gap-3 sm:flex-row sm:items-start">
            <input
              id={inputId}
              name="email"
              type="email"
              required
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
              className={`placeholder:text-faint min-w-0 border-b-2 bg-transparent px-1 py-2 text-base focus-visible:outline-none sm:flex-1 ${
                error
                  ? "border-accent"
                  : "border-border focus-visible:border-accent"
              }`}
            />
            {/* Decision 3 (locked): the one filled control in the system —
                solid accent ground, 12px mono uppercase, ≥44px tall. The
                label inverts with the mode via the accent-foreground token;
                hover is the primary-control mix (darkens in light, lightens
                in dark, label unchanged) and the ring sits at 2px offset so
                it reads against the fill. */}
            <button
              type="submit"
              className={`${meta} primary-control bg-accent text-accent-foreground focus-visible:outline-accent min-h-11 shrink-0 self-start rounded-sm px-5 focus-visible:outline-2 focus-visible:outline-offset-2`}
            >
              {c.button}
            </button>
          </div>
          {error ? (
            <p
              id={errorId}
              role="alert"
              className="text-body mt-3 font-mono text-xs"
            >
              {error}
            </p>
          ) : null}
          {/* The handoff promise. Never "you're subscribed" — this surface
              genuinely does not know, and cannot. */}
          <p
            id={hintId}
            className="text-faint mt-3 text-[13px] leading-relaxed"
          >
            {c.handoff}
          </p>
        </form>
      </div>
    </section>
  );
}
