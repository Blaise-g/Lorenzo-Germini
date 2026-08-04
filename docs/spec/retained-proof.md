# Retained-proof manifest

**Purpose:** the acceptance oracle for the redesign's one binding constraint — _the site must never look less technical than it does today_.

**The oracle is [`retained-proof.json`](./retained-proof.json), not this file.** This file explains it. If the two disagree, the JSON wins.

## Why this exists

Prose could not enforce this constraint. #9's decision 5 passed review while cutting the homepage from 18 proof statements to 4 and removing every technical noun in the data, because "no duplication" read as reasonable until someone counted. This is the count, in a form a test can run.

## The test

Concatenate the **visible text content** of the rendered `/` and `/cv` routes. For every entry in `terms`:

- an entry with `acceptedAnyOf` passes if **at least one** of its strings is present;
- an entry with `requiredAllOf` passes if **all** of its strings are present.

Matching is case-insensitive, on whitespace-normalized text. Every entry must pass. Each entry declares exactly one of the two keys, so there is nothing to infer.

Two entries use `requiredAllOf`, both for the same reason: **the figure carries the proof**. "Water rejection strategies" without `10,000 m³`, or "fill parameter tuning" without `20%`, is a claim rather than evidence — which is precisely the kind of softening this test exists to catch.

`additive: true` marks terms that are **not** in `resume-data.tsx` today. They enter with the redesign's systems line and are protected from that point on, so the test can be run against the current site by filtering them out.

The flag is **dormant as of 2026-08-04**: the last entries carrying it left with the systems line that was to introduce them, so no live entry uses it. The flag itself remains valid — an entry for a term the data has not shipped yet should still declare it.

## Scope

This is a **floor**, not a target. It asserts that nothing is lost. It says nothing about whether the homepage is technical _enough_ — that is a separate pair of tests in the spec:

- ≥3 technical terms above the fold (parity with the incumbent), and
- ≥1 named concrete system above the fold.

## Maintenance

Extend `retained-proof.json` whenever `resume-data.tsx` gains a technical noun. **A term added to the data but not to the fixture is unprotected.** Adding an entry is three lines; there is no excuse for skipping it.

When a term's wording changes in the data, prefer adding an alias to `acceptedAnyOf` over editing the existing string — the point is that _the proof_ survives, not that a particular phrasing does.

## Known exclusions

These are deliberately unprotected, because they are **prose framing rather than technical proof**:

- Product-and-process phrasing: "product strategy", "team coordination", "cross-functional teams", "end-to-end delivery", "business processes", "market research", "user outreach", "product-market fit".
- Employment and status labels: "Side Project", "MSc Thesis Project", "Founding", "Intern". `Side Project` in particular is a status label, and #12 already ruled _L'Oracolo_ off the homepage hero on the strength of it.
- Teaching content from the Self Employed role ("Math and Physics", "high-school"). It is biography, and #9 flagged that rendering `description[0]` for this role surfaces the teaching sentence where a technical one is wanted.

**The exclusion is by kind, not by bullet position.** An earlier draft of this file excluded "every third bullet", which was wrong: Complaion's third bullet carries `automation workflows` and GSK's carries `natural-language interfaces` and `generative AI use cases`. All three are protected above. Never exclude by position in the data — only by whether the phrase is proof.
