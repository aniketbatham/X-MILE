"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import SeedGrowthCanvas from "@/components/SeedGrowthCanvas";

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
 * Six Configurable Chapters of the Agricultural Lifecycle
 */
const CHAPTERS = [
  {
    id: "seed",
    number: "01",
    title: "THE SEED",
    subtitle: "Every MILE begins in the soil.",
    annotation: "AGRICULTURAL LIFECYCLE // 001",
    range: [0.0, 0.18] as const,
  },
  {
    id: "root",
    number: "02",
    title: "ROOT",
    subtitle: "Strong foundations create stronger journeys.",
    annotation: "SUBTERRANEAN BOTANICAL // 002",
    range: [0.18, 0.36] as const,
  },
  {
    id: "upward",
    number: "03",
    title: "UPWARD",
    subtitle: "From the ground up, every journey deserves a better connection.",
    annotation: "EMERGENCE & QUALITY // 003",
    range: [0.36, 0.54] as const,
  },
  {
    id: "fullness",
    number: "04",
    title: "FULLNESS",
    subtitle: "Where hard work finds opportunity.",
    annotation: "MARKETPLACE MATURITY // 004",
    range: [0.54, 0.72] as const,
  },
  {
    id: "return",
    number: "05",
    title: "RETURN",
    subtitle: "Every connection carries value forward.",
    annotation: "SUPPLY CHAIN NETWORK // 005",
    range: [0.72, 0.88] as const,
  },
  {
    id: "again",
    number: "06",
    title: "AGAIN",
    subtitle: "Every ending creates the beginning of another journey.",
    annotation: "REGENERATIVE GATEWAY // 006",
    range: [0.88, 1.0] as const,
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
    signUp: "సైన్ అప్ చేయండి",
    tagline: "ప్రతి మైలు ముఖ్యం, ప్రతి రైతు ముఖ్యం.",
    selectLang: "భాషను మార్చండి",
    scrollStory: "ప్రయాణాన్ని చూడటానికి స్క్రోల్ చేయండి ↓",
    bePartOfJourney: "ఈ ప్రయాణంలో భాగస్వామ్యం అవ్వండి.",
    finalSupporting: "X-MILE ద్వారా వ్యవసాయం, ప్రజలు మరియు అవకాశాలను అనుసంధానించండి.",
  },
  mr: {
    signIn: "साइन इन करा",
    signUp: "साइन अप करा",
    tagline: "प्रत्येक मैल महत्त्वाचा, प्रत्येक शेतकरी महत्त्वाचा.",
    selectLang: "भाषा बदला",
    scrollStory: "प्रवास पाहण्यासाठी स्क्रोल करा ↓",
    bePartOfJourney: "या प्रवासाचा भाग व्हा.",
    finalSupporting: "X-MILE द्वारे शेती, लोक आणि संधी जोडा.",
  },
  ta: {
    signIn: "உள்நுழைக",
    signUp: "பதிவு செய்க",
    tagline: "ஒவ்வொரு மைலும் முக்கியம், ஒவ்வொரு விவசாயியும் முக்கியம்.",
    selectLang: "மொழியை மாற்றவும்",
    scrollStory: "பயணத்தை காண உருட்டவும் ↓",
    bePartOfJourney: "பயணத்தின் ஒரு பகுதியாக இருங்கள்.",
    finalSupporting: "X-MILE மூலம் விவசாயம், மக்கள் மற்றும் வாய்ப்புகளை இணைக்கவும்.",
  },
  gu: {
    signIn: "સાઇન ઇન કરો",
    signUp: "સાઇન અપ કરો",
    tagline: "દરેક માઇલ મહત્વપૂર્ણ છે, દરેક ખેડૂત મહત્વપૂર્ણ છે.",
    selectLang: "ભાષા બદલો",
    scrollStory: "યાત્રા જોવા નીચે સ્ક્રોલ કરો ↓",
    bePartOfJourney: "યાત્રાનો ભાગ બનો.",
    finalSupporting: "X-MILE દ્વારા કૃષિ, લોકો અને તકોને જોડો.",
  },
  kn: {
    signIn: "ಸೈನ್ ಇನ್ ಮಾಡಿ",
    signUp: "ಸೈನ್ ಅಪ್ ಮಾಡಿ",
    tagline: "ಪ್ರತಿ ಮೈಲಿ ಮುಖ್ಯ, ಪ್ರತಿ ರೈತ ಮುಖ್ಯ.",
    selectLang: "ಭಾಷೆ ಬದಲಾಯಿಸಿ",
    scrollStory: "ಪ್ರಯಾಣ ನೋಡಲು ಸ್ಕ್ರಾಲ್ ಮಾಡಿ ↓",
    bePartOfJourney: "ಈ ಪ್ರಯಾಣದ ಭಾಗವಾಗಿ.",
    finalSupporting: "X-MILE ಮೂಲಕ ಕೃಷಿ, ಜನರು ಮತ್ತು ಅವಕಾಶಗಳನ್ನು ಸಂಪರ್ಕಿಸಿ.",
  },
  ml: {
    signIn: "സൈൻ ഇൻ ചെയ്യുക",
    signUp: "സൈൻ അപ്പ് ചെയ്യുക",
    tagline: "ഓരോ മൈലും പ്രധാനം, ഓരോ കർഷകനും പ്രധാനം.",
    selectLang: "ഭാഷ മാറ്റുക",
    scrollStory: "യാത്ര കാണാൻ താഴേക്ക് സ്ക്രോൾ ചെയ്യുക ↓",
    bePartOfJourney: "ഈ യാത്രയുടെ ഭാഗമാകുക.",
    finalSupporting: "X-MILE വഴി കൃഷിയും ജനങ്ങളും അവസരങ്ങളും ബന്ധിപ്പിക്കുക.",
  },
  or: {
    signIn: "ସାଇନ୍ ଇନ୍ କରନ୍ତୁ",
    signUp: "ସାଇନ୍ ଅପ୍ କରନ୍ତୁ",
    tagline: "ପ୍ରତ୍ୟେକ ମାଇଲ୍ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ, ପ୍ରତ୍ୟେକ କୃଷକ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ।",
    selectLang: "ଭାଷା ବଦଳାନ୍ତୁ",
    scrollStory: "ଯାତ୍ରା ଦେଖିବାକୁ ସ୍କ୍ରୋଲ୍ କରନ୍ତୁ ↓",
    bePartOfJourney: "ଏହି ଯାତ୍ରାର ଅଂଶ ହୁଅନ୍ତୁ।",
    finalSupporting: "X-MILE ମାଧ୍ୟମରେ କୃଷି, ଲୋକ ଏବଂ ସୁଯୋଗକୁ ଯୋଡନ୍ତୁ।",
  },
  pa: {
    signIn: "ਸਾਈਨ ਇਨ ਕਰੋ",
    signUp: "ਸਾਈਨ ਅੱਪ ਕਰੋ",
    tagline: "ਹਰ ਮੀਲ ਮਹੱਤਵਪੂਰਨ ਹੈ, ਹਰ ਕਿਸਾਨ ਮਹੱਤਵਪੂਰਨ ਹੈ।",
    selectLang: "ਭਾਸ਼ਾ ਬਦਲੋ",
    scrollStory: "ਯਾਤਰਾ ਦੇਖਣ ਲਈ ਹੇਠਾਂ ਸਕ੍ਰੌਲ ਕਰੋ ↓",
    bePartOfJourney: "ਇਸ ਯਾਤਰਾ ਦਾ ਹਿੱਸਾ ਬਣੋ।",
    finalSupporting: "X-MILE ਰਾਹੀਂ ਖੇਤੀਬਾੜੀ, ਲੋਕਾਂ ਅਤੇ ਮੌਕਿਆਂ ਨੂੰ ਜੋੜੋ।",
  },
  as: {
    signIn: "ছাইন ইন কৰক",
    signUp: "ছাইন আপ কৰক",
    tagline: "প্ৰতিটো মাইল গুৰুত্বপূৰ্ণ, প্ৰতিজন কৃষক গুৰুত্বপূৰ্ণ।",
    selectLang: "ভাষা সলনি কৰক",
    scrollStory: "যাত্ৰা চাবলৈ তললৈ স্ক্ৰল কৰক ↓",
    bePartOfJourney: "যাত্ৰাৰ অংশ হওক।",
    finalSupporting: "X-MILE ৰ জৰিয়তে কৃষি, মানুহ আৰু সুযোগ সংযোগ কৰক।",
  },
  ur: {
    signIn: "سائن ان کریں",
    signUp: "سائن اپ کریں",
    tagline: "ہر میل اہم ہے، ہر کسان اہم ہے۔",
    selectLang: "زبان تبدیل کریں",
    scrollStory: "سفر دیکھنے کے لیے نیچے اسکرول کریں ↓",
    bePartOfJourney: "اس سفر کا حصہ بنیں۔",
    finalSupporting: "X-MILE کے ذریعے زراعت، لوگوں اور مواقع کو جوڑیں۔",
  },
  sa: {
    signIn: "प्रविशतु",
    signUp: "पंजीकरणं करोतु",
    tagline: "प्रत्येकं क्रोशं महत्त्वपूर्णम्, प्रत्येकः कृषकः महत्त्वपूर्णः।",
    selectLang: "भाषां परिवर्तयतु",
    scrollStory: "यात्रां द्रष्टुं अधः स्क्रॉलं कुर्वन्तु ↓",
    bePartOfJourney: "अस्याः यात्रायाः भागिनः भवन्तु।",
    finalSupporting: "X-MILE माध्यमेन कृषिं, जनान्, अवसरांश्च संयोजयन्तु।",
  },
  ks: {
    signIn: "سائن اِن کٔرِو",
    signUp: "سائن اَپ کٔرِو",
    tagline: "پرٛتھ مَیٖل چھُ اہم، پرٛتھ کِسَان چھُ اہم۔",
    selectLang: "زَبان بدلاوِو",
    scrollStory: "سفر وُچھنہٕ باپتھ بۄن اسکرول کٔرِو ↓",
    bePartOfJourney: "امِہ سفرُک حِصہٕ بنِو۔",
    finalSupporting: "X-MILE ذٔریعہٕ زراعت، لوٗکھ تہٕ موقعہٕ جوڑِو۔",
  },
  kok: {
    signIn: "साइन इन करात",
    signUp: "साइन अप करात",
    tagline: "दर एक मैल म्हत्वाचो, दर एक शेतकार म्हत्वाचो.",
    selectLang: "भास बदलात",
    scrollStory: "भोंवडी पळेवंक सकयल स्क्रोल करात ↓",
    bePartOfJourney: "ह्या प्रवासाचो वांटो जायात.",
    finalSupporting: "X-MILE वरवीं शेती, लोक आनी संदी जोडून घेयात.",
  },
  mai: {
    signIn: "साइन इन करू",
    signUp: "साइन अप करू",
    tagline: "प्रत्येक मील महत्वपूर्ण अछि, प्रत्येक किसान महत्वपूर्ण अछि।",
    selectLang: "भाषा बदलू",
    scrollStory: "यात्रा देखबाक लेल नीचा स्क्रोल करू ↓",
    bePartOfJourney: "एहि यात्राक हिस्सा बनू।",
    finalSupporting: "X-MILE क माध्यम सँ कृषि, लोक आ अवसर केँ जोड़ू।",
  },
  sat: {
    signIn: "ᱥᱟᱭᱤᱱ ᱤᱱ ᱢᱮ",
    signUp: "ᱥᱟᱭᱤᱱ ᱟᱯ ᱢᱮ",
    tagline: "ᱡᱚᱛᱚ ᱢᱟᱭᱤᱞ ᱜᱩᱨᱩᱛᱯᱩᱨᱱᱚ ᱠᱟᱱᱟ, ᱡᱚᱛᱚ ᱪᱟᱹᱥᱤ ᱜᱩᱨᱩᱛᱯᱩᱨᱱᱚ ᱠᱟᱱᱟ।",
    selectLang: "ᱯᱟᱹᱨᱥᱤ ᱵᱚᱫᱚᱞ ᱢᱮ",
    scrollStory: "ᱡᱟᱛᱨᱟ ᱧᱮᱞ ᱞᱟᱹᱜᱤᱫ ᱞᱟᱛᱟᱨ ᱥᱠᱨᱚᱞ ᱢᱮ ↓",
    bePartOfJourney: "ᱱᱚᱣᱟ ᱡᱟᱛᱨᱟ ᱨᱮ ᱥᱮᱞᱮᱫᱚᱜ ᱢᱮ।",
    finalSupporting: "X-MILE ᱛᱮ ᱪᱟᱥ, ᱦᱚᱲ ᱟᱨ ᱫᱟᱣ ᱡᱚᱲᱟᱣ ᱢᱮ।",
  },
  sd: {
    signIn: "سائن ان ٿيو",
    signUp: "سائن اپ ٿيو",
    tagline: "هر ميل اهم آهي، هر هاري اهم آهي.",
    selectLang: "ٻولي مٽايو",
    scrollStory: "سفر ڏسڻ لاءِ ھيٺ اسڪرول ڪريو ↓",
    bePartOfJourney: "ھن سفر جو حصو بڻجو.",
    finalSupporting: "X-MILE ذريعي زراعت، ماڻھن ۽ موقعن کي ڳنڍيو.",
  },
  doi: {
    signIn: "साइन इन करो",
    signUp: "साइन अप करो",
    tagline: "हर मील जरूरी ऐ, हर किसान जरूरी ऐ।",
    selectLang: "बोली बदलो",
    scrollStory: "यात्रा दिक्खने लेई हेठ स्क्रोल करो ↓",
    bePartOfJourney: "इस यात्रा दा हिस्सा बनो।",
    finalSupporting: "X-MILE राएं खेती, लोकें ते मौकें गी जोड़ो।",
  },
  brx: {
    signIn: "साइन इन खालाम",
    signUp: "साइन आप खालाम",
    tagline: "गासै माइल गोनांथार, गासै आबादारी गोनांथार।",
    selectLang: "राव सोलाय",
    scrollStory: "दावबायनाय नायनो थाखाय गाहायाव स्क्रल खालाम ↓",
    bePartOfJourney: "बे दावबायनायनि बाहागो जा।",
    finalSupporting: "X-MILE जों आबाद, मानसि आरो खाबुफोरखौ फोनांजाब।",
  },
  ne: {
    signIn: "साइन इन गर्नुहोस्",
    signUp: "साइन अप गर्नुहोस्",
    tagline: "प्रत्येक माइल महत्त्वपूर्ण छ, प्रत्येक किसान महत्त्वपूर्ण छ।",
    selectLang: "भाषा बदल्नुहोस्",
    scrollStory: "यात्रा अन्वेषण गर्न तल स्क्रोल गर्नुहोस् ↓",
    bePartOfJourney: "यस यात्राको हिस्सा बन्नुहोस्।",
    finalSupporting: "X-MILE मार्फत कृषि, मानिस र अवसरहरूलाई जोड्नुहोस्।",
  },
  mni: {
    signIn: "ꯁꯥꯏꯟ ꯏꯟ ꯇꯧꯕꯤꯌꯨ",
    signUp: "ꯁꯥꯏꯟ ꯑꯞ ꯇꯧꯕꯤꯌꯨ",
    tagline: "ꯃꯥꯏꯜ ꯈꯨꯗꯤꯡꯃꯛ ꯃꯔꯨꯑꯣꯏ, ꯂꯧꯃꯤ ꯈꯨꯗꯤꯡꯃꯛ ꯃꯔꯨꯑꯣꯏ।",
    selectLang: "ꯂꯣꯟ ꯍꯣꯡꯗꯣꯛꯄꯤꯌꯨ",
    scrollStory: "ꯈꯣꯡꯆꯠ ꯑꯁꯤ ꯎꯅꯕ ꯃꯈꯥꯗ ꯁ꯭ꯛꯔꯣꯜ ꯇꯧꯕꯤꯌꯨ ↓",
    bePartOfJourney: "ꯈꯣꯡꯆꯠ ꯑꯁꯤꯒꯤ ꯁꯔꯨꯛ ꯑꯣꯏꯕꯤꯌꯨ।",
    finalSupporting: "X-MILE ꯒꯤ ꯈꯨꯠꯊꯥꯡꯗ ꯂꯧ-উশিং, ꯃꯤꯌꯥꯝ ꯑꯃꯁꯨꯡ ꯈꯨꯗꯣꯡꯆꯥꯕꯁꯤꯡꯕꯨ ꯁꯝꯅꯍꯟꯕꯥ।",
  },
};

export default function HomePage() {
  const { currentLanguage } = useLanguage();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [audioActive, setAudioActive] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

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

  const openLanguageModal = useCallback(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("open-language-modal"));
    }
  }, []);

  const labels = useMemo(() => {
    return AUTH_LABELS[currentLanguage.code] || AUTH_LABELS.en;
  }, [currentLanguage.code]);

  const isNonEnglish = currentLanguage.code !== "en";

  // Native scroll progress calculation (0.00 to 1.00)
  useEffect(() => {
    let ticking = false;

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

  // Web Audio Ambient Synthesizer (Optional sound toggle, defaults to OFF)
  const toggleAudio = useCallback(() => {
    if (typeof window === "undefined") return;

    if (!audioActive) {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.0001, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.04, ctx.currentTime + 1.8);
        gainNode.connect(ctx.destination);
        masterGainRef.current = gainNode;

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(380, ctx.currentTime);
        filter.connect(gainNode);

        // Root drone 110Hz (A2)
        const osc1 = ctx.createOscillator();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(110, ctx.currentTime);
        osc1.connect(filter);
        osc1.start();

        // Harmonious fifth 165Hz (E3)
        const osc2 = ctx.createOscillator();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(165, ctx.currentTime);
        osc2.connect(filter);
        osc2.start();

        setAudioActive(true);
      } catch {
        setAudioActive(false);
      }
    } else {
      if (audioContextRef.current && masterGainRef.current) {
        masterGainRef.current.gain.setValueAtTime(
          masterGainRef.current.gain.value,
          audioContextRef.current.currentTime
        );
        masterGainRef.current.gain.exponentialRampToValueAtTime(
          0.0001,
          audioContextRef.current.currentTime + 0.5
        );
        setTimeout(() => {
          audioContextRef.current?.close();
          audioContextRef.current = null;
          setAudioActive(false);
        }, 500);
      } else {
        setAudioActive(false);
      }
    }
  }, [audioActive]);

  // Clean up Web Audio on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Compute active chapter index
  const activeChapterIndex = useMemo(() => {
    for (let i = 0; i < CHAPTERS.length; i++) {
      const [start, end] = CHAPTERS[i].range;
      if (scrollProgress >= start && scrollProgress <= end) {
        return i;
      }
    }
    return scrollProgress >= 0.88 ? 5 : 0;
  }, [scrollProgress]);

  const activeChapter = CHAPTERS[activeChapterIndex];

  // Helper for chapter narrative opacity with smooth entry/active/exit transitions
  const getChapterOpacity = (range: readonly [number, number]) => {
    const [start, end] = range;
    const buffer = 0.03;
    if (scrollProgress < start - buffer || scrollProgress > end + buffer) {
      return 0;
    }
    if (scrollProgress < start) {
      return (scrollProgress - (start - buffer)) / buffer;
    }
    if (scrollProgress > end) {
      return Math.max(0, 1 - (scrollProgress - end) / buffer);
    }
    return 1;
  };

  const ch1Opacity = getChapterOpacity(CHAPTERS[0].range);
  const ch2Opacity = getChapterOpacity(CHAPTERS[1].range);
  const ch3Opacity = getChapterOpacity(CHAPTERS[2].range);
  const ch4Opacity = getChapterOpacity(CHAPTERS[3].range);
  const ch5Opacity = getChapterOpacity(CHAPTERS[4].range);
  const ch6Opacity = getChapterOpacity(CHAPTERS[5].range);

  // Jump to specific chapter
  const scrollToChapter = (idx: number) => {
    if (!containerRef.current) return;
    const totalHeight = containerRef.current.scrollHeight - window.innerHeight;
    const targetProgress = CHAPTERS[idx].range[0] + 0.02;
    window.scrollTo({
      top: targetProgress * totalHeight,
      behavior: "smooth",
    });
  };

  // Determine text color contrast based on atmosphere (Chapters 3 & 4 are bright daylight)
  const isDaylightChapter = scrollProgress >= 0.40 && scrollProgress <= 0.74;

  return (
    <div
      ref={containerRef}
      className="relative min-h-[600vh] w-full bg-[#030704] text-stone-100 font-sans selection:bg-emerald-500 selection:text-white"
    >
      {/* ──────────────────────────────────────────────────────────
          LAYER A: FULL-VIEWPORT CINEMATIC VISUAL ENGINE (PINNED)
      ────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 h-screen w-full z-0 overflow-hidden">
        <SeedGrowthCanvas progress={scrollProgress} />
      </div>

      {/* ──────────────────────────────────────────────────────────
          LAYER B: FIXED TOP NAVIGATION BAR
      ────────────────────────────────────────────────────────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 h-16 sm:h-18 px-4 sm:px-8 flex items-center justify-between transition-colors duration-500 backdrop-blur-md ${
          isDaylightChapter
            ? "bg-[#faf8f2]/80 border-b border-stone-300/40 text-stone-900"
            : "bg-[#040c06]/80 border-b border-emerald-500/15 text-white"
        }`}
      >
        {/* Brand Mark */}
        <Link href="/" className="inline-flex items-center gap-3 group">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#163821] to-[#0a1b10] border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-sm group-hover:border-emerald-300 transition">
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
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
          <div>
            <span className="font-black tracking-tight text-lg sm:text-xl block leading-none">
              X-MILE
            </span>
            <span
              className={`text-[9px] font-mono tracking-widest uppercase block mt-1 ${
                isDaylightChapter ? "text-emerald-700" : "text-emerald-400"
              }`}
            >
              Agricultural Lifecycle
            </span>
          </div>
        </Link>

        {/* Center: Decorative Network Pulse */}
        <div
          className={`hidden md:inline-flex items-center gap-2.5 px-3.5 py-1 rounded-full text-[11px] font-mono tracking-wider border shadow-sm ${
            isDaylightChapter
              ? "bg-white/80 border-stone-300 text-stone-700"
              : "bg-[#0b1f12]/80 border-emerald-500/25 text-emerald-200"
          }`}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span>EXCHANGE ACTIVE // 22 VERNACULAR REGIONS</span>
        </div>

        {/* Right Actions: Audio Toggle, Language, Sign In, Sign Up */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Audio Synthesizer Toggle */}
          <button
            type="button"
            onClick={toggleAudio}
            className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-mono uppercase tracking-wider transition ${
              audioActive
                ? "bg-emerald-600 text-white border-emerald-400"
                : isDaylightChapter
                ? "bg-stone-100 text-stone-600 border-stone-300 hover:text-stone-900"
                : "bg-[#0c2214] text-stone-300 border-emerald-500/30 hover:text-white"
            }`}
            title="Toggle Ambient Audio Drone"
          >
            <span>{audioActive ? "SOUND: ON" : "SOUND: OFF"}</span>
          </button>

          {/* Language Selector */}
          <button
            type="button"
            onClick={openLanguageModal}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition shadow-sm ${
              isDaylightChapter
                ? "bg-white border-stone-300 text-stone-800 hover:bg-stone-50"
                : "bg-[#0c2214] border-emerald-500/30 text-emerald-100 hover:text-white"
            }`}
            aria-label={labels.selectLang}
          >
            <span>🌐</span>
            <span>{currentLanguage.nativeName}</span>
            <span className="text-[10px] ml-0.5">▾</span>
          </button>

          {/* Direct Sign In Link */}
          <Link
            href="/login"
            className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm border border-emerald-400/30 transition shadow-sm active:scale-[0.98]"
          >
            {labels.signIn}
          </Link>
        </div>
      </header>

      {/* ──────────────────────────────────────────────────────────
          LAYER B: MINIMAL TECHNICAL HUD OVERLAYS
      ────────────────────────────────────────────────────────── */}
      {/* Corner Crosshairs */}
      <div className="fixed top-20 left-6 z-40 pointer-events-none hidden md:block">
        <span className="font-mono text-[10px] tracking-widest text-emerald-500/50">
          + 12.9716° N / 77.5946° E
        </span>
      </div>
      <div className="fixed top-20 right-6 z-40 pointer-events-none hidden md:block">
        <span className="font-mono text-[10px] tracking-widest text-emerald-500/50">
          SECURE PROTOCOL // +
        </span>
      </div>
      <div className="fixed bottom-6 left-6 z-40 pointer-events-none hidden md:block">
        <div className="space-y-0.5 font-mono text-[10px] tracking-widest text-emerald-400/70">
          <p className="font-bold text-white">CHAPTER // {activeChapter.number}</p>
          <p className="text-emerald-500/80">{activeChapter.title}</p>
          <p className="text-stone-400">PROGRESS // {Math.round(scrollProgress * 100)}%</p>
        </div>
      </div>

      {/* Right Vertical Scrub Track */}
      <div className="fixed right-4 sm:right-6 top-1/2 -translate-y-1/2 z-40 hidden sm:flex flex-col items-center gap-3">
        <div className="h-32 w-0.5 bg-white/10 relative rounded-full overflow-hidden">
          <div
            className="w-full bg-emerald-400 absolute top-0 rounded-full transition-all duration-75"
            style={{ height: `${scrollProgress * 100}%` }}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          {CHAPTERS.map((ch, idx) => (
            <button
              key={ch.id}
              onClick={() => scrollToChapter(idx)}
              className={`w-2.5 h-2.5 rounded-full border transition-all ${
                activeChapterIndex === idx
                  ? "bg-emerald-400 border-white scale-125"
                  : "bg-transparent border-white/20 hover:border-emerald-400/60"
              }`}
              title={`Jump to Chapter ${ch.number}: ${ch.title}`}
              aria-label={`Jump to Chapter ${ch.number}: ${ch.title}`}
            />
          ))}
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────
          LAYER B: SYNCHRONIZED NARRATIVE CHAPTER OVERLAYS
      ────────────────────────────────────────────────────────── */}
      <div className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-center items-center px-4 sm:px-8">
        
        {/* ══════════════════════════════════════════════════════════
            CHAPTER 01: THE SEED (0.00 -> 0.18)
        ══════════════════════════════════════════════════════════ */}
        <div
          className="absolute inset-0 flex flex-col justify-between items-center text-center p-6 sm:p-12 transition-opacity duration-300"
          style={{
            opacity: ch1Opacity,
            pointerEvents: ch1Opacity > 0.6 ? "auto" : "none",
          }}
        >
          {/* Top Titles: Positioned in upper third to keep central 3D rotating seed completely unobstructed */}
          <div className="pt-20 sm:pt-24 max-w-3xl mx-auto space-y-3">
            <span className="inline-block px-3.5 py-1 rounded-full bg-[#0a1e12]/80 border border-emerald-400/30 text-[11px] font-mono tracking-widest text-emerald-300 uppercase shadow-md backdrop-blur-md">
              {CHAPTERS[0].annotation}
            </span>
            <h1 className="text-5xl sm:text-7xl md:text-8xl font-serif tracking-tight text-white drop-shadow-lg">
              {CHAPTERS[0].title}
            </h1>
            <p className="text-xl sm:text-2xl md:text-3xl font-light text-stone-200 tracking-wide font-sans">
              &ldquo;{CHAPTERS[0].subtitle}&rdquo;
            </p>
            <div className="pt-1">
              <span className="text-xs sm:text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-amber-200 to-emerald-300">
                {labels.tagline}
              </span>
            </div>
          </div>

          {/* Center void for 3D seed */}
          <div className="my-auto pointer-events-none" />

          {/* Scroll Prompt */}
          <div className="pb-8">
            <div className="inline-flex flex-col items-center gap-2 text-xs font-mono text-emerald-300/80">
              <span>{labels.scrollStory}</span>
              <div className="h-7 w-4.5 rounded-full border border-emerald-400/40 flex items-start justify-center p-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" />
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            CHAPTER 02: ROOT (0.18 -> 0.36)
        ══════════════════════════════════════════════════════════ */}
        <div
          className="absolute inset-0 flex flex-col justify-between items-center p-6 sm:p-12 transition-opacity duration-300"
          style={{
            opacity: ch2Opacity,
            pointerEvents: ch2Opacity > 0.6 ? "auto" : "none",
          }}
        >
          {/* Header at Top */}
          <div className="pt-20 sm:pt-24 max-w-3xl mx-auto space-y-2 text-center">
            <span className="text-xs font-mono font-bold tracking-widest text-amber-400 uppercase">
              {CHAPTERS[1].annotation}
            </span>
            <h2 className="text-4xl sm:text-6xl font-serif text-white tracking-tight">
              {CHAPTERS[1].title}
            </h2>
            <p className="text-lg sm:text-2xl font-light text-stone-200">
              &ldquo;{CHAPTERS[1].subtitle}&rdquo;
            </p>
            <p className="text-xs sm:text-sm text-emerald-200/80 font-mono tracking-wider">
              Every farmer is part of something bigger.
            </p>
          </div>

          {/* Subterranean Context Cards at Bottom */}
          <div className="w-full max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4 pb-8 sm:pb-12 text-left">
            <div className="p-4 rounded-2xl bg-[#09180e]/90 border border-emerald-500/25 backdrop-blur-md shadow-lg">
              <div className="flex items-center gap-2 mb-1 text-emerald-400 text-xs font-mono font-bold">
                <span>01</span>
                <span>FARMER AGGREGATION</span>
              </div>
              <p className="text-xs text-stone-300 leading-relaxed">
                Connecting independent acreage into unified regional volume pools without intermediary dilution.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#09180e]/90 border border-emerald-500/25 backdrop-blur-md shadow-lg">
              <div className="flex items-center gap-2 mb-1 text-emerald-400 text-xs font-mono font-bold">
                <span>02</span>
                <span>INVENTORY VISIBILITY</span>
              </div>
              <p className="text-xs text-stone-300 leading-relaxed">
                Harvest lots tracked directly from registered land plots, distinguishing available and committed produce.
              </p>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            CHAPTER 03: UPWARD (0.36 -> 0.54)
        ══════════════════════════════════════════════════════════ */}
        <div
          className="absolute inset-0 flex flex-col justify-between items-center p-6 sm:p-12 transition-opacity duration-300 pointer-events-none"
          style={{
            opacity: ch3Opacity,
            pointerEvents: ch3Opacity > 0.6 ? "auto" : "none",
          }}
        >
          {/* Header at Top */}
          <div className="pt-20 sm:pt-24 max-w-3xl mx-auto space-y-2 text-center text-stone-900">
            <span className="text-xs font-mono font-bold tracking-widest text-emerald-800 uppercase bg-emerald-100/90 px-3 py-1 rounded-full border border-emerald-300">
              {CHAPTERS[2].annotation}
            </span>
            <h2 className="text-4xl sm:text-6xl font-serif text-stone-900 tracking-tight pt-1">
              {CHAPTERS[2].title}
            </h2>
            <p className="text-base sm:text-xl font-medium text-stone-700 max-w-2xl mx-auto">
              &ldquo;{CHAPTERS[2].subtitle}&rdquo;
            </p>
          </div>

          {/* AI Quality Card on Side/Bottom */}
          <div className="w-full max-w-5xl mx-auto flex justify-end pb-8 sm:pb-12">
            <div className="max-w-md w-full p-5 rounded-2xl bg-white/95 border border-emerald-200/90 shadow-2xl backdrop-blur-md text-left space-y-3">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <span className="font-mono text-[11px] font-bold text-emerald-800">
                  AI VISION // CROP QUALITY ASSESSMENT
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold">
                  VISUAL INSPECTION
                </span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Illustrative representation of X-MILE&apos;s AI-assisted crop quality assessment. Farmers analyze produce lots for surface color uniformity and morphological grade indication prior to mandi dispatch.
              </p>
              <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200 text-[10px] text-amber-900 leading-relaxed font-sans">
                ℹ️ <strong>Triage Notice:</strong> Visual AI provides indicative grading only and does not replace certified laboratory chemical assay or food safety testing.
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            CHAPTER 04: FULLNESS (0.54 -> 0.72)
        ══════════════════════════════════════════════════════════ */}
        <div
          className="absolute inset-0 flex flex-col justify-between items-center p-6 sm:p-12 transition-opacity duration-300 pointer-events-none"
          style={{
            opacity: ch4Opacity,
            pointerEvents: ch4Opacity > 0.6 ? "auto" : "none",
          }}
        >
          {/* Header at Top */}
          <div className="pt-20 sm:pt-24 max-w-3xl mx-auto space-y-2 text-center text-stone-900">
            <span className="text-xs font-mono font-bold tracking-widest text-amber-800 uppercase bg-amber-100/90 px-3 py-1 rounded-full border border-amber-300">
              {CHAPTERS[3].annotation}
            </span>
            <h2 className="text-4xl sm:text-6xl font-serif text-stone-900 tracking-tight pt-1">
              {CHAPTERS[3].title}
            </h2>
            <p className="text-base sm:text-xl font-medium text-stone-700">
              &ldquo;{CHAPTERS[3].subtitle}&rdquo;
            </p>
          </div>

          {/* Flanking Marketplace Capability Cards, leaving center open for Sunflower */}
          <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-x-56 gap-y-4 my-auto pb-6">
            <div className="space-y-3 max-w-sm">
              <div className="p-4 rounded-2xl bg-white/95 border border-stone-200/90 shadow-md">
                <h3 className="text-xs font-bold text-stone-900 uppercase font-mono mb-1">
                  01 · Open Marketplace
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Help buyers discover available produce and help farmers present lots with verified grade, variety, and rate per kg.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/95 border border-stone-200/90 shadow-md">
                <h3 className="text-xs font-bold text-stone-900 uppercase font-mono mb-1">
                  02 · Transparent Info
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Clear harvest date, pickup district, net quantity, and asking price supported by the actual listing engine.
                </p>
              </div>
            </div>

            <div className="space-y-3 max-w-sm ml-auto">
              <div className="p-4 rounded-2xl bg-white/95 border border-stone-200/90 shadow-md">
                <h3 className="text-xs font-bold text-stone-900 uppercase font-mono mb-1">
                  03 · Buyer Connections
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Commercial buyers submit rate offers per kg, agree on escrow terms, and coordinate procurement directly.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/95 border border-stone-200/90 shadow-md">
                <h3 className="text-xs font-bold text-stone-900 uppercase font-mono mb-1">
                  04 · Inventory Visibility
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Farmers manage available vs. reserved produce through automated atomic reservation on contract acceptance.
                </p>
              </div>
            </div>
          </div>

          <div className="h-4" />
        </div>

        {/* ══════════════════════════════════════════════════════════
            CHAPTER 05: RETURN & THE NETWORK (0.72 -> 0.88)
        ══════════════════════════════════════════════════════════ */}
        <div
          className="absolute inset-0 flex flex-col justify-center items-center p-6 sm:p-12 transition-opacity duration-300"
          style={{
            opacity: ch5Opacity,
            pointerEvents: ch5Opacity > 0.6 ? "auto" : "none",
          }}
        >
          <div className="max-w-4xl mx-auto space-y-6 text-center text-white">
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold tracking-widest text-emerald-400 uppercase bg-[#0d2215]/80 px-3 py-1 rounded-full border border-emerald-500/30">
                {CHAPTERS[4].annotation}
              </span>
              <h2 className="text-4xl sm:text-6xl font-serif text-white tracking-tight pt-2">
                {CHAPTERS[4].title}
              </h2>
              <p className="text-base sm:text-xl font-light text-stone-300">
                &ldquo;{CHAPTERS[4].subtitle}&rdquo;
              </p>
            </div>

            {/* Linear Journey Route Pill */}
            <div className="inline-flex flex-wrap items-center justify-center gap-2 p-3 rounded-2xl bg-[#08170d]/90 border border-emerald-500/30 text-xs font-mono font-bold text-emerald-300 shadow-xl backdrop-blur-md">
              <span>FARMER</span>
              <span className="text-stone-400">→</span>
              <span>MARKETPLACE</span>
              <span className="text-stone-400">→</span>
              <span>BUYER</span>
              <span className="text-stone-400">→</span>
              <span>TRANSPORT</span>
              <span className="text-stone-400">→</span>
              <span className="text-white">DELIVERY</span>
            </div>

            {/* Accurate Capabilities Context */}
            <div className="max-w-xl mx-auto p-4 rounded-2xl bg-[#08150c]/85 border border-emerald-500/20 text-xs text-stone-300 leading-relaxed font-sans">
              Orders link growers, commercial buyers, and rural transporters. Shipments track milestone progress through weighbridge verification, and settlement ledgers strictly distinguish delivered produce value from confirmed bank disbursements.
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════
            CHAPTER 06: AGAIN // THE GATEWAY (0.88 -> 1.00)
        ══════════════════════════════════════════════════════════ */}
        <div
          className="absolute inset-0 flex flex-col justify-center items-center p-6 sm:p-12 transition-opacity duration-300"
          style={{
            opacity: ch6Opacity,
            pointerEvents: ch6Opacity > 0.6 ? "auto" : "none",
          }}
        >
          <div className="max-w-md w-full mx-auto space-y-6 text-center">
            
            {/* Header Titles */}
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold tracking-widest text-emerald-400 uppercase bg-[#0d2215]/80 px-3 py-1 rounded-full border border-emerald-500/30 inline-block">
                {CHAPTERS[5].annotation}
              </span>
              <h2 className="text-4xl sm:text-5xl font-serif text-white tracking-tight">
                {CHAPTERS[5].title}
              </h2>
              <p className="text-xs sm:text-sm font-light text-stone-300">
                &ldquo;{CHAPTERS[5].subtitle}&rdquo;
              </p>
            </div>

            {/* Central Authentication Gateway Card */}
            <div className="p-6 sm:p-8 rounded-[32px] bg-[#0c2214]/95 backdrop-blur-2xl border border-emerald-500/35 shadow-[0_25px_70px_rgba(0,0,0,0.85)] space-y-6">
              
              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight font-sans">
                  {labels.bePartOfJourney}
                </h3>
                <p className="text-xs text-emerald-300/90 font-medium">
                  {labels.finalSupporting}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-1">
                {/* Sign In */}
                <Link
                  href="/login"
                  className="w-full h-13 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-650 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-extrabold shadow-lg shadow-emerald-950/50 border border-emerald-400/30 active:scale-[0.985] transition-all flex items-center justify-between px-5"
                >
                  <div className="text-left">
                    <span className="block text-base font-black text-white">
                      {labels.signIn}
                    </span>
                    {isNonEnglish && (
                      <span className="block text-[9px] font-semibold uppercase text-emerald-200/80 -mt-0.5">
                        Sign In
                      </span>
                    )}
                  </div>
                  <div className="h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center text-white">
                    →
                  </div>
                </Link>

                {/* Sign Up */}
                <Link
                  href="/register"
                  className="w-full h-13 rounded-xl bg-[#142d1d]/85 hover:bg-[#1a3a25] text-stone-100 hover:text-white font-bold border border-emerald-500/25 shadow-md active:scale-[0.985] transition-all flex items-center justify-between px-5"
                >
                  <div className="text-left">
                    <span className="block text-base font-bold text-stone-100">
                      {labels.signUp}
                    </span>
                    {isNonEnglish && (
                      <span className="block text-[9px] font-semibold uppercase text-emerald-300/70 -mt-0.5">
                        Sign Up
                      </span>
                    )}
                  </div>
                  <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-emerald-300">
                    +
                  </div>
                </Link>
              </div>

              {/* Informational Role Cards (No client-side role manipulation) */}
              <div className="pt-2 border-t border-emerald-500/20 text-left space-y-1.5 text-[11px] text-stone-300">
                <p>
                  <strong className="text-emerald-400">🌾 Farmer:</strong> Manage acreage, harvest inventory, produce listings.
                </p>
                <p>
                  <strong className="text-amber-400">🏢 Commercial Buyer:</strong> Sourcing discovery, rate offers, order tracking.
                </p>
                <p>
                  <strong className="text-teal-400">🚚 Transporter:</strong> Transport job discovery & fulfillment coordination.
                </p>
              </div>

              {/* Language Switcher Trigger */}
              <div className="pt-2 border-t border-emerald-500/15">
                <button
                  type="button"
                  onClick={openLanguageModal}
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-300 hover:text-white font-semibold transition"
                >
                  <span>🌐</span>
                  <span>{currentLanguage.nativeName}</span>
                  <span className="text-[10px] text-emerald-400">— {labels.selectLang}</span>
                </button>
              </div>
            </div>

            {/* Security Badge */}
            <p className="text-[10px] text-emerald-400/60 font-mono tracking-wider">
              🔒 VERIFIED SESSIONS · ROW-LEVEL SECURITY ENFORCED
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
