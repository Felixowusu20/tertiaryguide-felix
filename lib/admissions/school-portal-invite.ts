import { createHash, randomBytes } from "crypto";
import { ObjectId, type Db } from "mongodb";

const INVITE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 1 month

export type SchoolPortalInviteDoc = {
  _id?: ObjectId;
  tokenHash: string;
  schoolId: ObjectId;
  schoolSlug: string;
  schoolName: string;
  email: string;
  expiresAt: Date;
  createdAt: Date;
  usedAt?: Date | null;
};

export function schoolPortalInvitesCollection(db: Db) {
  return db.collection<SchoolPortalInviteDoc>("schoolPortalInvites");
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateInviteToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createSchoolPortalInvite(
  db: Db,
  opts: {
    schoolId: ObjectId;
    schoolSlug: string;
    schoolName: string;
    email: string;
  },
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateInviteToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVITE_TTL_MS);
  const invites = schoolPortalInvitesCollection(db);

  await invites.createIndex({ tokenHash: 1 }, { unique: true });
  await invites.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

  await invites.deleteMany({ schoolId: opts.schoolId });

  await invites.insertOne({
    tokenHash: hashInviteToken(token),
    schoolId: opts.schoolId,
    schoolSlug: opts.schoolSlug,
    schoolName: opts.schoolName,
    email: opts.email.trim().toLowerCase(),
    expiresAt,
    createdAt: now,
    usedAt: null,
  });

  return { token, expiresAt };
}

export async function findValidSchoolPortalInvite(
  db: Db,
  token: string,
): Promise<SchoolPortalInviteDoc | null> {
  if (!token?.trim()) return null;
  const invite = await schoolPortalInvitesCollection(db).findOne({
    tokenHash: hashInviteToken(token.trim()),
  });
  if (!invite) return null;
  if (invite.expiresAt.getTime() < Date.now()) return null;
  return invite;
}
