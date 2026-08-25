import { markdownResponse, renderCvMarkdown } from "@/lib/markdown-siblings";

export function GET() {
  return markdownResponse(renderCvMarkdown());
}
