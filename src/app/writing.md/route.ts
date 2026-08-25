import {
  markdownResponse,
  renderWritingMarkdown,
} from "@/lib/markdown-siblings";

export async function GET() {
  return markdownResponse(renderWritingMarkdown());
}
