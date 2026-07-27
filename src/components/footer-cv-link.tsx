"use client";

import { usePathname } from "next/navigation";

export function FooterCvLink({ className }: { className: string }) {
  const pathname = usePathname();

  if (pathname !== "/") return null;

  return (
    <li>
      <a className={className} href="/cv">
        CV
      </a>
    </li>
  );
}
