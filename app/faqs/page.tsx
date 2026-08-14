"use client";

import React, { useState } from "react";
import { Header } from "@/app/components/Header";
import { FaqSection, defaultFaqs } from "@/app/components/FaqSection";
import { Footer } from "@/app/components/Footer";
import { FaqHero } from "@/app/components/FaqHero";

export default function FaqsPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState("All");

    const filteredFaqs = defaultFaqs.filter((faq) => {
        const matchesSearch =
            faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = activeCategory === "All" || faq.category === activeCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="min-h-screen bg-[#FFFFFF]">
            <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-3 sm:gap-6 sm:px-6 sm:py-4 md:gap-8 md:px-10 md:py-8">
                <Header />

                <FaqHero
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    activeCategory={activeCategory}
                    setActiveCategory={setActiveCategory}
                />
            </div>

            <div className="pb-20">
                <FaqSection
                    items={filteredFaqs}
                    title={searchQuery || activeCategory !== "All" ? "Search Results" : "Common Questions"}
                />
            </div>

            <Footer />
        </div>
    );
}
