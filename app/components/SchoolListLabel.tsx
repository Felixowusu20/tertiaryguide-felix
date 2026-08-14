type SchoolListLabelProps = {
  name: string;
  alias?: string | null;
  className?: string;
};

export function SchoolListLabel({
  name,
  alias,
  className = "",
}: SchoolListLabelProps) {
  const shortLabel = alias?.trim() || name;

  return (
    <>
      <span
        title={name}
        className={`truncate md:hidden ${className}`.trim()}
      >
        {shortLabel}
      </span>
      <span className={`hidden md:inline ${className}`.trim()}>{name}</span>
    </>
  );
}
