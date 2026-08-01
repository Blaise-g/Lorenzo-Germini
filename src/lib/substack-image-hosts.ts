/* The only hosts a feed `<enclosure>` may point at. Shared by two consumers
   that must never disagree: `next.config.ts`, which allows them for
   `next/image`, and the feed parser, which drops a cover pointing anywhere
   else. A cover from an unlisted host is not a broken image — it throws when
   `next/image` renders it, taking the whole index with it. */
export const SUBSTACK_IMAGE_HOSTS = [
  "substackcdn.com",
  "substack-post-media.s3.amazonaws.com",
] as const;
