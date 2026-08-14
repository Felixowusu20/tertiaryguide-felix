"use client";

import React from "react";
import Link from "next/link";
import { LogIn, UserPlus, X } from "lucide-react";

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    redirectPath: string;
}

export function AuthModal({ isOpen, onClose, redirectPath }: AuthModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-6 backdrop-blur-sm">
            <div className="w-full max-w-md animate-in fade-in zoom-in duration-300">
                <div className="relative overflow-hidden rounded-[32px] bg-white p-8 shadow-2xl md:p-10">
                    <button
                        onClick={onClose}
                        className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F5F5] text-[#1E1E1E] transition hover:bg-[#EDECEC]"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    <div className="flex flex-col items-center text-center">
                        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#007AFF]/10 text-[#007AFF]">
                            <LogIn className="h-10 w-10" />
                        </div>

                        <h2 className="mb-3 text-2xl font-bold text-[#1E1E1E] md:text-3xl">
                            Sign in to Continue
                        </h2>
                        <p className="mb-8 text-sm leading-relaxed text-[#555555] md:text-base">
                            Sign in or create an account to purchase vouchers, track
                            applications, and manage your serial numbers and PINs in your profile.
                        </p>

                        <div className="grid w-full gap-4">
                            <Link
                                href={`/signin?redirect=${encodeURIComponent(redirectPath)}`}
                                className="flex items-center justify-center gap-2 rounded-2xl bg-[#007AFF] py-4 text-sm font-semibold text-white shadow-lg shadow-[#007AFF]/20 transition hover:bg-[#0062CC]"
                            >
                                <LogIn className="h-4 w-4" />
                                <span>Sign In to Account</span>
                            </Link>

                            <Link
                                href={`/signup?redirect=${encodeURIComponent(redirectPath)}`}
                                className="flex items-center justify-center gap-2 rounded-2xl border border-[#E0E0E0] bg-white py-4 text-sm font-semibold text-[#1E1E1E] transition hover:bg-[#F9FAFB]"
                            >
                                <UserPlus className="h-4 w-4" />
                                <span>Create New Account</span>
                            </Link>
                        </div>

                        <button
                            onClick={onClose}
                            className="mt-6 text-sm font-medium text-[#9E9E9E] hover:text-[#1E1E1E]"
                        >
                            Maybe later
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
