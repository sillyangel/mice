import Link from 'next/link';
import { Music } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6">
      <div className="flex flex-col items-center text-center gap-6">
        <div className="relative">
          <span className="text-8xl font-bold tracking-tight bg-gradient-to-br from-primary to-violet-500 bg-clip-text text-transparent">
            404
          </span>
          <div className="absolute -top-3 -right-3 flex items-center justify-center h-9 w-9 rounded-full bg-background border">
            <Music className="h-4 w-4 text-primary animate-pulse" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            This track doesn&apos;t exist
          </h1>
          <p className="text-sm text-muted-foreground max-w-sm">
            The page you&apos;re looking for was moved, deleted, or never made it
            to the queue.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            Back to Home
          </Link>
          <Link
            href="/library"
            className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-5 py-2.5 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Browse Library
          </Link>
        </div>
      </div>
    </div>
  );
}