"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import ThreeSeedLifecycle from "@/components/ThreeSeedLifecycle";
import SeedEntryGate from "@/components/SeedEntryGate";
import LifecycleHUD from "@/components/LifecycleHUD";
import ChapterOverlay, { ChapterData } from "@/components/ChapterOverlay";
import LanguageSelector from "@/components/LanguageSelector";
import { audioEngine } from "@/components/SeedAudioEngine";

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
 * The 17 Configurable Chapters of the Agricultural Lifecycle
 * Metaphor: The Seed -> Subterranean Roots -> Emergence -> Harvest -> Marketplace -> Supply Chain -> Rebirth
 */
const CHAPTERS: ChapterData[] = [
  {
    id: "seed",
    number: "01",
    title: "THE SEED",
    subtitle: "Everything begins before it can be seen.",
    annotation: "ORIGIN OF VALUE // 001",
    position: "top-center",
    featurePill: "AGRICULTURAL ROOTS",
    range: [0.0, 0.06],
    season: "Spring",
    day: 0,
  },
  {
    id: "burial",
    number: "02",
    title: "BURIAL",
    subtitle: "Some beginnings require darkness.",
    annotation: "FARMER DEDICATION // 002",
    position: "top-left",
    featurePill: "SOIL PREPARATION",
    range: [0.06, 0.12],
    season: "Spring",
    day: 2,
  },
  {
    id: "awakening",
    number: "03",
    title: "AWAKENING",
    subtitle: "Before the surface breaks, something moves beneath it.",
    annotation: "BIOLOGICAL POTENTIAL // 003",
    position: "bottom-right",
    featurePill: "EMBRYO ACTIVATION",
    range: [0.12, 0.18],
    season: "Spring",
    day: 4,
  },
  {
    id: "root",
    number: "04",
    title: "ROOT",
    subtitle: "To grow upward, something must first go down.",
    annotation: "FOUNDATION ECOSYSTEM // 004",
    position: "top-right",
    featurePill: "FARMER COMMUNITY",
    range: [0.18, 0.24],
    season: "Spring",
    day: 6,
  },
  {
    id: "upward",
    number: "05",
    title: "UPWARD",
    subtitle: "Every direction becomes a decision.",
    annotation: "AGRARIAN ENDEAVOR // 005",
    position: "middle-left",
    featurePill: "CROP TRIAGE",
    range: [0.24, 0.3],
    season: "Spring",
    day: 8,
  },
  {
    id: "first-light",
    number: "06",
    title: "FIRST LIGHT",
    subtitle: "For the first time, darkness has an opposite.",
    annotation: "SURFACE EMERGENCE // 006",
    position: "top-center",
    featurePill: "QUALITY CULTIVATION",
    range: [0.3, 0.36],
    season: "Spring",
    day: 11,
  },
  {
    id: "growth",
    number: "07",
    title: "GROWTH",
    subtitle: "What was hidden begins to take up space.",
    annotation: "PLOT & INVENTORY // 007",
    position: "bottom-left",
    featurePill: "FARM MANAGEMENT",
    range: [0.36, 0.42],
    season: "Summer",
    day: 28,
  },
  {
    id: "becoming",
    number: "08",
    title: "BECOMING",
    subtitle: "Day after day, it becomes what it is.",
    annotation: "MATURATION CYCLE // 008",
    position: "top-left",
    featurePill: "AI QUALITY ASSESSMENT",
    range: [0.42, 0.48],
    season: "Summer",
    day: 52,
  },
  {
    id: "bloom",
    number: "09",
    title: "BLOOM",
    subtitle: "For a brief moment, there is nothing left to become.",
    annotation: "MARKET READINESS // 009",
    position: "bottom-right",
    featurePill: "PRODUCE LISTINGS",
    range: [0.48, 0.54],
    season: "Summer",
    day: 68,
  },
  {
    id: "fullness",
    number: "10",
    title: "FULLNESS",
    subtitle: "Where hard work finds opportunity.",
    annotation: "MARKETPLACE MATCHING // 010",
    position: "bottom-center",
    featurePill: "BUYER DISCOVERY",
    range: [0.54, 0.6],
    season: "Summer",
    day: 76,
  },
  {
    id: "seeds",
    number: "11",
    title: "SEEDS",
    subtitle: "The flower is already carrying its ending.",
    annotation: "FERMAT PHYLLOTAXIS // 011",
    position: "middle-center",
    featurePill: "GRADE & PRICE TRANSPARENCY",
    range: [0.6, 0.66],
    season: "Summer",
    day: 88,
  },
  {
    id: "turning",
    number: "12",
    title: "TURNING",
    subtitle: "The light changes first.",
    annotation: "HARVEST COMMENCEMENT // 012",
    position: "bottom-left",
    featurePill: "BUYER OFFERS",
    range: [0.66, 0.72],
    season: "Autumn",
    day: 100,
  },
  {
    id: "fall",
    number: "13",
    title: "FALL",
    subtitle: "What was green becomes gold. What was gold becomes dust.",
    annotation: "LOGISTICS DEMAND // 013",
    position: "top-right",
    featurePill: "TRANSPORT DISPATCH",
    range: [0.72, 0.78],
    season: "Autumn",
    day: 110,
  },
  {
    id: "return",
    number: "14",
    title: "RETURN",
    subtitle: "What leaves the field carries value forward.",
    annotation: "SUPPLY CHAIN FULFILLMENT // 014",
    position: "top-left",
    featurePill: "ESCROW & SETTLEMENT",
    range: [0.78, 0.84],
    season: "Autumn",
    day: 122,
  },
  {
    id: "ash",
    number: "15",
    title: "ASH",
    subtitle: "Nothing stays above the ground forever.",
    annotation: "REGENERATION LOAM // 015",
    position: "middle-center",
    featurePill: "SUSTAINABLE CYCLE",
    range: [0.84, 0.9],
    season: "Winter",
    day: 136,
  },
  {
    id: "one-remains",
    number: "16",
    title: "ONE REMAINS",
    subtitle: "Every completed journey creates another beginning.",
    annotation: "SOLITARY SEED // 016",
    position: "bottom-center",
    featurePill: "FARMER TRUST",
    range: [0.9, 0.95],
    season: "Winter",
    day: 140,
  },
  {
    id: "again",
    number: "17",
    title: "AGAIN",
    subtitle: "Every MILE Matters, Every FARMER Matters.",
    annotation: "X-MILE GATEWAY // 017",
    position: "bottom-center",
    featurePill: "CONNECTED PLATFORM",
    range: [0.95, 1.0],
    season: "Spring",
    day: 0,
  },
];

/**
 * Native script labels across all 22 official Indian languages + English
 */
const AUTH_LABELS: Record<
  string,
  {
    signIn: string;
    signUp: string;
    tagline: string;
    selectLang: string;
    scrollStory: string;
    bePartOfJourney: string;
    finalSupporting: string;
  }
> = {
  en: {
    signIn: "Sign In",
    signUp: "Sign Up",
    tagline: "Every MILE Matters, Every FARMER Matters.",
    selectLang: "Change Language",
    scrollStory: "Scroll to experience the journey ↓",
    bePartOfJourney: "Be part of the journey.",
    finalSupporting: "Connect agriculture, people and opportunity through X-MILE.",
  },
  hi: {
    signIn: "साइन इन करें",
    signUp: "साइन अप करें",
    tagline: "हर मील महत्वपूर्ण है, हर किसान महत्वपूर्ण है।",
    selectLang: "भाषा बदलें",
    scrollStory: "यात्रा देखने के लिए स्क्रोल करें ↓",
    bePartOfJourney: "इस यात्रा का हिस्सा बनें।",
    finalSupporting: "X-MILE के माध्यम से कृषि, लोगों और अवसरों को जोड़ें।",
  },
  bn: {
    signIn: "সাইন ইন করুন",
    signUp: "সাইন আপ করুন",
    tagline: "প্রতিটি মাইল গুরুত্বপূর্ণ, প্রতিটি কৃষক গুরুত্বপূর্ণ।",
    selectLang: "ভাষা পরিবর্তন",
    scrollStory: "যাত্রা অন্বেষণ করতে স্ক্রোল করুন ↓",
    bePartOfJourney: "এই যাত্রার অংশ হোন।",
    finalSupporting: "X-MILE এর মাধ্যমে কৃষি, মানুষ এবং সুযোগ সংযুক্ত করুন।",
  },
  te: {
    signIn: "సైన్ ఇన్ చేయండి",
    signUp: "చేరండి",
    tagline: "ప్రతి మైలు ముఖ్యమైనది, ప్రతి రైతు ముఖ్యమైనవాడు.",
    selectLang: "భాష మార్చండి",
    scrollStory: "ప్రయాణాన్ని అనుభవించడానికి స్క్రోల్ చేయండి ↓",
    bePartOfJourney: "ఈ ప్రయాణంలో భాగస్వామ్యం అవ్వండి.",
    finalSupporting: "X-MILE ద్వారా వ్యవసాయం, ప్రజలు మరియు అవకాశాలను కలపండి.",
  },
  mr: {
    signIn: "साइन इन करा",
    signUp: "नोंदणी करा",
    tagline: "प्रत्येक मैल महत्त्वाचा, प्रत्येक शेतकरी महत्त्वाचा.",
    selectLang: "भाषा बदला",
    scrollStory: "प्रवास अनुभवण्यासाठी स्क्रोल करा ↓",
    bePartOfJourney: "या प्रवासाचा भाग व्हा.",
    finalSupporting: "X-MILE द्वारे शेती, लोक आणि संधी एकत्र जोडा.",
  },
  ta: {
    signIn: "உள்நுழையவும்",
    signUp: "பதிவு செய்யவும்",
    tagline: "ஒவ்வொரு மைலும் முக்கியம், ஒவ்வொரு விவசாயியும் முக்கியம்.",
    selectLang: "மொழியை மாற்றவும்",
    scrollStory: "பயணத்தை அனுபவிக்க உருட்டவும் ↓",
    bePartOfJourney: "இந்த பயணத்தின் ஒரு பகுதியாக இருங்கள்.",
    finalSupporting: "X-MILE வழியாக விவசாயம், மக்கள் மற்றும் வாய்ப்புகளை இணைக்கவும்.",
  },
  gu: {
    signIn: "સાઇન ઇન કરો",
    signUp: "નોંધણી કરો",
    tagline: "દરેક માઇલ મહત્વપૂર્ણ છે, દરેક ખેડૂત મહત્વપૂર્ણ છે.",
    selectLang: "ભાષા બદલો",
    scrollStory: "પ્રવાસ અનુભવવા માટે સ્ક્રોલ કરો ↓",
    bePartOfJourney: "આ પ્રવાસનો ભાગ બનો.",
    finalSupporting: "X-MILE દ્વારા કૃષિ, લોકો અને તકોને જોડો.",
  },
  kn: {
    signIn: "ಸೈನ್ ಇನ್ ಮಾಡಿ",
    signUp: "ಖಾತೆ ತೆರೆಯಿರಿ",
    tagline: "ಪ್ರತಿ ಮೈಲಿ ಮುಖ್ಯ, ಪ್ರತಿ ರೈತ ಮುಖ್ಯ.",
    selectLang: "ಭಾಷೆ ಬದಲಾಯಿಸಿ",
    scrollStory: "ಪ್ರಯಾಣವನ್ನು ಅನುಭವಿಸಲು ಸ್ಕ್ರಾಲ್ ಮಾಡಿ ↓",
    bePartOfJourney: "ಈ ಪ್ರಯಾಣದ ಭಾಗವಾಗಿರಿ.",
    finalSupporting: "X-MILE ಮೂಲಕ ಕೃಷಿ, ಜನರು ಮತ್ತು ಅವಕಾಶಗಳನ್ನು ಸಂಪರ್ಕಿಸಿ.",
  },
  ml: {
    signIn: "സൈൻ ഇൻ ചെയ്യുക",
    signUp: "രജിസ്റ്റർ ചെയ്യുക",
    tagline: "ഓരോ മൈലും പ്രധാനം, ഓരോ കർഷകനും പ്രധാനം.",
    selectLang: "ഭാഷ മാറ്റുക",
    scrollStory: "യാത്ര അനുഭവിക്കാൻ സ്ക്രോൾ ചെയ്യുക ↓",
    bePartOfJourney: "ഈ യാത്രയുടെ ഭാഗമാകൂ.",
    finalSupporting: "X-MILE വഴി കൃഷി, ജനങ്ങൾ, അവസരങ്ങൾ എന്നിവയെ ബന്ധിപ്പിക്കുക.",
  },
  or: {
    signIn: "ସାଇନ୍ ଇନ୍ କରନ୍ତୁ",
    signUp: "ପଞ୍ଜୀକରଣ କରନ୍ତୁ",
    tagline: "ପ୍ରତ୍ୟେକ ମାଇଲ୍ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ, ପ୍ରତ୍ୟେକ କୃଷକ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ |",
    selectLang: "ଭାଷା ପରିବର୍ତ୍ତନ କରନ୍ତୁ",
    scrollStory: "ଯାତ୍ରା ଅନୁଭବ କରିବାକୁ ସ୍କ୍ରୋଲ୍ କରନ୍ତୁ ↓",
    bePartOfJourney: "ଏହି ଯାତ୍ରାର ଏକ ଅଂଶ ହୁଅନ୍ତୁ |",
    finalSupporting: "X-MILE ମାଧ୍ୟମରେ କୃଷି, ଲୋକ ଏବଂ ସୁଯୋଗକୁ ଯୋଡନ୍ତୁ |",
  },
  pa: {
    signIn: "ਸਾਈਨ ਇਨ ਕਰੋ",
    signUp: "ਖਾਤਾ ਬਣਾਓ",
    tagline: "ਹਰ ਮੀਲ ਮਹੱਤਵਪੂਰਨ ਹੈ, ਹਰ ਕਿਸਾਨ ਮਹੱਤਵਪੂਰਨ ਹੈ।",
    selectLang: "ਭਾਸ਼ਾ ਬਦਲੋ",
    scrollStory: "ਯਾਤਰਾ ਦੇਖਣ ਲਈ ਸਕ੍ਰੋਲ ਕਰੋ ↓",
    bePartOfJourney: "ਇਸ ਯਾਤਰਾ ਦਾ ਹਿੱਸਾ ਬਣੋ।",
    finalSupporting: "X-MILE ਰਾਹੀਂ ਖੇਤੀਬਾੜੀ, ਲੋਕਾਂ ਅਤੇ ਮੌਕਿਆਂ ਨੂੰ ਜੋੜੋ।",
  },
  as: {
    signIn: "ছাইন ইন কৰক",
    signUp: "পঞ্জীয়ন কৰক",
    tagline: "প্ৰতিটো মাইল গুৰুত্বপূৰ্ণ, প্ৰতিজন কৃষক গুৰুত্বপূৰ্ণ।",
    selectLang: "ভাষা সলনি কৰক",
    scrollStory: "যাত্ৰা অনুভৱ কৰিবলৈ স্ক্ৰল কৰক ↓",
    bePartOfJourney: "এই যাত্ৰাৰ অংশ হওক।",
    finalSupporting: "X-MILE ৰ জৰিয়তে কৃষি, মানুহ আৰু সুযোগ সংযোগ কৰক।",
  },
  ur: {
    signIn: "سائن ان کریں",
    signUp: "رجسٹر کریں",
    tagline: "ہر میل اہم ہے، ہر کسان اہم ہے۔",
    selectLang: "زبان تبدیل کریں",
    scrollStory: "سفر کا تجربہ کرنے کے لیے سکرول کریں ↓",
    bePartOfJourney: "اس سفر کا حصہ بنیں۔",
    finalSupporting: "X-MILE کے ذریعے زراعت، لوگوں اور مواقع کو مربوط کریں۔",
  },
  sa: {
    signIn: "प्रवेशं कुर्वन्तु",
    signUp: "पञ्जीकरणं कुर्वन्तु",
    tagline: "प्रत्येकं क्रोशः महत्त्वपूर्णः, प्रत्येकं कृषकः महत्त्वपूर्णः।",
    selectLang: "भाषां परिवर्तयतु",
    scrollStory: "यात्राम् अनुभवितुं अधः भ्रमन्तु ↓",
    bePartOfJourney: "अस्याः यात्रायाः भागिनः भवन्तु।",
    finalSupporting: "X-MILE माध्यमेन कृषिं, जनान्, अवसराँश्च योजयन्तु।",
  },
  ks: {
    signIn: "سائن ان کٔریو",
    signUp: "رجسٹر کٔریو",
    tagline: "پرؠتھ میل چھُ اَہَم، پرؠتھ زمیٖندار چھُ اَہَم۔",
    selectLang: "زبان بَدلاوِو",
    scrollStory: "سَفَر وُچھنہٕ خٲطرٕ کٔریو سکرول ↓",
    bePartOfJourney: "یَتھ سَفَرس مَنٛز شٲمِل گژھِو۔",
    finalSupporting: "X-MILE کِس ذٔریعہٕ زراعت، لوٗکھ تہٕ مۄقعہٕ جوڈِو۔",
  },
  kok: {
    signIn: "साइन इन करात",
    signUp: "नोंदणी करात",
    tagline: "दर एक मैल म्हत्वाचो, दर एक शेतकार म्हत्वाचो.",
    selectLang: "भास बदलात",
    scrollStory: "प्रवास अणभवपाक स्क्रोल करात ↓",
    bePartOfJourney: "ह्या प्रवासाचो वांटो जायात.",
    finalSupporting: "X-MILE वरवीं शेतकाम, लोक आनी संदी जोडात.",
  },
  mai: {
    signIn: "साइन इन करू",
    signUp: "पंजीकरण करू",
    tagline: "प्रत्येक मील महत्वपूर्ण अछि, प्रत्येक किसान महत्वपूर्ण अछि।",
    selectLang: "भाषा बदलू",
    scrollStory: "यात्राक अनुभवक लेल स्क्रॉल करू ↓",
    bePartOfJourney: "एहि यात्राक हिस्सा बनू।",
    finalSupporting: "X-MILE क माध्यम सँ कृषि, लोक आ अवसर केँ जोड़ू।",
  },
  sat: {
    signIn: "ᱥᱟᱭᱤᱱ ᱤᱱ ᱢᱮ",
    signUp: "ᱚᱞ ᱯᱚᱨᱛᱚᱱ ᱢᱮ",
    tagline: "ᱡᱚᱛᱚ ᱢᱟᱭᱤᱞ ᱜᱮ ᱞᱟᱹᱠᱛᱤᱭᱟᱱᱟ, ᱡᱚᱛᱚ ᱪᱟᱹᱥᱤ ᱜᱮ ᱞᱟᱹᱠᱛᱤᱭᱟᱱᱟ᱾",
    selectLang: "ᱯᱟᱹᱨᱥᱤ ᱵᱚᱫᱚᱞ ᱢᱮ",
    scrollStory: "ᱫᱟᱬᱟᱱ ᱧᱮᱞ ᱞᱟᱹᱜᱤᱫ ᱥᱠᱨᱳᱞ ᱢᱮ ↓",
    bePartOfJourney: "ᱱᱚᱣᱟ ᱫᱟᱬᱟᱱ ᱨᱮ ᱥᱮᱞᱮᱫᱚᱜ ᱢᱮ᱾",
    finalSupporting: "X-MILE ᱛᱮ ᱪᱟᱥ, ᱦᱚᱲ ᱟᱨ ᱫᱟᱣ ᱡᱚᱲᱟᱣ ᱢᱮ᱾",
  },
  sd: {
    signIn: "سائن ان ڪريو",
    signUp: "رجسٽر ڪريو",
    tagline: "هر ميل اهم آهي، هر هاري اهم آهي.",
    selectLang: "ٻولي تبديل ڪريو",
    scrollStory: "سفر جو تجربو ڪرڻ لاءِ اسڪرول ڪريو ↓",
    bePartOfJourney: "هن سفر جو حصو بڻجو.",
    finalSupporting: "X-MILE ذريعي زراعت، ماڻهن ۽ موقعن کي ڳنڍيو.",
  },
  doi: {
    signIn: "साइन इन करो",
    signUp: "पंजीकरण करो",
    tagline: "हर मील महत्वपूर्ण ऐ, हर किसान महत्वपूर्ण ऐ।",
    selectLang: "भाशा बदलो",
    scrollStory: "सफ़र दा अनुभव करने लेई स्क्रोल करो ↓",
    bePartOfJourney: "इस सफ़र दा हिस्सा बनो।",
    finalSupporting: "X-MILE दे माध्यम कन्नै खेतीबाड़ी, लोकें ते मौकें गी जोड़ो।",
  },
  brx: {
    signIn: "साइन इन खालाम",
    signUp: "रेजिस्टार खालाम",
    tagline: "गासै माइलआनो गोनांथार, गासै आबादफोरा गोनांथार।",
    selectLang: "राव सोलाय",
    scrollStory: "दावबायनायखौ मोजां मोननो स्क्रल खालाम ↓",
    bePartOfJourney: "बे दावबायनायनि बाहागो जा।",
    finalSupporting: "X-MILE जों आबाद, सुबुं आरो खाबुखौ फोनांजाब।",
  },
  ne: {
    signIn: "साइन इन गर्नुहोस्",
    signUp: "दर्ता गर्नुहोस्",
    tagline: "प्रत्येक माइल महत्त्वपूर्ण छ, प्रत्येक किसान महत्त्वपूर्ण छ।",
    selectLang: "भाषा बदल्नुहोस्",
    scrollStory: "यात्रा अनुभव गर्न स्क्रोल गर्नुहोस् ↓",
    bePartOfJourney: "यस यात्राको भाग बन्नुहोस्।",
    finalSupporting: "X-MILE मार्फत कृषि, मानिस र अवसरहरू जोड्नुहोस्।",
  },
  mni: {
    signIn: "সাইন ইন তৌবীয়ু",
    signUp: "রেজিষ্টর তৌবীয়ু",
    tagline: "মাইল খুদিংমক মরুওই, লৌমী খুদিংমক মরুওই।",
    selectLang: "লোন হোংদোকউ",
    scrollStory: "খোংচৎ অসি উনবা স্ক্রোল তৌবীয়ু ↓",
    bePartOfJourney: "খোংচৎ অসিগী শরুক অমা ওইবীয়ু।",
    finalSupporting: "X-MILE গী খুত্থাংদা লৌমী, মী অমসুং খুদোংচাবশিং শম্নহনগনি।",
  },
};

export default function HomePage() {
  const { currentLanguage } = useLanguage();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isGateOpen, setIsGateOpen] = useState(false);
  const [isSoundOn, setIsSoundOn] = useState(false);

  // Automatic role redirection for returning authenticated users
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      const destination = ROLE_PORTALS[user.role] || "/farmer";
      const timer = setTimeout(() => {
        router.replace(destination);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Audio cleanup on unmount
  useEffect(() => {
    return () => {
      audioEngine.dispose();
    };
  }, []);

  const labels = useMemo(() => {
    return AUTH_LABELS[currentLanguage.code] || AUTH_LABELS.en;
  }, [currentLanguage.code]);

  // Handle Entry Gate completion
  const handleEnterGate = useCallback((soundOn: boolean) => {
    setIsGateOpen(true);
    setIsSoundOn(soundOn);
  }, []);

  const handleToggleSound = useCallback(() => {
    const active = audioEngine.toggleSound();
    setIsSoundOn(active);
  }, []);

  // Native smooth scroll tracking across 26 screens (1100vh)
  useEffect(() => {
    let ticking = false;
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const totalScrollable = rect.height - window.innerHeight;
            if (totalScrollable > 0) {
              const currentOffset = -rect.top;
              const p = Math.min(1, Math.max(0, currentOffset / totalScrollable));
              setScrollProgress(p);

              // Inform audio engine of scroll velocity for natural acoustic resonance
              const deltaScroll = Math.abs(window.scrollY - lastScrollY);
              lastScrollY = window.scrollY;
              audioEngine.updateScroll(p, deltaScroll * 0.01);
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Compute current chapter based on scroll progress
  const currentChapterIndex = useMemo(() => {
    const idx = CHAPTERS.findIndex(
      (c) => scrollProgress >= c.range[0] && scrollProgress <= c.range[1]
    );
    return idx !== -1 ? idx : scrollProgress >= 0.95 ? 16 : 0;
  }, [scrollProgress]);

  const currentChapter = CHAPTERS[currentChapterIndex] || CHAPTERS[0];

  // Smooth jump to any chapter via right-side stem scrubber
  const handleSelectChapter = useCallback((index: number) => {
    if (!containerRef.current) return;
    const ch = CHAPTERS[index];
    if (!ch) return;
    const totalScrollable = containerRef.current.scrollHeight - window.innerHeight;
    const targetScrollY = ch.range[0] * totalScrollable;
    window.scrollTo({
      top: targetScrollY,
      behavior: "smooth",
    });
  }, []);

  return (
    <main
      ref={containerRef}
      className="relative min-h-[1100vh] bg-[#050608] text-[#ede7db] font-sans overflow-x-hidden selection:bg-[#ffb35c] selection:text-black"
    >
      {/* ────────────────────────────────────────────────────────────
          1. INTERACTIVE ENTRY GATE (The Seed Awakening Ritual)
          ──────────────────────────────────────────────────────────── */}
      {!isGateOpen && (
        <SeedEntryGate
          onEnter={handleEnterGate}
          brandTagline={labels.tagline}
        />
      )}

      {/* ────────────────────────────────────────────────────────────
          2. FIXED FULLSCREEN 3D WEBGL LIFECYCLE (Three.js Scene)
          ──────────────────────────────────────────────────────────── */}
      <ThreeSeedLifecycle
        progress={scrollProgress}
        isSoundOn={isSoundOn}
      />

      {/* ────────────────────────────────────────────────────────────
          3. FIXED MINIMAL HUD TELEMETRY LAYER
          ──────────────────────────────────────────────────────────── */}
      <LifecycleHUD
        currentChapterIndex={currentChapterIndex}
        progress={scrollProgress}
        chapters={CHAPTERS}
        onSelectChapter={handleSelectChapter}
        isSoundOn={isSoundOn}
        onToggleSound={handleToggleSound}
        languageSelector={<LanguageSelector variant="compact" />}
        signInLabel={labels.signIn}
      />

      {/* ────────────────────────────────────────────────────────────
          4. EDITORIAL SCROLL STORY OVERLAY (Saol-Style Typography)
          ──────────────────────────────────────────────────────────── */}
      <ChapterOverlay
        currentChapter={currentChapter}
        progress={scrollProgress}
        langTagline={labels.tagline}
        signInLabel={labels.signIn}
        signUpLabel={labels.signUp}
      />

      {/* ────────────────────────────────────────────────────────────
          5. ACCESSIBLE TEXT CONTENT FOR SCREEN READERS
          ──────────────────────────────────────────────────────────── */}
      <div className="sr-only">
        <h2>X-MILE Agricultural Lifecycle Narrative</h2>
        {CHAPTERS.map((ch) => (
          <article key={ch.id}>
            <h3>
              Chapter {ch.number}: {ch.title}
            </h3>
            <p>{ch.subtitle}</p>
            <p>{ch.annotation}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
