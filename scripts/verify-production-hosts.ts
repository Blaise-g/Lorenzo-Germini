/**
 * Check the production hosts actually redirect the way #68 decided.
 *
 * `tests/canonical-host.spec.ts` already proves the `next.config.ts` rules fire
 * correctly, by sending a spoofed `Host` header at a local server. What it
 * cannot reach is the layer in front of them: Vercel's own domain configuration,
 * which lives in a dashboard rather than this repo and so can drift without any
 * diff to notice it. That is what this checks, against the live internet.
 *
 * It is deliberately not wired into CI. Run on a PR it would test the deployed
 * site rather than the change, and on a schedule it would page for transient DNS
 * blips. Run it by hand after a deploy, after touching the Vercel domain
 * settings, and after the publication moves to a Substack custom domain — the
 * flip #68 left open, which is the moment this file's expectations change.
 *
 *   bun run verify:hosts
 *
 * Every check runs before it reports, so one wrong host does not hide the rest.
 * Exit 1 means a redirect is wrong; exit 2 means some host never answered and
 * its check could not be judged either way.
 */
import {
  CANONICAL_ORIGIN,
  PUBLICATION_HOSTS,
  RETIRED_DEPLOYMENT_HOST,
} from "@/lib/site-hosts";

const canonicalHost = new URL(CANONICAL_ORIGIN).host;

/** One hop of a redirect chain, as the status line and `location` report it. */
type Hop = { url: string; status: number; location: string | null };

type Check = {
  /** What the reader should understand this row is protecting. */
  what: string;
  from: string;
  /** Where the chain must end, after following every hop. */
  endsAt: string;
  /**
   * Whether the hop that reaches `endsAt` may be cached permanently.
   *
   * #68's load-bearing distinction: the publication hosts are temporary on
   * purpose, because a 308 cached in the wild would outlive the decision to
   * move the publication to a Substack custom domain. The retired deployment
   * host is the opposite — it is never coming back, so 308 is correct there.
   */
  permanent: boolean | null;
};

const paths = ["/", "/cv", "/writing"];

const checks: Check[] = [
  {
    what: "the canonical host serves the site",
    from: `https://${canonicalHost}/`,
    endsAt: `${CANONICAL_ORIGIN}/`,
    permanent: null,
  },
  {
    what: "the canonical www host folds into the apex",
    from: `https://www.${canonicalHost}/`,
    endsAt: `${CANONICAL_ORIGIN}/`,
    permanent: null,
  },
  /* Every path, not just `/`: the publication hosts are a doorway to the
     writing, not a mirror of the site. */
  ...PUBLICATION_HOSTS.flatMap((host) =>
    paths.map((path) => ({
      what: `${host} sends ${path} to the essay index`,
      from: `https://${host}${path}`,
      endsAt: `${CANONICAL_ORIGIN}/writing`,
      permanent: false,
    })),
  ),
  ...paths.map((path) => ({
    what: `${RETIRED_DEPLOYMENT_HOST} keeps ${path} on the way over`,
    from: `https://${RETIRED_DEPLOYMENT_HOST}${path}`,
    endsAt: new URL(path, CANONICAL_ORIGIN).href,
    permanent: true,
  })),
];

const maxHops = 5;
const attempts = 3;

/**
 * A host that would not answer at all, as opposed to one that answered wrongly.
 *
 * Worth its own type because the two demand opposite reactions: a wrong answer
 * is a deploy or a dashboard to fix, while no answer is usually this machine.
 * macOS' stub resolver intermittently fails to resolve these hosts even while
 * `dig` — which talks to the nameserver directly and bypasses it — answers
 * fine, so treating a connect failure as a redirect failure would cry wolf.
 */
class Unreachable extends Error {}

async function head(url: string) {
  let last: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fetch(url, { method: "HEAD", redirect: "manual" });
    } catch (error) {
      last = error;
      /* Linear backoff: enough for a stub-resolver hiccup, short enough that a
         genuinely dead host still fails the run promptly. */
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }

  throw new Unreachable(
    `${url} did not answer after ${attempts} attempts: ${last instanceof Error ? last.message : last}`,
  );
}

async function follow(from: string): Promise<Hop[]> {
  const hops: Hop[] = [];
  let url = from;

  for (let hop = 0; hop < maxHops; hop += 1) {
    const response = await head(url);
    const location = response.headers.get("location");
    hops.push({ url, status: response.status, location });

    if (!location) return hops;
    url = new URL(location, url).href;
  }

  throw new Error(`${from} still redirecting after ${maxHops} hops`);
}

function describe(hops: Hop[]) {
  return hops
    .map(({ url, status, location }) =>
      location ? `${status} ${url} -> ${location}` : `${status} ${url}`,
    )
    .join("\n      ");
}

let failures = 0;
const unreachable: string[] = [];

for (const check of checks) {
  let hops: Hop[];
  try {
    hops = await follow(check.from);
  } catch (error) {
    if (error instanceof Unreachable) {
      unreachable.push(check.from);
      console.error(`??    ${check.what}\n      ${error.message}`);
      continue;
    }
    failures += 1;
    console.error(`FAIL  ${check.what}\n      ${check.from}\n      ${error}`);
    continue;
  }

  const problems: string[] = [];

  const settled = hops.at(-1)!;
  if (new URL(settled.url).href !== new URL(check.endsAt).href) {
    problems.push(`ends at ${settled.url}, expected ${check.endsAt}`);
  }
  if (settled.status !== 200) {
    problems.push(`settles on ${settled.status}, expected 200`);
  }

  /* The polarity is checked on the hop that reaches the destination, not on the
     first one: a `www.` host may legitimately be folded into its apex by a
     permanent redirect before our own rule ever runs. */
  if (check.permanent !== null) {
    const arriving = hops.find(
      ({ location }) =>
        location && new URL(location, CANONICAL_ORIGIN).href === check.endsAt,
    );

    if (!arriving) {
      problems.push(`no hop redirects to ${check.endsAt}`);
    } else if (check.permanent && arriving.status !== 308) {
      problems.push(
        `arrives with ${arriving.status}, expected a permanent 308`,
      );
    } else if (!check.permanent && arriving.status !== 307) {
      problems.push(
        `arrives with ${arriving.status}, expected a temporary 307 — a cached permanent redirect would outlive the decision to move the publication (#68)`,
      );
    }
  }

  if (problems.length === 0) {
    console.log(`ok    ${check.what}`);
    continue;
  }

  failures += 1;
  console.error(
    `FAIL  ${check.what}\n      ${problems.join("\n      ")}\n      ${describe(hops)}`,
  );
}

if (failures > 0) {
  console.error(`\n${failures} of ${checks.length} checks failed.`);
  process.exit(1);
}

/* Distinct exit code, because the two outcomes mean different things: 1 says a
   redirect is wrong, 2 says some of them could not be judged at all. Silently
   passing an unjudged run would make this file worse than useless. */
if (unreachable.length > 0) {
  console.error(
    `\n${unreachable.length} of ${checks.length} checks could not be judged — nothing answered.\n` +
      `Confirm it is not this machine before believing the host is down:\n` +
      unreachable
        .map((url) => `  dig +short ${new URL(url).host} @8.8.8.8`)
        .join("\n"),
  );
  process.exit(2);
}

console.log(`\nAll ${checks.length} checks passed.`);
