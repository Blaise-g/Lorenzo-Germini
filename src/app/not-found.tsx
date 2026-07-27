import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="text-center space-y-6 animate-fade-in-up">
        <h1 className="font-display text-7xl font-bold tracking-tighter text-accent md:text-9xl">
          404
        </h1>
        <div className="mx-auto h-px w-16 bg-accent/30" />
        <p className="text-body mx-auto max-w-md text-lg">
          This page doesn&apos;t exist. You were probably looking for my resume.
        </p>
        <Link
          href="/"
          className="primary-control inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 font-mono text-xs font-medium text-accent-foreground uppercase shadow-sm transition-refined hover:scale-105 hover:shadow-md"
        >
          Back to resume
        </Link>
      </div>
    </div>
  );
}
