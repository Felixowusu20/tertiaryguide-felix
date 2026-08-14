"use client";

import { ArrowRight, Search } from "lucide-react";
import { useRouter } from "next/navigation";

export function ProgramSearchPromo() {
  const router = useRouter();

  return (
    <section className="bg-white py-12 md:py-16">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <div className="flex flex-col items-center gap-10 md:grid md:grid-cols-[minmax(0,1.05fr)_minmax(320px,1fr)] md:items-center md:gap-8 md:rounded-[32px] md:border md:border-[#EFEFEF] md:bg-[#FBFBFB] md:px-10 md:py-10">
          <div className="max-w-xl space-y-6 text-center md:text-left">
            <h2 className="text-3xl font-semibold leading-tight text-[#252525] md:text-4xl lg:text-[52px] lg:leading-[1.02]">
              Try out our Program Search
              <br />
              and Compare Feature
            </h2>
            <button
              type="button"
              onClick={() => router.push("/program-search")}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#007AFF] px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#0062CC]"
            >
              <span>Try it</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mx-auto w-full max-w-2xl self-start md:max-w-[430px]">
            <div className="rounded-[28px] bg-white p-4 shadow-[0_20px_55px_rgba(15,23,42,0.08)] ring-1 ring-[#F1F1F1] md:p-5">
              <div className="mb-3 flex items-center justify-center gap-5 md:gap-7">
                <span className="h-1.5 w-14 rounded-full bg-[#E5E7EB]" />
                <span className="h-1.5 w-10 rounded-full bg-[#E5E7EB]" />
                <span className="h-1.5 w-10 rounded-full bg-[#E5E7EB]" />
                <span className="h-1.5 w-10 rounded-full bg-[#E5E7EB]" />
                <span className="h-1.5 w-16 rounded-full bg-[#E5E7EB]" />
              </div>

              <div className="rounded-2xl bg-[#F3F4F6] p-2.5">
                <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-[#F3F4F6]">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#007AFF] text-white">
                    <Search className="h-3.5 w-3.5" />
                  </span>
                  <div className="h-2.5 flex-1 rounded-full bg-[#007AFF]" />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-16 rounded-2xl bg-[#E5E7EB] md:h-20"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
