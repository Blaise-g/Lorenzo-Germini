# SEO, GEO and agent-readiness: evidence and skill review

Researched 2026-10-03. This is a research input to the interview and subsequent implementation, not an authorization to change positioning, publish, or install a skill. Sources were checked live; third-party skill instructions were inspected as material, not executed.

## The two Search Console warnings

The supplied screenshot reports valid `ProfilePage` items with non-critical warnings for `dateCreated` and `dateModified`. These properties belong to page structured data, not the submitted XML sitemap.

Google specifies both as recommended `DateTime` properties in ISO 8601. Its example uses a complete time and explicit UTC offset. `dateCreated` concerns creation of the profile; `dateModified` should represent human-edited profile metadata, rather than arbitrary site activity. A profile principally about a person affiliated with the site is an eligible use case. Validate with Rich Results Test, inspect the live URL after deployment, then request validation in Search Console; recrawling is separate from a correct implementation. [Google ProfilePage documentation](https://developers.google.com/search/docs/appearance/structured-data/profile-page)

Current audit evidence supplied by the main agent: production `/` returns `dateCreated: "2024-01-01"` and `dateModified: "2026-09-30"`. The creation date is hardcoded and its provenance is unverified. The current implementation truncates `BUILD_DATE_ISO` to ten characters; existing tests require the date-only representation. This makes a full timestamp a targeted hypothesis for the warnings, while the semantic provenance of each date needs its own decision. A passing existing test does not establish compliance with Google's current validator.

The production sitemap already returns complete `lastmod` timestamps for all three content URLs. Google also explicitly accepts date-only sitemap examples. Its `lastmod` should describe significant changes to each page, and Google uses it when consistently accurate; `priority` and `changefreq` are ignored. Sitemap submission is a discovery hint, not guaranteed indexing. Changing sitemap dates alone will not repair `ProfilePage` properties. [Google sitemap documentation](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)

## Best practices that matter here

Google's current guide prioritizes original, useful first-hand content, crawlable pages, indexing eligibility and good page experience. It states Google Search ignores `llms.txt` and does not require Markdown, special schema, tiny answer chunks or writing specifically for AI. It now documents both a Search Console inclusion control for generative AI features and a Generative AI performance report. Thus older advice saying there is no separate reporting must be rechecked. [Google's AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)

Direct Help Center pages confirm rollout of both features worldwide as of August 31, 2026. The control defaults to inclusion (or inheritance from a parent property); the new performance report measures impressions and may be absent for insufficient impressions. This is current primary evidence, not a search-result snippet or assumption about this property's account. [Search generative AI control](https://support.google.com/webmasters/answer/16908024), [Generative AI performance report](https://support.google.com/webmasters/answer/16984139)

For this personal site, the practical baseline is descriptive page metadata, reliable public HTML, working internal links, consistent identity surfaces and evidence for professional claims. Content changes should follow the intended site map and the user's positioning decisions. Google's starter guide also stresses accessible resources and URL Inspection to compare crawler visibility with the visitor's page; observed SEO impact can take weeks or longer. [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)

Search discovery and model training require separate crawler decisions. OpenAI identifies `OAI-SearchBot` for ChatGPT search, `GPTBot` for potential model training, and `ChatGPT-User` for user-triggered retrieval. Search visibility does not require allowing training. Check WAF/CDN access as well as robots rules. The current audit reports an allow-all policy; this is an owner preference to make deliberate, not a defect to change automatically. [OpenAI crawler documentation](https://developers.openai.com/api/docs/bots)

Bing now offers first-party AI Performance reporting for citations across Copilot, Bing and selected partners. Later preview capabilities add intents, topics, citation share and time comparisons. Citation share is observational, not a quality score or traffic share. This provides a better measurement candidate than treating an agent-readiness scanner score as proof of search visibility. Availability and site data still need checking in the owner's account. [Bing's original AI Performance announcement](https://blogs.bing.com/webmaster/2026/2/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview/), [June reporting expansion](https://blogs.bing.com/search/2026/6/New-AI-Visibility-Insights-in-Bing-Webmaster-Tools-Intents-Topics-Citation-Share-Compare/)

Canonical signals should agree across redirects, HTML metadata, HTTP headers and sitemap inclusion. HTTP `Link` canonical headers can express a preferred URL for non-HTML documents supported by Search. Whether they are appropriate for a specific Markdown representation must be tested, not inferred from PDF examples. [Google canonical documentation](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)

The repository already has generated Markdown siblings and content negotiation; [ADR-0005](../adr/0005-markdown-siblings-with-an-accept-shim.md) records the scanner-specific reason and verified cache behavior. Maintain those as agent access features. Their existence does not demonstrate Google ranking benefit, and adding more representations should have a verified consumer and a maintenance reason.

## Existing skills in the Vercel ecosystem

`npx skills` is the open CLI maintained in `vercel-labs/skills`; `skills.sh` is its directory. A listing there does not mean Vercel authored or endorses the listed SEO methodology. The CLI supports discovery/listing and scoped skill installation. No installer was run during this research. [Vercel skills repository](https://github.com/vercel-labs/skills)

These are adaptation candidates, ranked by usefulness for this task. Counts describe the fetched versions, not stable contracts.

| Candidate                                         | Useful behavior                                                                                                                                                                                    | Changes needed before reuse                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. `seo-audit`, coreyhaines31/marketingskills** | Evidence, impact, fix and priority per finding; crawl/indexing before content polish; separate technical audit from AI work. Listed on skills.sh.                                                  | 455-line body: disclose branches irrelevant to a personal site. Its blanket curl/schema limitation needs precision: curl sees server-rendered JSON-LD, but does not execute JS. Establish explicit per-route completion criteria.                                                                                                 |
| **1b. `schema`, same repository**                 | Focused structured-data implementation; accuracy first, consult Google requirements, JSON-LD, validation checklist with all required properties and visible-content match.                         | Actual current name is `schema`, not `schema-markup` (that path returned 404). Its 165-line generic catalog omits ProfilePage; narrow to Google's feature-specific documentation. The all-warnings-cleared checklist is observable but should distinguish optional warnings from blockers. Refresh obsolete rich-result examples. |
| **2. `geo-optimize-site`, kyliamet**              | Compact 39-line workflow; read repository instructions, verify claims, preserve design, distinguish crawler purposes, validate observable behavior; propagation reference is disclosed separately. | Separate the audit from optional implementation. Sharpen exhaustive completion bounds; honor existing session authorization instead of introducing repeated approval for staging or read-only propagation checks. Verify listing/distribution separately if directory installation is desired.                                    |
| **3. `ai-seo`, coreyhaines31/marketingskills**    | Repeated query observations, crawler purpose distinctions, context-first audit; several branch-specific references. Listed on skills.sh.                                                           | 415-line body and long synonym-heavy trigger. Its claim that Google has no AI-specific reporting is stale against current Google docs. Assertions that other engines parse llms.txt need provider evidence; percentage lifts and 40–60-word prescriptions must remain experiment-specific hypotheses.                             |
| **4. `seo-geo-audit`, dageno-agents**             | Scope-first audit and unavailable-data labeling; search API optional.                                                                                                                              | 207-line body repeats access and scope material; broad brand/platform coverage needs disclosure. Severity and readiness labels need reproducible evidence rather than consultant-style scoring.                                                                                                                                   |

Original files: [seo-audit](https://github.com/coreyhaines31/marketingskills/blob/main/skills/seo-audit/SKILL.md), [schema](https://github.com/coreyhaines31/marketingskills/blob/main/skills/schema/SKILL.md), [geo-optimize-site](https://github.com/kyliamet/geo-optimize-site/blob/main/SKILL.md), [ai-seo](https://github.com/coreyhaines31/marketingskills/blob/main/skills/ai-seo/SKILL.md), [seo-geo-audit](https://github.com/dageno-agents/seo-geo-audit/blob/main/SKILL.md). Directory entries: [seo-audit](https://skills.sh/coreyhaines31/marketingskills/seo-audit), [ai-seo](https://skills.sh/coreyhaines31/marketingskills/ai-seo). All three repositories carry MIT licenses; preserve notices when copying or adapting substantial material: [marketingskills license](https://github.com/coreyhaines31/marketingskills/blob/main/LICENSE), [geo-optimize-site license](https://github.com/kyliamet/geo-optimize-site/blob/main/LICENSE), [seo-geo-audit license](https://github.com/dageno-agents/seo-geo-audit/blob/main/LICENSE).

For the first trial, `seo-audit` plus the `schema` branch is the more direct fit: diagnose scope, record findings, then validate a chosen structured-data correction. The compact GEO skill is a useful subsequent workflow seed but its headings describe phases rather than defining exhaustive audit completion. Neither candidate should treat its generic schema catalog as more authoritative than the current feature documentation.

## Proposed bounded trial

After the interview resolves audience and intended outcome, trial an audit on `/`, `/cv`, `/writing` and their public machine-readable surfaces. Every finding should record URL, observed value, owning source or provider requirement, confidence, practical consequence and proposed correction; unavailable account data stays unverified. Keep a small set of agreed branded and professional-intent queries for later measurement.

Completion means every scoped surface is accounted for, both warning properties have traced provenance and validator evidence, each accepted change passes the repository's relevant checks, and deployed readback is reported separately from external recrawling or citation effects. Local correctness can be proven immediately; a ranking or citation improvement needs subsequent comparable observations.

Using the supplied writing-for-agents criteria, the best reusable shape is a short audit entrypoint, evidence-first completion criteria and disclosed references for structured dates, provider crawler policy and measurement. A skill installation should follow source review and the user's chosen trial; a directory listing alone is insufficient validation.

## Reusable composition: Is Agentic and existing skills

The user subsequently clarified the deliverable: a general reusable skill that composes SEO, GEO and agent-readiness work, delegates reconstruction of each repository's project context, and optimizes within the explicit request. The site's two warnings are its first trial, not its permanent scope.

### Exact scanner interface, verified without execution

Official documentation distinguishes the report CLI, report API, MCP and agent skill. The skill installation command advertised by the site is `npx skills add vercel-labs/is-agentic`; its GitHub repository returned 404 when checked. Do not turn that into a request for private credentials. The first-party discovery index publishes a reachable skill URL and digest. [Official developer docs](https://is-agentic.com/docs), [advertised GitHub repository](https://github.com/vercel-labs/is-agentic)

First-party skill source: [is-agentic SKILL.md](https://is-agentic.com/.well-known/agent-skills/is-agentic/SKILL.md). The downloaded file's SHA-256 matched the [discovery index](https://is-agentic.com/.well-known/agent-skills/index.json): `41cacbc952a0d9b8336773d531abd573e0916092deb1fb6c1e468b03451b997d`. It instructs readers to inspect `score`, `score_label`, Essential/Recommended earned and available counts, optional bonus points, `issues[]`, `report_url`, and `scanned_at`. Issues contain `id`, `name`, `tier`, `result`, `details`, and `recommendation`. A null score can reflect an unscorable authenticated target rather than failure. Its workflow prioritizes Essential failures, Essential partials, then Recommended; the wrapper should verify applicability and evidence before accepting scanner recommendations. Missing bonus signals are optional, not defects. Exact target paths and queries produce separate reports.

The public npm metadata identifies **is-agentic 1.0.1**, Node **>=18**, ISC license, and no declared runtime dependencies. The published package was downloaded to `/private/tmp` and read, without installation or execution. Its CLI source and README confirm these commands:

```sh
npx is-agentic <domain-or-url> --json
npx is-agentic@1.0.1 <domain-or-url> --json
npx is-agentic --help
```

The only documented/parser-supported options are `--json`/`-j`, `--help`/`-h`, and `--` to terminate options. There is **no `scan` subcommand and no `--force` or `--rescan` flag**. `--json` emits unchanged report JSON; errors also appear as JSON with nonzero exit status. A successful low score exits zero, so exit code alone is not an audit pass. [npm package metadata](https://registry.npmjs.org/is-agentic/latest), [published source tarball](https://registry.npmjs.org/is-agentic/-/is-agentic-1.0.1.tgz)

Source-inspected behavior: first GET `/api/v1/report?url=<encoded-target>`; only `report_not_found` starts GET `/api/scan/stream?target=<encoded-target>` with `Accept: text/event-stream`, then polls the report endpoint. Stream parsing recognizes `scan_init`/`checkRoster`, `check_start`/`checkName`, `check_complete`, `scan_complete`, `scan_archived`, and `error`. The stream endpoint is implementation detail, not a replacement for the supported CLI or versioned report contract. Public source repository access could not be verified, so this is npm-source evidence, not an inspected Git checkout.

For stored-report reads without starting a scan:

```sh
curl 'https://is-agentic.com/api/v1/report?url=https%3A%2F%2Fexample.com'
```

The API's 404 means no completed report. Rate limits are 120/IP/minute; honor `Retry-After` for 429, and retry a 503 without launching another scan. Public/free access needs no API key. MCP endpoint: `https://is-agentic.com/mcp`, tools `is_agentic_get_report`, `is_agentic_get_methodology`, `is_agentic_get_developer_docs`. [Supported API/MCP contracts](https://is-agentic.com/docs), [OpenAPI](https://is-agentic.com/openapi.json)

Stored output is **not proof of a fresh post-change scan**. The CLI never forces rescan if a report exists. The skill says immediate reruns return the old snapshot and directs humans to the report's Rescan control; check `scanned_at`. Methodology additionally documents Ora's six-hour freshness cache. Essential checks share 80 points, Recommended 20, and optional emerging signals add at most five; inapplicable checks are excluded. Automated observations can be wrong; scores are neither certification nor SEO rankings. A change can reflect target behavior, methodology drift or a transient result. Keep timestamps, methodology, target and issue IDs alongside scores. [Official methodology](https://is-agentic.com/methodology)

### Composition interface proposal

Use **installed upstream skills as dependencies**, reached by branch-specific pointers, with **small package-local adapter references** for evidence normalization, scanner usage and current provider corrections. This preserves the existing skills' own references rather than copying hundreds of lines into a new skill. Installation is a setup operation; missing dependencies are reported concretely before their branch is run. A URL citation alone does not make a skill locally invocable, and a remote SKILL.md without its relative references is an incomplete installation.

Official marketing repository installation syntax supports selecting skills:

```sh
npx skills add coreyhaines31/marketingskills --skill seo-audit ai-seo schema
```

This is a proposed setup command, not executed. `schema-markup` was renamed to `schema` in v2. All three first consult `.agents/product-marketing.md`, with older-path fallbacks, and reference sibling skills; their Markdown frontmatter declares versions rather than mandatory executable tool packages. Browser validation, webmaster accounts and paid tools remain actual capability checks. [Marketing skills README and rename map](https://github.com/coreyhaines31/marketingskills/blob/main/README.md)

Recommended dispatch:

| Request branch                            | Existing skill                                 | Adapter's bounded result                                                                                                                                        |
| ----------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Technical/on-page SEO                     | `seo-audit`                                    | Each scoped indexable route accounted for; evidence/impact/fix/priority normalized; missing account data explicit.                                              |
| Structured-data warning or implementation | `schema`                                       | Exact feature documentation, parsed markup, date/claim provenance, validator result; required and optional fields distinguished.                                |
| AI search/citation request                | `ai-seo`                                       | Platform-specific policy verified; claimed benefit separated from hypothesis; observable retrieval/citation samples record platform, timestamp and sample size. |
| Agent access/readiness                    | First-party `is-agentic` guidance plus CLI/API | Exact public target report, timestamp, eligible checks and evidence; fresh local/public probes for selected findings; stale scanner output labeled.             |

`ai-seo` already discloses [references/agent-readiness.md](https://github.com/coreyhaines31/marketingskills/blob/main/skills/ai-seo/references/agent-readiness.md), which references the correct `npx is-agentic yourdomain.com` interface and separates access/discovery/parseability. Treat this as an existing connection to compose, not a reason to create a duplicate checklist. Its statements about most agents never executing JS, training crawler blocks and vendor score thresholds need consumer/provider verification before they become requirements.

A delegated context reader should return a compact brief: repository instructions and source pointers; project purpose/audience and confirmed unknowns; intended route map; framework/rendering/deployment; copy/data owners and derived artifacts; relevant ADR constraints; public host and environment differences; existing checks and user-authorized changes. Completion requires every requested dimension sourced or explicitly unknown. The main agent should reconcile contradictions and ask only questions that affect an unresolved choice.

Pass that brief and the request's boundaries into each selected skill. Normalize findings into **observed fact / provider requirement / experiment**, carrying URL/file, timestamp, evidence, applicability, confidence, proposed change and validation. Apply supported fixes within the authorized request; preserve product decisions, then report local verification, deployed readback and downstream refresh as separately observable outcomes. This composition is reusable across site types without installing commerce, pricing, FAQ or MCP requirements onto a personal site merely to raise a score.

## Fresh before/after checks: local replica and official uncached alternative

The user's next request prioritizes an existing local implementation that can check changes immediately. Focused research found **no verified public implementation of the complete Is Agentic/Ora scanner**. The inspected `is-agentic` npm package is a hosted-service client, not the check engine. Is Agentic's own methodology says Ora executes and scores the checks and Is Agentic reorganizes them into its own buckets. Public transport contracts and methodology do not establish local scoring parity.

### Better official hosted path: Ora `ax --force`

Ora publishes its own open-source CLI [ora/ax](https://github.com/ora/ax). Its `audit` command supports bypassing the six-hour cache with `--force`. The documented anonymous force allowance is six/day/IP (30 ordinary scans/day and ten/minute burst). This can provide fresh deployed before/after evidence. It is still hosted: the CLI explicitly computes no score locally. Full localhost audit requires a public tunnel, so it does not solve private local validation. `webmcp-audit` captures locally but uploads evidence for a different WebMCP rubric. No tunnel, installation or scanner invocation was performed in this research.

The current [npm registry metadata](https://registry.npmjs.org/ax/latest) reports **ax 0.8.1**, MIT, Node **>=22.4.0**, git commit `edfa6d5b7af318523cc981fba3dae6c6011ed68f`. A web-indexed `main/package.json` showed an older 0.7.5, illustrating why installation versions should be verified and pinned. Proposed command:

```sh
npx ax@0.8.1 audit https://example.com --force --json
```

Published-commit source was read directly: [API client](https://github.com/ora/ax/blob/edfa6d5b7af318523cc981fba3dae6c6011ed68f/src/api/audit.ts), [audit command](https://github.com/ora/ax/blob/edfa6d5b7af318523cc981fba3dae6c6011ed68f/src/commands/audit.ts). Exact force request:

```sh
curl --get --no-buffer \
  --header 'Accept: text/event-stream' \
  --data-urlencode 'domain=https://example.com' \
  --data-urlencode 'format=audit' \
  --data-urlencode 'force=1' \
  'https://ora.ai/api/scan/stream'
```

The stream's `scan_complete.result` contains the audit payload. `summary_ready.agenticSummary` carries the separate narrative verdict. If `analysisStatus` is partial or `pendingChecks` remains, the client polls `/api/score/<encoded-result.domain>?format=audit`, every two seconds up to 45 times. Keep partial evidence labeled. Direct HTTP avoids package execution and CLI environment defaults (`ORA_API_URL`, `ORA_SCAN_API_KEY`, tunnel settings); it also requires handling the SSE contract rather than treating the stream as ordinary JSON.

An Ora result is not automatically an Is Agentic result. Preserve provider, tool, contract version, target, timestamp, checks and rubric for each artifact. Compare Ora-before with Ora-after, and Is Agentic-before with Is Agentic-after; a shared backend does not guarantee equal displayed scores.

### Existing local alternative: `matteobaccan/AgentReady`

[AgentReady](https://github.com/matteobaccan/AgentReady) contains a runnable Python stdlib scanner with 30 checks and JSON/Markdown reports. It targets Cloudflare's **isitagentready.com** 22-check/0–5 model plus eight extras, not Is Agentic's score. Its methodology documents inferred ladder rules and deliberate divergences, including static WebMCP inspection instead of a real-browser check. [Methodology](https://github.com/matteobaccan/AgentReady/blob/main/docs/METHODOLOGY.md)

[Scanner source](https://github.com/matteobaccan/AgentReady/blob/main/skills/agent-ready/scripts/agent_ready_scan.py) accepts explicit HTTP localhost URLs. Each process fetches the target afresh; only per-run fetch sharing is cached. It checks negotiation, robots, sitemap, llms.txt, raw JSON-LD, semantics and status behavior. However, `--only` filters displayed results after all probes; it does not limit network work. DNS probes use Cloudflare DoH; MCP detection can POST initialize. Several validators are heuristics: sitemap detection is substring-based, initial HTML uses word thresholds, and JS behavior needs browser confirmation. [MIT license](https://github.com/matteobaccan/AgentReady/blob/main/LICENSE)

After source review and acquisition, its documented local form would be:

```sh
python3 skills/agent-ready/scripts/agent_ready_scan.py \
  http://localhost:3200 --json before.json --markdown before.md
```

This is an existing candidate, not an installed or tested dependency. Its ladder requires discovery/auth surfaces for higher levels even when those are irrelevant to a content site, so use scoped check evidence rather than treating level five as this project's goal.

### Practical recommendation

Use existing repository tests and direct HTTP/browser probes for the immediate local loop: raw JSON-LD with feature-specific dates; sitemap XML and canonical targets; robots policy; substantive Markdown siblings and all declared links; Accept preference and `Vary`; alternating HTML/Markdown responses; missing-path statuses; browser-visible content and key actions. Each run should identify the target and code revision. Origin/framework caches can still serve stale content even when no scanner cache exists, so confirm the response comes from the changed server/build.

Add AgentReady only if its wider local checks justify maintaining a reviewed dependency and interpreting its different rubric. For current delivery, the cheaper official improvement is fresh **Ora `--force` on the public deployment**, retaining Is Agentic's cached report as separate context. A full replica should remain out of scope until a verified engine source or explicit implementation requirement exists. Local observations may map to named Is Agentic findings; they must not be presented as an official reconstructed score.
