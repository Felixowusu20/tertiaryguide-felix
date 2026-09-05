"use client";

import React from "react";

export function Field({
  label,
  required,
  error,
  children,
  className = "",
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block space-y-1.5 text-sm ${className}`}>
      <span className="font-medium text-[#334155]">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      {children}
      {error ? <span className="block text-xs text-red-600">{error}</span> : null}
    </label>
  );
}

const controlClass =
  "w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm text-[#0F172A] outline-none transition focus:border-[var(--school-brand,#007AFF)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--school-brand,#007AFF)_10%,transparent)] disabled:bg-[#F8FAFC]";

export function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean },
) {
  const { error, className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={`${controlClass} ${error ? "border-red-400" : ""} ${className}`}
    />
  );
}

export function TextSelect(
  props: React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean },
) {
  const { error, className = "", children, ...rest } = props;
  return (
    <select
      {...rest}
      className={`${controlClass} ${error ? "border-red-400" : ""} ${className}`}
    >
      {children}
    </select>
  );
}

export function TextTextarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean },
) {
  const { error, className = "", ...rest } = props;
  return (
    <textarea
      {...rest}
      className={`${controlClass} min-h-[88px] resize-y ${error ? "border-red-400" : ""} ${className}`}
    />
  );
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Search…",
  error,
  allowOther,
}: {
  options: readonly string[] | string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: boolean;
  allowOther?: boolean;
}) {
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = !q
      ? [...options]
      : options.filter((o) => o.toLowerCase().includes(q));
    return list.slice(0, 40);
  }, [options, query]);

  return (
    <div className="relative">
      <TextInput
        error={error}
        value={open ? query : value}
        placeholder={placeholder}
        onFocus={() => {
          setOpen(true);
          setQuery(value);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (allowOther) onChange(e.target.value);
        }}
        onBlur={() => {
          setTimeout(() => setOpen(false), 150);
        }}
      />
      {open && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-[#E2E8F0] bg-white py-1 shadow-lg">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-xs text-[#94A3B8]">No matches</li>
          ) : (
            filtered.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-[#EFF6FF]"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(opt);
                    setQuery(opt);
                    setOpen(false);
                  }}
                >
                  {opt}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
