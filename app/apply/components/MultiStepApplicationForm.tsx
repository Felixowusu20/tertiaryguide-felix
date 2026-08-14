"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Save,
} from "lucide-react";
import {
  APPLICATION_TABS,
  CORE_SUBJECTS,
  COUNTRIES,
  ELECTIVE_SUBJECTS,
  EXAM_BODIES,
  EXAM_TYPES,
  GENDERS,
  GHANA_REGIONS,
  GHANA_SHS_SCHOOLS,
  GUARDIAN_TITLES,
  INSTITUTION_TYPES,
  MARITAL_STATUSES,
  MONTHS,
  NATIONALITIES,
  OCCUPATIONS,
  RELATIONSHIPS,
  SHS_PROGRAMMES,
  SITTING_TYPES,
  TITLES,
  WASSCE_GRADES,
  daysInMonth,
  yearOptions,
  type ApplicationTabId,
} from "@/lib/admissions/form-options";
import {
  dobToIso,
  emptyApplicationForm,
  fieldErrorsFromZod,
  tabSchemas,
  type ApplicationFormState,
} from "@/lib/admissions/form-schema";
import {
  readApplySession,
  writeApplySession,
} from "@/lib/admissions/applicant-session";
import { Field, SearchableSelect, TextInput, TextSelect } from "./FormControls";
import { FileDropzone } from "./FileDropzone";

type ProgrammeOption = {
  id: string;
  name: string;
  streams: string[];
};

type Props = {
  schoolId: string;
  schoolName: string;
  schoolSlug?: string | null;
  voucherCode?: string;
  serialNumber?: string;
  loginEmail?: string;
  loginPassword?: string;
  initialEmail?: string;
  onSubmitted: (result: {
    applicationNumber: string;
    schoolName: string;
    updated?: boolean;
  }) => void;
};

const LOCAL_DRAFT_PREFIX = "tg_application_draft_";

function localDraftKey(schoolId: string, voucherCode?: string, serialNumber?: string) {
  const id =
    voucherCode && serialNumber
      ? `${schoolId}:${voucherCode}:${serialNumber}`
      : schoolId;
  return `${LOCAL_DRAFT_PREFIX}${id}`;
}

export function MultiStepApplicationForm({
  schoolId,
  schoolName,
  schoolSlug,
  voucherCode: voucherCodeProp,
  serialNumber: serialNumberProp,
  loginEmail,
  loginPassword,
  initialEmail,
  onSubmitted,
}: Props) {
  const [credentials, setCredentials] = useState(() => {
    const saved = readApplySession(schoolId);
    return {
      voucherCode: (voucherCodeProp || saved?.voucherCode || "").trim().toUpperCase(),
      serialNumber: (serialNumberProp || saved?.serialNumber || "")
        .trim()
        .toUpperCase(),
    };
  });

  const [form, setForm] = useState<ApplicationFormState>(() => {
    const base = emptyApplicationForm();
    if (initialEmail) base.personal.email = initialEmail;
    return base;
  });
  const [tab, setTab] = useState<ApplicationTabId>("personal");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [programmes, setProgrammes] = useState<ProgrammeOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftMsg, setDraftMsg] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [draftReady, setDraftReady] = useState(false);

  const formRef = React.useRef(form);
  const tabRef = React.useRef(tab);
  formRef.current = form;
  tabRef.current = tab;

  const tabIndex = APPLICATION_TABS.findIndex((t) => t.id === tab);
  const voucherCode = credentials.voucherCode;
  const serialNumber = credentials.serialNumber;

  useEffect(() => {
    const saved = readApplySession(schoolId);
    const nextCode = (voucherCodeProp || saved?.voucherCode || "")
      .trim()
      .toUpperCase();
    const nextSerial = (serialNumberProp || saved?.serialNumber || "")
      .trim()
      .toUpperCase();
    if (!nextCode || !nextSerial) return;
    setCredentials({ voucherCode: nextCode, serialNumber: nextSerial });
    writeApplySession({
      schoolId,
      schoolSlug,
      voucherCode: nextCode,
      serialNumber: nextSerial,
      email: initialEmail,
    });
  }, [schoolId, schoolSlug, voucherCodeProp, serialNumberProp, initialEmail]);

  useEffect(() => {
    void fetch(`/api/apply/programmes?schoolId=${encodeURIComponent(schoolId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.programmes) setProgrammes(data.programmes);
      })
      .catch(() => undefined);
  }, [schoolId]);

  const mergeDraft = useCallback(
    (draftForm: Partial<ApplicationFormState>, currentTab?: string) => {
      setForm((prev) => ({
        ...prev,
        ...draftForm,
        personal: { ...prev.personal, ...(draftForm.personal || {}) },
        guardian: { ...prev.guardian, ...(draftForm.guardian || {}) },
        programme: { ...prev.programme, ...(draftForm.programme || {}) },
        education: { ...prev.education, ...(draftForm.education || {}) },
        examination: {
          ...prev.examination,
          ...(draftForm.examination || {}),
        },
        results: { ...prev.results, ...(draftForm.results || {}) },
        documents: { ...prev.documents, ...(draftForm.documents || {}) },
        declarationAccepted: !!draftForm.declarationAccepted,
      }));
      if (currentTab) setTab(currentTab as ApplicationTabId);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      try {
        const localRaw = window.localStorage.getItem(
          localDraftKey(schoolId, voucherCode || undefined, serialNumber || undefined),
        );
        if (localRaw) {
          const parsed = JSON.parse(localRaw) as {
            formData?: ApplicationFormState;
            currentTab?: string;
          };
          if (parsed.formData && !cancelled) {
            mergeDraft(parsed.formData, parsed.currentTab);
            setDraftMsg("Progress restored");
          }
        }
      } catch {
        // ignore
      }

      if (voucherCode && serialNumber) {
        try {
          const res = await fetch(
            `/api/apply/draft?schoolId=${encodeURIComponent(schoolId)}&voucherCode=${encodeURIComponent(voucherCode)}&serialNumber=${encodeURIComponent(serialNumber)}`,
          );
          const data = await res.json();
          if (!cancelled && data.draft?.formData) {
            mergeDraft(data.draft.formData, data.draft.currentTab);
            setDraftMsg("Draft restored");
          }
        } catch {
          // ignore
        }
      }

      if (!cancelled) setDraftReady(true);
    }

    void restore();
    return () => {
      cancelled = true;
    };
  }, [schoolId, voucherCode, serialNumber, mergeDraft]);

  const saveDraft = useCallback(
    async (opts?: { silent?: boolean }) => {
      const currentForm = formRef.current;
      const currentTab = tabRef.current;

      try {
        window.localStorage.setItem(
          localDraftKey(schoolId, voucherCode || undefined, serialNumber || undefined),
          JSON.stringify({
            formData: currentForm,
            currentTab,
            updatedAt: new Date().toISOString(),
          }),
        );
      } catch {
        // ignore quota errors
      }

      if (!voucherCode || !serialNumber) {
        if (!opts?.silent) {
          setDraftMsg(`Saved locally ${new Date().toLocaleTimeString()}`);
        }
        return;
      }

      if (!opts?.silent) setSavingDraft(true);
      try {
        const res = await fetch("/api/apply/draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schoolId,
            voucherCode,
            serialNumber,
            formData: currentForm,
            currentTab,
          }),
        });
        if (res.ok) {
          setDraftMsg(`Draft saved ${new Date().toLocaleTimeString()}`);
        }
      } finally {
        if (!opts?.silent) setSavingDraft(false);
      }
    },
    [schoolId, serialNumber, voucherCode],
  );

  useEffect(() => {
    if (!draftReady) return;
    void saveDraft({ silent: true });
  }, [draftReady, saveDraft]);

  useEffect(() => {
    if (!draftReady) return;
    const id = window.setTimeout(() => {
      void saveDraft({ silent: true });
    }, 2000);
    return () => window.clearTimeout(id);
  }, [form, tab, draftReady, saveDraft]);

  useEffect(() => {
    if (!draftReady) return;
    const id = window.setInterval(() => {
      void saveDraft({ silent: true });
    }, 30000);
    return () => window.clearInterval(id);
  }, [draftReady, saveDraft]);

  const years = useMemo(() => yearOptions(70, 14), []);
  const dayCount = daysInMonth(
    form.personal.dateOfBirthMonth,
    form.personal.dateOfBirthYear,
  );

  const streamsFor = (programmeName: string) => {
    const found = programmes.find((p) => p.name === programmeName);
    return found?.streams ?? [];
  };

  const validateTab = (id: ApplicationTabId): boolean => {
    const schema = tabSchemas[id];
    let payload: unknown = null;
    if (id === "personal") payload = form.personal;
    if (id === "guardian") payload = form.guardian;
    if (id === "programme") payload = form.programme;
    if (id === "education") payload = form.education;
    if (id === "examination") payload = form.examination;
    if (id === "results") payload = form.results;
    if (id === "documents") payload = form.documents;
    if (id === "review") payload = { declarationAccepted: form.declarationAccepted };

    const result = schema.safeParse(payload);
    if (!result.success) {
      setErrors(fieldErrorsFromZod(result.error));
      return false;
    }
    setErrors({});
    return true;
  };

  const goNext = () => {
    if (!validateTab(tab)) return;
    const next = APPLICATION_TABS[tabIndex + 1];
    if (next) setTab(next.id);
    void saveDraft();
  };

  const goPrev = () => {
    const prev = APPLICATION_TABS[tabIndex - 1];
    if (prev) setTab(prev.id);
  };

  const submit = async () => {
    for (const t of APPLICATION_TABS) {
      if (!validateTab(t.id)) {
        setTab(t.id);
        return;
      }
    }

    const saved = readApplySession(schoolId);
    const finalCode = (
      voucherCode ||
      voucherCodeProp ||
      saved?.voucherCode ||
      ""
    )
      .trim()
      .toUpperCase();
    const finalSerial = (
      serialNumber ||
      serialNumberProp ||
      saved?.serialNumber ||
      ""
    )
      .trim()
      .toUpperCase();

    if (!finalCode || !finalSerial) {
      setSubmitError(
        "Your voucher session expired. Please log in again with your Serial Number and PIN.",
      );
      return;
    }

    setCredentials({ voucherCode: finalCode, serialNumber: finalSerial });
    writeApplySession({
      schoolId,
      schoolSlug,
      voucherCode: finalCode,
      serialNumber: finalSerial,
      email: form.personal.email || initialEmail,
    });

    setBusy(true);
    setSubmitError(null);
    try {
      const personal = form.personal;
      const resultsPayload = [
        ...form.results.coreResults.map((r) => ({
          subject: r.subject,
          grade: r.grade,
        })),
        ...form.results.electiveResults
          .filter((r) => r.subject && r.grade)
          .map((r) => ({ subject: r.subject!, grade: r.grade! })),
      ];

      const res = await fetch("/api/apply/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          voucherCode: finalCode,
          serialNumber: finalSerial,
          loginEmail,
          loginPassword,
          personalInfo: {
            title: personal.title,
            surname: personal.surname,
            firstName: personal.firstName,
            middleName: personal.middleName,
            gender: personal.gender,
            dateOfBirth: dobToIso(personal),
            maritalStatus: personal.maritalStatus,
            homeRegion: personal.homeRegion,
            homeCountry: personal.homeCountry,
            nationality: personal.nationality,
            occupation:
              personal.occupation === "Other"
                ? personal.occupationDescription || "Other"
                : personal.occupation,
            phoneNumber: personal.phoneNumber,
            email: personal.email,
            postalAddress: personal.postalAddress,
            residentialAddress: personal.residentialAddress,
            passportPhoto: form.documents.passportPhoto,
          },
          guardianInfo: form.guardian,
          programmeChoices: {
            firstChoice: `${form.programme.firstChoiceProgramme}${form.programme.firstChoiceStream ? ` — ${form.programme.firstChoiceStream}` : ""}`,
            secondChoice: form.programme.secondChoiceProgramme
              ? `${form.programme.secondChoiceProgramme}${form.programme.secondChoiceStream ? ` — ${form.programme.secondChoiceStream}` : ""}`
              : "",
            thirdChoice: form.programme.thirdChoiceProgramme
              ? `${form.programme.thirdChoiceProgramme}${form.programme.thirdChoiceStream ? ` — ${form.programme.thirdChoiceStream}` : ""}`
              : "",
            fourthChoice: form.programme.fourthChoiceProgramme
              ? `${form.programme.fourthChoiceProgramme}${form.programme.fourthChoiceStream ? ` — ${form.programme.fourthChoiceStream}` : ""}`
              : "",
            firstChoiceProgramme: form.programme.firstChoiceProgramme,
            firstChoiceStream: form.programme.firstChoiceStream,
            secondChoiceProgramme: form.programme.secondChoiceProgramme,
            secondChoiceStream: form.programme.secondChoiceStream,
            thirdChoiceProgramme: form.programme.thirdChoiceProgramme,
            thirdChoiceStream: form.programme.thirdChoiceStream,
            fourthChoiceProgramme: form.programme.fourthChoiceProgramme,
            fourthChoiceStream: form.programme.fourthChoiceStream,
          },
          educationalBackground: [form.education],
          examinationInfo: form.examination,
          results: resultsPayload,
          documents: {
            passportPhoto: form.documents.passportPhoto,
            resultSlip: form.documents.resultSlip,
            birthCertificate: form.documents.birthCertificate,
            nationalId: form.documents.nationalId || undefined,
            transcript: form.documents.sssceResultSlip || undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");

      try {
        window.localStorage.removeItem(
          localDraftKey(schoolId, finalCode, finalSerial),
        );
      } catch {
        // ignore
      }

      onSubmitted({
        applicationNumber: data.application.applicationNumber,
        schoolName: data.application.schoolName || schoolName,
        updated: data.updated,
      });
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setBusy(false);
    }
  };

  const setPersonal = <K extends keyof ApplicationFormState["personal"]>(
    key: K,
    value: ApplicationFormState["personal"][K],
  ) => setForm((f) => ({ ...f, personal: { ...f.personal, [key]: value } }));

  const setGuardian = <K extends keyof ApplicationFormState["guardian"]>(
    key: K,
    value: ApplicationFormState["guardian"][K],
  ) => setForm((f) => ({ ...f, guardian: { ...f.guardian, [key]: value } }));

  const setProgramme = <K extends keyof ApplicationFormState["programme"]>(
    key: K,
    value: ApplicationFormState["programme"][K],
  ) => setForm((f) => ({ ...f, programme: { ...f.programme, [key]: value } }));

  const setEducation = <K extends keyof ApplicationFormState["education"]>(
    key: K,
    value: ApplicationFormState["education"][K],
  ) => setForm((f) => ({ ...f, education: { ...f.education, [key]: value } }));

  const setExamination = <K extends keyof ApplicationFormState["examination"]>(
    key: K,
    value: ApplicationFormState["examination"][K],
  ) =>
    setForm((f) => ({ ...f, examination: { ...f.examination, [key]: value } }));

  return (
    <div className="space-y-5">
      {/* Progress */}
      <div className="rounded-3xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[#0F172A]">
            Step {tabIndex + 1} of {APPLICATION_TABS.length}:{" "}
            {APPLICATION_TABS[tabIndex]?.label}
          </p>
          <button
            type="button"
            onClick={() => void saveDraft()}
            disabled={savingDraft}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--school-brand-border,#BFDBFE)] px-3 py-1.5 text-xs font-medium text-[var(--school-brand,#007AFF)] disabled:opacity-50"
          >
            {savingDraft ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save draft
          </button>
        </div>
        <div className="mb-3 h-2 overflow-hidden rounded-full bg-[#E2E8F0]">
          <div
            className="h-full rounded-full bg-[var(--school-brand,#007AFF)] transition-all"
            style={{
              width: `${((tabIndex + 1) / APPLICATION_TABS.length) * 100}%`,
            }}
          />
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {APPLICATION_TABS.map((t, i) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                if (i <= tabIndex || validateTab(tab)) setTab(t.id);
              }}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                t.id === tab
                  ? "bg-[var(--school-brand,#007AFF)] text-white"
                  : i < tabIndex
                    ? "bg-[var(--school-brand-soft,#DBEAFE)] text-[var(--school-brand,#1D4ED8)]"
                    : "bg-[#F1F5F9] text-[#64748B]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {draftMsg && (
          <p className="mt-2 text-xs text-[#16A34A]">{draftMsg}</p>
        )}
      </div>

      <div className="rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-6">
        {tab === "personal" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" required error={errors.title}>
              <TextSelect
                value={form.personal.title}
                onChange={(e) =>
                  setPersonal("title", e.target.value as typeof form.personal.title)
                }
              >
                {TITLES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </TextSelect>
            </Field>
            <Field label="Surname" required error={errors.surname}>
              <TextInput
                value={form.personal.surname}
                onChange={(e) => setPersonal("surname", e.target.value)}
              />
            </Field>
            <Field label="First name" required error={errors.firstName}>
              <TextInput
                value={form.personal.firstName}
                onChange={(e) => setPersonal("firstName", e.target.value)}
              />
            </Field>
            <Field label="Middle / other names">
              <TextInput
                value={form.personal.middleName || ""}
                onChange={(e) => setPersonal("middleName", e.target.value)}
              />
            </Field>
            <div className="sm:col-span-2">
              <p className="mb-1.5 text-sm font-medium text-[#334155]">
                Date of birth <span className="text-red-500">*</span>
              </p>
              <div className="grid grid-cols-3 gap-2">
                <TextSelect
                  value={form.personal.dateOfBirthDay}
                  onChange={(e) => setPersonal("dateOfBirthDay", e.target.value)}
                >
                  <option value="">Day</option>
                  {Array.from({ length: dayCount }, (_, i) =>
                    String(i + 1).padStart(2, "0"),
                  ).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </TextSelect>
                <TextSelect
                  value={form.personal.dateOfBirthMonth}
                  onChange={(e) => setPersonal("dateOfBirthMonth", e.target.value)}
                >
                  <option value="">Month</option>
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </TextSelect>
                <TextSelect
                  value={form.personal.dateOfBirthYear}
                  onChange={(e) => setPersonal("dateOfBirthYear", e.target.value)}
                >
                  <option value="">Year</option>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </TextSelect>
              </div>
              {(errors.dateOfBirthDay ||
                errors.dateOfBirthMonth ||
                errors.dateOfBirthYear) && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.dateOfBirthDay ||
                    errors.dateOfBirthMonth ||
                    errors.dateOfBirthYear}
                </p>
              )}
            </div>
            <Field label="Gender" required error={errors.gender}>
              <TextSelect
                value={form.personal.gender}
                onChange={(e) =>
                  setPersonal("gender", e.target.value as typeof form.personal.gender)
                }
              >
                {GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </TextSelect>
            </Field>
            <Field label="Marital status" required error={errors.maritalStatus}>
              <TextSelect
                value={form.personal.maritalStatus}
                onChange={(e) =>
                  setPersonal(
                    "maritalStatus",
                    e.target.value as typeof form.personal.maritalStatus,
                  )
                }
              >
                {MARITAL_STATUSES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </TextSelect>
            </Field>
            <Field label="Home region" required error={errors.homeRegion}>
              <TextSelect
                value={form.personal.homeRegion}
                onChange={(e) =>
                  setPersonal(
                    "homeRegion",
                    e.target.value as typeof form.personal.homeRegion,
                  )
                }
              >
                {GHANA_REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </TextSelect>
            </Field>
            <Field label="Home country" required error={errors.homeCountry}>
              <TextSelect
                value={form.personal.homeCountry}
                onChange={(e) =>
                  setPersonal(
                    "homeCountry",
                    e.target.value as typeof form.personal.homeCountry,
                  )
                }
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </TextSelect>
            </Field>
            <Field label="Nationality" required error={errors.nationality}>
              <TextSelect
                value={form.personal.nationality}
                onChange={(e) =>
                  setPersonal(
                    "nationality",
                    e.target.value as typeof form.personal.nationality,
                  )
                }
              >
                {NATIONALITIES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </TextSelect>
            </Field>
            <Field label="Present occupation" required error={errors.occupation}>
              <TextSelect
                value={form.personal.occupation}
                onChange={(e) =>
                  setPersonal(
                    "occupation",
                    e.target.value as typeof form.personal.occupation,
                  )
                }
              >
                {OCCUPATIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </TextSelect>
            </Field>
            {form.personal.occupation === "Other" && (
              <Field
                label="Occupation description"
                required
                error={errors.occupationDescription}
                className="sm:col-span-2"
              >
                <TextInput
                  value={form.personal.occupationDescription || ""}
                  onChange={(e) =>
                    setPersonal("occupationDescription", e.target.value)
                  }
                />
              </Field>
            )}
            <Field label="Phone number" required error={errors.phoneNumber}>
              <TextInput
                value={form.personal.phoneNumber}
                onChange={(e) => setPersonal("phoneNumber", e.target.value)}
                placeholder="024XXXXXXX"
              />
            </Field>
            <Field label="Email address" required error={errors.email}>
              <TextInput
                type="email"
                value={form.personal.email}
                onChange={(e) => setPersonal("email", e.target.value)}
              />
            </Field>
            <Field
              label="Postal address"
              required
              error={errors.postalAddress}
              className="sm:col-span-2"
            >
              <TextInput
                value={form.personal.postalAddress}
                onChange={(e) => setPersonal("postalAddress", e.target.value)}
              />
            </Field>
            <Field
              label="Residential address"
              required
              error={errors.residentialAddress}
              className="sm:col-span-2"
            >
              <TextInput
                value={form.personal.residentialAddress}
                onChange={(e) =>
                  setPersonal("residentialAddress", e.target.value)
                }
              />
            </Field>
          </div>
        )}

        {tab === "guardian" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Guardian title" required error={errors.guardianTitle}>
              <TextSelect
                value={form.guardian.guardianTitle}
                onChange={(e) =>
                  setGuardian(
                    "guardianTitle",
                    e.target.value as typeof form.guardian.guardianTitle,
                  )
                }
              >
                {GUARDIAN_TITLES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </TextSelect>
            </Field>
            <Field label="Guardian name" required error={errors.guardianName}>
              <TextInput
                value={form.guardian.guardianName}
                onChange={(e) => setGuardian("guardianName", e.target.value)}
              />
            </Field>
            <Field label="Relationship" required error={errors.relationship}>
              <TextSelect
                value={form.guardian.relationship}
                onChange={(e) =>
                  setGuardian(
                    "relationship",
                    e.target.value as typeof form.guardian.relationship,
                  )
                }
              >
                {RELATIONSHIPS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </TextSelect>
            </Field>
            <Field label="Occupation" required error={errors.occupation}>
              <TextInput
                value={form.guardian.occupation}
                onChange={(e) => setGuardian("occupation", e.target.value)}
              />
            </Field>
            <Field label="Phone number" required error={errors.phoneNumber}>
              <TextInput
                value={form.guardian.phoneNumber}
                onChange={(e) => setGuardian("phoneNumber", e.target.value)}
              />
            </Field>
            <Field label="Alternative phone" error={errors.alternativePhone}>
              <TextInput
                value={form.guardian.alternativePhone || ""}
                onChange={(e) => setGuardian("alternativePhone", e.target.value)}
              />
            </Field>
            <Field label="Email" error={errors.email}>
              <TextInput
                type="email"
                value={form.guardian.email || ""}
                onChange={(e) => setGuardian("email", e.target.value)}
              />
            </Field>
            <Field label="Nationality" required error={errors.nationality}>
              <TextSelect
                value={form.guardian.nationality}
                onChange={(e) =>
                  setGuardian(
                    "nationality",
                    e.target.value as typeof form.guardian.nationality,
                  )
                }
              >
                {NATIONALITIES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </TextSelect>
            </Field>
            <Field
              label="Residential address"
              required
              error={errors.residentialAddress}
              className="sm:col-span-2"
            >
              <TextInput
                value={form.guardian.residentialAddress}
                onChange={(e) =>
                  setGuardian("residentialAddress", e.target.value)
                }
              />
            </Field>
            <Field label="Postal address" className="sm:col-span-2">
              <TextInput
                value={form.guardian.postalAddress || ""}
                onChange={(e) => setGuardian("postalAddress", e.target.value)}
              />
            </Field>
          </div>
        )}

        {tab === "programme" && (
          <div className="space-y-4">
            {programmes.length === 0 && (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
                This school has not published programmes yet. Ask the school admin
                to add programmes and streams in their portal.
              </p>
            )}
            {(
              [
                ["first", true],
                ["second", false],
                ["third", false],
                ["fourth", false],
              ] as const
            ).map(([ord, required]) => {
              const progKey =
                `${ord}ChoiceProgramme` as keyof ApplicationFormState["programme"];
              const streamKey =
                `${ord}ChoiceStream` as keyof ApplicationFormState["programme"];
              const progVal = form.programme[progKey] as string;
              return (
                <div
                  key={ord}
                  className="grid gap-3 rounded-2xl border border-[#F1F5F9] p-4 sm:grid-cols-2"
                >
                  <Field
                    label={`${ord[0]!.toUpperCase()}${ord.slice(1)} choice programme`}
                    required={required}
                    error={errors[progKey]}
                  >
                    <TextSelect
                      value={progVal}
                      onChange={(e) => {
                        setProgramme(progKey, e.target.value);
                        setProgramme(streamKey, "");
                      }}
                    >
                      <option value="">Select programme</option>
                      {programmes.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </TextSelect>
                  </Field>
                  <Field
                    label={`${ord[0]!.toUpperCase()}${ord.slice(1)} choice stream`}
                    required={required || !!progVal}
                    error={errors[streamKey]}
                  >
                    <TextSelect
                      value={form.programme[streamKey] as string}
                      onChange={(e) => setProgramme(streamKey, e.target.value)}
                      disabled={!progVal}
                    >
                      <option value="">Select stream</option>
                      {streamsFor(progVal).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </TextSelect>
                  </Field>
                </div>
              );
            })}
          </div>
        )}

        {tab === "education" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Institution name"
              required
              error={errors.institutionName}
              className="sm:col-span-2"
            >
              <SearchableSelect
                options={GHANA_SHS_SCHOOLS}
                value={form.education.institutionName}
                onChange={(v) => setEducation("institutionName", v)}
                placeholder="Search SHS…"
                allowOther
                error={!!errors.institutionName}
              />
            </Field>
            <Field label="Institution type" required error={errors.institutionType}>
              <TextSelect
                value={form.education.institutionType}
                onChange={(e) =>
                  setEducation(
                    "institutionType",
                    e.target.value as typeof form.education.institutionType,
                  )
                }
              >
                {INSTITUTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </TextSelect>
            </Field>
            <Field label="Programme pursued" required error={errors.programmePursued}>
              <TextSelect
                value={form.education.programmePursued}
                onChange={(e) =>
                  setEducation(
                    "programmePursued",
                    e.target.value as typeof form.education.programmePursued,
                  )
                }
              >
                {SHS_PROGRAMMES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </TextSelect>
            </Field>
            <Field label="Start date" required error={errors.startDate}>
              <TextInput
                type="date"
                value={form.education.startDate}
                onChange={(e) => setEducation("startDate", e.target.value)}
              />
            </Field>
            <Field label="End date" required error={errors.endDate}>
              <TextInput
                type="date"
                value={form.education.endDate}
                onChange={(e) => setEducation("endDate", e.target.value)}
              />
            </Field>
            <Field label="Country of institution" required error={errors.country}>
              <TextSelect
                value={form.education.country}
                onChange={(e) =>
                  setEducation(
                    "country",
                    e.target.value as typeof form.education.country,
                  )
                }
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </TextSelect>
            </Field>
            <Field label="Region of institution" required error={errors.region}>
              <TextSelect
                value={form.education.region}
                onChange={(e) =>
                  setEducation(
                    "region",
                    e.target.value as typeof form.education.region,
                  )
                }
              >
                {GHANA_REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </TextSelect>
            </Field>
          </div>
        )}

        {tab === "examination" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Examination type" required error={errors.examType}>
              <TextSelect
                value={form.examination.examType}
                onChange={(e) =>
                  setExamination(
                    "examType",
                    e.target.value as typeof form.examination.examType,
                  )
                }
              >
                {EXAM_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </TextSelect>
            </Field>
            <Field label="Examination body" required error={errors.examBody}>
              <TextSelect
                value={form.examination.examBody}
                onChange={(e) =>
                  setExamination(
                    "examBody",
                    e.target.value as typeof form.examination.examBody,
                  )
                }
              >
                {EXAM_BODIES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </TextSelect>
            </Field>
            <Field label="Sitting type" required error={errors.sitting}>
              <TextSelect
                value={form.examination.sitting}
                onChange={(e) =>
                  setExamination(
                    "sitting",
                    e.target.value as typeof form.examination.sitting,
                  )
                }
              >
                {SITTING_TYPES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </TextSelect>
            </Field>
            <Field label="Examination year" required error={errors.examYear}>
              <TextSelect
                value={form.examination.examYear}
                onChange={(e) => setExamination("examYear", e.target.value)}
              >
                <option value="">Select year</option>
                {yearOptions(30, 0).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </TextSelect>
            </Field>
            <Field label="Index number" required error={errors.indexNumber}>
              <TextInput
                value={form.examination.indexNumber}
                onChange={(e) => setExamination("indexNumber", e.target.value)}
              />
            </Field>
            <Field label="Candidate number" required error={errors.candidateNumber}>
              <TextInput
                value={form.examination.candidateNumber}
                onChange={(e) =>
                  setExamination("candidateNumber", e.target.value)
                }
              />
            </Field>
            <Field
              label="Examination centre"
              required
              error={errors.examinationCentre}
              className="sm:col-span-2"
            >
              <TextInput
                value={form.examination.examinationCentre}
                onChange={(e) =>
                  setExamination("examinationCentre", e.target.value)
                }
              />
            </Field>
          </div>
        )}

        {tab === "results" && (
          <div className="space-y-6">
            <div>
              <h3 className="mb-3 text-sm font-semibold text-[#0F172A]">
                Core subjects
              </h3>
              <div className="space-y-2">
                {CORE_SUBJECTS.map((subject, index) => (
                  <div
                    key={subject}
                    className="grid grid-cols-[1fr_8rem] items-center gap-2"
                  >
                    <span className="text-sm text-[#334155]">{subject}</span>
                    <TextSelect
                      value={form.results.coreResults[index]?.grade || ""}
                      onChange={(e) => {
                        const next = [...form.results.coreResults];
                        next[index] = {
                          subject,
                          grade: e.target.value as (typeof WASSCE_GRADES)[number],
                        };
                        setForm((f) => ({
                          ...f,
                          results: { ...f.results, coreResults: next },
                        }));
                      }}
                    >
                      <option value="">Grade</option>
                      {WASSCE_GRADES.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </TextSelect>
                  </div>
                ))}
              </div>
              {errors.coreResults && (
                <p className="mt-2 text-xs text-red-600">{errors.coreResults}</p>
              )}
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold text-[#0F172A]">
                Elective subjects (up to 8)
              </h3>
              <div className="space-y-2">
                {form.results.electiveResults.map((row, index) => (
                  <div key={index} className="grid grid-cols-2 gap-2">
                    <TextSelect
                      value={row.subject || ""}
                      onChange={(e) => {
                        const next = [...form.results.electiveResults];
                        next[index] = { ...row, subject: e.target.value };
                        setForm((f) => ({
                          ...f,
                          results: { ...f.results, electiveResults: next },
                        }));
                      }}
                    >
                      <option value="">Subject</option>
                      {ELECTIVE_SUBJECTS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </TextSelect>
                    <TextSelect
                      value={row.grade || ""}
                      onChange={(e) => {
                        const next = [...form.results.electiveResults];
                        next[index] = { ...row, grade: e.target.value };
                        setForm((f) => ({
                          ...f,
                          results: { ...f.results, electiveResults: next },
                        }));
                      }}
                    >
                      <option value="">Grade</option>
                      {WASSCE_GRADES.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </TextSelect>
                  </div>
                ))}
              </div>
              {errors.electiveResults && (
                <p className="mt-2 text-xs text-red-600">
                  {errors.electiveResults}
                </p>
              )}
            </div>
          </div>
        )}

        {tab === "documents" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FileDropzone
              label="Passport photograph"
              required
              accept="image/jpeg,image/jpg,image/png,.jpg,.jpeg,.png"
              maxMb={5}
              value={form.documents.passportPhoto}
              error={errors.passportPhoto}
              onUploaded={(url) =>
                setForm((f) => ({
                  ...f,
                  documents: { ...f.documents, passportPhoto: url },
                }))
              }
              onClear={() =>
                setForm((f) => ({
                  ...f,
                  documents: { ...f.documents, passportPhoto: "" },
                }))
              }
            />
            <FileDropzone
              label="WASSCE result slip"
              required
              accept="image/jpeg,image/jpg,image/png,application/pdf,.pdf,.jpg,.jpeg,.png"
              maxMb={10}
              value={form.documents.resultSlip}
              error={errors.resultSlip}
              onUploaded={(url) =>
                setForm((f) => ({
                  ...f,
                  documents: { ...f.documents, resultSlip: url },
                }))
              }
              onClear={() =>
                setForm((f) => ({
                  ...f,
                  documents: { ...f.documents, resultSlip: "" },
                }))
              }
            />
            <FileDropzone
              label="Birth certificate"
              required
              accept="image/jpeg,image/jpg,image/png,application/pdf,.pdf,.jpg,.jpeg,.png"
              maxMb={10}
              value={form.documents.birthCertificate}
              error={errors.birthCertificate}
              onUploaded={(url) =>
                setForm((f) => ({
                  ...f,
                  documents: { ...f.documents, birthCertificate: url },
                }))
              }
              onClear={() =>
                setForm((f) => ({
                  ...f,
                  documents: { ...f.documents, birthCertificate: "" },
                }))
              }
            />
            <FileDropzone
              label="SSSCE result slip (optional)"
              accept="image/jpeg,image/jpg,image/png,application/pdf,.pdf,.jpg,.jpeg,.png"
              maxMb={10}
              value={form.documents.sssceResultSlip}
              onUploaded={(url) =>
                setForm((f) => ({
                  ...f,
                  documents: { ...f.documents, sssceResultSlip: url },
                }))
              }
              onClear={() =>
                setForm((f) => ({
                  ...f,
                  documents: { ...f.documents, sssceResultSlip: "" },
                }))
              }
            />
            <FileDropzone
              label="National ID (Ghana Card / Passport / Voter ID)"
              accept="image/jpeg,image/jpg,image/png,application/pdf,.pdf,.jpg,.jpeg,.png"
              maxMb={10}
              value={form.documents.nationalId}
              onUploaded={(url) =>
                setForm((f) => ({
                  ...f,
                  documents: { ...f.documents, nationalId: url },
                }))
              }
              onClear={() =>
                setForm((f) => ({
                  ...f,
                  documents: { ...f.documents, nationalId: "" },
                }))
              }
            />
          </div>
        )}

        {tab === "review" && (
          <div className="space-y-4 text-sm">
            <ReviewBlock title="Passport photograph">
              {form.documents.passportPhoto ? (
                <div className="flex items-start gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.documents.passportPhoto}
                    alt="Passport photograph"
                    className="h-36 w-28 rounded-xl border border-[#E2E8F0] object-cover shadow-sm"
                  />
                  <p className="text-xs text-[#64748B]">
                    Confirm this is a clear passport-size photo before submitting.
                  </p>
                </div>
              ) : (
                <p className="text-red-600">No passport photograph uploaded.</p>
              )}
            </ReviewBlock>
            <ReviewBlock title="Personal">
              <p>
                {form.personal.title} {form.personal.firstName}{" "}
                {form.personal.middleName} {form.personal.surname}
              </p>
              <p>
                {form.personal.gender} · {form.personal.maritalStatus}
              </p>
              <p>
                DOB: {form.personal.dateOfBirthDay}/
                {form.personal.dateOfBirthMonth}/{form.personal.dateOfBirthYear}
              </p>
              <p>
                {form.personal.phoneNumber} · {form.personal.email}
              </p>
              <p>
                {form.personal.homeRegion}, {form.personal.homeCountry} ·{" "}
                {form.personal.nationality}
              </p>
            </ReviewBlock>
            <ReviewBlock title="Guardian">
              <p>
                {form.guardian.guardianTitle} {form.guardian.guardianName} (
                {form.guardian.relationship})
              </p>
              <p>{form.guardian.phoneNumber}</p>
            </ReviewBlock>
            <ReviewBlock title="Programme choices">
              <p>
                1st: {form.programme.firstChoiceProgramme} —{" "}
                {form.programme.firstChoiceStream}
              </p>
              {form.programme.secondChoiceProgramme && (
                <p>
                  2nd: {form.programme.secondChoiceProgramme} —{" "}
                  {form.programme.secondChoiceStream}
                </p>
              )}
            </ReviewBlock>
            <ReviewBlock title="Education">
              <p>
                {form.education.institutionName} ({form.education.institutionType})
              </p>
              <p>{form.education.programmePursued}</p>
            </ReviewBlock>
            <ReviewBlock title="Examination">
              <p>
                {form.examination.examType} · {form.examination.sitting}{" "}
                {form.examination.examYear}
              </p>
              <p>Index: {form.examination.indexNumber}</p>
            </ReviewBlock>
            <ReviewBlock title="Documents">
              <p>
                WASSCE result slip:{" "}
                {form.documents.resultSlip ? "Uploaded" : "Missing"}
              </p>
              <p>
                Birth certificate:{" "}
                {form.documents.birthCertificate ? "Uploaded" : "Missing"}
              </p>
              {form.documents.nationalId ? <p>National ID: Uploaded</p> : null}
            </ReviewBlock>
            <label className="flex items-start gap-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
              <input
                type="checkbox"
                checked={form.declarationAccepted}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    declarationAccepted: e.target.checked,
                  }))
                }
                className="mt-1 h-4 w-4"
              />
              <span>
                I certify that the information provided is true and accurate.
                {errors.declarationAccepted && (
                  <span className="mt-1 block text-xs text-red-600">
                    {errors.declarationAccepted}
                  </span>
                )}
              </span>
            </label>
            {submitError && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-red-700">
                {submitError}
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#F1F5F9] pt-4">
          <button
            type="button"
            onClick={goPrev}
            disabled={tabIndex === 0}
            className="inline-flex items-center gap-1 rounded-full border border-[#E2E8F0] px-4 py-2 text-sm font-medium disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          {tab === "review" ? (
            <button
              type="button"
              onClick={() => void submit()}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--school-brand,#007AFF)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--school-brand-hover,#0062CC)] disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Submit application
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--school-brand,#007AFF)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--school-brand-hover,#0062CC)]"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#F1F5F9] p-4">
      <h4 className="mb-2 font-semibold text-[#0F172A]">{title}</h4>
      <div className="space-y-1 text-[#475569]">{children}</div>
    </div>
  );
}
