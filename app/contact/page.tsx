"use client";

import React from "react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white text-[#1E1E1E]">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-4 md:gap-8 md:px-10 md:py-8">
        {/* Header */}
        <Header />

        {/* Main Content */}
        <main className="mt-4 md:mt-6">
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
