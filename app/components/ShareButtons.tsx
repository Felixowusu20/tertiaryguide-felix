"use client";

import { useEffect, useState } from "react";
import { LinkIcon } from "lucide-react";

export function ShareButtons({ title, url }: { title: string; url: string }) {
    const [copied, setCopied] = useState(false);
    const [fullUrl, setFullUrl] = useState(url);

    useEffect(() => {
        if (url) {
            setFullUrl(url);
            return;
        }
        setFullUrl(window.location.href);
    }, [url]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(fullUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    const shareLinks = [
        {
            name: "Twitter",
            href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                title
            )}&url=${encodeURIComponent(fullUrl)}`,
            color: "hover:bg-[#1DA1F2] hover:text-white",
            icon: (
                <svg
                    className="h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
            ),
        },
        {
            name: "Facebook",
            href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                fullUrl
            )}`,
            color: "hover:bg-[#4267B2] hover:text-white",
            icon: (
                <svg
                    className="h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <path
                        fillRule="evenodd"
                        d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
                        clipRule="evenodd"
                    />
                </svg>
            ),
        },
        {
            name: "LinkedIn",
            href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
                fullUrl
            )}`,
            color: "hover:bg-[#0077b5] hover:text-white",
            icon: (
                <svg
                    className="h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <path
                        fillRule="evenodd"
                        d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"
                        clipRule="evenodd"
                    />
                </svg>
            ),
        },
    ];

    if (!fullUrl) return null; // Avoid hydration mismatch on server

    return (
        <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mr-2">
                Share
            </span>
            {shareLinks.map((link) => (
                <a
                    key={link.name}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors ${link.color}`}
                    aria-label={`Share on ${link.name}`}
                >
                    {link.icon}
                </a>
            ))}
            <button
                onClick={handleCopy}
                className={`flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200 ${copied ? "text-green-600" : "text-gray-500"
                    }`}
                aria-label="Copy Link"
                title="Copy Link"
            >
                {copied ? (
                    <span className="text-xs font-bold">✓</span>
                ) : (
                    <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                        />
                    </svg>
                )}
            </button>
        </div>
    );
}
