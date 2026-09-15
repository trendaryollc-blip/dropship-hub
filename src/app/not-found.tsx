import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="flex flex-col items-center justify-center max-w-md text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 border border-accent/20 mb-5">
          <span className="text-2xl font-bold text-accent">404</span>
        </div>
        <h2 className="font-display text-xl font-bold text-foreground mb-2">
          Page Not Found
        </h2>
        <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent text-sm font-semibold hover:bg-accent/20 transition-all"
        >
          Go to Homepage
        </Link>
      </div>
    </div>
  );
}
