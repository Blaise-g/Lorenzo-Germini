import { markdownResponse, renderIndexMarkdown } from "@/lib/markdown-siblings";

export async function GET() {
  return markdownResponse(renderIndexMarkdown());
}
