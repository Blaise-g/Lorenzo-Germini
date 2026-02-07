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
    <Card className="flex flex-col overflow-hidden p-3 card-hover group border-l border-l-border hover:border-l-[3px] hover:border-l-primary">
      <CardHeader>
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">
            {link ? (
              <a
                href={link}
                target="_blank"
                className="inline-flex items-center gap-1.5 hover:underline group-hover:text-primary transition-refined"
              >
                {title}
                <span className="size-1.5 rounded-full bg-primary/60 animate-pulse" />
              </a>
            ) : (
              title
            )}
          </CardTitle>
          <div className="hidden font-mono text-xs underline print:visible">
            {link
              ?.replace("https://", "")
              .replace("www.", "")
              .replace("/", "")}
          </div>
          <CardDescription className="text-xs print:text-[10px]">
            {description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="mt-auto flex">
        <div className="mt-2 flex flex-wrap gap-1">
          {tags.map((tag) => (
            <Badge
              className="px-1 py-0 text-[10px] print:px-1 print:py-0.5 print:text-[8px] print:leading-tight transition-refined hover:bg-primary hover:text-primary-foreground"
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
