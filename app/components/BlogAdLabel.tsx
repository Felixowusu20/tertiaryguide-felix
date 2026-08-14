/** Promotional / sponsored post indicator (editor-controlled). */
export function BlogAdLabel({
  className = "",
  title = "Promotional or sponsored content",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded border border-amber-200/90 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wide text-amber-900 sm:text-[11px] ${className}`}
      title={title}
    >
      Ad
    </span>
  );
}
