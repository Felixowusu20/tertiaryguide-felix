"use client";

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoComplete?: string;
  /** When true, password starts visible (admin can still hide with the eye). */
  defaultVisible?: boolean;
};

export function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  className = "",
  autoComplete,
  defaultVisible = false,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(defaultVisible);

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={
          className ||
          "block w-full rounded-xl border border-[#E0E0E0] bg-white px-4 py-3 pr-10 text-sm outline-none transition focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]"
        }
      />
      <button
        type="button"
        onClick={() => setVisible((prev) => !prev)}
        className="absolute inset-y-0 right-3 flex items-center text-[#9E9E9E] transition hover:text-[#555555]"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
