"use client";

import Image from "next/image";
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

/**
 * Authentic native script authentication labels across all 22 official Indian languages + English
 */
const AUTH_LABELS: Record<
  string,
  { signIn: string; signUp: string; tagline: string; selectLang: string }
> = {
  en: {
    signIn: "Sign In",
    signUp: "Sign Up",
    tagline: "Every MILE Matters, Every FARMER Matters.",
    selectLang: "Change Language",
  },
  hi: {
    signIn: "साइन इन करें",
    signUp: "साइन अप करें",
    tagline: "हर मील महत्वपूर्ण है, हर किसान महत्वपूर्ण है।",
    selectLang: "भाषा बदलें",
  },
  bn: {
    signIn: "সাইন ইন করুন",
    signUp: "সাইন আপ করুন",
    tagline: "প্রতিটি মাইল গুরুত্বপূর্ণ, প্রতিটি কৃষক গুরুত্বপূর্ণ।",
    selectLang: "ভাষা পরিবর্তন",
  },
  te: {
    signIn: "సైన్ ఇన్ చేయండి",
    signUp: "సైన్ అప్ చేయండి",
    tagline: "ప్రతి మైలు ముఖ్యం, ప్రతి రైతు ముఖ్యం.",
    selectLang: "భాషను మార్చండి",
  },
  mr: {
    signIn: "साइन इन करा",
    signUp: "साइन अप करा",
    tagline: "प्रत्येक मैल महत्त्वाचा, प्रत्येक शेतकरी महत्त्वाचा.",
    selectLang: "भाषा बदला",
  },
  ta: {
    signIn: "உள்நுழைக",
    signUp: "பதிவு செய்க",
    tagline: "ஒவ்வொரு மைலும் முக்கியம், ஒவ்வொரு விவசாயியும் முக்கியம்.",
    selectLang: "மொழியை மாற்றவும்",
  },
  gu: {
    signIn: "સાઇન ઇન કરો",
    signUp: "સાઇન અપ કરો",
    tagline: "દરેક માઇલ મહત્વપૂર્ણ છે, દરેક ખેડૂત મહત્વપૂર્ણ છે.",
    selectLang: "ભાષા બદલો",
  },
  kn: {
    signIn: "ಸೈನ್ ಇನ್ ಮಾಡಿ",
    signUp: "ಸೈನ್ ಅಪ್ ಮಾಡಿ",
    tagline: "ಪ್ರತಿ ಮೈಲಿ ಮುಖ್ಯ, ಪ್ರತಿ ರೈತ ಮುಖ್ಯ.",
    selectLang: "ಭಾಷೆ ಬದಲಾಯಿಸಿ",
  },
  ml: {
    signIn: "സൈൻ ഇൻ ചെയ്യുക",
    signUp: "സൈൻ അപ്പ് ചെയ്യുക",
    tagline: "ഓരോ മൈലും പ്രധാനം, ഓരോ കർഷകനും പ്രധാനം.",
    selectLang: "ഭാഷ മാറ്റുക",
  },
  or: {
    signIn: "ସାଇନ୍ ଇନ୍ କରନ୍ତୁ",
    signUp: "ସାଇନ୍ ଅପ୍ କରନ୍ତୁ",
    tagline: "ପ୍ରତ୍ୟେକ ମାଇଲ୍ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ, ପ୍ରତ୍ୟେକ କୃଷକ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ।",
    selectLang: "ଭାଷା ବଦଳାନ୍ତୁ",
  },
  pa: {
    signIn: "ਸਾਈਨ ਇਨ ਕਰੋ",
    signUp: "ਸਾਈਨ ਅੱਪ ਕਰੋ",
    tagline: "ਹਰ ਮੀਲ ਮਹੱਤਵਪੂਰਨ ਹੈ, ਹਰ ਕਿਸਾਨ ਮਹੱਤਵਪੂਰਨ ਹੈ।",
    selectLang: "ਭਾਸ਼ਾ ਬਦਲੋ",
  },
  as: {
    signIn: "ছাইন ইন কৰক",
    signUp: "ছাইন আপ কৰক",
    tagline: "প্ৰতিটো মাইল গুৰুত্বপূৰ্ণ, প্ৰতিজন কৃষক গুৰুত্বপূৰ্ণ।",
    selectLang: "ভাষা সলনি কৰক",
  },
  ur: {
    signIn: "سائن ان کریں",
    signUp: "سائن اپ کریں",
    tagline: "ہر میل اہم ہے، ہر کسان اہم ہے۔",
    selectLang: "زبان تبدیل کریں",
  },
  sa: {
    signIn: "प्रविशतु",
    signUp: "पंजीकरणं करोतु",
    tagline: "प्रत्येकं क्रोशं महत्त्वपूर्णम्, प्रत्येकः कृषकः महत्त्वपूर्णः।",
    selectLang: "भाषां परिवर्तयतु",
  },
  ks: {
    signIn: "سائن اِن کٔرِو",
    signUp: "سائن اَپ کٔرِو",
    tagline: "پرٛتھ مَیٖل چھُ اہم، پرٛتھ کِسَان چھُ اہم۔",
    selectLang: "زَبان بدلاوِو",
  },
  kok: {
    signIn: "साइन इन करात",
    signUp: "साइन अप करात",
    tagline: "दर एक मैल म्हत्वाचो, दर एक शेतकार म्हत्वाचो.",
    selectLang: "भास बदलात",
  },
  mai: {
    signIn: "साइन इन करू",
    signUp: "साइन अप करू",
    tagline: "प्रत्येक मील महत्वपूर्ण अछि, प्रत्येक किसान महत्वपूर्ण अछि।",
    selectLang: "भाषा बदलू",
  },
  sat: {
    signIn: "ᱥᱟᱭᱤᱱ ᱤᱱ ᱢᱮ",
    signUp: "ᱥᱟᱭᱤᱱ ᱟᱯ ᱢᱮ",
    tagline: "ᱡᱚᱛᱚ ᱢᱟᱭᱤᱞ ᱜᱩᱨᱩᱛᱯᱩᱨᱱᱚ ᱠᱟᱱᱟ, ᱡᱚᱛᱚ ᱪᱟᱹᱥᱤ ᱜᱩᱨᱩᱛᱯᱩᱨᱱᱚ ᱠᱟᱱᱟ।",
    selectLang: "ᱯᱟᱹᱨᱥᱤ ᱵᱚᱫᱚᱞ ᱢᱮ" ,
  },
  sd: {
    signIn: "سائن ان ٿيو",
    signUp: "سائن اپ ٿيو",
    tagline: "هر ميل اهم آهي، هر هاري اهم آهي.",
    selectLang: "ٻولي مٽايو",
  },
  doi: {
    signIn: "साइन इन करो",
    signUp: "साइन अप करो",
    tagline: "हर मील जरूरी ऐ, हर किसान जरूरी ऐ।",
    selectLang: "बोली बदलो",
  },
  brx: {
    signIn: "साइन इन खालाम",
    signUp: "साइन आप खालाम",
    tagline: "गासै माइल गोनांथार, गासै आबादारी गोनांथार।",
    selectLang: "राव सोलाय",
  },
  ne: {
    signIn: "साइन इन गर्नुहोस्",
    signUp: "साइन अप गर्नुहोस्",
    tagline: "प्रत्येक माइल महत्त्वपूर्ण छ, प्रत्येक किसान महत्त्वपूर्ण छ।",
    selectLang: "भाषा बदल्नुहोस्",
  },
  mni: {
    signIn: "ꯁꯥꯏꯟ ꯏꯟ ꯇꯧꯕꯤꯌꯨ",
    signUp: "ꯁꯥꯏꯟ ꯑꯞ ꯇꯧꯕꯤꯌꯨ",
    tagline: "ꯃꯥꯏꯜ ꯈꯨꯗꯤꯡꯃꯛ ꯃꯔꯨꯑꯣꯏ, ꯂꯧꯃꯤ ꯈꯨꯗꯤꯡꯃꯛ ꯃꯔꯨꯑꯣꯏ।",
    selectLang: "ꯂꯣꯟ ꯍꯣꯡꯗꯣꯛꯄꯤꯌꯨ",
  },
};

export default function HomePage() {
  const { currentLanguage } = useLanguage();
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

  const labels = AUTH_LABELS[currentLanguage.code] || AUTH_LABELS.en;
  const isNonEnglish = currentLanguage.code !== "en";

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden flex flex-col justify-between bg-[#08140c] text-stone-100 selection:bg-emerald-500 selection:text-white">
      {/* 1. AUTHENTIC AGRICULTURAL PHOTOGRAPHY & NATURE BACKGROUND */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none">
        <Image
          src="/images/hero-farm.jpg"
          alt="Verdant Indian agricultural terrace farmland at dawn"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center filter brightness-[0.42] contrast-[1.12] scale-[1.03]"
        />

        {/* Rich Forest-Green Atmospheric Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#08140c]/90 via-[#0a1c10]/80 to-[#061009]/95" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_18%,rgba(16,185,129,0.18),transparent_70%)]" />

        {/* Precision Agronomic Micro-Grid & Telemetry Texture */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, 0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.4) 1px, transparent 1px)`,
            backgroundSize: "44px 44px",
          }}
        />
      </div>

      {/* 2. REFINED FLOATING TOP BAR */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-5 sm:pt-7 flex items-center justify-between">
        {/* Subtle Live Network Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0d2215]/85 border border-emerald-500/20 backdrop-blur-md text-[11px] font-semibold text-emerald-200/90 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="font-mono uppercase tracking-wider text-[10px] text-emerald-300">
            Agritech Network
          </span>
        </div>

        {/* Top-Right Language Switcher Trigger */}
        <button
          type="button"
          onClick={openLanguageModal}
          className="group inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full border border-emerald-500/30 bg-[#0d2215]/85 hover:bg-[#132e1d] backdrop-blur-md text-emerald-100 hover:text-white text-xs font-bold transition-all duration-150 shadow-md hover:border-emerald-400/50 hover:shadow-emerald-950/40 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          aria-label={labels.selectLang}
        >
          <span className="text-sm">🌐</span>
          <span className="font-semibold text-stone-100">{currentLanguage.nativeName}</span>
          <span className="text-emerald-300/60 font-normal text-[11px] hidden sm:inline">
            ({currentLanguage.name})
          </span>
          <span className="text-emerald-400/80 text-[10px] font-mono ml-0.5 group-hover:translate-y-0.5 transition-transform">
            ▾
          </span>
        </button>
      </header>

      {/* 3. CENTERPIECE: MINIMAL AUTHENTICATION PORTAL */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-md sm:max-w-lg relative">
          {/* Subtle Ambient Emerald Aura behind Card */}
          <div className="absolute -inset-1 rounded-[36px] bg-gradient-to-b from-emerald-500/20 via-emerald-600/10 to-transparent blur-2xl opacity-70 pointer-events-none" />

          {/* Main Architectural Card */}
          <div className="relative w-full rounded-[32px] bg-[#0c1f13]/90 backdrop-blur-2xl border border-emerald-500/25 p-7 sm:p-10 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.8)] ring-1 ring-white/10 flex flex-col items-center text-center space-y-7 animate-in fade-in zoom-in-95 duration-200">
            {/* Top Micro Accent Line */}
            <div className="absolute top-0 left-12 right-12 h-[2px] bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent" />

            {/* X-MILE Emblem: Seed-to-Canopy Seedling */}
            <div className="relative flex items-center justify-center pt-1">
              <div className="relative flex h-20 w-20 sm:h-22 sm:w-22 items-center justify-center rounded-3xl bg-gradient-to-br from-[#183a22] to-[#0a1b0f] border border-emerald-400/35 text-white shadow-xl shadow-emerald-950/60 ring-1 ring-white/10">
                <svg
                  className="w-10 h-10 sm:w-11 sm:h-11 text-emerald-400 drop-shadow-[0_2px_8px_rgba(16,185,129,0.5)]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M7 20h10" />
                  <path d="M10 20c0-4.5 1.5-8 5-11" />
                  <path d="M15 9c2.5-3 5-3 5-3s0 3-2.5 5.5c-1.5 1.5-3 2-4 2" />
                  <path d="M12 14c-2.5-2.5-3-5.5-3-5.5s3 0 5 2.5" />
                </svg>
              </div>
            </div>

            {/* Brand Title & Tagline */}
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white font-sans drop-shadow-sm">
                X-MILE
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-emerald-300/90 tracking-wide max-w-xs sm:max-w-sm mx-auto text-balance">
                {labels.tagline}
              </p>
            </div>

            {/* PRIMARY ACTIONS: SIGN IN & SIGN UP ONLY */}
            <div className="w-full space-y-3.5 pt-1">
              {/* 1. Sign In (Primary Action) */}
              <Link
                href="/login"
                className="group relative w-full h-14 sm:h-15 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-650 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-extrabold shadow-lg shadow-emerald-950/50 border border-emerald-400/30 active:scale-[0.985] transition-all duration-150 flex items-center justify-between px-6 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-[#0c1f13]"
              >
                <div className="text-left">
                  <span className="block text-base sm:text-lg font-black tracking-tight text-white">
                    {labels.signIn}
                  </span>
                  {isNonEnglish && (
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-emerald-200/80 -mt-0.5">
                      Sign In
                    </span>
                  )}
                </div>
                <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center text-white group-hover:translate-x-1 transition-transform">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </div>
              </Link>

              {/* 2. Sign Up (Secondary Action) */}
              <Link
                href="/register"
                className="group relative w-full h-14 sm:h-15 rounded-2xl bg-[#142d1d]/80 hover:bg-[#193824] text-stone-100 hover:text-white font-bold border border-emerald-500/20 hover:border-emerald-400/40 shadow-md active:scale-[0.985] transition-all duration-150 flex items-center justify-between px-6 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-[#0c1f13]"
              >
                <div className="text-left">
                  <span className="block text-base sm:text-lg font-bold tracking-tight text-stone-100">
                    {labels.signUp}
                  </span>
                  {isNonEnglish && (
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-emerald-300/70 -mt-0.5">
                      Sign Up
                    </span>
                  )}
                </div>
                <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-emerald-300 group-hover:scale-105 transition-transform">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.375 21c-2.331 0-4.512-.645-6.374-1.765z"
                    />
                  </svg>
                </div>
              </Link>
            </div>

            {/* Language Switcher Trigger Button */}
            <div className="pt-2 border-t border-emerald-500/15 w-full flex justify-center">
              <button
                type="button"
                onClick={openLanguageModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-emerald-500/25 bg-[#0a1a10]/70 hover:bg-[#122a1a] text-emerald-200/90 hover:text-white text-xs font-semibold transition duration-150 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-emerald-400"
                aria-label={labels.selectLang}
              >
                <span className="text-sm">🌐</span>
                <span className="font-semibold">{currentLanguage.nativeName}</span>
                <span className="text-emerald-400 font-bold text-[11px]">
                  — {labels.selectLang}
                </span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* 4. DISCREET NATURE & TRUST FOOTER */}
      <footer className="relative z-10 w-full max-w-5xl mx-auto px-4 py-5 sm:py-6 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-[11px] text-emerald-300/60 font-medium">
        <div className="flex items-center gap-2">
          <span>🌱 X-MILE Ecosystem</span>
          <span className="text-emerald-500/40">·</span>
          <span>22 Indian Languages Supported</span>
        </div>
        <div className="text-center sm:text-right">
          <span>Every MILE Matters, Every FARMER Matters.</span>
        </div>
      </footer>
    </div>
  );
}
