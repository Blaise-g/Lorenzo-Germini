import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="text-center space-y-6 animate-fade-in-up">
        <h1 className="text-7xl font-bold tracking-tighter text-primary md:text-9xl">
          404
        </h1>
        <div className="h-px w-16 mx-auto bg-primary/30" />
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          This page doesn&apos;t exist. You were probably looking for my resume.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-refined hover:scale-105 hover:shadow-md"
        >
          Back to resume
        </Link>
      </div>
    </main>
  );
}
