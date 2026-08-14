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
  birthCertificate: z.string().url("Birth certificate is required"),
  sssceResultSlip: z.string().url().optional().or(z.literal("")),
  nationalId: z.string().url().optional().or(z.literal("")),
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
export type DocumentsForm = z.infer<typeof documentsSchema>;

export type ApplicationFormState = {
  personal: PersonalInfoForm;
  guardian: GuardianInfoForm;
  programme: ProgrammeChoicesForm;
  education: EducationalBackgroundForm;
  examination: ExaminationInfoForm;
  results: ExaminationResultsForm;
  documents: DocumentsForm;
  declarationAccepted: boolean;
};

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
    education: {
      institutionName: "",
      institutionType: "Public",
      programmePursued: "General Science",
      startDate: "",
      endDate: "",
      country: "Ghana",
      region: "Ashanti",
    },
    examination: {
      examType: "WASSCE",
      examBody: "WAEC",
      sitting: "May/June",
      examYear: "",
      indexNumber: "",
      candidateNumber: "",
      examinationCentre: "",
    },
    results: {
      coreResults: CORE_SUBJECTS.map((subject) => ({
        subject,
        grade: "" as unknown as (typeof WASSCE_GRADES)[number],
      })),
      electiveResults: Array.from({ length: 8 }, () => ({
        subject: "",
        grade: "",
      })),
    },
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

export const tabSchemas = {
  personal: personalInfoSchema,
  guardian: guardianInfoSchema,
  programme: programmeChoicesSchema,
  education: educationalBackgroundSchema,
  examination: examinationInfoSchema,
  results: examinationResultsSchema,
  documents: documentsSchema,
  review: reviewSchema,
} as const;
