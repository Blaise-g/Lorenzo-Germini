import {
  Card,
  CardHeader,
  CardContent,
  CardDescription,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";

interface Props {
  title: string;
  description: string;
  tags: readonly string[];
  link?: string;
}

export function ProjectCard({ title, description, tags, link }: Props) {
  return (
    <Card className="card-hover print-keep-together group border-l-border hover:border-l-accent flex flex-col overflow-hidden border-l p-3 print:p-1">
      <CardHeader>
        <div className="space-y-1">
          <CardTitle className="font-display text-base font-semibold">
            {link ? (
              /* No pulsing dot beside the title: it duplicated the "Live" badge
                 three lines below with no legend of its own, so the only thing
                 it added was perpetual motion. */
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="touch-target transition-refined group-hover:text-accent items-center gap-1.5 hover:underline"
              >
                {title}
              </a>
            ) : (
              title
            )}
          </CardTitle>
          {/* 14px, matching the Work proof line above it. At 12px this was the
              smallest, tightest type on the homepage — in the section holding
              the shipped artefacts. */}
          <CardDescription className="text-sm print:text-[12px]">
            {description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="mt-auto flex">
        <div className="mt-2 flex flex-wrap gap-1">
          {tags.map((tag) => (
            <Badge
              className="px-1 py-0 text-xs print:px-1 print:py-0.5 print:text-[12px] print:leading-tight"
              variant="secondary"
              key={tag}
            >
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
