"use client";

/* The cover's error path, and the only reason any of `/writing`'s cover code is
   a client component. `Cover` fell back when the feed carried no `<enclosure>`
   at all, but never when the URL it carried failed to load — so a 404 from the
   CDN rendered the bordered box with nothing in it. At the launch state that is
   a 386px empty rectangle pushing the title to y≈780, below the fold at
   1024×900: the one essay on the site, invisible.
   `fallback` is the same coverless panel the no-URL case returns, passed in from
   the server component so the two paths cannot drift apart. */

import Image from "next/image";
import * as React from "react";
import type { ReactNode } from "react";

export function CoverImage({
  alt = "",
  boxClassName,
  fallback,
  fetchPriority,
  imageClassName,
  loading,
  sizes,
  src,
}: {
  alt?: string;
  boxClassName: string;
  fallback: ReactNode;
  fetchPriority?: "high" | "low" | "auto";
  imageClassName: string;
  loading: "eager" | "lazy";
  sizes: string;
  src: string;
}) {
  /* The failing URL, not a boolean: the lead cover is rendered without a key, so
     a boolean would survive a feed revalidation that swaps the lead essay and
     show the coverless panel over a cover that loads perfectly well. Comparing
     against the current `src` resets itself and needs no effect. */
  const [failedSrc, setFailedSrc] = React.useState<string | null>(null);

  /* Replaces the box rather than filling it: rendering the panel inside the
     wrapper would double the hairline border the panel already carries. */
  if (failedSrc === src) return fallback;

  return (
    <div className={boxClassName}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        loading={loading}
        fetchPriority={fetchPriority}
        onError={() => setFailedSrc(src)}
        className={imageClassName}
      />
    </div>
  );
}
