import type { Db, ObjectId } from "mongodb";
import { SCHOOL_ADMIN_ROLE } from "@/lib/admissions/types";

function deliverableEmail(value?: string | null): string | null {
  const email = value?.trim().toLowerCase() ?? "";
  if (!email.includes("@")) return null;
  if (email.endsWith(".local")) return null;
  return email;
}

export async function schoolApplicationNotifyEmails(
  db: Db,
  school: { _id?: ObjectId; email?: string | null },
): Promise<string[]> {
  const emails = new Set<string>();
  const schoolEmail = deliverableEmail(school.email);
  if (schoolEmail) emails.add(schoolEmail);

  if (school._id) {
    const admins = await db
      .collection<{ email?: string | null }>("users")
      .find(
        {
          role: SCHOOL_ADMIN_ROLE,
          schoolId: { $in: [school._id, String(school._id)] },
        },
        { projection: { email: 1 } },
      )
      .toArray();
    for (const admin of admins) {
      const email = deliverableEmail(admin.email);
      if (email) emails.add(email);
    }
  }

  return [...emails];
}
