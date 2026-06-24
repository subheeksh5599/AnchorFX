"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center font-mono">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Something went wrong</h1>
        <p className="text-neutral-500 mb-6 text-sm">{error.message || "An unexpected error occurred"}</p>
        <button onClick={reset} className="bg-white text-black px-6 py-3 text-xs uppercase tracking-[0.2em] font-bold hover:bg-neutral-200">
          Try again
        </button>
      </div>
    </div>
  );
}
