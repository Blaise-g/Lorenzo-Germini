import {
  markdownResponse,
  renderWritingMarkdown,
} from "@/lib/markdown-siblings";

export function GET() {
  return markdownResponse(renderWritingMarkdown());
}
