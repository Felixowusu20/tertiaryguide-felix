export type RankedProgrammeChoice = {
  rank: number;
  label: string;
  programme: string;
  stream?: string;
  display: string;
};

type ProgrammeChoiceFields = {
  firstChoice?: string;
  secondChoice?: string;
  thirdChoice?: string;
  fourthChoice?: string;
  firstChoiceProgramme?: string;
  firstChoiceStream?: string;
  secondChoiceProgramme?: string;
  secondChoiceStream?: string;
  thirdChoiceProgramme?: string;
  thirdChoiceStream?: string;
  fourthChoiceProgramme?: string;
  fourthChoiceStream?: string;
};

const RANKS: Array<{
  rank: number;
  label: string;
  programmeKey: keyof ProgrammeChoiceFields;
  streamKey: keyof ProgrammeChoiceFields;
  combinedKey: keyof ProgrammeChoiceFields;
}> = [
  {
    rank: 1,
    label: "1st choice",
    programmeKey: "firstChoiceProgramme",
    streamKey: "firstChoiceStream",
    combinedKey: "firstChoice",
  },
  {
    rank: 2,
    label: "2nd choice",
    programmeKey: "secondChoiceProgramme",
    streamKey: "secondChoiceStream",
    combinedKey: "secondChoice",
  },
  {
    rank: 3,
    label: "3rd choice",
    programmeKey: "thirdChoiceProgramme",
    streamKey: "thirdChoiceStream",
    combinedKey: "thirdChoice",
  },
  {
    rank: 4,
    label: "4th choice",
    programmeKey: "fourthChoiceProgramme",
    streamKey: "fourthChoiceStream",
    combinedKey: "fourthChoice",
  },
];

function trim(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function listProgrammeChoices(
  raw?: ProgrammeChoiceFields | Record<string, string | undefined> | null,
  fallback?: string | null,
): RankedProgrammeChoice[] {
  const pc = (raw || {}) as ProgrammeChoiceFields;
  const rows: RankedProgrammeChoice[] = [];

  for (const rank of RANKS) {
    const programme = trim(pc[rank.programmeKey]);
    const stream = trim(pc[rank.streamKey]);
    const combined = trim(pc[rank.combinedKey]);
    if (programme) {
      rows.push({
        rank: rank.rank,
        label: rank.label,
        programme,
        stream: stream || undefined,
        display: stream ? `${programme} — ${stream}` : programme,
      });
      continue;
    }
    if (combined) {
      rows.push({
        rank: rank.rank,
        label: rank.label,
        programme: combined,
        display: combined,
      });
    }
  }

  if (rows.length === 0 && trim(fallback)) {
    rows.push({
      rank: 1,
      label: "1st choice",
      programme: trim(fallback),
      display: trim(fallback),
    });
  }

  return rows;
}

export function legacyProgrammeFallback(doc: {
  programmeChoice?: unknown;
  programme?: unknown;
}): string | null {
  const choice = doc.programmeChoice;
  if (typeof choice === "string" && choice.trim()) return choice.trim();
  if (choice && typeof choice === "object") {
    const record = choice as { name?: unknown; programme?: unknown; title?: unknown };
    const named = trim(record.name) || trim(record.programme) || trim(record.title);
    if (named) return named;
  }
  return typeof doc.programme === "string" && doc.programme.trim()
    ? doc.programme.trim()
    : null;
}
