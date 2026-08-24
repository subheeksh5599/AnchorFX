import type { ReactNode } from "react";

/** Typed code block in the docs aesthetic. */
export function CodeBlock({
  title,
  children,
}: {
  title?: string;
  children: string;
}): ReactNode {
  return (
    <div className="my-5 border border-neutral-800">
      {title && (
        <div className="border-b border-neutral-800 px-4 py-2 text-[10px] font-bold tracking-[0.25em] text-neutral-500 uppercase">
          {title}
        </div>
      )}
      <pre className="overflow-x-auto bg-neutral-950 p-4 text-[12px] leading-relaxed text-neutral-300">
        <code>{children}</code>
      </pre>
    </div>
  );
}

/** Callout / note box. */
export function Callout({
  variant = "info",
  title,
  children,
}: {
  variant?: "info" | "warning" | "success";
  title?: string;
  children: ReactNode;
}): ReactNode {
  const border =
    variant === "warning"
      ? "border-amber-400/40"
      : variant === "success"
        ? "border-green-400/40"
        : "border-blue-400/40";
  const label =
    variant === "warning" ? "WARNING" : variant === "success" ? "NOTE" : "INFO";
  return (
    <div
      className={`my-5 border-l-2 ${border} border-neutral-800 bg-neutral-950/40 p-4`}
    >
      <div className="mb-1 text-[10px] font-bold tracking-[0.3em] text-neutral-500 uppercase">
        {label}
      </div>
      {title && (
        <div className="mb-1 text-sm font-semibold text-white">{title}</div>
      )}
      <div className="text-[13px] leading-relaxed text-neutral-400">
        {children}
      </div>
    </div>
  );
}

/** Section heading with index line. */
export function SectionHeading({
  index,
  children,
}: {
  index: string;
  children: ReactNode;
}): ReactNode {
  return (
    <h2
      id={
        typeof children === "string"
          ? children.toLowerCase().replace(/\s+/g, "-")
          : undefined
      }
      className="mt-14 mb-4 flex items-baseline gap-3 text-2xl font-bold tracking-[-0.02em]"
    >
      <span className="text-[11px] font-normal tracking-[0.2em] text-neutral-600">
        {index}
      </span>
      {children}
    </h2>
  );
}

/** Small bordered label tag. */
export function Tag({ children }: { children: ReactNode }): ReactNode {
  return (
    <span className="inline-block border border-neutral-700 px-2 py-0.5 text-[10px] tracking-[0.15em] text-neutral-300 uppercase">
      {children}
    </span>
  );
}

/** Definition row for contract functions / addresses. */
export function DefRow({
  term,
  children,
}: {
  term: string;
  children: ReactNode;
}): ReactNode {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-neutral-800 py-3 md:grid-cols-[220px_1fr]">
      <code className="text-[12px] text-neutral-200">{term}</code>
      <div className="text-[13px] leading-relaxed text-neutral-400">
        {children}
      </div>
    </div>
  );
}
