"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
 * Native script translations for authentication actions across all 22 official Indian languages + English
 */
const AUTH_LABELS: Record<
  string,
  { signIn: string; signUp: string; tagline: string; selectLang: string; startJourney: string }
> = {
  en: {
    signIn: "Sign In",
    signUp: "Sign Up",
    tagline: "Every MILE Matters, Every FARMER Matters.",
    selectLang: "Change Language",
    startJourney: "Explore the Agricultural Journey",
  },
  hi: {
    signIn: "साइन इन करें",
    signUp: "साइन अप करें",
    tagline: "हर मील महत्वपूर्ण है, हर किसान महत्वपूर्ण है।",
    selectLang: "भाषा बदलें",
    startJourney: "कृषि यात्रा देखें",
  },
  bn: {
    signIn: "সাইন ইন করুন",
    signUp: "সাইন আপ করুন",
    tagline: "প্রতিটি মাইল গুরুত্বপূর্ণ, প্রতিটি কৃষক গুরুত্বপূর্ণ।",
    selectLang: "ভাষা পরিবর্তন",
    startJourney: "কৃষি যাত্রা অন্বেষণ করুন",
  },
  te: {
    signIn: "సైన్ ఇన్ చేయండి",
    signUp: "సైన్ అప్ చేయండి",
    tagline: "ప్రతి మైలు ముఖ్యం, ప్రతి రైతు ముఖ్యం.",
    selectLang: "భాషను మార్చండి",
    startJourney: "వ్యవసాయ ప్రయాణాన్ని అన్వేషించండి",
  },
  mr: {
    signIn: "साइन इन करा",
    signUp: "साइन अप करा",
    tagline: "प्रत्येक मैल महत्त्वाचा, प्रत्येक शेतकरी महत्त्वाचा.",
    selectLang: "भाषा बदला",
    startJourney: "कृषी प्रवास पहा",
  },
  ta: {
    signIn: "உள்நுழைக",
    signUp: "பதிவு செய்க",
    tagline: "ஒவ்வொரு மைலும் முக்கியம், ஒவ்வொரு விவசாயியும் முக்கியம்.",
    selectLang: "மொழியை மாற்றவும்",
    startJourney: "விவசாய பயணத்தை ஆராயுங்கள்",
  },
  gu: {
    signIn: "સાઇન ઇન કરો",
    signUp: "સાઇન અપ કરો",
    tagline: "દરેક માઇલ મહત્વપૂર્ણ છે, દરેક ખેડૂત મહત્વપૂર્ણ છે.",
    selectLang: "ભાષા બદલો",
    startJourney: "કૃષિ યાત્રા જુઓ",
  },
  kn: {
    signIn: "ಸೈನ್ ಇನ್ ಮಾಡಿ",
    signUp: "ಸೈನ್ ಅಪ್ ಮಾಡಿ",
    tagline: "ಪ್ರತಿ ಮೈಲಿ ಮುಖ್ಯ, ಪ್ರತಿ ರೈತ ಮುಖ್ಯ.",
    selectLang: "ಭಾಷೆ ಬದಲಾಯಿಸಿ",
    startJourney: "ಕೃಷಿ ಪಯಣವನ್ನು ಅನ್ವೇಷಿಸಿ",
  },
  ml: {
    signIn: "സൈൻ ഇൻ ചെയ്യുക",
    signUp: "സൈൻ അപ്പ് ചെയ്യുക",
    tagline: "ഓരോ മൈലും പ്രധാനം, ഓരോ കർഷകനും പ്രധാനം.",
    selectLang: "ഭാഷ മാറ്റുക",
    startJourney: "കാർഷിക യാത്ര പര്യവേക്ഷണം ചെയ്യുക",
  },
  or: {
    signIn: "ସାଇନ୍ ଇନ୍ କରନ୍ତୁ",
    signUp: "ସାଇନ୍ ଅପ୍ କରନ୍ତୁ",
    tagline: "ପ୍ରତ୍ୟେକ ମାଇଲ୍ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ, ପ୍ରତ୍ୟେକ କୃଷକ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ।",
    selectLang: "ଭାଷା ବଦଳାନ୍ତୁ",
    startJourney: "କୃଷି ଯାତ୍ରା ଦେଖନ୍ତୁ",
  },
  pa: {
    signIn: "ਸਾਈਨ ਇਨ ਕਰੋ",
    signUp: "ਸਾਈਨ ਅੱਪ ਕਰੋ",
    tagline: "ਹਰ ਮੀਲ ਮਹੱਤਵਪੂਰਨ ਹੈ, ਹਰ ਕਿਸਾਨ ਮਹੱਤਵਪੂਰਨ ਹੈ।",
    selectLang: "ਭਾਸ਼ਾ ਬਦਲੋ",
    startJourney: "ਖੇਤੀ ਯਾਤਰਾ ਦੇਖੋ",
  },
  as: {
    signIn: "ছাইন ইন কৰক",
    signUp: "ছাইন আপ কৰক",
    tagline: "প্ৰতিটো মাইল গুৰুত্বপূৰ্ণ, প্ৰতিজন কৃষক গুৰুত্বপূৰ্ণ।",
    selectLang: "ভাষা সলনি কৰক",
    startJourney: "কৃষি যাত্ৰা চাওক",
  },
  ur: {
    signIn: "سائن ان کریں",
    signUp: "سائن اپ کریں",
    tagline: "ہر میل اہم ہے، ہر کسان اہم ہے۔",
    selectLang: "زبان تبدیل کریں",
    startJourney: "زرعی سفر دیکھیں",
  },
  sa: {
    signIn: "प्रविशतु",
    signUp: "पंजीकरणं करोतु",
    tagline: "प्रत्येकं क्रोशं महत्त्वपूर्णम्, प्रत्येकः कृषकः महत्त्वपूर्णः।",
    selectLang: "भाषां परिवर्तयतु",
    startJourney: "कृषि-यात्रां पश्यतु",
  },
  ks: {
    signIn: "سائن اِن کٔرِو",
    signUp: "سائن اَپ کٔرِو",
    tagline: "پرٛتھ مَیٖل چھُ اہم، پرٛتھ کِسَان چھُ اہم۔",
    selectLang: "زَبان بدلاوِو",
    startJourney: "زَرعی سفر وُچھِو",
  },
  kok: {
    signIn: "साइन इन करात",
    signUp: "साइन अप करात",
    tagline: "दर एक मैल म्हत्वाचो, दर एक शेतकार म्हत्वाचो.",
    selectLang: "भास बदलात",
    startJourney: "कृषी भोंवडी पळेयात",
  },
  mai: {
    signIn: "साइन इन करू",
    signUp: "साइन अप करू",
    tagline: "प्रत्येक मील महत्वपूर्ण अछि, प्रत्येक किसान महत्वपूर्ण अछि।",
    selectLang: "भाषा बदलू",
    startJourney: "कृषि यात्रा देखू",
  },
  sat: {
    signIn: "ᱥᱟᱭᱤᱱ ᱤᱱ ᱢᱮ",
    signUp: "ᱥᱟᱭᱤᱱ ᱟᱯ ᱢᱮ",
    tagline: "ᱡᱚᱛᱚ ᱢᱟᱭᱤᱞ ᱜᱩᱨᱩᱛᱯᱩᱨᱱᱚ ᱠᱟᱱᱟ, ᱡᱚᱛᱚ ᱪᱟᱹᱥᱤ ᱜᱩᱨᱩᱛᱯᱩᱨᱱᱚ ᱠᱟᱱᱟ।",
    selectLang: "ᱯᱟᱹᱨᱥᱤ ᱵᱚᱫᱚᱞ ᱢᱮ",
    startJourney: "ᱪᱟᱥ ᱡᱟᱛᱨᱟ ᱧᱮᱞ ᱢᱮ",
  },
  sd: {
    signIn: "سائن ان ٿيو",
    signUp: "سائن اپ ٿيو",
    tagline: "هر ميل اهم آهي، هر هاري اهم آهي.",
    selectLang: "ٻولي مٽايو",
    startJourney: "زرعي سفر ڏسو",
  },
  doi: {
    signIn: "साइन इन करो",
    signUp: "साइन अप करो",
    tagline: "हर मील जरूरी ऐ, हर किसान जरूरी ऐ।",
    selectLang: "बोली बदलो",
    startJourney: "खेती यात्रा दिक्खो",
  },
  brx: {
    signIn: "साइन इन खालाम",
    signUp: "साइन आप खालाम",
    tagline: "गासै माइल गोनांथार, गासै आबादारी गोनांथार।",
    selectLang: "राव सोलाय",
    startJourney: "आबाद दावबायनाय नाय",
  },
  ne: {
    signIn: "साइन इन गर्नुहोस्",
    signUp: "साइन अप गर्नुहोस्",
    tagline: "प्रत्येक माइल महत्त्वपूर्ण छ, प्रत्येक किसान महत्त्वपूर्ण छ।",
    selectLang: "भाषा बदल्नुहोस्",
    startJourney: "कृषि यात्रा अन्वेषण गर्नुहोस्",
  },
  mni: {
    signIn: "ꯁꯥꯏꯟ ꯏꯟ ꯇꯧꯕꯤꯌꯨ",
    signUp: "ꯁꯥꯏꯟ ꯑꯞ ꯇꯧꯕꯤꯌꯨ",
    tagline: "ꯃꯥꯏꯜ ꯈꯨꯗꯤꯡꯃꯛ ꯃꯔꯨꯑꯣꯏ, ꯂꯧꯃꯤ ꯈꯨꯗꯤꯡꯃꯛ ꯃꯔꯨꯑꯣꯏ।",
    selectLang: "ꯂꯣꯟ ꯍꯣꯡꯗꯣꯛꯄꯤꯌꯨ",
    startJourney: "ꯂꯧ-উশিং খোঙচৎ য়েংবীয়ু",
  },
};

/**
 * Lightweight performant scroll reveal hook with IntersectionObserver
 */
function useInView(options?: IntersectionObserverInit) {
  const [inView, setInView] = useState(() => {
    if (typeof window === "undefined") return false;
    return !("IntersectionObserver" in window);
  });
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined" || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px", ...options }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [options]);

  return [ref, inView] as const;
}

export default function HomePage() {
  const { currentLanguage } = useLanguage();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [activeRoleTab, setActiveRoleTab] = useState<"farmer" | "buyer" | "transporter" | "admin">("farmer");

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

  const labels = useMemo(() => {
    return AUTH_LABELS[currentLanguage.code] || AUTH_LABELS.en;
  }, [currentLanguage.code]);

  const isNonEnglish = currentLanguage.code !== "en";

  // Section inView observers
  const [heroRef, heroInView] = useInView();
  const [challengeRef, challengeInView] = useInView();
  const [introRef, introInView] = useInView();
  const [featuresRef, featuresInView] = useInView();
  const [journeyRef, journeyInView] = useInView();
  const [rolesRef, rolesInView] = useInView();
  const [ctaRef, ctaInView] = useInView();

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#07130a] text-stone-100 selection:bg-emerald-500 selection:text-white font-sans scroll-smooth">

      {/* ──────────────────────────────────────────────────────────
          STICKY TOP NAVIGATION BAR
      ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-[#08150c]/85 border-b border-emerald-500/15 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-18 flex items-center justify-between gap-4">
          
          {/* Logo & Emblem */}
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br from-[#173a21] to-[#0d2214] border border-emerald-400/35 flex items-center justify-center text-emerald-400 shadow-sm group-hover:border-emerald-300 transition">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M7 20h10" />
                <path d="M10 20c0-4.5 1.5-8 5-11" />
                <path d="M15 9c2.5-3 5-3 5-3s0 3-2.5 5.5c-1.5 1.5-3 2-4 2" />
                <path d="M12 14c-2.5-2.5-3-5.5-3-5.5s3 0 5 2.5" />
              </svg>
            </div>
            <div>
              <span className="font-black tracking-tight text-lg sm:text-xl text-white block">X-MILE</span>
              <span className="text-[9px] font-mono tracking-widest text-emerald-400 uppercase hidden sm:block -mt-1">
                Agritech Ecosystem
              </span>
            </div>
          </Link>

          {/* Center: Live Network Status Badge */}
          <div className="hidden md:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0d2215]/80 border border-emerald-500/20 text-[11px] font-medium text-emerald-200/90 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>National Agricultural Exchange Active</span>
          </div>

          {/* Right: Language Selector & Quick Auth */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={openLanguageModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-[#0d2215] hover:bg-[#132e1d] text-emerald-100 hover:text-white text-xs font-bold transition shadow-sm"
              aria-label={labels.selectLang}
            >
              <span className="text-xs">🌐</span>
              <span className="font-semibold text-stone-100">{currentLanguage.nativeName}</span>
              <span className="text-emerald-400 text-[10px] ml-0.5">▾</span>
            </button>

            <Link
              href="/login"
              className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm border border-emerald-400/30 transition shadow-sm active:scale-[0.98]"
            >
              {labels.signIn}
            </Link>

            <Link
              href="/register"
              className="hidden sm:inline-flex px-3.5 py-1.5 sm:py-2 rounded-xl bg-[#142d1d] hover:bg-[#1b3b26] text-stone-100 hover:text-white font-bold text-xs sm:text-sm border border-emerald-500/20 transition active:scale-[0.98]"
            >
              {labels.signUp}
            </Link>
          </div>
        </div>
      </header>


      {/* ──────────────────────────────────────────────────────────
          SECTION 1 — CINEMATIC HERO
      ────────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="relative min-h-[92vh] flex flex-col justify-between items-center text-center px-4 sm:px-6 pt-12 sm:pt-20 pb-12 overflow-hidden"
      >
        {/* Cinematic Backdrop Image */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <Image
            src="/images/hero-farm.jpg"
            alt="Pristine green Indian agricultural terrace farmland at dawn"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center filter brightness-[0.38] contrast-[1.14] scale-[1.02]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#07130a]/80 via-[#091a0e]/75 to-[#07130a]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_50%_at_50%_25%,rgba(16,185,129,0.18),transparent_70%)]" />
        </div>

        {/* Ambient Top Micro-Badge */}
        <div
          className={`relative z-10 transition-all duration-700 ${
            heroInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0d2616]/90 border border-emerald-400/30 backdrop-blur-md text-[11px] font-bold text-emerald-300 tracking-wider uppercase shadow-md">
            <span>🌱</span>
            <span>National Agricultural Supply & Value Network</span>
          </div>
        </div>

        {/* Hero Typography & Core Message */}
        <div
          className={`relative z-10 max-w-4xl mx-auto space-y-6 my-auto pt-6 sm:pt-10 transition-all duration-1000 delay-150 ${
            heroInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white font-sans text-balance leading-[1.08] drop-shadow-md">
            Every <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-200">MILE</span> Matters.
            <br />
            Every <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-amber-300 to-emerald-200">FARMER</span> Matters.
          </h1>

          <p className="text-base sm:text-xl text-emerald-100/85 font-medium max-w-2xl mx-auto text-balance leading-relaxed">
            An agricultural exchange platform connecting farm-gate harvests, commercial buyers, and rural logistics into one transparent, verified ecosystem.
          </p>

          {/* Quick CTA Actions inside Hero */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-4">
            <Link
              href="/login"
              className="px-7 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-650 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-extrabold text-base shadow-xl shadow-emerald-950/60 border border-emerald-400/35 active:scale-[0.98] transition-all"
            >
              {labels.signIn} {isNonEnglish && <span className="text-emerald-200 text-xs font-normal ml-1">· Sign In</span>} →
            </Link>

            <Link
              href="/register"
              className="px-7 py-4 rounded-2xl bg-[#0f2818]/90 hover:bg-[#153420] text-stone-100 hover:text-white font-bold text-base border border-emerald-500/25 shadow-md active:scale-[0.98] transition-all"
            >
              {labels.signUp} {isNonEnglish && <span className="text-emerald-300/80 text-xs font-normal ml-1">· Sign Up</span>}
            </Link>
          </div>
        </div>

        {/* Elegant Scroll Indicator */}
        <div
          className={`relative z-10 pt-8 transition-all duration-700 delay-300 ${
            heroInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <a
            href="#agricultural-challenge"
            className="inline-flex flex-col items-center gap-2 text-xs font-semibold text-emerald-300/80 hover:text-emerald-200 transition group"
          >
            <span>{labels.startJourney}</span>
            <div className="h-8 w-5 rounded-full border border-emerald-400/40 flex items-start justify-center p-1 group-hover:border-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" />
            </div>
          </a>
        </div>
      </section>


      {/* ──────────────────────────────────────────────────────────
          SECTION 2 — THE AGRICULTURAL CHALLENGE
      ────────────────────────────────────────────────────────── */}
      <section
        id="agricultural-challenge"
        ref={challengeRef}
        className="relative py-20 sm:py-28 px-4 sm:px-6 bg-[#08170c] border-t border-emerald-500/10"
      >
        <div className="max-w-6xl mx-auto space-y-14">
          
          <div
            className={`text-center space-y-3 max-w-2xl mx-auto transition-all duration-700 ${
              challengeInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <span className="text-xs font-mono font-bold tracking-widest text-emerald-400 uppercase">
              The Agricultural Challenge
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
              The Realities of Agricultural Commerce
            </h2>
            <p className="text-sm sm:text-base text-emerald-100/75">
              Agricultural supply chains across India face fundamental systemic barriers that create uncertainty for growers, commercial buyers, and logistics providers alike.
            </p>
          </div>

          {/* 4 Core Real-World Challenge Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Challenge 1 */}
            <div
              className={`p-7 sm:p-8 rounded-3xl bg-[#0c2214]/85 border border-emerald-500/20 backdrop-blur-md shadow-lg transition-all duration-700 delay-100 ${
                challengeInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              <div className="h-12 w-12 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-2xl mb-5">
                🌾
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Farmers Need Direct Market Access
              </h3>
              <p className="text-sm text-emerald-100/70 leading-relaxed">
                Smallholder growers often lack transparent commercial access beyond local mandis, causing price discounts, multi-layered commission agent fees, and uncertain sale timelines.
              </p>
            </div>

            {/* Challenge 2 */}
            <div
              className={`p-7 sm:p-8 rounded-3xl bg-[#0c2214]/85 border border-emerald-500/20 backdrop-blur-md shadow-lg transition-all duration-700 delay-200 ${
                challengeInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-2xl mb-5">
                🏢
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Buyers Need Reliable Crop Supply
              </h3>
              <p className="text-sm text-emerald-100/70 leading-relaxed">
                Commercial and institutional buyers require dependable harvest volume streams. When supply is fragmented across thousands of individual holdings, procurement becomes unpredictable.
              </p>
            </div>

            {/* Challenge 3 */}
            <div
              className={`p-7 sm:p-8 rounded-3xl bg-[#0c2214]/85 border border-emerald-500/20 backdrop-blur-md shadow-lg transition-all duration-700 delay-300 ${
                challengeInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              <div className="h-12 w-12 rounded-2xl bg-blue-500/15 border border-blue-400/30 flex items-center justify-center text-2xl mb-5">
                🔬
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Produce Quality Needs Early Visibility
              </h3>
              <p className="text-sm text-emerald-100/70 leading-relaxed">
                Quality assessments frequently occur only upon arrival at distant distribution centers, triggering rejections, weighbridge grading disputes, and irreversible produce spoilage.
              </p>
            </div>

            {/* Challenge 4 */}
            <div
              className={`p-7 sm:p-8 rounded-3xl bg-[#0c2214]/85 border border-emerald-500/20 backdrop-blur-md shadow-lg transition-all duration-700 delay-400 ${
                challengeInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              <div className="h-12 w-12 rounded-2xl bg-teal-500/15 border border-teal-400/30 flex items-center justify-center text-2xl mb-5">
                🚚
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Agricultural Transport Needs Coordination
              </h3>
              <p className="text-sm text-emerald-100/70 leading-relaxed">
                Rural freight vehicles operate with little scheduled coordination between farm gates, collection points, and buyer warehouses, leading to idle capacity and delayed fulfillment.
              </p>
            </div>

          </div>
        </div>
      </section>


      {/* ──────────────────────────────────────────────────────────
          SECTION 3 — INTRODUCING X-MILE
      ────────────────────────────────────────────────────────── */}
      <section
        ref={introRef}
        className="relative py-20 sm:py-28 px-4 sm:px-6 bg-[#061208] border-t border-emerald-500/10 overflow-hidden"
      >
        <div className="max-w-6xl mx-auto space-y-16">
          
          <div
            className={`text-center space-y-3 max-w-2xl mx-auto transition-all duration-700 ${
              introInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <span className="text-xs font-mono font-bold tracking-widest text-emerald-400 uppercase">
              The Solution
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
              One Unified Agricultural Ecosystem
            </h2>
            <p className="text-sm sm:text-base text-emerald-100/75">
              X-MILE creates a structured digital bridge where farm-level production, buyer demand specifications, and rural transit connect into one transparent lifecycle.
            </p>
          </div>

          {/* Three Interconnected Pillars Diagram */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            
            {/* Pillar 1: Farmers */}
            <div
              className={`p-8 rounded-3xl bg-[#0a1e12] border border-emerald-500/25 relative flex flex-col justify-between transition-all duration-700 delay-100 ${
                introInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              <div>
                <div className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider mb-2">Pillar 01</div>
                <h3 className="text-2xl font-black text-white mb-2">The Growers</h3>
                <p className="text-xs text-emerald-300 font-semibold mb-4">Farm Profile & Harvest Inventory</p>
                <p className="text-sm text-emerald-100/70 leading-relaxed">
                  Farmers document their registered plots, log harvest inventory lots, publish market listings with asking prices, and receive direct procurement offers.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-emerald-500/15 flex items-center justify-between text-xs text-emerald-300 font-medium">
                <span>Direct Listing Access</span>
                <span>🌾</span>
              </div>
            </div>

            {/* Pillar 2: Buyers */}
            <div
              className={`p-8 rounded-3xl bg-[#0a1e12] border border-emerald-500/25 relative flex flex-col justify-between transition-all duration-700 delay-200 ${
                introInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              <div>
                <div className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider mb-2">Pillar 02</div>
                <h3 className="text-2xl font-black text-white mb-2">The Commercial Buyers</h3>
                <p className="text-xs text-emerald-300 font-semibold mb-4">Procurement & Order Negotiation</p>
                <p className="text-sm text-emerald-100/70 leading-relaxed">
                  Bulk purchasers discover verified harvest lots across districts, submit rate offers per kg with payment terms, and negotiate confirmed supply contracts.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-emerald-500/15 flex items-center justify-between text-xs text-emerald-300 font-medium">
                <span>Verified Procurement</span>
                <span>🏢</span>
              </div>
            </div>

            {/* Pillar 3: Transporters */}
            <div
              className={`p-8 rounded-3xl bg-[#0a1e12] border border-emerald-500/25 relative flex flex-col justify-between transition-all duration-700 delay-300 ${
                introInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              <div>
                <div className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider mb-2">Pillar 03</div>
                <h3 className="text-2xl font-black text-white mb-2">The Rural Transporters</h3>
                <p className="text-xs text-emerald-300 font-semibold mb-4">Dispatch & Transit Verification</p>
                <p className="text-sm text-emerald-100/70 leading-relaxed">
                  Transport providers accept scheduled dispatch runs, coordinate pickup locations, update milestone progress, and confirm final weighbridge delivery.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-emerald-500/15 flex items-center justify-between text-xs text-emerald-300 font-medium">
                <span>Milestone Logistics</span>
                <span>🚚</span>
              </div>
            </div>

          </div>

          {/* Connection Summary Banner */}
          <div className="p-6 rounded-2xl bg-[#0d2616]/80 border border-emerald-500/20 text-center max-w-3xl mx-auto">
            <p className="text-xs sm:text-sm text-emerald-200/90 font-medium">
              🔗 <strong>Unified Connectivity:</strong> Every produce listing ties atomically to farmer inventory, buyer offers, transporter assignment, and delivery weighbridge verification.
            </p>
          </div>

        </div>
      </section>


      {/* ──────────────────────────────────────────────────────────
          SECTION 4 — EXPLORE X-MILE FEATURES (6 REAL PLATFORM CAPABILITIES)
      ────────────────────────────────────────────────────────── */}
      <section
        ref={featuresRef}
        className="relative py-20 sm:py-28 px-4 sm:px-6 bg-[#08170c] border-t border-emerald-500/10"
      >
        <div className="max-w-6xl mx-auto space-y-16">
          
          <div
            className={`text-center space-y-3 max-w-2xl mx-auto transition-all duration-700 ${
              featuresInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <span className="text-xs font-mono font-bold tracking-widest text-emerald-400 uppercase">
              Operational Platform Features
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
              Built on Verified Agricultural Workflows
            </h2>
            <p className="text-sm sm:text-base text-emerald-100/75">
              Explore the six core functional capabilities operational inside X-MILE today.
            </p>
          </div>

          {/* Feature 1: Agricultural Marketplace */}
          <div
            className={`grid grid-cols-1 lg:grid-cols-2 gap-8 items-center p-8 sm:p-10 rounded-3xl bg-[#0a1e12] border border-emerald-500/20 shadow-xl transition-all duration-700 ${
              featuresInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="space-y-4">
              <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                01 · Produce Marketplace
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white">
                Live Agricultural Listings & Discovery
              </h3>
              <p className="text-sm text-emerald-100/75 leading-relaxed">
                Farmers publish verified crop lots specifying variety, harvest date, quality grade, pickup district, and asking rate per kilogram. Commercial buyers discover real produce available across regions and initiate procurement.
              </p>
              <ul className="text-xs text-emerald-200/90 space-y-2 pt-2">
                <li>✓ Filter by crop category, variety, grade, and district</li>
                <li>✓ Transparent asking price per kg with volume availability</li>
                <li>✓ Connected directly to actual farmer harvest inventory</li>
              </ul>
            </div>
            <div className="relative h-64 sm:h-80 rounded-2xl overflow-hidden border border-emerald-500/20 shadow-md">
              <Image
                src="/images/harvest-crops.jpg"
                alt="Harvested fresh agricultural produce in wooden crates"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a1e12] via-transparent to-transparent" />
              <div className="absolute bottom-3 left-4 right-4 p-3 rounded-xl bg-[#0a1e12]/90 backdrop-blur-md border border-emerald-500/30 text-[11px] text-emerald-200 flex justify-between items-center">
                <span>Verified Crop Lot #LOT-TOM-01</span>
                <span className="font-mono font-bold text-white">1,200 kg · Grade A</span>
              </div>
            </div>
          </div>

          {/* Feature 2: AI Crop Quality Assessment */}
          <div
            className={`grid grid-cols-1 lg:grid-cols-2 gap-8 items-center p-8 sm:p-10 rounded-3xl bg-[#0a1e12] border border-emerald-500/20 shadow-xl transition-all duration-700 ${
              featuresInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="order-2 lg:order-1 relative h-64 sm:h-80 rounded-2xl overflow-hidden border border-emerald-500/20 shadow-md">
              <Image
                src="/images/quality-check.jpg"
                alt="Agricultural produce quality assessment"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a1e12] via-transparent to-transparent" />
              <div className="absolute bottom-3 left-4 right-4 p-3 rounded-xl bg-[#0a1e12]/90 backdrop-blur-md border border-emerald-500/30 text-[11px] text-emerald-200 flex justify-between items-center">
                <span>AI Vision Triage: Color, Uniformity, Defects</span>
                <span className="font-mono font-bold text-emerald-300">Grade A Assessed</span>
              </div>
            </div>
            <div className="order-1 lg:order-2 space-y-4">
              <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                02 · AI Vision Triage
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white">
                Multimodal Visual Crop Assessment
              </h3>
              <p className="text-sm text-emerald-100/75 leading-relaxed">
                Farmers take or upload clear photos of harvested crops to receive instant computer-vision triage estimating Grade A, B, or C based on external color, skin maturity, shape uniformity, and visible surface defects.
              </p>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-400/25 text-[11px] text-amber-200 leading-normal">
                ⚠️ <strong>Important Notice:</strong> Visual AI grading evaluates external characteristics only. It does not replace laboratory chemical residue analysis or certified assay testing.
              </div>
            </div>
          </div>

          {/* Feature 3: Farm & Inventory Management */}
          <div
            className={`grid grid-cols-1 lg:grid-cols-2 gap-8 items-center p-8 sm:p-10 rounded-3xl bg-[#0a1e12] border border-emerald-500/20 shadow-xl transition-all duration-700 ${
              featuresInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="space-y-4">
              <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                03 · Farm Profile & Inventory
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white">
                Registered Acreage & Harvest Stock
              </h3>
              <p className="text-sm text-emerald-100/75 leading-relaxed">
                Farmers maintain their digital farm record: total acreage, village survey numbers, registered cultivation plots, soil types, and harvest inventory with automated reserved-stock tracking when orders are accepted.
              </p>
              <ul className="text-xs text-emerald-200/90 space-y-2 pt-2">
                <li>✓ Multi-plot management with crop stage and expected harvest date</li>
                <li>✓ Live stock tracking: Available vs. Reserved quantity in kilograms</li>
                <li>✓ Strict RLS database isolation preventing cross-farm data leakage</li>
              </ul>
            </div>
            <div className="relative h-64 sm:h-80 rounded-2xl overflow-hidden border border-emerald-500/20 shadow-md">
              <Image
                src="/images/agri-tech.jpg"
                alt="Agricultural cultivation plot and fertile soil"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a1e12] via-transparent to-transparent" />
              <div className="absolute bottom-3 left-4 right-4 p-3 rounded-xl bg-[#0a1e12]/90 backdrop-blur-md border border-emerald-500/30 text-[11px] text-emerald-200 flex justify-between items-center">
                <span>Plot: North-01 · 6.5 Acres</span>
                <span className="font-mono font-bold text-white">Stock: 1,200kg (800kg Reserved)</span>
              </div>
            </div>
          </div>

          {/* Feature 4: Orders & Negotiation */}
          <div
            className={`grid grid-cols-1 lg:grid-cols-2 gap-8 items-center p-8 sm:p-10 rounded-3xl bg-[#0a1e12] border border-emerald-500/20 shadow-xl transition-all duration-700 ${
              featuresInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="order-2 lg:order-1 p-6 rounded-2xl bg-[#08180d] border border-emerald-500/25 space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-emerald-500/20">
                <span className="text-emerald-400 font-bold">Purchase Offer #PO-9412</span>
                <span className="px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 text-[10px]">ESCROW TERMS</span>
              </div>
              <div className="text-stone-300 space-y-1 text-[11px]">
                <p>Crop: Organic Robusta Banana</p>
                <p>Offered Rate: ₹30 / kg · Quantity: 800 kg</p>
                <p>Total Contract: ₹24,000</p>
                <p>Destination: APMC Yeshwanthpur, Bengaluru</p>
              </div>
              <div className="pt-2 flex justify-between items-center text-[10px] text-emerald-400">
                <span>✓ Atomic Inventory Reserved</span>
                <span className="text-white font-bold">Status: ACCEPTED</span>
              </div>
            </div>
            <div className="order-1 lg:order-2 space-y-4">
              <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                04 · Orders & Offers
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white">
                Structured Offers & Negotiation
              </h3>
              <p className="text-sm text-emerald-100/75 leading-relaxed">
                Commercial buyers place binding purchase offers on farmer listings. Farmers can review terms, accept, or place counteroffers. Acceptance atomically executes the transaction and updates inventory allocations without race conditions.
              </p>
            </div>
          </div>

          {/* Feature 5: Transportation & Delivery */}
          <div
            className={`grid grid-cols-1 lg:grid-cols-2 gap-8 items-center p-8 sm:p-10 rounded-3xl bg-[#0a1e12] border border-emerald-500/20 shadow-xl transition-all duration-700 ${
              featuresInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="space-y-4">
              <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                05 · Rural Logistics
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white">
                Transporter Assignment & Delivery Tracking
              </h3>
              <p className="text-sm text-emerald-100/75 leading-relaxed">
                Accepted orders are linked to transport providers. The platform tracks transit progress through explicit stages: Accepted → Dispatched → Delivered, concluding with weighbridge quantity confirmation at destination.
              </p>
            </div>
            <div className="relative h-64 sm:h-80 rounded-2xl overflow-hidden border border-emerald-500/20 shadow-md">
              <Image
                src="/images/rural-transport.jpg"
                alt="Agricultural produce transport vehicle on rural transit route"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a1e12] via-transparent to-transparent" />
              <div className="absolute bottom-3 left-4 right-4 p-3 rounded-xl bg-[#0a1e12]/90 backdrop-blur-md border border-emerald-500/30 text-[11px] text-emerald-200 flex justify-between items-center">
                <span>Shipment #SHP-886B · Route: Tumakuru → Mandi</span>
                <span className="font-mono font-bold text-white">Status: IN TRANSIT</span>
              </div>
            </div>
          </div>

          {/* Feature 6: Earnings & Settlement Ledger */}
          <div
            className={`grid grid-cols-1 lg:grid-cols-2 gap-8 items-center p-8 sm:p-10 rounded-3xl bg-[#0a1e12] border border-emerald-500/20 shadow-xl transition-all duration-700 ${
              featuresInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="order-2 lg:order-1 p-6 rounded-2xl bg-[#08180d] border border-emerald-500/25 space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-emerald-500/20">
                <span className="text-emerald-400 font-bold">Financial Settlement Ledger</span>
                <span className="text-[10px] text-stone-400">Strict Verification</span>
              </div>
              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-stone-400">Fulfilled Produce Value:</span>
                  <span className="text-white font-bold">₹35,000 (900 kg)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Disbursed to Bank:</span>
                  <span className="text-emerald-400 font-bold">₹20,000 (Verified)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Held in Escrow:</span>
                  <span className="text-blue-300 font-bold">₹25,000 (Protected)</span>
                </div>
                <div className="pt-2 text-[10px] text-amber-300">
                  ⚡ 1 order: Delivered · Awaiting settlement confirmation
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2 space-y-4">
              <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                06 · Financial Accuracy
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white">
                Honest Financial Ledger & Payout Transparency
              </h3>
              <p className="text-sm text-emerald-100/75 leading-relaxed">
                Physical delivery is never falsely labeled as &ldquo;Disbursed to Bank&rdquo; unless a verified settlement receipt confirms payout. Orders awaiting banking settlement are transparently indicated without inventing financial states.
              </p>
            </div>
          </div>

        </div>
      </section>


      {/* ──────────────────────────────────────────────────────────
          SECTION 5 — THE AGRICULTURAL JOURNEY (5 STAGES)
      ────────────────────────────────────────────────────────── */}
      <section
        ref={journeyRef}
        className="relative py-20 sm:py-28 px-4 sm:px-6 bg-[#061208] border-t border-emerald-500/10 overflow-hidden"
      >
        <div className="max-w-6xl mx-auto space-y-16">
          
          <div
            className={`text-center space-y-3 max-w-2xl mx-auto transition-all duration-700 ${
              journeyInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <span className="text-xs font-mono font-bold tracking-widest text-emerald-400 uppercase">
              End-to-End Workflow
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
              The Agricultural Journey
            </h2>
            <p className="text-sm sm:text-base text-emerald-100/75">
              Follow how produce flows seamlessly from farm cultivation to final mandi delivery.
            </p>
          </div>

          {/* Interactive Step-by-Step Flow */}
          <div className="relative">
            {/* Connecting Route Line (Desktop) */}
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500/20 via-emerald-400/50 to-emerald-500/20 -translate-y-1/2 z-0" />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 relative z-10">
              
              {/* Step 1 */}
              <div className="p-6 rounded-3xl bg-[#0a1e12] border border-emerald-500/25 flex flex-col justify-between space-y-4 hover:border-emerald-400/50 transition">
                <div className="space-y-2">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm font-mono">
                    01
                  </div>
                  <h4 className="text-base font-black text-white">Farmer Harvest</h4>
                  <p className="text-xs text-emerald-100/70">
                    Grower records harvested stock in digital inventory and runs AI visual quality triage.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-emerald-400">STAGE: FARM GATE</span>
              </div>

              {/* Step 2 */}
              <div className="p-6 rounded-3xl bg-[#0a1e12] border border-emerald-500/25 flex flex-col justify-between space-y-4 hover:border-emerald-400/50 transition">
                <div className="space-y-2">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm font-mono">
                    02
                  </div>
                  <h4 className="text-base font-black text-white">Marketplace</h4>
                  <p className="text-xs text-emerald-100/70">
                    Produce listing is published with variety, quality grade, quantity, and asking price.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-emerald-400">STAGE: LISTED</span>
              </div>

              {/* Step 3 */}
              <div className="p-6 rounded-3xl bg-[#0a1e12] border border-emerald-500/25 flex flex-col justify-between space-y-4 hover:border-emerald-400/50 transition">
                <div className="space-y-2">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm font-mono">
                    03
                  </div>
                  <h4 className="text-base font-black text-white">Buyer Offer</h4>
                  <p className="text-xs text-emerald-100/70">
                    Commercial buyer submits purchase offer. Acceptance generates order and reserves stock.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-emerald-400">STAGE: ACCEPTED</span>
              </div>

              {/* Step 4 */}
              <div className="p-6 rounded-3xl bg-[#0a1e12] border border-emerald-500/25 flex flex-col justify-between space-y-4 hover:border-emerald-400/50 transition">
                <div className="space-y-2">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm font-mono">
                    04
                  </div>
                  <h4 className="text-base font-black text-white">Transporter</h4>
                  <p className="text-xs text-emerald-100/70">
                    Rural transporter coordinates scheduled dispatch from farm pickup to destination.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-emerald-400">STAGE: DISPATCHED</span>
              </div>

              {/* Step 5 */}
              <div className="p-6 rounded-3xl bg-[#0a1e12] border border-emerald-500/25 flex flex-col justify-between space-y-4 hover:border-emerald-400/50 transition">
                <div className="space-y-2">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm font-mono">
                    05
                  </div>
                  <h4 className="text-base font-black text-white">Mandi Delivery</h4>
                  <p className="text-xs text-emerald-100/70">
                    Weighbridge verification confirms delivered volume, completing fulfillment for settlement.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-emerald-400">STAGE: DELIVERED</span>
              </div>

            </div>
          </div>

        </div>
      </section>


      {/* ──────────────────────────────────────────────────────────
          SECTION 6 — BUILT FOR DIFFERENT AGRICULTURAL PARTICIPANTS
      ────────────────────────────────────────────────────────── */}
      <section
        ref={rolesRef}
        className="relative py-20 sm:py-28 px-4 sm:px-6 bg-[#08170c] border-t border-emerald-500/10"
      >
        <div className="max-w-6xl mx-auto space-y-14">
          
          <div
            className={`text-center space-y-3 max-w-2xl mx-auto transition-all duration-700 ${
              rolesInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <span className="text-xs font-mono font-bold tracking-widest text-emerald-400 uppercase">
              Role-Based Portals
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
              Purpose-Built for Every Participant
            </h2>
            <p className="text-sm sm:text-base text-emerald-100/75">
              X-MILE operates four strictly separated portals, each tailored to distinct operational responsibilities.
            </p>
          </div>

          {/* Interactive Role Switcher Tabs */}
          <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
            <button
              type="button"
              onClick={() => setActiveRoleTab("farmer")}
              className={`px-5 py-2.5 rounded-full text-xs font-bold transition ${
                activeRoleTab === "farmer"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                  : "bg-[#0c2214] text-emerald-200/80 hover:bg-[#142d1d]"
              }`}
            >
              🌾 Farmers
            </button>
            <button
              type="button"
              onClick={() => setActiveRoleTab("buyer")}
              className={`px-5 py-2.5 rounded-full text-xs font-bold transition ${
                activeRoleTab === "buyer"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                  : "bg-[#0c2214] text-emerald-200/80 hover:bg-[#142d1d]"
              }`}
            >
              🏢 Buyers
            </button>
            <button
              type="button"
              onClick={() => setActiveRoleTab("transporter")}
              className={`px-5 py-2.5 rounded-full text-xs font-bold transition ${
                activeRoleTab === "transporter"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                  : "bg-[#0c2214] text-emerald-200/80 hover:bg-[#142d1d]"
              }`}
            >
              🚚 Transporters
            </button>
            <button
              type="button"
              onClick={() => setActiveRoleTab("admin")}
              className={`px-5 py-2.5 rounded-full text-xs font-bold transition ${
                activeRoleTab === "admin"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/40"
                  : "bg-[#0c2214] text-emerald-200/80 hover:bg-[#142d1d]"
              }`}
            >
              🛡️ Administrators
            </button>
          </div>

          {/* Active Role Card Presentation */}
          <div className="p-8 sm:p-12 rounded-3xl bg-[#0a1e12] border border-emerald-500/25 shadow-xl max-w-4xl mx-auto transition-all">
            {activeRoleTab === "farmer" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center gap-3">
                  <span className="text-3xl p-3 bg-emerald-500/15 rounded-2xl">🌾</span>
                  <div>
                    <h3 className="text-2xl font-black text-white">Farmer Operations Portal</h3>
                    <p className="text-xs text-emerald-300 font-semibold">Route: /farmer</p>
                  </div>
                </div>
                <p className="text-sm text-emerald-100/75 leading-relaxed">
                  Designed exclusively for agricultural growers. Register cultivation acreage, run AI crop quality triage, publish harvest lots with asking prices per kg, review buyer purchase offers, and inspect confirmed settlement earnings.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="p-4 rounded-2xl bg-[#07170d] border border-emerald-500/20">
                    <span className="font-bold text-white block mb-1">My Farm</span>
                    <span className="text-stone-400 text-[11px]">Manage land plots, soil types, and crop cycles.</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#07170d] border border-emerald-500/20">
                    <span className="font-bold text-white block mb-1">Sell Crops</span>
                    <span className="text-stone-400 text-[11px]">List lots with asking rates and grade specs.</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#07170d] border border-emerald-500/20">
                    <span className="font-bold text-white block mb-1">My Earnings</span>
                    <span className="text-stone-400 text-[11px]">Verified settlements and escrow records.</span>
                  </div>
                </div>
              </div>
            )}

            {activeRoleTab === "buyer" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center gap-3">
                  <span className="text-3xl p-3 bg-emerald-500/15 rounded-2xl">🏢</span>
                  <div>
                    <h3 className="text-2xl font-black text-white">Commercial Buyer Portal</h3>
                    <p className="text-xs text-emerald-300 font-semibold">Route: /buyer</p>
                  </div>
                </div>
                <p className="text-sm text-emerald-100/75 leading-relaxed">
                  Tailored for wholesale purchasers, processors, and institutional retailers. Discover regional produce availability across districts, submit rate offers per kg, track active order dispatch, and inspect weighbridge receipts upon arrival.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="p-4 rounded-2xl bg-[#07170d] border border-emerald-500/20">
                    <span className="font-bold text-white block mb-1">Procurement Discovery</span>
                    <span className="text-stone-400 text-[11px]">Filter verified lots by grade and district.</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#07170d] border border-emerald-500/20">
                    <span className="font-bold text-white block mb-1">Purchase Offers</span>
                    <span className="text-stone-400 text-[11px]">Negotiate price and escrow payment terms.</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#07170d] border border-emerald-500/20">
                    <span className="font-bold text-white block mb-1">Shipment Visibility</span>
                    <span className="text-stone-400 text-[11px]">Track scheduled transit from farm pickup.</span>
                  </div>
                </div>
              </div>
            )}

            {activeRoleTab === "transporter" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center gap-3">
                  <span className="text-3xl p-3 bg-emerald-500/15 rounded-2xl">🚚</span>
                  <div>
                    <h3 className="text-2xl font-black text-white">Transporter Operations Portal</h3>
                    <p className="text-xs text-emerald-300 font-semibold">Route: /logistics</p>
                  </div>
                </div>
                <p className="text-sm text-emerald-100/75 leading-relaxed">
                  Engineered for rural logistics providers and freight fleets. Receive scheduled agricultural pickup requests, update milestone dispatch statuses, coordinate vehicle allocations, and record delivery confirmation.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="p-4 rounded-2xl bg-[#07170d] border border-emerald-500/20">
                    <span className="font-bold text-white block mb-1">Dispatch Queue</span>
                    <span className="text-stone-400 text-[11px]">View assigned pickup locations and volume.</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#07170d] border border-emerald-500/20">
                    <span className="font-bold text-white block mb-1">Transit Milestones</span>
                    <span className="text-stone-400 text-[11px]">Update Accepted → Dispatched → Delivered.</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#07170d] border border-emerald-500/20">
                    <span className="font-bold text-white block mb-1">Weighbridge Receipts</span>
                    <span className="text-stone-400 text-[11px]">Document verified net weight upon arrival.</span>
                  </div>
                </div>
              </div>
            )}

            {activeRoleTab === "admin" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center gap-3">
                  <span className="text-3xl p-3 bg-emerald-500/15 rounded-2xl">🛡️</span>
                  <div>
                    <h3 className="text-2xl font-black text-white">Platform Administration Portal</h3>
                    <p className="text-xs text-emerald-300 font-semibold">Route: /admin</p>
                  </div>
                </div>
                <p className="text-sm text-emerald-100/75 leading-relaxed">
                  Restricted to platform administrators. Monitor platform-wide order execution, verify agricultural profile credentials, oversee data integrity, and resolve exceptional transaction disputes.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="p-4 rounded-2xl bg-[#07170d] border border-emerald-500/20">
                    <span className="font-bold text-white block mb-1">Profile Oversight</span>
                    <span className="text-stone-400 text-[11px]">Verify farmer and buyer credentials.</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#07170d] border border-emerald-500/20">
                    <span className="font-bold text-white block mb-1">System Audit</span>
                    <span className="text-stone-400 text-[11px]">Maintain database integrity and RLS security.</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#07170d] border border-emerald-500/20">
                    <span className="font-bold text-white block mb-1">Transaction Health</span>
                    <span className="text-stone-400 text-[11px]">Oversee escrow and dispute settlements.</span>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </section>


      {/* ──────────────────────────────────────────────────────────
          SECTION 7 — FINAL CALL TO ACTION (AUTHENTICATION DESTINATION)
      ────────────────────────────────────────────────────────── */}
      <section
        ref={ctaRef}
        className="relative py-24 sm:py-32 px-4 sm:px-6 bg-[#061009] border-t border-emerald-500/15 overflow-hidden flex flex-col items-center justify-center text-center"
      >
        {/* Background Atmosphere */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <Image
            src="/images/hero-farm.jpg"
            alt="Verdant agricultural fields at dawn"
            fill
            sizes="100vw"
            className="object-cover object-center filter brightness-[0.25] contrast-[1.1] scale-[1.02]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#061009]/90 via-[#07140b]/85 to-[#050e08]/98" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_30%,rgba(16,185,129,0.18),transparent_70%)]" />
        </div>

        {/* Central Architectural Authentication Card */}
        <div
          className={`relative z-10 w-full max-w-lg mx-auto p-8 sm:p-12 rounded-[36px] bg-[#0c2214]/90 backdrop-blur-2xl border border-emerald-500/30 shadow-[0_30px_80px_-15px_rgba(0,0,0,0.85)] ring-1 ring-white/10 space-y-8 transition-all duration-700 ${
            ctaInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {/* Top Micro Accent Line */}
          <div className="absolute top-0 left-12 right-12 h-[2px] bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent" />

          {/* Seedling Emblem */}
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#1b3a24] to-[#0c1f13] border border-emerald-400/35 text-white shadow-xl shadow-emerald-950/60 ring-1 ring-white/10">
            <svg
              className="w-10 h-10 text-emerald-400 drop-shadow-[0_2px_8px_rgba(16,185,129,0.5)]"
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

          {/* Headline & Tagline */}
          <div className="space-y-2">
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Ready to Join X-MILE?
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-emerald-300 tracking-wide text-balance">
              {labels.tagline}
            </p>
          </div>

          {/* Primary Authentication Action Buttons */}
          <div className="space-y-3.5 pt-2">
            <Link
              href="/login"
              className="group relative w-full h-15 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-650 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-extrabold shadow-lg shadow-emerald-950/50 border border-emerald-400/30 active:scale-[0.985] transition-all flex items-center justify-between px-6"
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
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>
            </Link>

            <Link
              href="/register"
              className="group relative w-full h-15 rounded-2xl bg-[#142d1d]/85 hover:bg-[#1a3a25] text-stone-100 hover:text-white font-bold border border-emerald-500/25 shadow-md active:scale-[0.985] transition-all flex items-center justify-between px-6"
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
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.375 21c-2.331 0-4.512-.645-6.374-1.765z" />
                </svg>
              </div>
            </Link>
          </div>

          {/* Language Switcher Trigger */}
          <div className="pt-2 border-t border-emerald-500/15 w-full flex justify-center">
            <button
              type="button"
              onClick={openLanguageModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-emerald-500/25 bg-[#0a1a10]/70 hover:bg-[#122a1a] text-emerald-200/90 hover:text-white text-xs font-semibold transition active:scale-[0.98]"
              aria-label={labels.selectLang}
            >
              <span className="text-sm">🌐</span>
              <span className="font-semibold">{currentLanguage.nativeName}</span>
              <span className="text-emerald-400 font-bold text-[11px]">— {labels.selectLang}</span>
            </button>
          </div>
        </div>

        {/* Global Security Subtext */}
        <div className="relative z-10 pt-10 text-[11px] text-emerald-300/60 font-medium">
          🔒 Cryptographically Verified Server Sessions · Database Row-Level Security Enforced
        </div>
      </section>


      {/* ──────────────────────────────────────────────────────────
          DISCREET NATURE & TRUST FOOTER
      ────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 w-full bg-[#050d07] border-t border-emerald-500/15 py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-emerald-300/65 font-medium">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400">🌱</span>
            <span className="font-bold text-white">X-MILE</span>
            <span>· All 22 Official Indian Languages Supported</span>
          </div>
          <div className="text-center sm:text-right">
            <span>© 2026 X-MILE · “Every MILE Matters, Every FARMER Matters.”</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
