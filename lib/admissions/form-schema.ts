import { z } from "zod";
import {
  CORE_SUBJECTS,
  COUNTRIES,
  EXAM_BODIES,
  EXAM_TYPES,
  GENDERS,
  GHANA_REGIONS,
  GUARDIAN_TITLES,
  INSTITUTION_TYPES,
  MARITAL_STATUSES,
  NATIONALITIES,
  OCCUPATIONS,
  RELATIONSHIPS,
  SHS_PROGRAMMES,
  SITTING_TYPES,
  TITLES,
  WASSCE_GRADES,
} from "./form-options";

const titleEnum = z.enum(TITLES);
const genderEnum = z.enum(GENDERS);
const maritalEnum = z.enum(MARITAL_STATUSES);
const regionEnum = z.enum(GHANA_REGIONS);
const countryEnum = z.enum(COUNTRIES);
const nationalityEnum = z.enum(NATIONALITIES);
const occupationEnum = z.enum(OCCUPATIONS);

const ghanaPhoneRegex = /^(?:\+233|0)(?:20|23|24|25|26|27|28|50|53|54|55|56|57|59)\d{7}$/;

function isAtLeast14(isoDate: string): boolean {
  const dob = new Date(isoDate);
  if (Number.isNaN(dob.getTime())) return false;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 14);
  return dob <= cutoff;
}

export const personalInfoSchema = z
  .object({
    title: titleEnum,
    surname: z.string().trim().min(2, "Surname must be at least 2 characters"),
    firstName: z.string().trim().min(1, "First name is required"),
    middleName: z.string().trim().optional().or(z.literal("")),
    dateOfBirthDay: z.string().min(1, "Day is required"),
    dateOfBirthMonth: z.string().min(1, "Month is required"),
    dateOfBirthYear: z.string().min(1, "Year is required"),
    gender: genderEnum,
    maritalStatus: maritalEnum,
    homeRegion: regionEnum,
    homeCountry: countryEnum,
    nationality: nationalityEnum,
    occupation: occupationEnum,
    occupationDescription: z.string().trim().optional().or(z.literal("")),
    phoneNumber: z
      .string()
      .trim()
      .regex(ghanaPhoneRegex, "Enter a valid Ghana phone number"),
    email: z.string().trim().email("Enter a valid email address"),
    postalAddress: z.string().trim().min(1, "Postal address is required"),
    residentialAddress: z
      .string()
      .trim()
      .min(1, "Residential address is required"),
  })
  .superRefine((data, ctx) => {
    const iso = `${data.dateOfBirthYear}-${data.dateOfBirthMonth}-${data.dateOfBirthDay.padStart(2, "0")}`;
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid date of birth",
        path: ["dateOfBirthDay"],
      });
    } else if (!isAtLeast14(iso)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Applicant must be at least 14 years old",
        path: ["dateOfBirthYear"],
      });
    }
    if (data.occupation === "Other" && !data.occupationDescription?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Describe your occupation",
        path: ["occupationDescription"],
      });
    }
  });

export const guardianInfoSchema = z.object({
  guardianName: z.string().trim().min(1, "Guardian name is required"),
  guardianTitle: z.enum(GUARDIAN_TITLES),
  relationship: z.enum(RELATIONSHIPS),
  occupation: z.string().trim().min(1, "Occupation is required"),
  phoneNumber: z
    .string()
    .trim()
    .regex(ghanaPhoneRegex, "Enter a valid Ghana phone number"),
  alternativePhone: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => !v || ghanaPhoneRegex.test(v),
      "Enter a valid Ghana phone number",
    ),
  email: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || z.string().email().safeParse(v).success, "Invalid email"),
  residentialAddress: z.string().trim().min(1, "Residential address is required"),
  postalAddress: z.string().trim().optional().or(z.literal("")),
  nationality: nationalityEnum,
});

export const programmeChoicesSchema = z
  .object({
    firstChoiceProgramme: z.string().trim().min(1, "First choice programme is required"),
    firstChoiceStream: z.string().trim().min(1, "First choice stream is required"),
    secondChoiceProgramme: z.string().trim().optional().or(z.literal("")),
    secondChoiceStream: z.string().trim().optional().or(z.literal("")),
    thirdChoiceProgramme: z.string().trim().optional().or(z.literal("")),
    thirdChoiceStream: z.string().trim().optional().or(z.literal("")),
    fourthChoiceProgramme: z.string().trim().optional().or(z.literal("")),
    fourthChoiceStream: z.string().trim().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    const pairs = [
      { prog: data.firstChoiceProgramme, stream: data.firstChoiceStream, pPath: "firstChoiceProgramme", sPath: "firstChoiceStream" },
      { prog: data.secondChoiceProgramme, stream: data.secondChoiceStream, pPath: "secondChoiceProgramme", sPath: "secondChoiceStream" },
      { prog: data.thirdChoiceProgramme, stream: data.thirdChoiceStream, pPath: "thirdChoiceProgramme", sPath: "thirdChoiceStream" },
      { prog: data.fourthChoiceProgramme, stream: data.fourthChoiceStream, pPath: "fourthChoiceProgramme", sPath: "fourthChoiceStream" },
    ];

    const seen = new Set<string>();
    for (const row of pairs) {
      if (!row.prog) continue;
      if (row.prog && !row.stream) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Stream is required when programme is selected",
          path: [row.sPath],
        });
      }
      const key = row.prog.toLowerCase();
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Duplicate programme selection is not allowed",
          path: [row.pPath],
        });
      }
      seen.add(key);
    }
  });

export const educationalBackgroundSchema = z
  .object({
    institutionName: z.string().trim().min(1, "Institution name is required"),
    institutionType: z.enum(INSTITUTION_TYPES),
    programmePursued: z.enum(SHS_PROGRAMMES),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    country: countryEnum,
    region: regionEnum,
  })
  .superRefine((data, ctx) => {
    if (data.startDate && data.endDate && data.startDate > data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date must be after start date",
        path: ["endDate"],
      });
    }
  });

export const examinationInfoSchema = z.object({
  examType: z.enum(EXAM_TYPES),
  examBody: z.enum(EXAM_BODIES),
  sitting: z.enum(SITTING_TYPES),
  examYear: z.string().min(4, "Examination year is required"),
  indexNumber: z
    .string()
    .trim()
    .min(1, "Index number is required")
    .regex(/^[a-zA-Z0-9/-]+$/, "Index number must be alphanumeric"),
  candidateNumber: z
    .string()
    .trim()
    .min(1, "Candidate number is required")
    .regex(/^[a-zA-Z0-9/-]+$/, "Candidate number must be alphanumeric"),
  examinationCentre: z.string().trim().min(1, "Examination centre is required"),
});

export const MAX_INSTITUTIONS = 4;
export const MAX_EXAM_SITTINGS = 5;

export const examinationSittingSchema = examinationInfoSchema.extend({
  institutionIndex: z.number().int().min(0, "Select the school for this exam"),
});

export const educationTabSchema = z
  .array(educationalBackgroundSchema)
  .min(1, "Add at least one institution")
  .max(MAX_INSTITUTIONS, `You can add up to ${MAX_INSTITUTIONS} institutions`);

export const examinationTabSchema = z
  .object({
    educations: educationTabSchema,
    examSittings: z
      .array(examinationSittingSchema)
      .min(1, "Add at least one examination")
      .max(MAX_EXAM_SITTINGS, `You can add up to ${MAX_EXAM_SITTINGS} examinations`),
  })
  .superRefine((data, ctx) => {
    data.examSittings.forEach((sitting, index) => {
      if (sitting.institutionIndex >= data.educations.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Select the school where you wrote this exam",
          path: ["examSittings", index, "institutionIndex"],
        });
      }
    });
  });

const gradeEnum = z.enum(WASSCE_GRADES);

export const examinationResultsSchema = z
  .object({
    coreResults: z.array(
      z.object({
        subject: z.string(),
        grade: gradeEnum,
      }),
    ),
    electiveResults: z.array(
      z.object({
        subject: z.string().optional().or(z.literal("")),
        grade: z.string().optional().or(z.literal("")),
      }),
    ),
  })
  .superRefine((data, ctx) => {
    if (data.coreResults.length !== CORE_SUBJECTS.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "All core subjects require a grade",
        path: ["coreResults"],
      });
    }
    for (let i = 0; i < data.coreResults.length; i += 1) {
      if (!data.coreResults[i]?.grade) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Grade is required",
          path: ["coreResults", i, "grade"],
        });
      }
    }

    const filled = data.electiveResults.filter((r) => r.subject);
    const subjects = filled.map((r) => (r.subject || "").toLowerCase());
    const dup = subjects.find((s, i) => subjects.indexOf(s) !== i);
    if (dup) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Duplicate elective subjects are not allowed",
        path: ["electiveResults"],
      });
    }
    for (let i = 0; i < data.electiveResults.length; i += 1) {
      const row = data.electiveResults[i];
      if (row?.subject && !row.grade) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Select a grade for this subject",
          path: ["electiveResults", i, "grade"],
        });
      }
    }
  });

export const documentsSchema = z.object({
  passportPhoto: z.string().url("Passport photograph is required"),
  resultSlip: z.string().url("WASSCE result slip is required"),
  birthCertificate: z.string().url().optional().or(z.literal("")),
  sssceResultSlip: z.string().url().optional().or(z.literal("")),
  nationalId: z.string().url("Ghana Card or National ID is required"),
});

export const reviewSchema = z.object({
  declarationAccepted: z
    .boolean()
    .refine((v) => v === true, {
      message: "You must accept the declaration to submit",
    }),
});

export type PersonalInfoForm = z.infer<typeof personalInfoSchema>;
export type GuardianInfoForm = z.infer<typeof guardianInfoSchema>;
export type ProgrammeChoicesForm = z.infer<typeof programmeChoicesSchema>;
export type EducationalBackgroundForm = z.infer<typeof educationalBackgroundSchema>;
export type ExaminationInfoForm = z.infer<typeof examinationInfoSchema>;
export type ExaminationResultsForm = z.infer<typeof examinationResultsSchema>;
export type ExaminationSittingForm = z.infer<typeof examinationSittingSchema> &
  ExaminationResultsForm;
export type DocumentsForm = z.infer<typeof documentsSchema>;

export type ApplicationFormState = {
  personal: PersonalInfoForm;
  guardian: GuardianInfoForm;
  programme: ProgrammeChoicesForm;
  educations: EducationalBackgroundForm[];
  examSittings: ExaminationSittingForm[];
  documents: DocumentsForm;
  declarationAccepted: boolean;
};

export function emptyEducation(): EducationalBackgroundForm {
  return {
    institutionName: "",
    institutionType: "Public",
    programmePursued: "General Science",
    startDate: "",
    endDate: "",
    country: "Ghana",
    region: "Ashanti",
  };
}

export function emptyResultsForm(): ExaminationResultsForm {
  return {
    coreResults: CORE_SUBJECTS.map((subject) => ({
      subject,
      grade: "" as unknown as (typeof WASSCE_GRADES)[number],
    })),
    electiveResults: Array.from({ length: 8 }, () => ({
      subject: "",
      grade: "",
    })),
  };
}

export function emptyExamination(
  sitting: (typeof SITTING_TYPES)[number] = "May/June",
): ExaminationInfoForm {
  return {
    examType: "WASSCE",
    examBody: "WAEC",
    sitting,
    examYear: "",
    indexNumber: "",
    candidateNumber: "",
    examinationCentre: "",
  };
}

export function emptyExamSitting(
  sitting: (typeof SITTING_TYPES)[number] = "May/June",
  institutionIndex = 0,
): ExaminationSittingForm {
  return {
    ...emptyExamination(sitting),
    institutionIndex,
    ...emptyResultsForm(),
  };
}

export function emptyApplicationForm(): ApplicationFormState {
  return {
    personal: {
      title: "Mr.",
      surname: "",
      firstName: "",
      middleName: "",
      dateOfBirthDay: "",
      dateOfBirthMonth: "",
      dateOfBirthYear: "",
      gender: "Male",
      maritalStatus: "Single",
      homeRegion: "Greater Accra",
      homeCountry: "Ghana",
      nationality: "Ghanaian",
      occupation: "Student",
      occupationDescription: "",
      phoneNumber: "",
      email: "",
      postalAddress: "",
      residentialAddress: "",
    },
    guardian: {
      guardianName: "",
      guardianTitle: "Mr.",
      relationship: "Father",
      occupation: "",
      phoneNumber: "",
      alternativePhone: "",
      email: "",
      residentialAddress: "",
      postalAddress: "",
      nationality: "Ghanaian",
    },
    programme: {
      firstChoiceProgramme: "",
      firstChoiceStream: "",
      secondChoiceProgramme: "",
      secondChoiceStream: "",
      thirdChoiceProgramme: "",
      thirdChoiceStream: "",
      fourthChoiceProgramme: "",
      fourthChoiceStream: "",
    },
    educations: [emptyEducation()],
    examSittings: [emptyExamSitting("May/June", 0)],
    documents: {
      passportPhoto: "",
      resultSlip: "",
      birthCertificate: "",
      sssceResultSlip: "",
      nationalId: "",
    },
    declarationAccepted: false,
  };
}

export function dobToIso(personal: PersonalInfoForm): string {
  return `${personal.dateOfBirthYear}-${personal.dateOfBirthMonth}-${personal.dateOfBirthDay.padStart(2, "0")}`;
}

export function fieldErrorsFromZod(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

function asRecord(value: unknown): Record<string, string | undefined> {
  if (!value || typeof value !== "object") return {};
  const out: Record<string, string | undefined> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (typeof item === "string") out[key] = item;
  }
  return out;
}

function pickOption<T extends readonly string[]>(
  value: string | undefined,
  options: T,
  fallback: T[number],
): T[number] {
  const raw = (value || "").trim();
  return (options as readonly string[]).includes(raw)
    ? (raw as T[number])
    : fallback;
}

function splitDob(raw?: string) {
  const value = (raw || "").trim();
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return { year: iso[1], month: iso[2], day: iso[3] };
  }
  const dmy = value.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dmy) {
    return {
      day: dmy[1].padStart(2, "0"),
      month: dmy[2].padStart(2, "0"),
      year: dmy[3],
    };
  }
  return { year: "", month: "", day: "" };
}

function educationFromRecord(
  row: Record<string, string | undefined>,
): EducationalBackgroundForm {
  const base = emptyEducation();
  return {
    ...base,
    institutionName: row.institutionName || "",
    institutionType: pickOption(
      row.institutionType,
      INSTITUTION_TYPES,
      base.institutionType,
    ),
    programmePursued: pickOption(
      row.programmePursued,
      SHS_PROGRAMMES,
      base.programmePursued,
    ),
    startDate: row.startDate || "",
    endDate: row.endDate || "",
    country: pickOption(row.country, COUNTRIES, base.country),
    region: pickOption(row.region, GHANA_REGIONS, base.region),
  };
}

function resultsFromRows(
  rows: Array<{ subject?: string; grade?: string }> | undefined,
): ExaminationResultsForm {
  const submitted = (rows || []).filter((row) => row.subject && row.grade);
  const coreNames = new Set<string>(CORE_SUBJECTS);
  const coreResults = CORE_SUBJECTS.map((subject) => {
    const match = submitted.find((row) => (row.subject || "").trim() === subject);
    const grade = (match?.grade || "").trim();
    return {
      subject,
      grade: (WASSCE_GRADES as readonly string[]).includes(grade)
        ? (grade as (typeof WASSCE_GRADES)[number])
        : ("" as unknown as (typeof WASSCE_GRADES)[number]),
    };
  });
  const electives = submitted.filter(
    (row) => !coreNames.has((row.subject || "").trim()),
  );
  return {
    coreResults,
    electiveResults: Array.from({ length: 8 }, (_, index) => ({
      subject: electives[index]?.subject?.trim() || "",
      grade: electives[index]?.grade?.trim() || "",
    })),
  };
}

export function flattenExamResults(sitting: ExaminationResultsForm): {
  subject: string;
  grade: string;
}[] {
  return [
    ...sitting.coreResults,
    ...sitting.electiveResults,
  ].filter((row): row is { subject: string; grade: string } =>
    Boolean(row.subject && row.grade),
  );
}

export function examSittingLabel(
  sitting: Pick<
    ExaminationSittingForm,
    "examType" | "sitting" | "examYear" | "institutionIndex"
  >,
  educations: EducationalBackgroundForm[],
  index = 0,
): string {
  const school =
    educations[sitting.institutionIndex]?.institutionName?.trim() ||
    "School not selected";
  const parts = [sitting.examType, sitting.sitting, sitting.examYear].filter(
    Boolean,
  );
  const exam = parts.length ? parts.join(" · ") : `Sitting ${index + 1}`;
  return `${school} — ${exam}`;
}

type LegacyFormShape = Partial<ApplicationFormState> & {
  education?: EducationalBackgroundForm;
  examination?: ExaminationInfoForm;
  additionalExaminations?: ExaminationInfoForm[];
  results?: ExaminationResultsForm;
};

export function normalizeApplicationForm(
  raw?: LegacyFormShape | null,
): ApplicationFormState {
  const base = emptyApplicationForm();
  if (!raw) return base;

  const educations = (
    Array.isArray(raw.educations) && raw.educations.length
      ? raw.educations
      : raw.education
        ? [raw.education]
        : base.educations
  )
    .slice(0, MAX_INSTITUTIONS)
    .map((row) => ({ ...emptyEducation(), ...row }));

  const legacySittings = [
    raw.examination,
    ...(Array.isArray(raw.additionalExaminations)
      ? raw.additionalExaminations
      : []),
  ].filter((row): row is ExaminationInfoForm => Boolean(row));

  const examSittings = (
    Array.isArray(raw.examSittings) && raw.examSittings.length
      ? raw.examSittings
      : legacySittings.map((row, index) => ({
          ...emptyExamSitting(index === 0 ? "May/June" : "Nov/Dec", 0),
          ...row,
          institutionIndex:
            typeof (row as ExaminationSittingForm).institutionIndex === "number"
              ? (row as ExaminationSittingForm).institutionIndex
              : 0,
          ...(index === 0 && raw.results ? raw.results : emptyResultsForm()),
        }))
  )
    .slice(0, MAX_EXAM_SITTINGS)
    .map((row, index) => ({
      ...emptyExamSitting(index === 0 ? "May/June" : "Nov/Dec", 0),
      ...row,
      institutionIndex: Math.min(
        Math.max(0, row.institutionIndex || 0),
        Math.max(0, educations.length - 1),
      ),
      coreResults: row.coreResults?.length
        ? row.coreResults
        : emptyResultsForm().coreResults,
      electiveResults: row.electiveResults?.length
        ? row.electiveResults
        : emptyResultsForm().electiveResults,
    }));

  return {
    ...base,
    ...raw,
    educations: educations.length ? educations : base.educations,
    examSittings: examSittings.length ? examSittings : base.examSittings,
    personal: { ...base.personal, ...(raw.personal || {}) },
    guardian: { ...base.guardian, ...(raw.guardian || {}) },
    programme: { ...base.programme, ...(raw.programme || {}) },
    documents: { ...base.documents, ...(raw.documents || {}) },
    declarationAccepted: !!raw.declarationAccepted,
  };
}

export function validateExamResults(
  sittings: ExaminationSittingForm[],
): Record<string, string> {
  const errors: Record<string, string> = {};
  sittings.forEach((sitting, index) => {
    const payload = {
      coreResults: sitting.coreResults,
      electiveResults: sitting.electiveResults,
    };
    if (index === 0) {
      const result = examinationResultsSchema.safeParse(payload);
      if (!result.success) {
        for (const [key, message] of Object.entries(
          fieldErrorsFromZod(result.error),
        )) {
          errors[`examSittings.${index}.${key}`] = message;
        }
      }
      return;
    }
    const filled = flattenExamResults(sitting);
    if (filled.length === 0) {
      errors[`examSittings.${index}`] =
        "Enter at least one subject and grade for this sitting";
    }
    sitting.electiveResults.forEach((row, electiveIndex) => {
      if (row.subject && !row.grade) {
        errors[`examSittings.${index}.electiveResults.${electiveIndex}.grade`] =
          "Select a grade for this subject";
      }
    });
  });
  return errors;
}

function examinationFromRecord(
  exam: Record<string, string | undefined>,
  fallbackSitting: (typeof SITTING_TYPES)[number] = "May/June",
): ExaminationInfoForm {
  const base = emptyExamination(fallbackSitting);
  return {
    ...base,
    examType: pickOption(exam.examType, EXAM_TYPES, base.examType),
    examBody: pickOption(exam.examBody, EXAM_BODIES, base.examBody),
    sitting: pickOption(exam.sitting, SITTING_TYPES, base.sitting),
    examYear: exam.examYear || "",
    indexNumber: exam.indexNumber || "",
    candidateNumber: exam.candidateNumber || "",
    examinationCentre: exam.examinationCentre || "",
  };
}

function splitProgrammeChoice(
  combined?: string,
  programme?: string,
  stream?: string,
) {
  if (programme?.trim()) {
    return { programme: programme.trim(), stream: (stream || "").trim() };
  }
  const raw = (combined || "").trim();
  if (!raw) return { programme: "", stream: "" };
  const parts = raw.split(/\s+[—–-]\s+/);
  return {
    programme: (parts[0] || "").trim(),
    stream: (parts.slice(1).join(" — ") || "").trim(),
  };
}

export type SubmittedApplicationLike = {
  applicationNumber?: string;
  email?: string;
  phone?: string | null;
  personalInfo?: Record<string, string | undefined> | null;
  guardianInfo?: Record<string, string | undefined> | null;
  programmeChoices?: Record<string, string | undefined> | null;
  educationalBackground?: Record<string, string | undefined>[];
  examinationInfo?: Record<string, string | undefined> | null;
  additionalExaminations?: Record<string, string | undefined>[] | null;
  examinationSittings?: Array<{
    examType?: string;
    examBody?: string;
    sitting?: string;
    examYear?: string;
    indexNumber?: string;
    candidateNumber?: string;
    examinationCentre?: string;
    institutionName?: string;
    results?: { subject?: string; grade?: string }[];
  }> | null;
  results?: { subject?: string; grade?: string }[];
  documents?: Record<string, string | undefined> | null;
};

/** Prefill the stepped form from a submitted application. */
export function formStateFromApplication(
  application?: SubmittedApplicationLike | null,
): ApplicationFormState {
  const base = emptyApplicationForm();
  if (!application) return base;

  const personal = asRecord(application.personalInfo);
  const guardian = asRecord(application.guardianInfo);
  const choices = asRecord(application.programmeChoices);
  const educations = (
    application.educationalBackground?.length
      ? application.educationalBackground
      : [{}]
  ).map((row) => educationFromRecord(asRecord(row)));
  const documents = asRecord(application.documents);
  const dob = splitDob(personal.dateOfBirth);
  const occupationValue = (personal.occupation || "").trim();
  const occupationInList = (OCCUPATIONS as readonly string[]).includes(
    occupationValue,
  );
  const first = splitProgrammeChoice(
    choices.firstChoice,
    choices.firstChoiceProgramme,
    choices.firstChoiceStream,
  );
  const second = splitProgrammeChoice(
    choices.secondChoice,
    choices.secondChoiceProgramme,
    choices.secondChoiceStream,
  );
  const third = splitProgrammeChoice(
    choices.thirdChoice,
    choices.thirdChoiceProgramme,
    choices.thirdChoiceStream,
  );
  const fourth = splitProgrammeChoice(
    choices.fourthChoice,
    choices.fourthChoiceProgramme,
    choices.fourthChoiceStream,
  );

  const storedSittings = application.examinationSittings?.length
    ? application.examinationSittings
    : [
        application.examinationInfo,
        ...(application.additionalExaminations || []),
      ].filter((row): row is Record<string, string | undefined> => Boolean(row));

  const examSittings = (
    storedSittings.length ? storedSittings : [{}]
  ).map((row, index) => {
    const record = asRecord(row);
    const schoolName = (record.institutionName || "").trim().toLowerCase();
    const institutionIndex = Math.max(
      0,
      educations.findIndex(
        (edu) => edu.institutionName.trim().toLowerCase() === schoolName,
      ),
    );
    const sittingResults =
      Array.isArray((row as { results?: { subject?: string; grade?: string }[] }).results) &&
      (row as { results?: { subject?: string; grade?: string }[] }).results!.length
        ? resultsFromRows(
            (row as { results?: { subject?: string; grade?: string }[] }).results,
          )
        : index === 0
          ? resultsFromRows(application.results)
          : emptyResultsForm();
    return {
      ...emptyExamSitting(index === 0 ? "May/June" : "Nov/Dec", institutionIndex),
      ...examinationFromRecord(record, index === 0 ? "May/June" : "Nov/Dec"),
      institutionIndex: schoolName ? institutionIndex : 0,
      ...sittingResults,
    };
  });

  return {
    ...base,
    personal: {
      ...base.personal,
      title: pickOption(personal.title, TITLES, base.personal.title),
      surname: personal.surname || "",
      firstName: personal.firstName || "",
      middleName: personal.middleName || "",
      dateOfBirthDay: dob.day,
      dateOfBirthMonth: dob.month,
      dateOfBirthYear: dob.year,
      gender: pickOption(personal.gender, GENDERS, base.personal.gender),
      maritalStatus: pickOption(
        personal.maritalStatus,
        MARITAL_STATUSES,
        base.personal.maritalStatus,
      ),
      homeRegion: pickOption(
        personal.homeRegion,
        GHANA_REGIONS,
        base.personal.homeRegion,
      ),
      homeCountry: pickOption(
        personal.homeCountry,
        COUNTRIES,
        base.personal.homeCountry,
      ),
      nationality: pickOption(
        personal.nationality,
        NATIONALITIES,
        base.personal.nationality,
      ),
      occupation: occupationInList
        ? (occupationValue as (typeof OCCUPATIONS)[number])
        : occupationValue
          ? "Other"
          : base.personal.occupation,
      occupationDescription: occupationInList ? "" : occupationValue,
      phoneNumber: personal.phoneNumber || application.phone || "",
      email: personal.email || application.email || "",
      postalAddress: personal.postalAddress || "",
      residentialAddress: personal.residentialAddress || "",
    },
    guardian: {
      ...base.guardian,
      guardianName: guardian.guardianName || "",
      guardianTitle: pickOption(
        guardian.guardianTitle,
        GUARDIAN_TITLES,
        base.guardian.guardianTitle,
      ),
      relationship: pickOption(
        guardian.relationship,
        RELATIONSHIPS,
        base.guardian.relationship,
      ),
      occupation: guardian.occupation || "",
      phoneNumber: guardian.phoneNumber || "",
      alternativePhone: guardian.alternativePhone || "",
      email: guardian.email || "",
      residentialAddress:
        guardian.residentialAddress || guardian.address || "",
      postalAddress: guardian.postalAddress || "",
      nationality: pickOption(
        guardian.nationality,
        NATIONALITIES,
        base.guardian.nationality,
      ),
    },
    programme: {
      firstChoiceProgramme: first.programme,
      firstChoiceStream: first.stream,
      secondChoiceProgramme: second.programme,
      secondChoiceStream: second.stream,
      thirdChoiceProgramme: third.programme,
      thirdChoiceStream: third.stream,
      fourthChoiceProgramme: fourth.programme,
      fourthChoiceStream: fourth.stream,
    },
    educations,
    examSittings,
    documents: {
      passportPhoto:
        documents.passportPhoto || personal.passportPhoto || "",
      resultSlip: documents.resultSlip || "",
      birthCertificate: documents.birthCertificate || "",
      sssceResultSlip: documents.sssceResultSlip || documents.transcript || "",
      nationalId: documents.nationalId || "",
    },
    declarationAccepted: false,
  };
}

export const tabSchemas = {
  personal: personalInfoSchema,
  guardian: guardianInfoSchema,
  programme: programmeChoicesSchema,
  education: educationTabSchema,
  examination: examinationTabSchema,
  results: examinationResultsSchema,
  documents: documentsSchema,
  review: reviewSchema,
} as const;
