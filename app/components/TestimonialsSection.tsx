"use client";

import React from "react";

const testimonials = [
  {
    id: 1,
    name: "Ama Osei",
    text: "I almost missed a deadline because the dates were scattered across different sites. On TertiaryGuide I see approaching deadlines in one place and I bought my form without stress.",
    initial: "A",
  },
  {
    id: 2,
    name: "Kofi Asante",
    text: "I needed to check my WASSCE results quickly. The process was straightforward and I got my checker PIN after paying—no back-and-forth on WhatsApp groups.",
    initial: "K",
  },
  {
    id: 3,
    name: "Efua Mensah",
    text: "Comparing business programmes from Legon, KNUST, and UCC on one page saved me days. I could focus on my grades instead of hunting PDFs for every school.",
    initial: "E",
  },
  {
    id: 4,
    name: "Nana Yaw Boadi",
    text: "I used the university form flow for a school in Kumasi. Clear steps, and I knew exactly what I was paying for before I hit Paystack.",
    initial: "N",
  },
  {
    id: 5,
    name: "Maame Aba Tetteh",
    text: "As a first-generation applicant, I didn’t have anyone in my family who knew the system. The blog and FAQ answers felt written for people like us in SHS and gap years.",
    initial: "M",
  },
  {
    id: 6,
    name: "Selorm Agbeko",
    text: "I had a question about my purchase and used the get-assistance option. The team responded with my reference and I was sorted. Felt more reliable than random DMs online.",
    initial: "S",
  },
];

export function TestimonialsSection() {
  return (
    <section className="bg-[#007AFF] py-14 md:py-20 text-white">
      <div className="mx-auto max-w-6xl px-5 md:px-10">

        {/* Heading */}
        <div className="text-center mb-10 md:mb-14">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
            What our users say
          </h2>
          <p className="text-white/80 text-sm mt-2">
            Real feedback from real users
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">

          {testimonials.map((item) => (
            <article
              key={item.id}
              className="
                group relative
                rounded-2xl
                bg-white/95
                text-[#1E1E1E]
                p-5 md:p-6

                shadow-sm
                hover:shadow-lg
                transition-all duration-300

                hover:-translate-y-1
              "
            >
              {/* Header */}
              <header className="flex items-center gap-3 mb-4">
                <div className="
                  h-9 w-9 md:h-10 md:w-10
                  flex items-center justify-center
                  rounded-full
                  bg-[#F3F4F6]
                  text-sm font-semibold
                  text-[#1E1E1E]
                ">
                  {item.initial}
                </div>

                <div className="font-medium text-sm md:text-base">
                  {item.name}
                </div>
              </header>

              {/* Text */}
              <p className="
                text-xs md:text-sm
                leading-relaxed
                text-[#555555]
              ">
                {item.text}
              </p>

              {/* subtle glow effect */}
              <div className="
                absolute inset-0 rounded-2xl
                opacity-0 group-hover:opacity-100
                transition-opacity duration-300
                bg-gradient-to-br from-white/10 to-transparent
                pointer-events-none
              " />
            </article>
          ))}

        </div>
      </div>
    </section>
  );
}