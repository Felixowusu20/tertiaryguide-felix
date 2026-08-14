"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import React, { useEffect, useState } from "react";

const slides = [
  {
    id: "ucc",
    name: "University Of Cape Coast",
    logo: "/hero/UCC.png",
    tagline: "Explore undergraduate and distance programmes at UCC.",
    cta: "View UCC forms",
  },
  {
    id: "knust",
    name: "KNUST",
    logo: "/hero/KNUST.png",
    tagline: "Apply to Ghana's leading science and technology university.",
    cta: "View KNUST forms",
  },
  {
    id: "ug",
    name: "University of Ghana",
    logo: "/hero/UG.png",
    tagline: "Start your journey at the premier university in Ghana.",
    cta: "View UG forms",
  },
];

const heroImages = ["/hero/hero.jpg", "/hero/Banner2.png", "/hero/Banner.png"];

export function HeroSlider() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  const slide = slides[index];
  const imageSrc = heroImages[index % heroImages.length];

  return (
    <>
      {/* Mobile Hero Slider */}
      <section className="mt-4 flex flex-col gap-5 md:hidden">
        <div className="space-y-3 px-1">
          <p className="inline-flex items-center gap-2 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-medium text-[#007AFF] shadow-sm border border-gray-50">
            <span className="h-1 w-1 rounded-full bg-[#007AFF]" />
            Featured school
          </p>
          {/* Reduced from text-3xl to text-2xl */}
          <h1 className="text-2xl font-semibold leading-tight text-[#252525]">
            {slide.name}
          </h1>
          {/* Reduced from text-sm to text-[13px] */}
          <p className="text-[13px] leading-relaxed text-[#555555]">
            {slide.tagline}
          </p>
          
          {/* Optimized Button Group for Mobile */}
          <div className="flex items-center gap-2 pt-1">
            <Link
              href="/university-forms"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#007AFF] px-3 py-2.5 text-[13px] font-bold text-white shadow-md shadow-[#007AFF]/20 hover:bg-[#0062CC]"
            >
              <span>Get Forms</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/wassce-checker"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-[13px] font-bold text-[#1E1E1E]"
            >
              <span className="leading-tight text-center">Buy Checkers</span>
            </Link>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl shadow-lg">
          <Image
            src={imageSrc}
            alt={slide.name}
            width={800}
            height={480}
            className="h-48 w-full object-cover"
            priority
          />
          <div className="pointer-events-none absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r from-[#007AFF]/80 via-[#007AFF]/40 to-transparent" />

          {/* Adjusted Badge positioning and size */}
          <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-white/95 px-2.5 py-1 shadow-sm border border-white/20">
            <Image
              src={slide.logo}
              alt={slide.name}
              width={20}
              height={20}
              className="h-5 w-5 rounded-sm object-contain"
            />
            <span className="text-[10px] font-bold text-[#1E1E1E]">
              Selling {slide.name} forms
            </span>
          </div>
        </div>

        {/* Dots */}
        <div className="flex items-center justify-center gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setIndex(i)}
              className={`h-1 rounded-full transition-all ${
                i === index ? "w-4 bg-[#007AFF]" : "w-1 bg-[#D1D5DB]"
              }`}
            />
          ))}
        </div>
      </section>

      {/* Desktop / Tablet Hero Slider (Unchanged) */}
      <section className="relative hidden min-h-[360px] items-center overflow-hidden rounded-4xl shadow-xl md:flex md:min-h-[420px] lg:min-h-[480px]">
        <div className="absolute inset-0">
          <Image
            src={imageSrc}
            alt={slide.name}
            fill
            priority
            className="object-cover"
          />
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-[45%] bg-gradient-to-r from-[#007AFF]/90 via-[#007AFF]/55 to-transparent" />

        <div className="relative z-10 flex w-full items-center px-6 py-10 text-white md:px-10 md:py-14 lg:px-14">
          <div className="max-w-xl space-y-6">
            <div className="inline-flex items-center gap-3 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00E0FF]" />
              <span>Featured school</span>
              <span className="h-1 w-1 rounded-full bg-white/50" />
              <span className="flex items-center gap-2">
                <Image
                  src={slide.logo}
                  alt={slide.name}
                  width={20}
                  height={20}
                  className="h-5 w-5 rounded-sm object-contain"
                />
                <span>{slide.name}</span>
              </span>
            </div>

            <h1 className="text-3xl font-semibold leading-tight md:text-4xl lg:text-[40px] lg:leading-[1.1]">
              Discover convenience <br /> at Tertiary Guide
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-white/85 md:text-base">
              {slide.tagline}
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/university-forms"
                className="flex items-center gap-2 rounded-xl bg-[#007AFF] px-6 py-2.5 text-sm font-medium text-white shadow-md shadow-black/20 hover:bg-[#0062CC]"
              >
                <span>Get Forms</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/wassce-checker"
                className="flex items-center gap-2 rounded-xl bg-white/10 px-6 py-2.5 text-sm font-medium text-white ring-1 ring-white/40 hover:bg-white/15"
              >
                <span>Buy Wassce Checkers</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="absolute bottom-6 right-8 flex items-center gap-2">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-6 bg-white" : "w-3 bg-white/50"
                }`}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}