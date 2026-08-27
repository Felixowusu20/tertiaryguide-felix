"use client";

import React from "react";
import { Link2, Pencil } from "lucide-react";

const services = [
  {
    id: "01",
    title: "Connecting Students and Institutions",
    description:
      "A one-stop platform helping students explore institutions, compare programs, and stay informed about admission updates.",
    icon: Link2,
  },
  {
    id: "02",
    title: "Streamlining the Application Process",
    description:
      "Apply to multiple institutions without the stress. Our platform lets you buy application forms directly, simplifying the entire process.",
    icon: Pencil,
  },
  {
    id: "03",
    title: "Personalized Guidance for Success",
    description:
      "Get all the information you need from leading institutions to make informed academic decisions. Your journey to success is easier with guidance tailored for you.",
    icon: null,
  },
];

export function ServicesSection() {
  return (
    <section className="mt-10 bg-[#007AFF] py-10 text-white md:mt-12 md:py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 md:flex-row md:items-start md:gap-12 md:px-10">
        {/* Left heading */}
        <div className="md:w-1/3">
          <h2 className="text-2xl font-semibold leading-tight md:text-3xl lg:text-[32px]">
            Our Comprehensive
            <br />
            Services
          </h2>
        </div>

        {/* Cards */}
        <div className="md:w-2/3">
          <div className="flex gap-4 overflow-x-auto pb-2 md:overflow-visible">
            {services.map((service) => {
              const Icon = service.icon;

              return (
                <article
                  key={service.id}
                  className="min-w-[210px] max-w-[230px] rounded-[26px] bg-white px-5 py-5 text-[#1E1E1E] md:min-w-[230px] md:max-w-[240px] md:px-5 md:py-6"
                >
                  <div className="mb-6 flex items-center justify-between text-xs font-semibold text-[#1E1E1E]">
                    <span>{service.id}</span>
                    {Icon ? (
                      <span className="inline-flex h-7 w-7 items-center justify-center bg-white text-zinc-500">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                    ) : (
                      <span className="h-7 w-7" />
                    )}
                  </div>
                  <h3 className="mb-3 text-sm font-semibold md:text-base">
                    {service.title}
                  </h3>
                  <p className="text-xs font-semibold leading-relaxed text-[#555555] md:text-sm">
                    {service.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
