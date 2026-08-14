import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import { SCHOOL_ADMIN_ROLE } from "./admissions/types";
import { findSchoolBySlug } from "./admissions/schools";

export const STAFF_ROLES = ["admin", "superadmin"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export type StaffUser = {
  _id: ObjectId;
  username: string;
  email?: string;
  role: StaffRole;
  createdAt?: Date;
  lastLoginAt?: Date;
};

export type SchoolAdminUser = {
  _id: ObjectId;
  username: string;
  email?: string;
  role: typeof SCHOOL_ADMIN_ROLE;
  schoolId: ObjectId;
  createdAt?: Date;
  lastLoginAt?: Date;
};

export type PortalActor =
  | { kind: "staff"; user: StaffUser }
  | { kind: "school_admin"; user: SchoolAdminUser };

export function isStaffRole(value: unknown): value is StaffRole {
  return value === "admin" || value === "superadmin";
}

export function isSuperadminRole(value: unknown): boolean {
  return value === "superadmin";
}

export function isSchoolAdminRole(value: unknown): boolean {
  return value === SCHOOL_ADMIN_ROLE;
}

export function staffRoleLabel(role: StaffRole): string {
  return role === "superadmin" ? "Superadmin" : "Admin";
}

export async function findStaffByUsername(
  username: string,
): Promise<StaffUser | null> {
  const db = await getDb();
  const users = db.collection<StaffUser>("users");
  const doc = await users.findOne({
    username,
    role: { $in: [...STAFF_ROLES] },
  });
  return doc;
}

export async function findStaffByEmail(
  email: string,
): Promise<StaffUser | null> {
  const db = await getDb();
  const users = db.collection<StaffUser>("users");
  const doc = await users.findOne({
    email: email.trim().toLowerCase(),
    role: { $in: [...STAFF_ROLES] },
  });
  return doc;
}

export async function findSchoolAdminByUsername(
  username: string,
): Promise<SchoolAdminUser | null> {
  const db = await getDb();
  const users = db.collection<SchoolAdminUser>("users");
  const doc = await users.findOne({
    username,
    role: SCHOOL_ADMIN_ROLE,
  });
  return doc;
}

export function getActorUsername(req: NextRequest): string | null {
  const header = req.headers.get("x-admin-username")?.trim();
  if (header) return header;

  return null;
}

export async function requireStaff(
  req: NextRequest,
): Promise<{ user: StaffUser } | { response: NextResponse }> {
  const username = getActorUsername(req);
  if (!username) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const user = await findStaffByUsername(username);
  if (!user) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { user };
}

export async function requireSuperadmin(
  req: NextRequest,
): Promise<{ user: StaffUser } | { response: NextResponse }> {
  const auth = await requireStaff(req);
  if ("response" in auth) return auth;

  if (!isSuperadminRole(auth.user.role)) {
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return auth;
}

/**
 * Platform staff OR school admin for a given school slug.
 * School admins may only access their own school.
 * Platform staff (admin/superadmin) may access any school portal.
 */
export async function requireSchoolPortalAccess(
  req: NextRequest,
  schoolSlug: string,
): Promise<
  | { actor: PortalActor; schoolId: ObjectId; schoolSlug: string }
  | { response: NextResponse }
> {
  const username = getActorUsername(req);
  if (!username) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const db = await getDb();
  const school = await findSchoolBySlug(db, schoolSlug);
  if (!school?._id) {
    return {
      response: NextResponse.json({ error: "School not found" }, { status: 404 }),
    };
  }
  if (school.isPartner !== true) {
    return {
      response: NextResponse.json(
        { error: "This school does not have an admissions portal" },
        { status: 404 },
      ),
    };
  }

  const staff = await findStaffByUsername(username);
  if (staff) {
    return {
      actor: { kind: "staff", user: staff },
      schoolId: school._id,
      schoolSlug: school.slug || schoolSlug,
    };
  }

  const schoolAdmin = await findSchoolAdminByUsername(username);
  if (!schoolAdmin) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (!schoolAdmin.schoolId.equals(school._id)) {
    return {
      response: NextResponse.json(
        { error: "You do not have access to this school portal" },
        { status: 403 },
      ),
    };
  }

  return {
    actor: { kind: "school_admin", user: schoolAdmin },
    schoolId: school._id,
    schoolSlug: school.slug || schoolSlug,
  };
}

export function nonStaffUserFilter() {
  return {
    role: { $nin: [...STAFF_ROLES, SCHOOL_ADMIN_ROLE] },
  };
}
