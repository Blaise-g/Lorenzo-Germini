import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="animate-fade-in-up space-y-6 text-center">
        <h1 className="font-display text-accent text-7xl font-bold tracking-tighter md:text-9xl">
          404
        </h1>
        <div className="bg-accent/30 mx-auto h-px w-16" />
        <p className="text-body mx-auto max-w-md text-lg">
          This page doesn&apos;t exist. You were probably looking for my resume.
        </p>
        <Link
          href="/"
          className="primary-control bg-accent text-accent-foreground transition-refined inline-flex items-center gap-2 rounded-md px-6 py-3 font-mono text-xs font-medium uppercase shadow-sm hover:scale-105 hover:shadow-md"
        >
          Back to resume
        </Link>
      </div>
    </div>
  );
}
