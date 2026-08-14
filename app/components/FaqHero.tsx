"use client";

import React from "react";
import {
  Search,
  HelpCircle,
  BookOpen,
  CreditCard,
  ShieldCheck,
} from "lucide-react";

const categories = [
  { name: "All", icon: HelpCircle },
  { name: "General", icon: BookOpen },
  { name: "Getting Started", icon: ShieldCheck },
  { name: "Payments", icon: CreditCard },
];

export function FaqHero({
  searchQuery,
  setSearchQuery,
  activeCategory,
  setActiveCategory,
}: {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  activeCategory: string;
  setActiveCategory: (val: string) => void;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-[#007AFF] px-4 py-10 text-white shadow-sm min-[400px]:rounded-3xl min-[400px]:px-5 min-[500px]:px-6 min-[500px]:py-12 sm:px-6 sm:py-14 md:rounded-[40px] md:px-10 md:py-20 lg:px-16 lg:py-24">
      {/* Decorative patterns — smaller on very narrow viewports */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-3xl min-[400px]:-right-20 min-[400px]:-top-20 min-[400px]:h-64 min-[400px]:w-64" />
      <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-white/10 blur-3xl min-[400px]:-bottom-20 min-[400px]:-left-20 min-[400px]:h-64 min-[400px]:w-64" />

      <div className="relative z-10 mx-auto max-w-3xl min-w-0 text-center">
        <h1 className="mb-4 text-balance text-3xl font-bold leading-tight tracking-tight min-[400px]:mb-5 min-[400px]:text-4xl md:mb-6 md:text-5xl lg:text-6xl">
          How can we help?
        </h1>
        <p className="mb-6 max-w-[40ch] text-base leading-relaxed text-white/85 min-[400px]:mx-auto min-[400px]:mb-8 min-[400px]:text-lg md:mb-10 md:max-w-none md:text-xl">
          Search our knowledge base or browse categories below to find answers
          to your questions.
        </p>

        {/* Search — 16px+ text on small screens to avoid iOS zoom; min touch height */}
        <div className="group relative mx-auto mb-6 max-w-2xl min-w-0 min-[400px]:mb-8 min-[500px]:mb-10 md:mb-12">
          <div className="absolute inset-y-0 left-3 flex items-center pl-0.5 min-[500px]:left-4 min-[500px]:pl-1 md:left-5">
            <Search
              className="h-5 w-5 shrink-0 text-white/50 transition-colors group-focus-within:text-[#007AFF] min-[500px]:h-5"
              aria-hidden
            />
          </div>
          <input
            type="search"
            enterKeyHint="search"
            inputMode="search"
            autoComplete="off"
            autoCorrect="off"
            placeholder="Search for answers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-[52px] min-w-0 rounded-xl border border-white/20 bg-white/10 py-3.5 pl-11 pr-4 text-base text-white [touch-action:manipulation] placeholder-white/50 shadow-inner backdrop-blur-md transition-all focus:border-transparent focus:bg-white focus:text-[#1E1E1E] focus:placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-white/25 min-[500px]:rounded-2xl min-[500px]:py-4 min-[500px]:pl-14 min-[500px]:pr-6 min-[500px]:text-lg md:py-5"
          />
        </div>

        {/* Categories: horizontal scroll on small screens, wrap on larger */}
        <div
          className="flex w-full min-w-0 flex-nowrap gap-2 overflow-x-auto overscroll-x-contain scroll-pb-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [touch-action:manipulation] sm:flex-wrap sm:justify-center sm:gap-3 sm:overflow-visible sm:pb-0 md:gap-4 [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="FAQ categories"
        >
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.name;
            return (
              <button
                key={cat.name}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveCategory(cat.name)}
                className={`shrink-0 snap-start inline-flex min-h-[48px] min-w-0 max-w-full items-center justify-center gap-2 rounded-full border border-white/0 px-4 py-2.5 text-sm font-medium transition [touch-action:manipulation] active:scale-[0.98] min-[500px]:px-5 min-[500px]:py-3 sm:rounded-xl ${
                  isActive
                    ? "border-transparent bg-white text-[#007AFF] shadow-lg shadow-black/20"
                    : "border border-white/15 bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="whitespace-nowrap">{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
