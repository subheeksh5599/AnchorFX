"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black font-mono text-white">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">Something went wrong</h1>
        <p className="mb-6 text-sm text-neutral-500">
          {error.message || "An unexpected error occurred"}
        </p>
        <button
          onClick={reset}
          className="bg-white px-6 py-3 text-xs font-bold tracking-[0.2em] text-black uppercase hover:bg-neutral-200"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
