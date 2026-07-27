import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** A URL as a reader should see it: no scheme, no trailing slash. */
export function displayUrl(url: string) {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}
