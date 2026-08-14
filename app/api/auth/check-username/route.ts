import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../../lib/mongodb";
import { getCachedUserByUsername } from "../../../../lib/redis";

function normalizeUsername(raw: string): string {
  return raw.trim();
}

function generateCandidateUsernames(baseRaw: string, count: number = 8): string[] {
  const base = baseRaw.trim();
  if (!base) return [];

  const candidates: string[] = [];

  // Simple numeric prefixes
  for (let i = 1; i <= 4 && candidates.length < count; i += 1) {
    candidates.push(`${i}${base}`);
  }

  // Alpha prefixes
  const alphaPrefixes = ["my", "the", "real", "hey"];
  for (const prefix of alphaPrefixes) {
    if (candidates.length >= count) break;
    candidates.push(`${prefix}${base}`);
  }

  // Fallback numbers with underscore
  for (let i = 1; i <= 20 && candidates.length < count; i += 1) {
    candidates.push(`${base}${i}`);
  }

  // Remove duplicates while preserving order
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const c of candidates) {
    const key = c.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(c);
  }

  return unique.slice(0, count);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username } = body as { username?: string };

    if (!username || !username.trim()) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 },
      );
    }

    const normalized = normalizeUsername(username);

    if (normalized.length < 3) {
      return NextResponse.json(
        { available: false, suggestions: [], reason: "too_short" },
        { status: 200 },
      );
    }

    // First, check Redis cache for fast response
    const cached = await getCachedUserByUsername(normalized);
    let taken = !!cached;

    const db = await getDb();
    const users = db.collection("users");

    if (!taken) {
      const existing = await users.findOne<{ username: string }>({
        username: normalized,
      });
      taken = !!existing;
    }

    if (!taken) {
      return NextResponse.json(
        { available: true, suggestions: [] },
        { status: 200 },
      );
    }

    // If taken, propose a few alternative usernames that are currently free.
    const candidates = generateCandidateUsernames(normalized, 10);
    const suggestions: string[] = [];

    for (const candidate of candidates) {
      if (candidate.toLowerCase() === normalized.toLowerCase()) continue;

      const cachedCandidate = await getCachedUserByUsername(candidate);
      if (cachedCandidate) continue;

      const existingCandidate = await users.findOne<{ username: string }>({
        username: candidate,
      });
      if (existingCandidate) continue;

      suggestions.push(candidate);
      if (suggestions.length >= 5) break;
    }

    return NextResponse.json(
      {
        available: false,
        suggestions,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("check-username error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
