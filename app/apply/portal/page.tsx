"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  ClipboardList,
  Loader2,
  LogOut,
  Pencil,
} from "lucide-react";
import { Header } from "@/app/components/Header";
import { Footer } from "@/app/components/Footer";
import { brandThemeStyle } from "@/lib/brand-theme";
import { requireClientAuth } from "@/lib/client-auth";

const SESSION_KEY = "tg_applicant_session";

type PartnerSchool = {
  id: string;
  name: string;
  alias: string | null;
  slug: string | null;
  logoSrc: string | null;
  requiresVoucher: boolean;
  brandColor?: string | null;
};

type ApplicationDetail = {
  id: string;
  applicationNumber: string;
  fullName: string;
  email: string;
  phone: string | null;
  programme: string | null;
  status: string;
  submittedAt: string;
  updatedAt: string;
  personalInfo?: Record<string, string | undefined>;
  guardianInfo?: Record<string, string | undefined> | null;
  programmeChoices?: Record<string, string | undefined> | null;
  educationalBackground?: Record<string, string | undefined>[];
  examinationInfo?: Record<string, string | undefined> | null;
  results?: { subject: string; grade: string }[];
  documents?: Record<string, string | undefined> | null;
  reviewNotes?: string | null;
};

type Session = {
  schoolId: string;
  schoolName: string;
  schoolSlug: string | null;
  brandColor?: string | null;
  voucherCode: string;
  serialNumber: string;
  application: ApplicationDetail | null;
  canEdit: boolean;
};

export default function ApplicantPortalPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#007AFF]" />
        </main>
      }
    >
      <ApplicantPortalContent />
    </Suspense>
  );
}

function ApplicantPortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [schools, setSchools] = useState<PartnerSchool[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [personal, setPersonal] = useState({
    title: "",
    surname: "",
    firstName: "",
    middleName: "",
    gender: "",
    dateOfBirth: "",
    maritalStatus: "",
    homeRegion: "",
    homeCountry: "Ghana",
    occupation: "",
    phoneNumber: "",
    email: "",
    postalAddress: "",
    residentialAddress: "",
  });
  const [guardian, setGuardian] = useState({
    guardianName: "",
    relationship: "",
    occupation: "",
    phoneNumber: "",
    email: "",
    address: "",
  });
  const [programmes, setProgrammes] = useState({
    firstChoice: "",
    secondChoice: "",
    thirdChoice: "",
    fourthChoice: "",
  });
  const [education, setEducation] = useState({
    institutionName: "",
    programmePursued: "",
    startDate: "",
    endDate: "",
  });
  const [exam, setExam] = useState({
    examType: "WASSCE",
    sitting: "",
    examYear: "",
    indexNumber: "",
  });
  const [results, setResults] = useState([{ subject: "", grade: "" }]);
  const [documents, setDocuments] = useState<Record<string, string>>({});
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const email = requireClientAuth(router);
    if (!email) return;
    setAuthReady(true);
  }, [router]);

  useEffect(() => {
    if (!authReady) return;

    void fetch("/api/apply/schools")
      .then((r) => r.json())
      .then((data) => {
        if (data.schools) setSchools(data.schools);
      })
      .catch(() => undefined);

    try {
      const raw = window.localStorage.getItem(SESSION_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Session;
        if (saved?.voucherCode && saved?.schoolId) {
          setSession(saved);
          setSchoolId(saved.schoolId);
          setVoucherCode(saved.voucherCode);
          setSerialNumber(saved.serialNumber);
          if (saved.application) hydrateForm(saved.application);
        }
      }
    } catch {
      // ignore
    }

    const code = searchParams.get("voucherCode");
    const serial = searchParams.get("serialNumber");
    const sid = searchParams.get("schoolId");
    if (code) setVoucherCode(code.toUpperCase());
    if (serial) setSerialNumber(serial.toUpperCase());
    if (sid) setSchoolId(sid);
  }, [authReady, searchParams]);

  function hydrateForm(app: ApplicationDetail) {
    const p = app.personalInfo || {};
    setPersonal({
      title: p.title || "",
      surname: p.surname || "",
      firstName: p.firstName || "",
      middleName: p.middleName || "",
      gender: p.gender || "",
      dateOfBirth: p.dateOfBirth || "",
      maritalStatus: p.maritalStatus || "",
      homeRegion: p.homeRegion || "",
      homeCountry: p.homeCountry || "Ghana",
      occupation: p.occupation || "",
      phoneNumber: p.phoneNumber || app.phone || "",
      email: p.email || app.email || "",
      postalAddress: p.postalAddress || "",
      residentialAddress: p.residentialAddress || "",
    });
    const g = app.guardianInfo || {};
    setGuardian({
      guardianName: g.guardianName || "",
      relationship: g.relationship || "",
      occupation: g.occupation || "",
      phoneNumber: g.phoneNumber || "",
      email: g.email || "",
      address: g.address || "",
    });
    const pc = app.programmeChoices || {};
    setProgrammes({
      firstChoice: pc.firstChoice || "",
      secondChoice: pc.secondChoice || "",
      thirdChoice: pc.thirdChoice || "",
      fourthChoice: pc.fourthChoice || "",
    });
    const ed = app.educationalBackground?.[0] || {};
    setEducation({
      institutionName: ed.institutionName || "",
      programmePursued: ed.programmePursued || "",
      startDate: ed.startDate || "",
      endDate: ed.endDate || "",
    });
    const ex = app.examinationInfo || {};
    setExam({
      examType: ex.examType || "WASSCE",
      sitting: ex.sitting || "",
      examYear: ex.examYear || "",
      indexNumber: ex.indexNumber || "",
    });
    setResults(
      app.results && app.results.length > 0
        ? app.results
        : [{ subject: "", grade: "" }],
    );
    setDocuments((app.documents as Record<string, string>) || {});
  }

  const persistSession = (next: Session) => {
    setSession(next);
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(next));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/apply/voucher/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId, voucherCode, serialNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      const next: Session = {
        schoolId: data.school.id,
        schoolName: data.school.name,
        schoolSlug: data.school.slug,
        brandColor: data.school.brandColor ?? null,
        voucherCode: data.voucher.voucherCode,
        serialNumber: data.voucher.serialNumber,
        application: data.application,
        canEdit: data.canEdit !== false,
      };
      persistSession(next);
      if (data.application) {
        hydrateForm(data.application);
        setMessage(`Welcome back. Status: ${data.application.status}`);
      } else {
        setMessage("Voucher verified. You have not submitted an application yet.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = () => {
    window.localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setEditing(false);
    setMessage(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/apply/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId: session.schoolId,
          voucherCode: session.voucherCode,
          serialNumber: session.serialNumber,
          personalInfo: personal,
          guardianInfo: guardian,
          programmeChoices: programmes,
          educationalBackground: [education],
          examinationInfo: exam,
          results: results.filter((r) => r.subject && r.grade),
          documents,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save");

      // Refresh session from server
      const refresh = await fetch("/api/apply/voucher/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId: session.schoolId,
          voucherCode: session.voucherCode,
          serialNumber: session.serialNumber,
        }),
      });
      const refreshed = await refresh.json();
      if (refresh.ok) {
        const next: Session = {
          ...session,
          schoolName: refreshed.school?.name || session.schoolName,
          schoolSlug: refreshed.school?.slug ?? session.schoolSlug,
          brandColor: refreshed.school?.brandColor ?? session.brandColor,
          application: refreshed.application,
          canEdit: refreshed.canEdit !== false,
        };
        persistSession(next);
        if (refreshed.application) hydrateForm(refreshed.application);
      }

      setEditing(false);
      setMessage(
        data.updated
          ? "Application updated successfully."
          : "Application submitted successfully.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "Approved":
      case "Admitted":
        return "bg-green-100 text-green-800";
      case "Rejected":
        return "bg-red-100 text-red-800";
      case "Under Review":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-[var(--school-brand-soft,#DBEAFE)] text-[var(--school-brand,#1D4ED8)]";
    }
  };

  const activeSchool =
    schools.find((s) => s.id === (session?.schoolId || schoolId)) || null;
  const themeStyle = brandThemeStyle(
    session?.brandColor || activeSchool?.brandColor,
  );

  if (!authReady) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#007AFF]" />
      </main>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#F8FAFC] text-[#050816]"
      style={themeStyle}
    >
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--school-brand,#007AFF)] text-white">
              <ClipboardList className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                My application
              </h1>
              <p className="mt-1 text-sm text-[#6B7280]">
                Log in with your voucher anytime to check status or edit your form.
              </p>
            </div>
          </div>
          {session && (
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-medium"
            >
              <LogOut className="h-3.5 w-3.5" /> Log out
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {message}
          </div>
        )}

        {!session ? (
          <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Student voucher login</h2>
            <p className="mt-1 text-sm text-[#6B7280]">
              Use the same Serial Number and PIN from your payment email.
            </p>
            <form onSubmit={handleLogin} className="mt-6 grid gap-4">
              <label className="space-y-1 text-sm">
                <span className="font-medium">School</span>
                <select
                  required
                  value={schoolId}
                  onChange={(e) => setSchoolId(e.target.value)}
                  className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 outline-none focus:border-[var(--school-brand,#007AFF)]"
                >
                  <option value="">Select school</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.alias?.trim() || s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium">Serial number</span>
                <input
                  required
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 font-mono outline-none focus:border-[var(--school-brand,#007AFF)]"
                  placeholder="TG-2026-001234"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium">PIN</span>
                <input
                  required
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 font-mono outline-none focus:border-[var(--school-brand,#007AFF)]"
                  placeholder="HS-8K7D-29PX"
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="rounded-full bg-[var(--school-brand,#007AFF)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--school-brand-hover,#0062CC)] disabled:opacity-60"
              >
                {busy ? "Signing in…" : "Sign in"}
              </button>
            </form>
            <p className="mt-4 text-center text-xs text-[#9CA3AF]">
              New applicant?{" "}
              <Link href="/apply" className="text-[var(--school-brand,#007AFF)] underline">
                Start application
              </Link>
            </p>
          </section>
        ) : (
          <div className="space-y-6">
            <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
              <p className="text-sm text-[#6B7280]">{session.schoolName}</p>
              {session.application ? (
                <>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-semibold">
                      {session.application.fullName}
                    </h2>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor(
                        session.application.status,
                      )}`}
                    >
                      {session.application.status}
                    </span>
                  </div>
                  <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-[#6B7280]">Application number</dt>
                      <dd className="font-mono font-semibold">
                        {session.application.applicationNumber}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#6B7280]">Programme</dt>
                      <dd>{session.application.programme || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[#6B7280]">Submitted</dt>
                      <dd>
                        {new Date(session.application.submittedAt).toLocaleString()}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#6B7280]">Last updated</dt>
                      <dd>
                        {new Date(session.application.updatedAt).toLocaleString()}
                      </dd>
                    </div>
                  </dl>
                  {session.application.reviewNotes && (
                    <p className="mt-4 rounded-xl bg-[#F3F4F6] px-3 py-2 text-sm">
                      <strong>Note from school:</strong>{" "}
                      {session.application.reviewNotes}
                    </p>
                  )}
                  <div className="mt-6 flex flex-wrap gap-2">
                    {session.canEdit && (
                      <button
                        type="button"
                        onClick={() => setEditing((v) => !v)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[var(--school-brand,#007AFF)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--school-brand-hover,#0062CC)]"
                      >
                        <Pencil className="h-4 w-4" />
                        {editing ? "Hide form" : "Edit application"}
                      </button>
                    )}
                    {!session.canEdit && (
                      <p className="text-sm text-[#6B7280]">
                        This application can no longer be edited ({session.application.status}).
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="mt-4">
                  <div className="flex items-center gap-2 text-amber-700">
                    <CheckCircle2 className="h-5 w-5" />
                    <p className="font-medium">No application submitted yet</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/apply?school=${session.schoolSlug || session.schoolId}&step=form&voucherCode=${encodeURIComponent(session.voucherCode)}&serialNumber=${encodeURIComponent(session.serialNumber)}`,
                      )
                    }
                    className="mt-4 rounded-full bg-[var(--school-brand,#007AFF)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--school-brand-hover,#0062CC)]"
                  >
                    Complete application form
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="mt-2 ml-2 rounded-full border px-4 py-2 text-sm font-medium"
                  >
                    Fill form here
                  </button>
                </div>
              )}
            </section>

            {editing && session.canEdit && (
              <form
                onSubmit={handleSave}
                className="space-y-5 rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm"
              >
                <h3 className="text-base font-semibold">Edit application details</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      ["surname", "Surname *"],
                      ["firstName", "First name *"],
                      ["middleName", "Middle name"],
                      ["phoneNumber", "Phone *"],
                      ["email", "Email *"],
                      ["gender", "Gender"],
                      ["dateOfBirth", "Date of birth"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="space-y-1 text-sm">
                      <span className="font-medium">{label}</span>
                      <input
                        required={label.includes("*")}
                        type={key === "dateOfBirth" ? "date" : key === "email" ? "email" : "text"}
                        value={personal[key]}
                        onChange={(e) =>
                          setPersonal((p) => ({ ...p, [key]: e.target.value }))
                        }
                        className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 outline-none focus:border-[var(--school-brand,#007AFF)]"
                      />
                    </label>
                  ))}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      ["firstChoice", "First choice"],
                      ["secondChoice", "Second choice"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="space-y-1 text-sm">
                      <span className="font-medium">{label}</span>
                      <input
                        value={programmes[key]}
                        onChange={(e) =>
                          setProgrammes((p) => ({ ...p, [key]: e.target.value }))
                        }
                        className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 outline-none focus:border-[var(--school-brand,#007AFF)]"
                      />
                    </label>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Results</p>
                  {results.map((row, index) => (
                    <div key={index} className="grid grid-cols-2 gap-2">
                      <input
                        placeholder="Subject"
                        value={row.subject}
                        onChange={(e) => {
                          const next = [...results];
                          next[index] = { ...row, subject: e.target.value };
                          setResults(next);
                        }}
                        className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm"
                      />
                      <input
                        placeholder="Grade"
                        value={row.grade}
                        onChange={(e) => {
                          const next = [...results];
                          next[index] = { ...row, grade: e.target.value };
                          setResults(next);
                        }}
                        className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-sm"
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setResults((r) => [...r, { subject: "", grade: "" }])
                    }
                    className="text-sm text-[var(--school-brand,#007AFF)]"
                  >
                    + Add subject
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-full bg-[var(--school-brand,#007AFF)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--school-brand-hover,#0062CC)] disabled:opacity-60"
                >
                  {busy ? "Saving…" : session.application ? "Save changes" : "Submit application"}
                </button>
              </form>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
