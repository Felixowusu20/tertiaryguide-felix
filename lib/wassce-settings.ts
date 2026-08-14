import type { Db } from "mongodb";

export const WASSCE_SETTINGS_ID = "wassce_checker";

export type WassceSettings = {
  priceGhs: number;
  /** Heading shown above the steps on /wassce-checker */
  title: string;
  /** Ordered instructions shown before purchase */
  steps: string[];
  updatedAt?: Date;
};

export const DEFAULT_WASSCE_SETTINGS: WassceSettings = {
  priceGhs: 25,
  title: "Steps to get a\nWASSCE voucher",
  steps: [
    "Enter your name and email",
    "Make payment of GHS {price}",
    "Your PIN will be sent instantly",
  ],
};

export function wassceSettingsCollection(db: Db) {
  return db.collection<{
    _id: string;
    priceGhs: number;
    title: string;
    steps: string[];
    updatedAt: Date;
  }>("siteSettings");
}

function finitePrice(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

export function normalizeWassceSteps(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [...DEFAULT_WASSCE_SETTINGS.steps];
  const steps = raw
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean)
    .slice(0, 12);
  return steps.length > 0 ? steps : [...DEFAULT_WASSCE_SETTINGS.steps];
}

export function serializeWassceSettings(
  doc: Partial<WassceSettings> | null | undefined,
): {
  priceGhs: number;
  title: string;
  steps: string[];
  updatedAt: string | null;
} {
  const priceGhs =
    finitePrice(doc?.priceGhs) ?? DEFAULT_WASSCE_SETTINGS.priceGhs;
  const title =
    typeof doc?.title === "string" && doc.title.trim()
      ? doc.title.trim()
      : DEFAULT_WASSCE_SETTINGS.title;
  const steps = normalizeWassceSteps(doc?.steps);
  return {
    priceGhs,
    title,
    steps,
    updatedAt:
      doc?.updatedAt instanceof Date ? doc.updatedAt.toISOString() : null,
  };
}

/** Replace `{price}` placeholders with the formatted GHS amount. */
export function renderWassceSteps(
  steps: string[],
  priceGhs: number,
): string[] {
  const formatted = `GHS ${priceGhs.toFixed(2)}`;
  return steps.map((step) =>
    step
      .replaceAll("{price}", formatted)
      .replaceAll("{PRICE}", formatted),
  );
}

export async function getWassceSettings(db: Db) {
  const doc = await wassceSettingsCollection(db).findOne({
    _id: WASSCE_SETTINGS_ID,
  });
  return serializeWassceSettings(doc ?? undefined);
}

export async function upsertWassceSettings(
  db: Db,
  input: { priceGhs?: unknown; title?: unknown; steps?: unknown },
) {
  const current = await getWassceSettings(db);
  const priceGhs =
    input.priceGhs !== undefined
      ? finitePrice(input.priceGhs)
      : current.priceGhs;
  if (priceGhs === null) {
    throw new Error("Price must be a positive number");
  }

  const title =
    input.title !== undefined
      ? typeof input.title === "string" && input.title.trim()
        ? input.title.trim()
        : DEFAULT_WASSCE_SETTINGS.title
      : current.title;

  const steps =
    input.steps !== undefined
      ? normalizeWassceSteps(input.steps)
      : current.steps;

  const now = new Date();
  await wassceSettingsCollection(db).updateOne(
    { _id: WASSCE_SETTINGS_ID },
    {
      $set: {
        priceGhs,
        title,
        steps,
        updatedAt: now,
      },
    },
    { upsert: true },
  );

  return serializeWassceSettings({
    priceGhs,
    title,
    steps,
    updatedAt: now,
  });
}
