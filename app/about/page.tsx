"use client";

import React from "react";
import Image from "next/image";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { Link2, Pencil, BookOpen, Target, Eye, Users } from "lucide-react";

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-white text-[#1E1E1E]">
        <div className="mx-auto flex max-w-6xl flex-col px-4 sm:px-6 md:px-10">
        <Header />
      </div>

            <main className="mx-auto max-w-6xl px-4 sm:px-6 md:px-10">
                {/* Section 1: Introduction */}
                <section className="mt-4 flex flex-col gap-10 md:mt-5 md:flex-row md:items-center md:gap-16">
                    <div className="md:w-1/2 space-y-6">
                        <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-[#007AFF] shadow-sm ring-1 ring-[#007AFF]/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#007AFF]" />
                            Alphafind Product
                        </p>
                        <h1 className="text-3xl font-semibold leading-tight text-[#1E1E1E] md:text-4xl lg:text-[42px]">
                            About TertiaryGuide
                        </h1>
                        <p className="text-base leading-relaxed text-[#555555]">
                            At TertiaryGuide, we bring students and tertiary institutions together. Our platform offers a one-stop resource where students can explore different institutions, programs, and admission requirements. We facilitate direct communication, ensuring students stay informed about important dates and updates.
                        </p>
                    </div>
                    <div className="md:w-1/2 relative overflow-hidden rounded-[28px] shadow-lg">
                        <Image
                            src="/hero/Banner2.png"
                            alt="TertiaryGuide"
                            width={600}
                            height={400}
                            className="w-full h-auto object-cover"
                            priority
                        />
                    </div>
                </section>

                {/* Section 2: What We Do? (Blue Section) */}
                <section className="mt-12 -mx-4 rounded-[32px] bg-[#007AFF] py-10 text-white md:-mx-10 md:mt-16 md:py-14 md:px-10 px-6">
                    <div className="flex flex-col gap-10 md:flex-row md:items-start md:gap-12">
                        <div className="md:w-1/3">
                            <h2 className="text-2xl font-semibold leading-tight md:text-3xl lg:text-[32px]">
                                What We
                                <br />
                                Do?
                            </h2>
                            <p className="mt-4 text-xs font-medium text-white/80 md:text-sm">
                                Empowering the next generation of tertiary students.
                            </p>
                        </div>

                        <div className="md:w-2/3 grid gap-6 md:grid-cols-2">
                            <article className="rounded-[26px] bg-white p-6 text-[#1E1E1E]">
                                <div className="mb-4 flex items-center justify-center h-10 w-10 rounded-xl bg-blue-50 text-[#007AFF]">
                                    <Link2 className="h-5 w-5" />
                                </div>
                                <h3 className="mb-2 text-sm font-semibold md:text-base">Connecting Students & Institutions</h3>
                                <p className="text-xs font-semibold leading-relaxed text-[#555555] md:text-sm">
                                    Connecting students and institutions, we provide a hub for exploring institutions, programs, and admission requirements.
                                </p>
                            </article>

                            <article className="rounded-[26px] bg-white p-6 text-[#1E1E1E]">
                                <div className="mb-4 flex items-center justify-center h-10 w-10 rounded-xl bg-blue-50 text-[#007AFF]">
                                    <Pencil className="h-5 w-5" />
                                </div>
                                <h3 className="mb-2 text-sm font-semibold md:text-base">Streamlining the Application Process</h3>
                                <p className="text-xs font-semibold leading-relaxed text-[#555555] md:text-sm">
                                    We make applying to multiple institutions hassle-free by allowing you to purchase application forms directly from our platform.
                                </p>
                            </article>

                            <article className="md:col-span-2 rounded-[26px] bg-white p-6 text-[#1E1E1E]">
                                <div className="mb-4 flex items-center justify-center h-10 w-10 rounded-xl bg-blue-50 text-[#007AFF]">
                                    <BookOpen className="h-5 w-5" />
                                </div>
                                <h3 className="mb-2 text-sm font-semibold md:text-base">Personalized Guidance for Success</h3>
                                <p className="text-xs font-semibold leading-relaxed text-[#555555] md:text-sm">
                                    We provide you with all the information about all the best institutions for you, helping you make informed decisions about your academic future. With TertiaryGuide, your path to success is tailored just for you.
                                </p>
                            </article>
                        </div>
                    </div>
                </section>

                {/* Section 3: About Us & Alphafind */}
                <section className="mt-12 py-6 md:mt-16">
                    <div className="flex flex-col gap-10 md:flex-row md:items-start md:gap-16">
                        <div className="md:w-1/3">
                            <h2 className="text-2xl font-semibold tracking-tight text-[#1E1E1E] md:text-3xl lg:text-[32px]">
                                Know what
                                <br />
                                drives Us
                            </h2>
                        </div>

                        <div className="md:w-2/3 space-y-10">
                            <div className="space-y-4">
                                <h4 className="text-lg font-semibold text-[#007AFF]">About Us</h4>
                                <p className="text-base leading-relaxed text-[#555555]">
                                    TertiaryGuide is the premier product of Alphafind. At Alphafind, we are on a mission to transform the lives of tertiary students through our unwavering commitment to their well-being. Our dedication is rooted in the belief that every student deserves two essential pillars of success: comfort and companionship.
                                </p>
                                <p className="text-base leading-relaxed text-[#555555]">
                                    We don't just provide products and services; we provide a community where students can thrive. Alphafind is more than a company; it's a dynamic and empathetic partner on your educational journey, passionately dedicated to creating a brighter future for the next generation. Join the Alphafind community today and experience the genuine care and support that sets us apart.
                                </p>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <article className="rounded-3xl bg-gray-50 px-6 py-6 border border-gray-100 shadow-sm">
                                    <header className="mb-4 flex items-center gap-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#007AFF] shadow-sm">
                                            <Target className="h-4 w-4" />
                                        </div>
                                        <span className="font-semibold text-sm uppercase tracking-wide">Mission</span>
                                    </header>
                                    <p className="text-xs font-semibold leading-relaxed text-[#555555] md:text-sm">
                                        To craft innovative technological solutions designed to make academic, social, and emotional journeys easier and more enjoyable.
                                    </p>
                                </article>

                                <article className="rounded-3xl bg-gray-50 px-6 py-6 border border-gray-100 shadow-sm">
                                    <header className="mb-4 flex items-center gap-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#007AFF] shadow-sm">
                                            <Eye className="h-4 w-4" />
                                        </div>
                                        <span className="font-semibold text-sm uppercase tracking-wide">Vision</span>
                                    </header>
                                    <p className="text-xs font-semibold leading-relaxed text-[#555555] md:text-sm">
                                        Creating a brighter future for the next generation where every student thrives with comfort and companionship.
                                    </p>
                                </article>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Call to Action */}
                <section className="my-12 flex flex-col items-center text-center gap-6 rounded-[32px] bg-gray-50 py-12 px-6 md:my-16">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#007AFF]">
                        <Users className="h-6 w-6" />
                    </div>
                    <h3 className="text-2xl font-semibold md:text-3xl">Join the Alphafind community</h3>
                    <p className="max-w-xl text-sm text-[#555555] md:text-base">
                        Experience the genuine care and support that sets us apart on your educational journey.
                    </p>
                </section>
            </main>

            <Footer />
        </div>
    );
}
