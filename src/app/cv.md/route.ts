import { markdownResponse, renderCvMarkdown } from "@/lib/markdown-siblings";

export async function GET() {
  return markdownResponse(renderCvMarkdown());
}
