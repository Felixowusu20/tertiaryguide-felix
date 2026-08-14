"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { adminFetch } from "@/lib/admin-client";

type Programme = {
  id: string;
  name: string;
  streams: string[];
  intakeOptions: string[];
  cutoff: string | null;
  isActive: boolean;
};

type Props = {
  slug: string;
  onError: (message: string | null) => void;
};

export function ProgrammesSection({ slug, onError }: Props) {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [streams, setStreams] = useState("Regular, Evening");
  const [intakeOptions, setIntakeOptions] = useState("September, January");
  const [cutoff, setCutoff] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    onError(null);
    try {
      const res = await adminFetch(`/api/school-portal/${slug}/programmes`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load programmes");
      setProgrammes(data.programmes || []);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Failed to load programmes");
    } finally {
      setLoading(false);
    }
  }, [slug, onError]);

  useEffect(() => {
    void load();
  }, [load]);

  const createProgramme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    onError(null);
    try {
      const res = await adminFetch(`/api/school-portal/${slug}/programmes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          streams,
          intakeOptions,
          cutoff: cutoff || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create programme");
      setName("");
      setStreams("Regular, Evening");
      setIntakeOptions("September, January");
      setCutoff("");
      await load();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not create programme");
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (p: Programme) => {
    const res = await adminFetch(`/api/school-portal/${slug}/programmes/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    if (res.ok) await load();
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this programme? Applicants will no longer see it.")) {
      return;
    }
    const res = await adminFetch(`/api/school-portal/${slug}/programmes/${id}`, {
      method: "DELETE",
    });
    if (res.ok) await load();
    else {
      const data = await res.json().catch(() => ({}));
      onError(data.error || "Could not delete programme");
    }
  };

  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-[#DBEAFE] bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold">Add programme</h2>
        <p className="mt-1 text-sm text-[#6B7280]">
          Programmes and streams appear on the student application form automatically.
        </p>
        <form onSubmit={createProgramme} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="font-medium">Programme name</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. BSc Nursing"
              className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 outline-none focus:border-[#007AFF]"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Streams (comma-separated)</span>
            <input
              required
              value={streams}
              onChange={(e) => setStreams(e.target.value)}
              placeholder="Regular, Evening, Weekend"
              className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 outline-none focus:border-[#007AFF]"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Intake options (optional)</span>
            <input
              value={intakeOptions}
              onChange={(e) => setIntakeOptions(e.target.value)}
              placeholder="September, January"
              className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 outline-none focus:border-[#007AFF]"
            />
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="font-medium">Cutoff / notes (optional)</span>
            <input
              value={cutoff}
              onChange={(e) => setCutoff(e.target.value)}
              placeholder="e.g. Aggregate 24 or better"
              className="w-full rounded-xl border border-[#E5E7EB] px-3 py-2 outline-none focus:border-[#007AFF]"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#007AFF] px-5 py-2.5 text-sm font-semibold text-white sm:col-span-2 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add programme
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#007AFF]" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#F9FAFB] text-xs uppercase text-[#6B7280]">
                <tr>
                  <th className="px-4 py-3">Programme</th>
                  <th className="px-4 py-3">Streams</th>
                  <th className="px-4 py-3">Intake</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {programmes.map((p) => (
                  <tr key={p.id} className="border-t border-[#F3F4F6]">
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.name}</div>
                      {p.cutoff && (
                        <div className="text-xs text-[#6B7280]">{p.cutoff}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">{p.streams.join(", ") || "—"}</td>
                    <td className="px-4 py-3">
                      {p.intakeOptions?.join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          p.isActive
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {p.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => void toggleActive(p)}
                          className="rounded-full border px-2 py-0.5 text-xs"
                        >
                          {p.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(p.id)}
                          className="inline-flex items-center gap-1 rounded-full border border-red-200 px-2 py-0.5 text-xs text-red-700"
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {programmes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-[#6B7280]">
                      No programmes yet. Add one so applicants can select choices.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
