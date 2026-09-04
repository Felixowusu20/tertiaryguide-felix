"use client";

import React from "react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white text-[#1E1E1E]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pb-8 sm:px-6 md:gap-5 md:px-10 md:pb-10">
        {/* Header */}
        <Header />

        {/* Main Content */}
        <main>
          <section className="space-y-4 text-sm md:text-base">
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Contact Us
            </h1>
            <p>Email: info@tertiaryguide.com</p>
            <p>Phone number: +233 59 511 0767</p>
            <p>Location: Trafalgar, Ho, Ghana</p>
          </section>
        </main>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
