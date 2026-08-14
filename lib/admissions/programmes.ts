import { ObjectId, type Db } from "mongodb";

export type AdmissionProgrammeDoc = {
  _id?: ObjectId;
  schoolId: ObjectId;
  name: string;
  streams: string[];
  intakeOptions?: string[];
  cutoff?: string | null;
  preRequisite?: string | null;
  durationYears?: number | null;
  isActive?: boolean;
  createdAt: Date;
  updatedAt?: Date;
};

export function admissionProgrammesCollection(db: Db) {
  return db.collection<AdmissionProgrammeDoc>("admissionProgrammes");
}

export async function ensureAdmissionProgrammeIndexes(db: Db) {
  await admissionProgrammesCollection(db).createIndex({ schoolId: 1, name: 1 });
  await admissionProgrammesCollection(db).createIndex({ schoolId: 1, isActive: 1 });
}

export function serializeAdmissionProgramme(doc: AdmissionProgrammeDoc) {
  return {
    id: String(doc._id),
    schoolId: String(doc.schoolId),
    name: doc.name,
    streams: doc.streams ?? [],
    intakeOptions: doc.intakeOptions ?? [],
    cutoff: doc.cutoff ?? null,
    preRequisite: doc.preRequisite ?? null,
    durationYears: doc.durationYears ?? null,
    isActive: doc.isActive !== false,
    createdAt: doc.createdAt.toISOString(),
  };
}

export type ApplicationDraftDoc = {
  _id?: ObjectId;
  schoolId: ObjectId;
  voucherId?: ObjectId | null;
  applicantEmail: string;
  voucherCode?: string | null;
  serialNumber?: string | null;
  formData: Record<string, unknown>;
  currentTab?: string;
  updatedAt: Date;
  createdAt: Date;
};

export function applicationDraftsCollection(db: Db) {
  return db.collection<ApplicationDraftDoc>("applicationDrafts");
}

export async function ensureDraftIndexes(db: Db) {
  await applicationDraftsCollection(db).createIndex(
    { schoolId: 1, voucherCode: 1, serialNumber: 1 },
    { sparse: true },
  );
  await applicationDraftsCollection(db).createIndex({
    schoolId: 1,
    applicantEmail: 1,
  });
}
