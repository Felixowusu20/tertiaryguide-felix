"use client";

import React, { useState } from "react";
import { Plus, X } from "lucide-react";

export const defaultFaqs = [
  {
    id: 1,
    category: "General",
    question: "What is TertiaryGuide?",
    answer:
      "TertiaryGuide is a comprehensive platform designed to simplify the tertiary education application process in Ghana. We help students explore universities, find the right programs, and purchase application forms and WASSCE checker vouchers all in one place.",
  },

  {
    id: 2,
    category: "Getting Started",
    question: "Who can use the platform?",
    answer:
      "Our platform is built for high school graduates and anyone looking to further their education at a tertiary institution in Ghana.",
  },

  {
    id: 3,
    category: "General",
    question: "Is the platform free to use?",
    answer:
      "Browsing institutions, reading our resource guides, and accessing admission information is completely free. You only pay when purchasing specific application forms or WASSCE checker vouchers.",
  },

  {
    id: 4,
    category: "Payments",
    question: "How do I buy an application form or WASSCE checker voucher?",
    answer:
      "Simply navigate to the \"Forms & Vouchers\" section, select the specific university form or WASSCE voucher you need, and proceed to checkout.",
  },

  {
    id: 5,
    category: "Payments",
    question: "What payment methods do you accept?",
    answer:
      "We accept all major Mobile Money (MoMo) networks ensuring a fast and secure transaction.",
  },

  {
    id: 6,
    category: "Delivery",
    question: "How long does it take to receive my PIN/Serial Number?",
    answer:
      "Instantly! Once your payment is successfully processed, your application PIN, Serial Number, or WASSCE voucher code will be displayed on your screen and sent directly to your registered email address and phone number via SMS.",
  },

  {
    id: 7,
    category: "Support",
    question: "What should I do if I don't receive my code after payment?",
    answer:
      "If you experience any delays, first check your email spam folder. If it is still missing, please contact our support team with your transaction ID, and we will retrieve your code for you immediately.",
  },

  {
    id: 8,
    category: "Applications",
    question: "Can I apply to multiple universities at once?",
    answer:
      "While you still need to purchase separate forms for different institutions, TertiaryGuide centralizes the process. You can buy all your required forms in one transaction and access all the necessary admission portals directly through our site, saving you time.",
  },

  {
    id: 9,
    category: "Guidance",
    question: "How do I know which program is right for me?",
    answer:
      "We offer a range of resources, program breakdowns, and admission requirements on the platform to help guide your decision.",
  },

  {
    id: 10,
    category: "Account",
    question: "Do I need to create an account to use TertiaryGuide?",
    answer:
      "You can browse institutions and read our resources without an account. However, creating a free account allows you to track your purchased forms, save your favorite programs, and access your transaction history at any time.",
  },

  {
    id: 11,
    category: "Payments",
    question: "My MoMo account was deducted, but the transaction failed on the site. What should I do?",
    answer:
      "Network timeouts can occasionally happen. If your funds were deducted but you didn't receive your PIN, please contact our support team immediately with your transaction ID and phone number. We will verify the payment with the network provider and issue your code.",
  },

  {
    id: 12,
    category: "Refunds",
    question: "I accidentally purchased the wrong university form. Can I get a refund?",
    answer:
      "Because application forms and WASSCE vouchers are generated as unique, digital PINs that are revealed immediately upon purchase, they are generally non-refundable. Please double-check your selection before completing your payment.",
  },

  {
    id: 13,
    category: "Platform",
    question: "Does TertiaryGuide submit the university application on my behalf?",
    answer:
      "No. TertiaryGuide provides you with the necessary application e-vouchers and direct links to the official university portals. You will still need to log in to the specific university’s portal using the PIN and Serial Number you purchased from us to fill out and submit your actual application.",
  },
];

export function FaqSection({ items = defaultFaqs, title = "Frequently Asked Questions" }: { items?: typeof defaultFaqs, title?: string }) {
  const [openId, setOpenId] = useState<number | null>(items[0]?.id ?? null);

  return (
    <section className="bg-[#1E1E1E] py-16 text-white md:py-20">
      <div className="mx-auto max-w-4xl px-6 md:px-10">
        <h2 className="mb-10 text-center text-2xl font-semibold tracking-tight md:text-3xl lg:text-[32px]">
          {title}
        </h2>

        <div className="space-y-4">
          {items.map((item) => {
            const isOpen = openId === item.id;

            return (
              <div
                key={item.id}
                className="rounded-2xl bg-[#F5F5F5] text-[#1E1E1E] shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : item.id)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left md:px-6 md:py-5"
                >
                  <div>
                    <p className="text-sm font-semibold md:text-base">
                      {item.question}
                    </p>
                    {isOpen && (
                      <p className="mt-2 max-w-2xl text-xs leading-relaxed text-[#555555] md:text-sm">
                        {item.answer}
                      </p>
                    )}
                  </div>

                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[#E33F3F]">
                    {isOpen ? (
                      <X className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4 text-[#1E1E1E]" />
                    )}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
