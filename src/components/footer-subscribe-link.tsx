"use client";

import { usePathname } from "next/navigation";

/* Spec decision 6 (locked): never more than two Substack links per route. The
   footer subscribe link is suppressed on /writing — and on the dev-only
   fixture states below it, which are the same surface with a canned feed —
   where the full subscribe module already lives at the end of the index. */
export function FooterSubscribeLink({
  className,
  href,
}: {
  className: string;
  href: string;
}) {
  const pathname = usePathname();

  if (pathname === "/writing" || pathname.startsWith("/writing/")) return null;

  return (
    <li>
      <a
        className={className}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
      >
        Subscribe
      </a>
    </li>
  );
}
