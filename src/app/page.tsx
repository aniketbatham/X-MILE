"use client";

import { useState } from "react";
import Link from "next/link";

type Language = "English" | "ಕನ್ನಡ" | "हिन्दी" | "தமிழ்";

const translations = {
  English: {
    tagline: "AI-powered agricultural supply network",
    title: "From farm to buyer, intelligently connected.",
    description:
      "HARVEX connects farmers, buyers, inventory, AI quality analysis, orders and logistics in one simple platform.",
    farmer: "Farmer Portal",
    buyer: "Buyer Portal",
    farmerDesc: "Manage produce, inventory and incoming orders.",
    buyerDesc: "Create requirements, find supply and track orders.",
    demo: "Start Demo",
    how: "How HARVEX Works",
    step1: "Farmer adds produce",
    step2: "AI checks quality",
    step3: "Buyer creates requirement",
    step4: "Supply is aggregated",
    step5: "Order and delivery are tracked",
    language: "Language",
    ready: "Ready for Demo",
    readyText:
      "Use the portals below to demonstrate the complete HARVEX workflow.",
    open: "Open",
    footer: "HARVEX • Intelligent Agricultural Supply Network",
  },

  "ಕನ್ನಡ": {
    tagline: "AI ಆಧಾರಿತ ಕೃಷಿ ಪೂರೈಕೆ ಜಾಲ",
    title: "ಹೊಲದಿಂದ ಖರೀದಿದಾರರವರೆಗೆ, ಬುದ್ಧಿವಂತ ಸಂಪರ್ಕ.",
    description:
      "HARVEX ರೈತರು, ಖರೀದಿದಾರರು, ದಾಸ್ತಾನು, AI ಗುಣಮಟ್ಟ ಪರಿಶೀಲನೆ, ಆರ್ಡರ್ ಮತ್ತು ಲಾಜಿಸ್ಟಿಕ್ಸ್ ಅನ್ನು ಒಂದೇ ವೇದಿಕೆಯಲ್ಲಿ ಸಂಪರ್ಕಿಸುತ್ತದೆ.",
    farmer: "ರೈತ ಪೋರ್ಟಲ್",
    buyer: "ಖರೀದಿದಾರರ ಪೋರ್ಟಲ್",
    farmerDesc: "ಉತ್ಪನ್ನ, ದಾಸ್ತಾನು ಮತ್ತು ಆರ್ಡರ್‌ಗಳನ್ನು ನಿರ್ವಹಿಸಿ.",
    buyerDesc: "ಅವಶ್ಯಕತೆ ರಚಿಸಿ, ಪೂರೈಕೆ ಹುಡುಕಿ ಮತ್ತು ಆರ್ಡರ್ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ.",
    demo: "ಡೆಮೊ ಪ್ರಾರಂಭಿಸಿ",
    how: "HARVEX ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ",
    step1: "ರೈತ ಉತ್ಪನ್ನ ಸೇರಿಸುತ್ತಾರೆ",
    step2: "AI ಗುಣಮಟ್ಟ ಪರಿಶೀಲಿಸುತ್ತದೆ",
    step3: "ಖರೀದಿದಾರ ಅವಶ್ಯಕತೆ ರಚಿಸುತ್ತಾರೆ",
    step4: "ಪೂರೈಕೆಯನ್ನು ಒಟ್ಟುಗೂಡಿಸಲಾಗುತ್ತದೆ",
    step5: "ಆರ್ಡರ್ ಮತ್ತು ವಿತರಣೆಯನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಲಾಗುತ್ತದೆ",
    language: "ಭಾಷೆ",
    ready: "ಡೆಮೊಗೆ ಸಿದ್ಧ",
    readyText:
      "ಸಂಪೂರ್ಣ HARVEX ಕಾರ್ಯವಿಧಾನವನ್ನು ಪ್ರದರ್ಶಿಸಲು ಕೆಳಗಿನ ಪೋರ್ಟಲ್‌ಗಳನ್ನು ಬಳಸಿ.",
    open: "ತೆರೆಯಿರಿ",
    footer: "HARVEX • ಬುದ್ಧಿವಂತ ಕೃಷಿ ಪೂರೈಕೆ ಜಾಲ",
  },

  "हिन्दी": {
    tagline: "AI-संचालित कृषि आपूर्ति नेटवर्क",
    title: "खेत से खरीदार तक, बुद्धिमानी से जुड़ा हुआ।",
    description:
      "HARVEX किसानों, खरीदारों, इन्वेंटरी, AI गुणवत्ता जांच, ऑर्डर और लॉजिस्टिक्स को एक प्लेटफॉर्म पर जोड़ता है।",
    farmer: "किसान पोर्टल",
    buyer: "खरीदार पोर्टल",
    farmerDesc: "उपज, इन्वेंटरी और आने वाले ऑर्डर प्रबंधित करें।",
    buyerDesc: "आवश्यकता बनाएं, आपूर्ति खोजें और ऑर्डर ट्रैक करें।",
    demo: "डेमो शुरू करें",
    how: "HARVEX कैसे काम करता है",
    step1: "किसान उपज जोड़ता है",
    step2: "AI गुणवत्ता जांचता है",
    step3: "खरीदार आवश्यकता बनाता है",
    step4: "आपूर्ति को एकत्र किया जाता है",
    step5: "ऑर्डर और डिलीवरी ट्रैक की जाती है",
    language: "भाषा",
    ready: "डेमो के लिए तैयार",
    readyText:
      "पूरे HARVEX वर्कफ़्लो को प्रदर्शित करने के लिए नीचे दिए गए पोर्टल का उपयोग करें।",
    open: "खोलें",
    footer: "HARVEX • बुद्धिमान कृषि आपूर्ति नेटवर्क",
  },

  "தமிழ்": {
    tagline: "AI அடிப்படையிலான விவசாய விநியோக வலைப்பின்னல்",
    title: "விவசாய நிலத்திலிருந்து வாங்குபவர் வரை புத்திசாலித்தனமான இணைப்பு.",
    description:
      "HARVEX விவசாயிகள், வாங்குபவர்கள், சரக்கு, AI தரச் சோதனை, ஆர்டர்கள் மற்றும் லாஜிஸ்டிக்ஸை ஒரே தளத்தில் இணைக்கிறது.",
    farmer: "விவசாயி போர்டல்",
    buyer: "வாங்குபவர் போர்டல்",
    farmerDesc: "விளைபொருள், சரக்கு மற்றும் ஆர்டர்களை நிர்வகிக்கவும்.",
    buyerDesc:
      "தேவையை உருவாக்கி, விநியோகத்தை கண்டறிந்து, ஆர்டர்களை கண்காணிக்கவும்.",
    demo: "டெமோ தொடங்கவும்",
    how: "HARVEX எப்படி செயல்படுகிறது",
    step1: "விவசாயி விளைபொருளை சேர்க்கிறார்",
    step2: "AI தரத்தை சரிபார்க்கிறது",
    step3: "வாங்குபவர் தேவையை உருவாக்குகிறார்",
    step4: "விநியோகம் ஒருங்கிணைக்கப்படுகிறது",
    step5: "ஆர்டர் மற்றும் விநியோகம் கண்காணிக்கப்படுகிறது",
    language: "மொழி",
    ready: "டெமோவிற்கு தயார்",
    readyText:
      "முழு HARVEX செயல்முறையை காண கீழே உள்ள போர்டல்களைப் பயன்படுத்தவும்.",
    open: "திறக்கவும்",
    footer: "HARVEX • புத்திசாலித்தனமான விவசாய விநியோக வலைப்பின்னல்",
  },
};

export default function Home() {
  const [language, setLanguage] =
    useState<Language>("English");

  const t = translations[language];

  return (
    <main className="min-h-screen bg-[#f7f9f5] text-slate-900">
      {/* NAVBAR */}
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-xl">
              🌾
            </div>

            <div>
              <h1 className="text-xl font-black tracking-tight">
                HARVEX
              </h1>

              <p className="hidden text-xs text-slate-500 sm:block">
                {t.tagline}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="hidden text-sm text-slate-500 sm:block">
              {t.language}
            </label>

            <select
              value={language}
              onChange={(e) =>
                setLanguage(
                  e.target.value as Language
                )
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-emerald-500"
            >
              <option value="English">English</option>
              <option value="ಕನ್ನಡ">ಕನ್ನಡ</option>
              <option value="हिन्दी">हिन्दी</option>
              <option value="தமிழ்">தமிழ்</option>
            </select>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {t.tagline}
          </div>

          <h2 className="text-4xl font-black leading-tight tracking-tight md:text-6xl">
            {t.title}
          </h2>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            {t.description}
          </p>

          {/* MAIN BUTTONS */}
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/farmer"
              className="rounded-xl bg-emerald-600 px-6 py-3.5 text-center font-bold text-white shadow-sm transition hover:bg-emerald-700"
            >
              🌾 {t.farmer}
            </Link>

            <Link
              href="/buyer"
              className="rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-center font-bold text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              🏭 {t.buyer}
            </Link>
          </div>
        </div>
      </section>

      {/* PORTALS */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="mb-7">
          <p className="text-sm font-bold uppercase tracking-wider text-emerald-600">
            HARVEX DEMO
          </p>

          <h3 className="mt-2 text-3xl font-black tracking-tight">
            {t.ready}
          </h3>

          <p className="mt-2 max-w-2xl text-slate-500">
            {t.readyText}
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* FARMER */}
          <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-2xl">
                🌾
              </div>

              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                FARMER
              </span>
            </div>

            <h4 className="mt-6 text-xl font-black">
              {t.farmer}
            </h4>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {t.farmerDesc}
            </p>

            <Link
              href="/farmer"
              className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
            >
              {t.open} →
            </Link>
          </div>

          {/* BUYER */}
          <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl">
                🏭
              </div>

              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                BUYER
              </span>
            </div>

            <h4 className="mt-6 text-xl font-black">
              {t.buyer}
            </h4>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {t.buyerDesc}
            </p>

            <Link
              href="/buyer"
              className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
            >
              {t.open} →
            </Link>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-9">
            <p className="text-sm font-bold uppercase tracking-wider text-emerald-600">
              HARVEX
            </p>

            <h3 className="mt-2 text-3xl font-black tracking-tight">
              {t.how}
            </h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <DemoStep
              number="1"
              icon="🌾"
              text={t.step1}
            />

            <DemoStep
              number="2"
              icon="🤖"
              text={t.step2}
            />

            <DemoStep
              number="3"
              icon="🏭"
              text={t.step3}
            />

            <DemoStep
              number="4"
              icon="📦"
              text={t.step4}
            />

            <DemoStep
              number="5"
              icon="🚚"
              text={t.step5}
            />
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900">
        <div className="mx-auto max-w-6xl px-6 py-7 text-center text-sm text-slate-400">
          {t.footer}
        </div>
      </footer>
    </main>
  );
}

function DemoStep({
  number,
  icon,
  text,
}: {
  number: string;
  icon: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-[#f8faf7] p-5">
      <div className="flex items-center justify-between">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
          {number}
        </span>

        <span className="text-2xl">
          {icon}
        </span>
      </div>

      <p className="mt-5 text-sm font-bold leading-6 text-slate-700">
        {text}
      </p>
    </div>
  );
}