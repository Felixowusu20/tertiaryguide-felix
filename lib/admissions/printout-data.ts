import { certificateNameOrder } from "@/lib/admissions/declaration";
import type { RankedProgrammeChoice } from "@/lib/admissions/programme-choices";
import type { ApplicationFormState } from "@/lib/admissions/form-schema";

export type ApplicationPrintoutSchool = {
  name: string;
  logoSrc?: string | null;
  brandColor?: string | null;
  brandColors?: string[] | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
};

export type PrintField = { label: string; value: string };
export type PrintProgramme = {
  choice: string;
  programme: string;
  stream?: string;
};

export type PrintRecord = { heading: string; rows: PrintField[] };
export type PrintExamSitting = PrintRecord & {
  results: { subject: string; grade: string }[];
};

export type ApplicationPrintoutData = {
  applicationNumber?: string;
  photoUrl?: string | null;
  declarationName: string;
  personal: PrintField[];
  guardian: PrintField[];
  programmes: PrintProgramme[];
  educations: PrintRecord[];
  examinations: PrintExamSitting[];
  results: { subject: string; grade: string }[];
};

export function academicYearLabel(date = new Date()) {
  const year = date.getFullYear();
  const start = date.getMonth() >= 7 ? year : year - 1;
  return `${start}/${start + 1}`;
}

function upper(value?: string | null) {
  return (value || "").trim();
}

function formatPrintDate(value?: string | null) {
  const raw = (value || "").trim();
  if (!raw) return "";
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function kv(label: string, value?: string | null): PrintField | null {
  const next = upper(value);
  return next ? { label, value: next } : null;
}

function compact(rows: Array<PrintField | null>) {
  return rows.filter((row): row is PrintField => Boolean(row));
}

type ExamSittingPrintSource = {
  examType?: string;
  examBody?: string;
  sitting?: string;
  examYear?: string;
  indexNumber?: string;
  candidateNumber?: string;
  examinationCentre?: string;
  institutionName?: string;
  results?: { subject: string; grade: string }[];
};

function examSittingFields(
  exam: ExamSittingPrintSource | null | undefined,
): PrintField[] {
  const row = exam || {};
  return compact([
    kv("Exam Type", row.examType),
    kv("Exam Body", row.examBody),
    kv("Sitting", row.sitting),
    kv("Year", row.examYear),
    kv("Index Number", row.indexNumber),
    kv("Candidate Number", row.candidateNumber),
    kv("Centre", row.examinationCentre),
    kv("Institution", row.institutionName),
  ]);
}

function examSittingHeading(
  exam: ExamSittingPrintSource | null | undefined,
  index: number,
): string {
  const row = exam || {};
  const parts = [
    row.institutionName,
    row.examType,
    row.sitting,
    row.examYear,
  ].filter(Boolean);
  if (parts.length) return parts.join(" · ");
  return index === 0 ? "Examination" : `Additional examination ${index}`;
}

function gradeRows(
  rows?: { subject?: string; grade?: string }[] | null,
): { subject: string; grade: string }[] {
  return (rows || []).filter(
    (row): row is { subject: string; grade: string } =>
      Boolean(row.subject && row.grade),
  );
}

function educationFields(
  row: Record<string, string | undefined> | null | undefined,
): PrintField[] {
  const educationRow = row || {};
  return compact([
    kv("Institution", educationRow.institutionName),
    kv("Type", educationRow.institutionType),
    kv("Programme", educationRow.programmePursued),
    kv("Country", educationRow.country),
    kv("Region", educationRow.region),
    kv(
      "Period",
      [educationRow.startDate, educationRow.endDate].filter(Boolean).join(" – "),
    ),
  ]);
}

export type DetailLike = {
  applicationNumber?: string;
  email?: string;
  phone?: string | null;
  personalInfo?: Record<string, string | undefined> | null;
  guardianInfo?: Record<string, string | undefined> | null;
  programmes?: RankedProgrammeChoice[];
  educationalBackground?: Record<string, string | undefined>[];
  examinationInfo?: Record<string, string | undefined> | null;
  additionalExaminations?: ExamSittingPrintSource[] | null;
  examinationSittings?: ExamSittingPrintSource[] | null;
  results?: { subject: string; grade: string }[];
  documents?: Record<string, string | undefined> | null;
};

export function printoutFromDetail(
  detail?: DetailLike | null,
  programmes?: RankedProgrammeChoice[],
): ApplicationPrintoutData {
  const personal = detail?.personalInfo || {};
  const guardian = detail?.guardianInfo || {};
  const educationRows = detail?.educationalBackground?.length
    ? detail.educationalBackground
    : [{}];
  const storedSittings: ExamSittingPrintSource[] =
    detail?.examinationSittings?.length
      ? detail.examinationSittings
      : [
          { ...(detail?.examinationInfo || {}), results: detail?.results },
          ...(detail?.additionalExaminations || []),
        ];
  const ranked =
    programmes?.length ? programmes : detail?.programmes || [];

  const examinations = storedSittings.map((sitting, index) => {
    const results = gradeRows(
      sitting.results?.length
        ? sitting.results
        : index === 0
          ? detail?.results
          : [],
    );
    return {
      heading: examSittingHeading(sitting, index),
      rows: examSittingFields(sitting),
      results,
    };
  });
  const flattenedResults = examinations.flatMap((sitting) => sitting.results);

  return {
    applicationNumber: detail?.applicationNumber,
    photoUrl:
      detail?.documents?.passportPhoto ||
      personal.passportPhoto ||
      null,
    declarationName: certificateNameOrder(personal),
    personal: compact([
      kv("Applicant ID", detail?.applicationNumber),
      kv("Title", personal.title),
      kv("Surname", personal.surname),
      kv("Firstname", personal.firstName),
      kv("Middle Names", personal.middleName),
      kv("Date of Birth", formatPrintDate(personal.dateOfBirth)),
      kv("Gender", personal.gender),
      kv("Marital Status", personal.maritalStatus),
      kv("Home Country", personal.homeCountry),
      kv("Home Region", personal.homeRegion),
      kv("Nationality", personal.nationality),
      kv("Occupation", personal.occupation),
      kv("Phone Number", personal.phoneNumber || detail?.phone),
      kv("Email Address", personal.email || detail?.email),
      kv("Postal Address", personal.postalAddress),
      kv("Residential Address", personal.residentialAddress),
    ]),
    guardian: compact([
      kv("Name", [guardian.guardianTitle, guardian.guardianName].filter(Boolean).join(" ")),
      kv("Relation to Applicant", guardian.relationship),
      kv("Occupation", guardian.occupation),
      kv("Phone Number", guardian.phoneNumber),
      kv("Email Address", guardian.email),
      kv(
        "Physical Address",
        guardian.residentialAddress || guardian.address,
      ),
    ]),
    programmes: ranked
      .filter((item) => item.programme)
      .map((item) => ({
        choice: item.label,
        programme: item.programme,
        stream: item.stream,
      })),
    educations: educationRows.map((row, index) => ({
      heading: row.institutionName
        ? `Educational background — ${row.institutionName}`
        : index === 0
          ? "Educational background"
          : `Educational background ${index + 1}`,
      rows: educationFields(row),
    })),
    examinations,
    results: flattenedResults.length
      ? flattenedResults
      : (detail?.results || []).filter((row) => row.subject && row.grade),
  };
}

export function printoutFromForm(
  form: ApplicationFormState,
  applicationNumber?: string,
): ApplicationPrintoutData {
  const dob = [
    form.personal.dateOfBirthDay,
    form.personal.dateOfBirthMonth,
    form.personal.dateOfBirthYear,
  ]
    .filter(Boolean)
    .join("/");
  const choices: PrintProgramme[] = [
    {
      choice: "First",
      programme: form.programme.firstChoiceProgramme || "",
      stream: form.programme.firstChoiceStream || undefined,
    },
    {
      choice: "Second",
      programme: form.programme.secondChoiceProgramme || "",
      stream: form.programme.secondChoiceStream || undefined,
    },
    {
      choice: "Third",
      programme: form.programme.thirdChoiceProgramme || "",
      stream: form.programme.thirdChoiceStream || undefined,
    },
    {
      choice: "Fourth",
      programme: form.programme.fourthChoiceProgramme || "",
      stream: form.programme.fourthChoiceStream || undefined,
    },
  ].filter((row) => row.programme);

  const examinations = (form.examSittings || []).map((sitting, index) => {
    const institutionName =
      form.educations[sitting.institutionIndex]?.institutionName || "";
    return {
      heading: examSittingHeading(
        {
          institutionName,
          examType: sitting.examType,
          sitting: sitting.sitting,
          examYear: sitting.examYear,
        },
        index,
      ),
      rows: examSittingFields({
        examType: sitting.examType,
        examBody: sitting.examBody,
        sitting: sitting.sitting,
        examYear: sitting.examYear,
        indexNumber: sitting.indexNumber,
        candidateNumber: sitting.candidateNumber,
        examinationCentre: sitting.examinationCentre,
        institutionName,
      }),
      results: [
        ...sitting.coreResults,
        ...sitting.electiveResults,
      ].filter(
        (row): row is { subject: string; grade: string } =>
          Boolean(row.subject && row.grade),
      ),
    };
  });

  return {
    applicationNumber,
    photoUrl: form.documents.passportPhoto || null,
    declarationName: certificateNameOrder(form.personal),
    personal: compact([
      kv("Applicant ID", applicationNumber),
      kv("Title", form.personal.title),
      kv("Surname", form.personal.surname),
      kv("Firstname", form.personal.firstName),
      kv("Middle Names", form.personal.middleName),
      kv("Date of Birth", dob),
      kv("Gender", form.personal.gender),
      kv("Marital Status", form.personal.maritalStatus),
      kv("Home Country", form.personal.homeCountry),
      kv("Home Region", form.personal.homeRegion),
      kv("Nationality", form.personal.nationality),
      kv("Occupation", form.personal.occupation),
      kv("Phone Number", form.personal.phoneNumber),
      kv("Email Address", form.personal.email),
      kv("Postal Address", form.personal.postalAddress),
      kv("Residential Address", form.personal.residentialAddress),
    ]),
    guardian: compact([
      kv(
        "Name",
        [form.guardian.guardianTitle, form.guardian.guardianName]
          .filter(Boolean)
          .join(" "),
      ),
      kv("Relation to Applicant", form.guardian.relationship),
      kv("Occupation", form.guardian.occupation),
      kv("Phone Number", form.guardian.phoneNumber),
      kv("Email Address", form.guardian.email),
      kv("Physical Address", form.guardian.residentialAddress),
    ]),
    programmes: choices,
    educations: (form.educations || []).map((row, index) => ({
      heading: row.institutionName
        ? `Educational background — ${row.institutionName}`
        : index === 0
          ? "Educational background"
          : `Educational background ${index + 1}`,
      rows: educationFields(row),
    })),
    examinations,
    results: examinations.flatMap((sitting) => sitting.results),
  };
}
