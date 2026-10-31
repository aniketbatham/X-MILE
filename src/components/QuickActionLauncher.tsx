"use client";

import { useEffect, useRef, useState } from "react";
import Chatbot from "./Chatbot";

// Configurable phone number via NEXT_PUBLIC_SUPPORT_PHONE
// Leave empty if unverified to prevent invalid/accidental dialing
const SUPPORT_PHONE = process.env.NEXT_PUBLIC_SUPPORT_PHONE || "";

export default function QuickActionLauncher() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const launcherRef = useRef<HTMLDivElement | null>(null);

  // Close menu on outside click or Escape key press
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        launcherRef.current &&
        !launcherRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  const handleToggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  const handleOpenChat = () => {
    setIsChatOpen(true);
    setIsMenuOpen(false); // Close quick action menu after opening chatbot
  };

  const handleCloseChat = () => {
    setIsChatOpen(false);
  };

  const handleCallClick = (e: React.MouseEvent) => {
    if (!SUPPORT_PHONE) {
      e.preventDefault();
      alert(
        "X-MILE phone support is being configured. For immediate assistance, please use the X-MILE AI Assistant."
      );
    }
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Existing X-MILE AI Chatbot window */}
      <Chatbot
        isOpen={isChatOpen}
        onClose={handleCloseChat}
        showStandaloneToggle={false}
      />

      {/* Floating Action Launcher Container */}
      <div
        ref={launcherRef}
        className="fixed bottom-5 right-5 z-50 flex flex-col items-center"
      >
        {/* Secondary Action Buttons (Stacked Vertically Above X Button) */}
        <div
          className={`flex flex-col items-center gap-3 mb-3 transition-all duration-300 ease-out ${
            isMenuOpen
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
          aria-hidden={!isMenuOpen}
        >
          {/* Action 1: Call Button */}
          <div
            className={`relative group transition-all duration-200 ease-out motion-reduce:transition-none motion-reduce:transform-none ${
              isMenuOpen
                ? "translate-y-0 scale-100 opacity-100 delay-100"
                : "translate-y-4 scale-75 opacity-0"
            }`}
          >
            {/* Tooltip */}
            <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 hidden sm:group-hover:flex items-center pointer-events-none">
              <span className="rounded-lg bg-[#173b2a] px-2.5 py-1 text-xs font-semibold text-white shadow-lg whitespace-nowrap border border-[#2d583e]/50">
                Call X-MILE
              </span>
              <span className="border-y-4 border-y-transparent border-l-4 border-l-[#173b2a]" />
            </div>

            {SUPPORT_PHONE ? (
              <a
                href={`tel:${SUPPORT_PHONE}`}
                onClick={handleCallClick}
                aria-label="Call X-MILE"
                title="Call X-MILE"
                tabIndex={isMenuOpen ? 0 : -1}
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#173b2a] text-white shadow-lg border border-[#2e5e41] hover:bg-[#1f6b3b] hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-emerald-400/40 motion-reduce:transform-none"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
              </a>
            ) : (
              <button
                type="button"
                onClick={handleCallClick}
                aria-label="Call X-MILE"
                title="Call X-MILE"
                tabIndex={isMenuOpen ? 0 : -1}
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#173b2a] text-white shadow-lg border border-[#2e5e41] hover:bg-[#1f6b3b] hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-emerald-400/40 motion-reduce:transform-none"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Action 2: Chatbot Button */}
          <div
            className={`relative group transition-all duration-200 ease-out motion-reduce:transition-none motion-reduce:transform-none ${
              isMenuOpen
                ? "translate-y-0 scale-100 opacity-100 delay-50"
                : "translate-y-2 scale-75 opacity-0"
            }`}
          >
            {/* Tooltip */}
            <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 hidden sm:group-hover:flex items-center pointer-events-none">
              <span className="rounded-lg bg-[#173b2a] px-2.5 py-1 text-xs font-semibold text-white shadow-lg whitespace-nowrap border border-[#2d583e]/50">
                Chat with X-MILE AI
              </span>
              <span className="border-y-4 border-y-transparent border-l-4 border-l-[#173b2a]" />
            </div>

            <button
              type="button"
              onClick={handleOpenChat}
              aria-label="Open X-MILE AI Chatbot"
              title="Open X-MILE AI Chatbot"
              tabIndex={isMenuOpen ? 0 : -1}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1f6b3b] text-white shadow-lg border border-[#3c8e58]/50 hover:bg-[#277443] hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-emerald-400/40 motion-reduce:transform-none"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Main Floating "X" Button */}
        <button
          type="button"
          onClick={handleToggleMenu}
          aria-expanded={isMenuOpen}
          aria-haspopup="true"
          aria-label={isMenuOpen ? "Close actions launcher" : "Open X-MILE actions launcher"}
          className="group relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[#173b2a] text-white shadow-xl hover:shadow-2xl hover:bg-[#1f6b3b] active:scale-95 border border-[#2d583e]/60 focus:outline-none focus:ring-4 focus:ring-emerald-400/40 transition-all duration-300 motion-reduce:transition-none"
        >
          {/* Centered 'X' with exact 180° clockwise rotation */}
          <span
            className="text-2xl font-black tracking-wider transition-transform duration-300 ease-in-out select-none inline-block motion-reduce:transform-none"
            style={{
              transform: isMenuOpen ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            X
          </span>

          {/* Subtle status pulse when closed */}
          {!isMenuOpen && !isChatOpen && (
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 pointer-events-none">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
            </span>
          )}
        </button>
      </div>
    </>
  );
}
