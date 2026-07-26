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
    <Card className="card-hover group border-l-border hover:border-l-primary flex flex-col overflow-hidden border-l p-3 hover:border-l-[3px]">
      <CardHeader>
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">
            {link ? (
              <a
                href={link}
                target="_blank"
                className="touch-target transition-refined group-hover:text-primary items-center gap-1.5 hover:underline"
              >
                {title}
                <span className="bg-primary/60 size-1.5 animate-pulse rounded-full" />
              </a>
            ) : (
              title
            )}
          </CardTitle>
          <div className="hidden font-mono text-xs underline print:visible">
            {link?.replace("https://", "").replace("www.", "").replace("/", "")}
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
              className="transition-refined hover:bg-primary hover:text-primary-foreground px-1 py-0 text-[10px] print:px-1 print:py-0.5 print:text-[8px] print:leading-tight"
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
