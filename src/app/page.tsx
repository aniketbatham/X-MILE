"use client";

import Link from "next/link";
import { useState } from "react";

type Language = "English" | "ಕನ್ನಡ" | "हिन्दी" | "தமிழ்";

const translations = {
  English: {
    tagline: "AI-powered agricultural supply network",
    title: "Connecting farmers with better markets.",
    description:
      "HARVEX connects farmers, buyers, AI tools, supply management, logistics, and transactions in one simple platform.",
    explore: "Explore HARVEX",
    farmer: "Farmer Portal",
    farmerDesc: "List produce, manage inventory, and handle incoming orders.",
    buyer: "Buyer Portal",
    buyerDesc: "Create requirements, find supply, place orders, and track shipments.",
    quality: "AI Quality",
    qualityDesc: "Analyze agricultural produce quality using AI.",
    forecast: "Demand Forecast",
    forecastDesc: "Use AI-powered demand forecasting for better planning.",
    transaction: "Transactions",
    transactionDesc: "View and manage HARVEX transaction information.",
    open: "Open",
    language: "Language",
    demo: "College Demo",
    demoText:
      "All major HARVEX functions are available from the buttons below.",
    login: "Demo Login",
    loginTitle: "HARVEX Demo Access",
    loginSubtitle: "Choose a portal to continue",
    close: "Close",
  },

  "ಕನ್ನಡ": {
    tagline: "AI ಆಧಾರಿತ ಕೃಷಿ ಪೂರೈಕೆ ಜಾಲ",
    title: "ರೈತರನ್ನು ಉತ್ತಮ ಮಾರುಕಟ್ಟೆಗಳೊಂದಿಗೆ ಸಂಪರ್ಕಿಸುತ್ತದೆ.",
    description:
      "HARVEX ರೈತರು, ಖರೀದಿದಾರರು, AI ಉಪಕರಣಗಳು, ಪೂರೈಕೆ ನಿರ್ವಹಣೆ, ಲಾಜಿಸ್ಟಿಕ್ಸ್ ಮತ್ತು ವಹಿವಾಟುಗಳನ್ನು ಒಂದೇ ಸರಳ ವೇದಿಕೆಯಲ್ಲಿ ಸಂಪರ್ಕಿಸುತ್ತದೆ.",
    explore: "HARVEX ಅನ್ವೇಷಿಸಿ",
    farmer: "ರೈತ ಪೋರ್ಟಲ್",
    farmerDesc:
      "ಉತ್ಪನ್ನಗಳನ್ನು ಪಟ್ಟಿ ಮಾಡಿ, ದಾಸ್ತಾನು ನಿರ್ವಹಿಸಿ ಮತ್ತು ಆರ್ಡರ್‌ಗಳನ್ನು ನಿರ್ವಹಿಸಿ.",
    buyer: "ಖರೀದಿದಾರರ ಪೋರ್ಟಲ್",
    buyerDesc:
      "ಅಗತ್ಯಗಳನ್ನು ರಚಿಸಿ, ಪೂರೈಕೆ ಹುಡುಕಿ, ಆರ್ಡರ್ ಮಾಡಿ ಮತ್ತು ಸಾಗಣೆಯನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ.",
    quality: "AI ಗುಣಮಟ್ಟ",
    qualityDesc: "AI ಬಳಸಿ ಕೃಷಿ ಉತ್ಪನ್ನದ ಗುಣಮಟ್ಟವನ್ನು ವಿಶ್ಲೇಷಿಸಿ.",
    forecast: "ಬೇಡಿಕೆ ಮುನ್ಸೂಚನೆ",
    forecastDesc:
      "ಉತ್ತಮ ಯೋಜನೆಗಾಗಿ AI ಆಧಾರಿತ ಬೇಡಿಕೆ ಮುನ್ಸೂಚನೆಯನ್ನು ಬಳಸಿ.",
    transaction: "ವಹಿವಾಟುಗಳು",
    transactionDesc: "HARVEX ವಹಿವಾಟು ಮಾಹಿತಿಯನ್ನು ವೀಕ್ಷಿಸಿ ಮತ್ತು ನಿರ್ವಹಿಸಿ.",
    open: "ತೆರೆಯಿರಿ",
    language: "ಭಾಷೆ",
    demo: "ಕಾಲೇಜು ಡೆಮೊ",
    demoText:
      "HARVEX ನ ಎಲ್ಲಾ ಪ್ರಮುಖ ಕಾರ್ಯಗಳು ಕೆಳಗಿನ ಬಟನ್‌ಗಳಿಂದ ಲಭ್ಯವಿವೆ.",
    login: "ಡೆಮೊ ಲಾಗಿನ್",
    loginTitle: "HARVEX ಡೆಮೊ ಪ್ರವೇಶ",
    loginSubtitle: "ಮುಂದುವರಿಸಲು ಪೋರ್ಟಲ್ ಆಯ್ಕೆಮಾಡಿ",
    close: "ಮುಚ್ಚಿ",
  },

  "हिन्दी": {
    tagline: "AI-संचालित कृषि आपूर्ति नेटवर्क",
    title: "किसानों को बेहतर बाजारों से जोड़ना।",
    description:
      "HARVEX किसानों, खरीदारों, AI टूल्स, आपूर्ति प्रबंधन, लॉजिस्टिक्स और लेनदेन को एक सरल प्लेटफॉर्म में जोड़ता है।",
    explore: "HARVEX देखें",
    farmer: "किसान पोर्टल",
    farmerDesc:
      "उपज सूचीबद्ध करें, इन्वेंटरी प्रबंधित करें और ऑर्डर संभालें।",
    buyer: "खरीदार पोर्टल",
    buyerDesc:
      "आवश्यकता बनाएं, आपूर्ति खोजें, ऑर्डर करें और शिपमेंट ट्रैक करें।",
    quality: "AI गुणवत्ता",
    qualityDesc: "AI का उपयोग करके कृषि उत्पाद की गुणवत्ता का विश्लेषण करें।",
    forecast: "मांग पूर्वानुमान",
    forecastDesc:
      "बेहतर योजना के लिए AI आधारित मांग पूर्वानुमान का उपयोग करें।",
    transaction: "लेनदेन",
    transactionDesc:
      "HARVEX लेनदेन की जानकारी देखें और प्रबंधित करें।",
    open: "खोलें",
    language: "भाषा",
    demo: "कॉलेज डेमो",
    demoText:
      "HARVEX के सभी प्रमुख कार्य नीचे दिए गए बटनों से उपलब्ध हैं।",
    login: "डेमो लॉगिन",
    loginTitle: "HARVEX डेमो एक्सेस",
    loginSubtitle: "जारी रखने के लिए पोर्टल चुनें",
    close: "बंद करें",
  },

  "தமிழ்": {
    tagline: "AI அடிப்படையிலான விவசாய விநியோக வலைப்பின்னல்",
    title: "விவசாயிகளை சிறந்த சந்தைகளுடன் இணைக்கிறது.",
    description:
      "HARVEX விவசாயிகள், வாங்குபவர்கள், AI கருவிகள், விநியோக மேலாண்மை, லாஜிஸ்டிக்ஸ் மற்றும் பரிவர்த்தனைகளை ஒரே எளிய தளத்தில் இணைக்கிறது.",
    explore: "HARVEX ஐ ஆராயுங்கள்",
    farmer: "விவசாயி போர்டல்",
    farmerDesc:
      "விளைபொருட்களை பட்டியலிட்டு, சரக்குகளை நிர்வகித்து, ஆர்டர்களை கையாளுங்கள்.",
    buyer: "வாங்குபவர் போர்டல்",
    buyerDesc:
      "தேவையை உருவாக்கி, விநியோகத்தை கண்டறிந்து, ஆர்டர் செய்து, ஷிப்மென்ட்டை கண்காணிக்கவும்.",
    quality: "AI தரம்",
    qualityDesc:
      "AI மூலம் விவசாய விளைபொருட்களின் தரத்தை பகுப்பாய்வு செய்யுங்கள்.",
    forecast: "தேவை முன்னறிவிப்பு",
    forecastDesc:
      "சிறந்த திட்டமிடலுக்காக AI அடிப்படையிலான தேவை முன்னறிவிப்பைப் பயன்படுத்துங்கள்.",
    transaction: "பரிவர்த்தனைகள்",
    transactionDesc:
      "HARVEX பரிவர்த்தனை தகவல்களைப் பார்க்கவும் நிர்வகிக்கவும்.",
    open: "திறக்கவும்",
    language: "மொழி",
    demo: "கல்லூரி டெமோ",
    demoText:
      "HARVEX இன் அனைத்து முக்கிய செயல்பாடுகளும் கீழே உள்ள பொத்தான்களில் உள்ளன.",
    login: "டெமோ உள்நுழைவு",
    loginTitle: "HARVEX டெமோ அணுகல்",
    loginSubtitle: "தொடர ஒரு போர்டலைத் தேர்ந்தெடுக்கவும்",
    close: "மூடு",
  },
};

export default function Home() {
  const [language, setLanguage] =
    useState<Language>("English");

  const [showDemo, setShowDemo] =
    useState(false);

  const t = translations[language];

  const pages = [
    {
      href: "/farmer",
      icon: "🌾",
      title: t.farmer,
      description: t.farmerDesc,
    },
    {
      href: "/buyer",
      icon: "🏭",
      title: t.buyer,
      description: t.buyerDesc,
    },
    {
      href: "/quality",
      icon: "🤖",
      title: t.quality,
      description: t.qualityDesc,
    },
    {
      href: "/forecast",
      icon: "📈",
      title: t.forecast,
      description: t.forecastDesc,
    },
    {
      href: "/transaction",
      icon: "💳",
      title: t.transaction,
      description: t.transactionDesc,
    },
  ];

  return (
    <main className="min-h-screen bg-[#f6f8f3] text-slate-900">
      {/* NAVBAR */}
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-xl">
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
            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-slate-500 sm:block">
                {t.language}
              </span>

              <select
                value={language}
                onChange={(e) =>
                  setLanguage(
                    e.target.value as Language
                  )
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
              >
                <option value="English">
                  English
                </option>

                <option value="ಕನ್ನಡ">
                  ಕನ್ನಡ
                </option>

                <option value="हिन्दी">
                  हिन्दी
                </option>

                <option value="தமிழ்">
                  தமிழ்
                </option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setShowDemo(true)}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              {t.login}
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {t.tagline}
          </div>

          <h2 className="text-4xl font-black leading-tight tracking-tight md:text-6xl">
            {t.title}
          </h2>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            {t.description}
          </p>

          <div className="mt-8">
            <a
              href="#modules"
              className="inline-flex rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              {t.explore} ↓
            </a>
          </div>
        </div>
      </section>

      {/* DEMO NOTE */}
      <section className="mx-auto max-w-6xl px-6 pb-8">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-start gap-4">
            <div className="text-2xl">
              🎓
            </div>

            <div>
              <h3 className="font-bold text-emerald-900">
                {t.demo}
              </h3>

              <p className="mt-1 text-sm leading-6 text-emerald-800">
                {t.demoText}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* MODULES */}
      <section
        id="modules"
        className="mx-auto max-w-6xl px-6 pb-20"
      >
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
            HARVEX
          </p>

          <h3 className="mt-2 text-3xl font-black tracking-tight">
            {t.explore}
          </h3>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-emerald-300 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-2xl">
                  {page.icon}
                </div>

                <span className="text-sm font-semibold text-emerald-600 transition group-hover:translate-x-1">
                  {t.open} →
                </span>
              </div>

              <h4 className="mt-5 text-lg font-bold">
                {page.title}
              </h4>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {page.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            HARVEX — AI-powered agricultural supply network
          </span>

          <span>
            College Demo
          </span>
        </div>
      </footer>

      {/* SIMPLE DEMO ACCESS MODAL */}
      {showDemo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-5"
          onClick={() => setShowDemo(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-black">
                  {t.loginTitle}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {t.loginSubtitle}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowDemo(false)
                }
                className="rounded-lg px-2 py-1 text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label={t.close}
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              <Link
                href="/farmer"
                onClick={() =>
                  setShowDemo(false)
                }
                className="flex items-center gap-4 rounded-xl border border-slate-200 p-4 transition hover:border-emerald-300 hover:bg-emerald-50"
              >
                <span className="text-2xl">
                  🌾
                </span>

                <div>
                  <p className="font-bold">
                    {t.farmer}
                  </p>

                  <p className="text-xs text-slate-500">
                    {t.farmerDesc}
                  </p>
                </div>
              </Link>

              <Link
                href="/buyer"
                onClick={() =>
                  setShowDemo(false)
                }
                className="flex items-center gap-4 rounded-xl border border-slate-200 p-4 transition hover:border-emerald-300 hover:bg-emerald-50"
              >
                <span className="text-2xl">
                  🏭
                </span>

                <div>
                  <p className="font-bold">
                    {t.buyer}
                  </p>

                  <p className="text-xs text-slate-500">
                    {t.buyerDesc}
                  </p>
                </div>
              </Link>

              <Link
                href="/quality"
                onClick={() =>
                  setShowDemo(false)
                }
                className="flex items-center gap-4 rounded-xl border border-slate-200 p-4 transition hover:border-emerald-300 hover:bg-emerald-50"
              >
                <span className="text-2xl">
                  🤖
                </span>

                <div>
                  <p className="font-bold">
                    {t.quality}
                  </p>

                  <p className="text-xs text-slate-500">
                    {t.qualityDesc}
                  </p>
                </div>
              </Link>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowDemo(false)
              }
              className="mt-6 w-full rounded-xl bg-slate-100 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-200"
            >
              {t.close}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
