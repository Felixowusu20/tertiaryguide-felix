export const PROGRAMME_LEVELS = ["undergraduate", "postgraduate"] as const;

export type ProgrammeLevel = (typeof PROGRAMME_LEVELS)[number];

export const PROGRAMME_LEVEL_LABELS: Record<ProgrammeLevel, string> = {
  undergraduate: "Undergraduate",
  postgraduate: "Postgraduate",
};

export function parseProgrammeLevel(value: unknown): ProgrammeLevel | null {
  if (value === "undergraduate" || value === "postgraduate") return value;
  return null;
}

export function normalizeProgrammeLevel(value: unknown): ProgrammeLevel {
  return parseProgrammeLevel(value) ?? "undergraduate";
}

/** Match pool vouchers: missing level counts as undergraduate for legacy stock. */
export function schoolVoucherLevelFilter(
  level: ProgrammeLevel,
): Record<string, unknown> {
  if (level === "undergraduate") {
    return {
      $or: [
        { programmeLevel: "undergraduate" },
        { programmeLevel: { $exists: false } },
        { programmeLevel: null },
      ],
    };
  }
  return { programmeLevel: "postgraduate" };
}
