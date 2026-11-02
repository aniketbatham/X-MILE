"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/context/AuthContext";

const ROLE_PORTALS: Record<string, string> = {
  FARMER: "/farmer",
  BUYER: "/buyer",
  ADMIN: "/admin",
  TRANSPORT_PROVIDER: "/logistics",
  LOGISTICS: "/logistics",
  FPO_ADMIN: "/fpo",
  MACHINERY_PROVIDER: "/machinery",
  STORAGE_PROVIDER: "/storage",
  EXPERT: "/experts",
};

export default function HomePage() {
  const { t, currentLanguage } = useLanguage();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  // Role-based automatic redirection for returning authenticated users
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      const destination = ROLE_PORTALS[user.role] || "/farmer";
      const timer = setTimeout(() => {
        router.replace(destination);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isAuthenticated, user, router]);

  const openLanguageModal = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("open-language-modal"));
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-stone-50 via-emerald-50/20 to-stone-100 flex flex-col items-center justify-center p-4 selection:bg-emerald-500 selection:text-white">
      <div className="w-full max-w-sm sm:max-w-md bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-stone-200/80 text-center flex flex-col items-center space-y-8 animate-in fade-in duration-300">
        
        {/* X-MILE Logo & Brand Name */}
        <div className="flex flex-col items-center space-y-3">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[#172019] text-white shadow-xl shadow-emerald-950/15">
            <span className="text-4xl" role="img" aria-label="Sprout Logo">🌱</span>
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#172019]">
              X-MILE
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm font-semibold text-emerald-800 tracking-wide">
              Every MILE Matters, Every FARMER Matters.
            </p>
          </div>
        </div>

        {/* Primary Action Buttons: Sign In and Sign Up ONLY */}
        <div className="w-full space-y-3.5 pt-2">
          <Link
            href="/login"
            className="w-full flex items-center justify-center px-6 py-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-base shadow-lg shadow-emerald-800/20 active:scale-[0.98] transition duration-150"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="w-full flex items-center justify-center px-6 py-4 rounded-2xl bg-stone-900 hover:bg-black text-white font-extrabold text-base shadow-md active:scale-[0.98] transition duration-150"
          >
            Sign Up
          </Link>
        </div>

        {/* Language Selection Trigger Button */}
        <div className="pt-2 border-t border-stone-100 w-full flex justify-center">
          <button
            type="button"
            onClick={openLanguageModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-stone-200 hover:border-emerald-500 bg-stone-50 hover:bg-emerald-50/60 text-stone-700 hover:text-emerald-900 text-xs font-bold transition duration-150 shadow-2xs"
            aria-label="Change Language"
          >
            <span className="text-base">🌐</span>
            <span>{currentLanguage.nativeName} ({currentLanguage.name})</span>
            <span className="text-stone-400 font-normal text-[11px]">— Change</span>
          </button>
        </div>

      </div>
    </main>
  );
}
