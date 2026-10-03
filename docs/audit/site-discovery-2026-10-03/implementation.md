# Site discovery trial: implementation and verification

This is the current implementation record for the 2026-10-03 trial. The [context brief](context.md), [three-lens synthesis](synthesis.md), and raw captures describe the read-only public observations made before the local fix. They are historical evidence, not a claim that the fix was deployed.

## Scope and fixed points

The user requested a general reusable skill combining contextual SEO, AI discovery and is-agentic analysis; an agent must investigate the launching repository, separate outputs must be integrated critically, and the workflow must adapt to explicit project requests. A repeatable scan without stale report cache was requested where available. The user invoked `implement-light` for completion and added a Quadrell copy alignment requirement.

- Site review base: `f782a3c1cb643da4bfa17d562512e167da1662ed`.
- Canonical skill review base: `fc215521c634d8b9a532e158963636dfbb71ef99` in `/Volumes/Code/Personal/agent-skills`, initial working branch `feat/site-discovery`. The final local commit was observed on the then-current `main`; no remote operation occurred.

`site-discovery` is an Owned Skill in the canonical source, registered as model-invocable for the fleet's three runtime renderings. Its package contains the workflow and four disclosed references. Existing public skills supplied research inputs; their instruction bodies were not installed wholesale. The independent repository investigation and audit trial exposed gaps that were used to revise the skill's evidence coverage, repeatability and pre-publication source reconciliation.

## Applied correction

The homepage ProfilePage omits optional `dateCreated` and `dateModified`. The creation day had no documented source; modification represented a build rather than a human profile edit. Omission retains the required defining Person/name and avoids inventing timestamps. [Google's ProfilePage requirements](https://developers.google.com/search/docs/appearance/structured-data/profile-page) distinguish those optional DateTime fields from required properties.

The previous test required a day-only build date and agreement with sitemap freshness. Its replacement observes the served JSON-LD, verifies that the unsourced optional fields are absent, and retains the defining Person/name contract. Sitemap/CV freshness and the conflicting public `Vary` observations remain separate proposals in the synthesis; they were not expanded into this bounded fix.

## Quadrell copy

The requested service-focused copy was already present at the site base commit in `RESUME_DATA.projects`, both hand-maintained LLM manifests and the checked-in PDF. The description offers websites and workflow automations for small businesses and independent professionals, from brief to launch, with no client names or project-type case studies. Homepage, CV and Markdown siblings derive it from the data source. OpenGraph cards do not quote this project description.

No new copy or PDF generation was needed. The passing full suite includes manifest/project agreement and PDF text checks against the data module. Public captures still contain the earlier project examples: reconciling the intended release and publishing the corrected source remain release work, not a reason to rewrite an already aligned checkout.

## Evidence and checks

| Behavior                                                                                | Anchor and evidence                                                                                                                                                                                                                                               |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New canonical skill is discoverable to the renderer with its declared invocation intent | User's reusable/new-site requirement and normal automatic discovery; catalog membership test failed before registration with missing `site-discovery`, then passed. Existing rendering tests validated all three runtime candidates and package-local references. |
| Fleet inventory retains its aligned approved intent split after addition                | Canonical fleet contract; membership/overlay and external-provider preparation tests passed with 30 User-Only and 11 model-invocable global skills.                                                                                                               |
| Profile does not advertise unsourced creation/edit events                               | Google's optional-property semantics and captured invalid values; regression failed on the old `dateCreated: 2024-01-01`, then passed on served corrected JSON-LD. Structured graph checks preserve Person identity.                                              |
| Critical integration preserves applicability and uncertainty                            | Independent context and audit artifacts; every returned Ora check has a disposition, historical IsAgentic score remains separate, and contradictory header observations are retained as a diagnosis. Behavioral forward-testing, not a text-matching test.        |
| Quadrell uses the requested service framing across its actual consumers                 | Explicit late user requirement; existing source/manifests were inspected and full-suite project/PDF agreement checks passed. No executable or copy change needed.                                                                                                 |

Observed checks:

- Site regression red: `bun run test tests/content-correctness.spec.ts --grep 'profile metadata'` failed on the old creation property.
- Site focused green: `bun run test tests/content-correctness.spec.ts tests/structured-data-graph.spec.ts` — 46 passed.
- Site full suite: `bun run test` — 385 passed.
- Site typecheck: `bunx tsc --noEmit` — passed.
- Site lint: `bun run lint` — passed.
- Site changed Markdown/source formatting: checked with Prettier after its formatting pass.
- Canonical focused catalog/external suite — 17 passed; final catalog/reference/render pass after instruction iteration — 5 passed.
- Canonical full suite: `uv run python -m unittest discover -s tests -v` — 117 passed.
- Canonical Python compile check passed with bytecode output directed to a temporary directory.
- Official skill `quick_validate.py` — valid.

No website build was required for this JSON-LD-only code change; the meaningful route/graph tests and typecheck cover its local behavior without regenerating unrelated assets. CI was not remotely observed. Fixture-image 404 messages appeared during the passing site suite; there were no test failures.

## Single-reviewer disposition

One report-only reviewer carried Standards, Spec, Reuse, Quality and Efficiency since both fixed points. Selected paths: the skill package, overlay/catalog, fleet guard hunk and affected membership/preparation tests; the site structured-data component, regression test, research note and authored audit Markdown. Generated raw HTTP/report captures were excluded from review findings as captured artifacts; the ADR/fleet-document count changes were mechanical and checked for consistency. Unrelated scratch work and unchanged executable bodies were outside the requested change. All five lenses were applicable; none was omitted.

| ID  | Lens      | Finding                                                                                       | Disposition | Reason                                                                                                                                                                      | Verified by                                |
| --- | --------- | --------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| S-1 | Standards | Unescaped title pipes split the SEO-7 evidence table into extra columns.                      | Applied     | Escape the title separators so the four evidence dimensions remain intact.                                                                                                  | static; check: changed-file Prettier check |
| Q-1 | Quality   | Repeated full dispositions across 125 Ora rows could be defined once and referenced by label. | Deferred    | Keep explicit per-check reasoning for this first trial; compress the evidence presentation in a later iteration if it proves cumbersome. No workflow or correctness defect. | static                                     |

Reuse and Efficiency had no findings; Spec found the local requirements met, with publication/provider validation and session interview completeness outside the reviewed artifacts.

## Release and measurement limits

[Ora baseline](ora-baseline.json) records a forced public scan at `2026-10-03T11:58:49.219+00:00`, contract `1.25.0`, final score 54/C and complete analysis. The persisted final report supersedes the interim stream score; both are retained. It is a different rubric from IsAgentic's stored 88 from August. The official `ax audit --force --json` path supports later fresh scans; no complete local equivalent of the hosted scoring engine was verified.

The skill is retained in canonical commit `fc511be`; active runtime deployment has not occurred. The site correction is local; no production publication, Search Console validation or recrawl occurred. A public before/after scan needs the changed deployment and the same service/rubric/target. Account-based indexing, field performance, AI citations and conversion effects remain unverified. Keep the local regression loop for immediate verification and reserve hosted force requests for an actual changed public release.
