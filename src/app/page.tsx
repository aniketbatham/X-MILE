"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import Image from "next/image";
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
 * Authentic native script authentication labels across all 22 official Indian languages + English
 */
const AUTH_LABELS: Record<
  string,
  {
    signIn: string;
    signUp: string;
    tagline: string;
    selectLang: string;
    scrollStory: string;
    supportingHero: string;
    finalSupporting: string;
  }
> = {
  en: {
    signIn: "Sign In",
    signUp: "Sign Up",
    tagline: "Every MILE Matters, Every FARMER Matters.",
    selectLang: "Change Language",
    scrollStory: "Scroll to experience the journey ↓",
    supportingHero: "Connecting farms, markets and people through smarter agricultural supply chains.",
    finalSupporting: "Be part of a smarter, more connected agricultural journey.",
  },
  hi: {
    signIn: "साइन इन करें",
    signUp: "साइन अप करें",
    tagline: "हर मील महत्वपूर्ण है, हर किसान महत्वपूर्ण है।",
    selectLang: "भाषा बदलें",
    scrollStory: "कृषि यात्रा देखने के लिए नीचे स्क्रॉल करें ↓",
    supportingHero: "स्मार्ट आपूर्ति श्रृंखलाओं के माध्यम से खेतों, बाजारों और लोगों को जोड़ना।",
    finalSupporting: "एक स्मार्ट, अधिक जुड़ी हुई कृषि यात्रा का हिस्सा बनें।",
  },
  bn: {
    signIn: "সাইন ইন করুন",
    signUp: "সাইন আপ করুন",
    tagline: "প্রতিটি মাইল গুরুত্বপূর্ণ, প্রতিটি কৃষক গুরুত্বপূর্ণ।",
    selectLang: "ভাষা পরিবর্তন",
    scrollStory: "কৃষি যাত্রা অন্বেষণ করতে স্ক্রোল করুন ↓",
    supportingHero: "স্মার্ট কৃষি সরবরাহ শৃঙ্খলার মাধ্যমে খামার, বাজার এবং মানুষকে সংযুক্ত করা।",
    finalSupporting: "একটি স্মার্ট ও সংযুক্ত কৃষি যাত্রার অংশ হোন।",
  },
  te: {
    signIn: "సైన్ ఇన్ చేయండి",
    signUp: "సైన్ అప్ చేయండి",
    tagline: "ప్రతి మైలు ముఖ్యం, ప్రతి రైతు ముఖ్యం.",
    selectLang: "భాషను మార్చండి",
    scrollStory: "వ్యవసాయ ప్రయాణాన్ని అనుభవించడానికి క్రిందికి స్క్రోల్ చేయండి ↓",
    supportingHero: "పొలాలు, మార్కెట్లు మరియు ప్రజలను కలుపుతూ స్మార్ట్ వ్యవసాయ సరఫరా గొలుసులు.",
    finalSupporting: "మరింత అనుసంధానించబడిన వ్యవసాయ ప్రయాణంలో భాగస్వామ్యం అవ్వండి.",
  },
  mr: {
    signIn: "साइन इन करा",
    signUp: "साइन अप करा",
    tagline: "प्रत्येक मैल महत्त्वाचा, प्रत्येक शेतकरी महत्त्वाचा.",
    selectLang: "भाषा बदला",
    scrollStory: "कृषी प्रवास पाहण्यासाठी स्क्रोल करा ↓",
    supportingHero: "शेत, बाजार आणि लोकांना जोडणारी अधिक सक्षम कृषी पुरवठा साखळी.",
    finalSupporting: "अधिक जोडलेल्या कृषी प्रवासाचा भाग व्हा.",
  },
  ta: {
    signIn: "உள்நுழைக",
    signUp: "பதிவு செய்க",
    tagline: "ஒவ்வொரு மைலும் முக்கியம், ஒவ்வொரு விவசாயியும் முக்கியம்.",
    selectLang: "மொழியை மாற்றவும்",
    scrollStory: "பயணத்தை அனுபவிக்க கீழே உருட்டவும் ↓",
    supportingHero: "விவசாய பண்ணைகள், சந்தைகள் மற்றும் மக்களை இணைக்கும் ஸ்மார்ட் விநியோக சங்கிலி.",
    finalSupporting: "ஒருங்கிணைந்த விவசாய பயணத்தின் அங்கமாக இருங்கள்.",
  },
  gu: {
    signIn: "સાઇન ઇન કરો",
    signUp: "સાઇન અપ કરો",
    tagline: "દરેક માઇલ મહત્વપૂર્ણ છે, દરેક ખેડૂત મહત્વપૂર્ણ છે.",
    selectLang: "ભાષા બદલો",
    scrollStory: "યાત્રાનો અનુભવ કરવા નીચે સ્ક્રોલ કરો ↓",
    supportingHero: "સ્માર્ટ સપ્લાય ચેઇન દ્વારા ખેતરો, બજારો અને લોકોને જોડવું.",
    finalSupporting: "વધુ જોડાયેલ કૃષિ યાત્રાનો ભાગ બનો.",
  },
  kn: {
    signIn: "ಸೈನ್ ಇನ್ ಮಾಡಿ",
    signUp: "ಸೈನ್ ಅಪ್ ಮಾಡಿ",
    tagline: "ಪ್ರತಿ ಮೈಲಿ ಮುಖ್ಯ, ಪ್ರತಿ ರೈತ ಮುಖ್ಯ.",
    selectLang: "ಭಾಷೆ ಬದಲಾಯಿಸಿ",
    scrollStory: "ಕೃಷಿ ಪಯಣವನ್ನು ಅನ್ವೇಷಿಸಲು ಸ್ಕ್ರಾಲ್ ಮಾಡಿ ↓",
    supportingHero: "ಸ್ಮಾರ್ಟ್ ಕೃಷಿ ಪೂರೈಕೆ ಸರಪಳಿಯ ಮೂಲಕ ಹೊಲಗಳು, ಮಾರುಕಟ್ಟೆಗಳು ಮತ್ತು ಜನರನ್ನು ಸಂಪರ್ಕಿಸುವುದು.",
    finalSupporting: "ಸಂಪರ್ಕಿತ ಕೃಷಿ ಪಯಣದ ಭಾಗವಾಗಿರಿ.",
  },
  ml: {
    signIn: "സൈൻ ഇൻ ചെയ്യുക",
    signUp: "സൈൻ അപ്പ് ചെയ്യുക",
    tagline: "ഓരോ മൈലും പ്രധാനം, ഓരോ കർഷകനും പ്രധാനം.",
    selectLang: "ഭാഷ മാറ്റുക",
    scrollStory: "കാർഷിക യാത്ര അനുഭവിക്കാൻ താഴേക്ക് സ്ക്രോൾ ചെയ്യുക ↓",
    supportingHero: "ഫാമുകൾ, വിപണികൾ, മനുഷ്യർ എന്നിവയെ ബന്ധിപ്പിക്കുന്ന കാർഷിക വിതരണ ശൃംഖല.",
    finalSupporting: "കൂടുതൽ ബന്ധിതമായ കാർഷിക യാത്രയുടെ ഭാഗമാകൂ.",
  },
  or: {
    signIn: "ସାଇନ୍ ଇନ୍ କରନ୍ତୁ",
    signUp: "ସାଇନ୍ ଅପ୍ କରନ୍ତୁ",
    tagline: "ପ୍ରତ୍ୟେକ ମାଇଲ୍ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ, ପ୍ରତ୍ୟେକ କୃଷକ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ।",
    selectLang: "ଭାଷା ବଦଳାନ୍ତୁ",
    scrollStory: "କୃଷି ଯାତ୍ରା ଦେଖିବାକୁ ତଳକୁ ସ୍କ୍ରୋଲ କରନ୍ତୁ ↓",
    supportingHero: "ସ୍ମାର୍ଟ ଯୋଗାଣ ଶୃଙ୍ଖଳା ମାଧ୍ୟମରେ କ୍ଷେତ, ବଜାର ଓ ମଣିଷଙ୍କୁ ଯୋଡ଼ିବା।",
    finalSupporting: "ଏକ ଯୋଡ଼ି ହୋଇଥିବା କୃଷି ଯାତ୍ରାର ଅଂଶ ହୁଅନ୍ତୁ।",
  },
  pa: {
    signIn: "ਸਾਈਨ ਇਨ ਕਰੋ",
    signUp: "ਸਾਈਨ ਅੱਪ ਕਰੋ",
    tagline: "ਹਰ ਮੀਲ ਮਹੱਤਵਪੂਰਨ ਹੈ, ਹਰ ਕਿਸਾਨ ਮਹੱਤਵਪੂਰਨ ਹੈ।",
    selectLang: "ਭਾਸ਼ਾ ਬਦਲੋ",
    scrollStory: "ਖੇਤੀ ਯਾਤਰਾ ਵੇਖਣ ਲਈ ਹੇਠਾਂ ਸਕ੍ਰੋਲ ਕਰੋ ↓",
    supportingHero: "ਸਮਾਰਟ ਸਪਲਾਈ ਚੇਨ ਰਾਹੀਂ ਖੇਤਾਂ, ਮੰਡੀਆਂ ਅਤੇ ਲੋਕਾਂ ਨੂੰ ਜੋੜਨਾ।",
    finalSupporting: "ਇੱਕ ਜੁੜੀ ਹੋਈ ਖੇਤੀ ਯਾਤਰਾ ਦਾ ਹਿੱਸਾ ਬਣੋ।",
  },
  as: {
    signIn: "ছাইন ইন কৰক",
    signUp: "ছাইন আপ কৰক",
    tagline: "প্ৰতিটো মাইল গুৰুত্বপূৰ্ণ, প্ৰতিজন কৃষক গুৰুত্বপূৰ্ণ।",
    selectLang: "ভাষা সলনি কৰক",
    scrollStory: "যাত্ৰা উপভোগ কৰিবলৈ তললৈ স্ক্ৰল কৰক ↓",
    supportingHero: "স্মাৰ্ট যোগান শৃংখলৰ জৰিয়তে পথাৰ, বজাৰ আৰু মানুহক সংযোগ কৰা।",
    finalSupporting: "এক সংযোগিত কৃষি যাত্ৰাৰ অংশ হওক।",
  },
  ur: {
    signIn: "سائن ان کریں",
    signUp: "سائن اپ کریں",
    tagline: "ہر میل اہم ہے، ہر کسان اہم ہے۔",
    selectLang: "زبان تبدیل کریں",
    scrollStory: "سفر دیکھنے کے لیے نیچے اسکرول کریں ↓",
    supportingHero: "سمارٹ زرعی سپلائی چینز کے ذریعے کھیتوں، منڈیوں اور لوگوں کو جوڑنا۔",
    finalSupporting: "ایک جڑے ہوئے زرعی سفر کا حصہ بنیں۔",
  },
  sa: {
    signIn: "प्रविशतु",
    signUp: "पंजीकरणं करोतु",
    tagline: "प्रत्येकं क्रोशं महत्त्वपूर्णम्, प्रत्येकः कृषकः महत्त्वपूर्णः।",
    selectLang: "भाषां परिवर्तयतु",
    scrollStory: "यात्रां द्रष्टुं अधः स्क्रॉलं कुर्वन्तु ↓",
    supportingHero: "सस्यक्षेत्राणि विपणिं च जनान् संयोजयन्ती कृषि-श्रृङ्खला।",
    finalSupporting: "समन्विते कृषि-प्रवासे सम्मिलिताः भवन्तु।",
  },
  ks: {
    signIn: "سائن اِن کٔرِو",
    signUp: "سائن اَپ کٔرِو",
    tagline: "پرٛتھ مَیٖل چھُ اہم، پرٛتھ کِسَان چھُ اہم۔",
    selectLang: "زَبان بدلاوِو",
    scrollStory: "سفر وُچھنہٕ باپتھ بۄن اسکرول کٔرِو ↓",
    supportingHero: "سمارٹ سپلائی چین ذٔریعہٕ کھیت، منڈی تہٕ لوٗکھ جوڑُن۔",
    finalSupporting: "اکِہ سمارٹ زَرعی سفرُک حِصہٕ بنِو۔",
  },
  kok: {
    signIn: "साइन इन करात",
    signUp: "साइन अप करात",
    tagline: "दर एक मैल म्हत्वाचो, दर एक शेतकार म्हत्वाचो.",
    selectLang: "भास बदलात",
    scrollStory: "कृषी भोंवडी पळेवंक सकयल स्क्रोल करात ↓",
    supportingHero: "शेत, बाजार आनी लोकांक जोडपी सक्षम पुरवण सांखळी.",
    finalSupporting: "जोडिल्ल्या कृषी प्रवासाचो वांटो जायात.",
  },
  mai: {
    signIn: "साइन इन करू",
    signUp: "साइन अप करू",
    tagline: "प्रत्येक मील महत्वपूर्ण अछि, प्रत्येक किसान महत्वपूर्ण अछि।",
    selectLang: "भाषा बदलू",
    scrollStory: "कृषि यात्रा देखबाक लेल नीचा स्क्रोल करू ↓",
    supportingHero: "स्मार्ट आपूर्ति श्रृंखलाक माध्यम सँ खेत, बाजार आ लोक केँ जोड़ब।",
    finalSupporting: "एकटा जुड़ल कृषि यात्राक हिस्सा बनू।",
  },
  sat: {
    signIn: "ᱥᱟᱭᱤᱱ ᱤᱱ ᱢᱮ",
    signUp: "ᱥᱟᱭᱤᱱ ᱟᱯ ᱢᱮ",
    tagline: "ᱡᱚᱛᱚ ᱢᱟᱭᱤᱞ ᱜᱩᱨᱩᱛᱯᱩᱨᱱᱚ ᱠᱟᱱᱟ, ᱡᱚᱛᱚ ᱪᱟᱹᱥᱤ ᱜᱩᱨᱩᱛᱯᱩᱨᱱᱚ ᱠᱟᱱᱟ।",
    selectLang: "ᱯᱟᱹᱨᱥᱤ ᱵᱚᱫᱚᱞ ᱢᱮ",
    scrollStory: "ᱪᱟᱥ ᱡᱟᱛᱨᱟ ᱧᱮᱞ ᱞᱟᱹᱜᱤᱫ ᱞᱟᱛᱟᱨ ᱥᱠᱨᱚᱞ ᱢᱮ ↓",
    supportingHero: "ᱥᱢᱟᱨᱴ ᱥᱟᱯᱞᱟᱭ ᱪᱮᱱ ᱛᱮ ᱪᱟᱥ ᱵᱟᱹᱫᱽ, ᱦᱟᱴ ᱟᱨ ᱦᱚᱲ ᱠᱚ ᱡᱚᱲᱟᱣ।",
    finalSupporting: "ᱢᱤᱫ ᱥᱟᱶ ᱡᱚᱲᱟᱣ ᱪᱟᱥ ᱡᱟᱛᱨᱟ ᱨᱮ ᱥᱮᱞᱮᱫᱚᱜ ᱢᱮ।",
  },
  sd: {
    signIn: "سائن ان ٿيو",
    signUp: "سائن اپ ٿيو",
    tagline: "هر ميل اهم آهي، هر هاري اهم آهي.",
    selectLang: "ٻولي مٽايو",
    scrollStory: "زرعي سفر ڏسڻ لاءِ ھيٺ اسڪرول ڪريو ↓",
    supportingHero: "سمارٽ سپلائي چين ذريعي ٻنين، منڊين ۽ ماڻهن کي ڳنڍڻ.",
    finalSupporting: "هڪ ڳنڍيل زرعي سفر جو حصو بڻجو.",
  },
  doi: {
    signIn: "साइन इन करो",
    signUp: "साइन अप करो",
    tagline: "हर मील जरूरी ऐ, हर किसान जरूरी ऐ।",
    selectLang: "बोली बदलो",
    scrollStory: "खेती यात्रा दिक्खने लेई हेठ स्क्रोल करो ↓",
    supportingHero: "स्मार्ट आपूर्ति श्रृंखलाएं राएं खेतें, मंडियें ते लोकें गी जोड़ना।",
    finalSupporting: "इक जुड़ी दी खेती यात्रा दा हिस्सा बनो।",
  },
  brx: {
    signIn: "साइन इन खालाम",
    signUp: "साइन आप खालाम",
    tagline: "गासै माइल गोनांथार, गासै आबादारी गोनांथार।",
    selectLang: "राव सोलाय",
    scrollStory: "आबाद दावबायनाय नायनो थाखाय गाहायाव स्क्रल खालाम ↓",
    supportingHero: "मोजां खाबुजों आबाद फोथार, हाथाय आरो मानसिफोरखौ फोनांजाबनाय।",
    finalSupporting: "फोनांजाबनाय आबाद दावबायनायनि बाहागो जा।",
  },
  ne: {
    signIn: "साइन इन गर्नुहोस्",
    signUp: "साइन अप गर्नुहोस्",
    tagline: "प्रत्येक माइल महत्त्वपूर्ण छ, प्रत्येक किसान महत्त्वपूर्ण छ।",
    selectLang: "भाषा बदल्नुहोस्",
    scrollStory: "कृषि यात्रा अन्वेषण गर्न तल स्क्रोल गर्नुहोस् ↓",
    supportingHero: "स्मार्ट आपूर्ति श्रृंखलाहरू मार्फत खेतहरू, बजारहरू र मानिसहरूलाई जोड्दै।",
    finalSupporting: "एक जोडिएको कृषि यात्राको हिस्सा बन्नुहोस्।",
  },
  mni: {
    signIn: "ꯁꯥꯏꯟ ꯏꯟ ꯇꯧꯕꯤꯌꯨ",
    signUp: "ꯁꯥꯏꯟ ꯑꯞ ꯇꯧꯕꯤꯌꯨ",
    tagline: "ꯃꯥꯏꯜ ꯈꯨꯗꯤꯡꯃꯛ ꯃꯔꯨꯑꯣꯏ, ꯂꯧꯃꯤ ꯈꯨꯗꯤꯡꯃꯛ ꯃꯔꯨꯑꯣꯏ।",
    selectLang: "ꯂꯣꯟ ꯍꯣꯡꯗꯣꯛꯄꯤꯌꯨ",
    scrollStory: "ꯈꯣꯡꯆꯠ ꯑꯁꯤ ꯎꯅꯕ ꯃꯈꯥꯗ ꯁ꯭ꯛꯔꯣꯜ ꯇꯧꯕꯤꯌꯨ ↓",
    supportingHero: "ꯁ꯭ꯃꯥꯔꯠ ꯁꯞꯂꯥꯏ ꯆꯦꯟꯁꯤꯡꯒꯤ ꯈꯨꯠꯊꯥꯡꯗ ꯂꯧꯕꯨꯛ, ꯀꯩꯊꯦꯜ ꯑꯃꯁꯨꯡ ꯃꯤꯌꯥꯝꯕꯨ ꯁꯝꯅꯍꯟꯕꯥ।",
    finalSupporting: "ꯑꯍꯦꯟꯕ ꯁꯝꯅꯔꯕ ꯂꯧ-উশিং ꯈꯣꯡꯆꯠ ꯑꯃꯒꯤ ꯁꯔꯨꯛ ꯑꯣꯏꯕꯤꯌꯨ।",
  },
};

export default function HomePage() {
  const { currentLanguage } = useLanguage();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  // Scroll Progress within the Seed-to-Growth Experience (Section 1 & 2)
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [seedProgress, setSeedProgress] = useState(0);

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

  const openLanguageModal = useCallback(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("open-language-modal"));
    }
  }, []);

  const labels = useMemo(() => {
    return AUTH_LABELS[currentLanguage.code] || AUTH_LABELS.en;
  }, [currentLanguage.code]);

  const isNonEnglish = currentLanguage.code !== "en";

  // Throttled Scroll Progress Listener for Sections 1 & 2
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (trackRef.current) {
            const rect = trackRef.current.getBoundingClientRect();
            const totalScrollable = rect.height - window.innerHeight;
            if (totalScrollable > 0) {
              const currentOffset = -rect.top;
              const p = Math.min(1, Math.max(0, currentOffset / totalScrollable));
              setSeedProgress(p);
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

  // Narrative fade calculations for Section 1 and Section 2
  // Stage 1 (Hero Title): Visible p in [0, 0.32], fades out as seed descends
  const heroOpacity = Math.max(0, Math.min(1, 1 - seedProgress / 0.28));
  
  // Stage 2 (The Foundation & Challenges): Fades in as roots develop p in [0.32, 0.72]
  const foundationOpacity =
    seedProgress < 0.28
      ? 0
      : seedProgress > 0.75
      ? Math.max(0, 1 - (seedProgress - 0.75) / 0.15)
      : Math.min(1, (seedProgress - 0.28) / 0.18);

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#050e07] text-stone-100 font-sans selection:bg-emerald-500 selection:text-white">

      {/* ──────────────────────────────────────────────────────────
          STICKY TOP NAVIGATION BAR
      ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-[#061208]/85 border-b border-emerald-500/15 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-18 flex items-center justify-between gap-4">
          
          {/* Brand Mark & Emblem */}
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br from-[#183a22] to-[#0c1f13] border border-emerald-400/35 flex items-center justify-center text-emerald-400 shadow-sm group-hover:border-emerald-300 transition">
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
                Connected Agriculture
              </span>
            </div>
          </Link>

          {/* Center: Live Agritech Network Status */}
          <div className="hidden md:inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#0d2215]/80 border border-emerald-500/20 text-[11px] font-medium text-emerald-200/90 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>National Agricultural Exchange Active</span>
          </div>

          {/* Right: Language Selector & Floating Sign In Trigger */}
          <div className="flex items-center gap-2.5 sm:gap-3">
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

            {/* Unobtrusive Floating Sign In for quick access anywhere on the page */}
            <Link
              href="/login"
              className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm border border-emerald-400/30 transition shadow-sm active:scale-[0.98]"
            >
              {labels.signIn}
            </Link>
          </div>
        </div>
      </header>


      {/* ──────────────────────────────────────────────────────────
          SECTIONS 1 & 2: CINEMATIC SEED-TO-ROOT SCROLL STORY
          (Dark Cinematic Scenes with Continuous Scroll Canvas)
      ────────────────────────────────────────────────────────── */}
      <div ref={trackRef} className="relative min-h-[250vh] w-full">
        
        {/* Sticky Canvas Viewport (60fps botanical biological sequence) */}
        <div className="sticky top-0 h-screen w-full z-0 overflow-hidden">
          <SeedGrowthCanvas progress={seedProgress} />
        </div>

        {/* Narrative Overlays mapped to Scroll Progress */}
        <div className="relative z-10 w-full pointer-events-none -mt-[100vh]">
          
          {/* SECTION 1: CINEMATIC OPENING (p in [0.0, 0.35]) */}
          <div
            className="min-h-screen flex flex-col justify-between items-center text-center px-4 sm:px-6 pt-12 sm:pt-20 pb-12 transition-opacity duration-300"
            style={{ opacity: heroOpacity }}
          >
            {/* Top Micro-Badge */}
            <div className="pointer-events-auto">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0d2616]/90 border border-emerald-400/30 backdrop-blur-md text-[11px] font-bold text-emerald-300 tracking-wider uppercase shadow-md">
                <span>🌱</span>
                <span>Every MILE Matters · Every FARMER Matters</span>
              </div>
            </div>

            {/* Main Brand Title & Tagline */}
            <div className="max-w-4xl mx-auto space-y-4 my-auto pt-4 sm:pt-10">
              <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight text-white font-sans drop-shadow-md">
                X-MILE
              </h1>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-amber-200 to-emerald-300 tracking-tight text-balance">
                {labels.tagline}
              </p>
              <p className="text-sm sm:text-base text-emerald-100/85 font-medium max-w-xl mx-auto text-balance pt-1 leading-relaxed">
                {labels.supportingHero}
              </p>
            </div>

            {/* Scroll Indicator */}
            <div className="pointer-events-auto pt-4">
              <div className="inline-flex flex-col items-center gap-2 text-xs font-semibold text-emerald-300/80">
                <span>{labels.scrollStory}</span>
                <div className="h-8 w-5 rounded-full border border-emerald-400/40 flex items-start justify-center p-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce" />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: THE FOUNDATION & THE CHALLENGE (p in [0.35, 0.75]) */}
          <div
            className="min-h-screen flex flex-col justify-center items-center px-4 sm:px-6 py-16 transition-opacity duration-300"
            style={{ opacity: foundationOpacity }}
          >
            <div className="max-w-4xl mx-auto space-y-8 pointer-events-auto">
              
              <div className="text-center space-y-3">
                <span className="text-xs font-mono font-bold tracking-widest text-amber-400 uppercase">
                  Section 02 · The Foundation
                </span>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
                  Every Journey Begins in the Soil
                </h2>
                <p className="text-sm sm:text-base text-emerald-100/80 max-w-2xl mx-auto text-balance leading-relaxed">
                  Behind every harvest is a grower working the earth. X-MILE is built to resolve the fundamental systemic friction points that hold agricultural commerce back.
                </p>
              </div>

              {/* 4 True Systemic Challenges Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-2">
                
                <div className="p-6 rounded-2xl bg-[#09180e]/90 border border-emerald-500/25 backdrop-blur-md shadow-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xl">🌾</span>
                    <h3 className="text-base font-bold text-white">Fragmented Supply Chains</h3>
                  </div>
                  <p className="text-xs sm:text-sm text-emerald-100/70 leading-relaxed">
                    Smallholder growers face multi-tier intermediary layers, disconnected local mandis, and lack of direct commercial market discovery.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-[#09180e]/90 border border-emerald-500/25 backdrop-blur-md shadow-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xl">🏢</span>
                    <h3 className="text-base font-bold text-white">Buyer Sourcing Uncertainty</h3>
                  </div>
                  <p className="text-xs sm:text-sm text-emerald-100/70 leading-relaxed">
                    Commercial buyers struggle with erratic harvest supply volumes, unpredictable delivery timelines, and fragmented farm contacts.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-[#09180e]/90 border border-emerald-500/25 backdrop-blur-md shadow-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xl">🔬</span>
                    <h3 className="text-base font-bold text-white">Quality Transparency Gaps</h3>
                  </div>
                  <p className="text-xs sm:text-sm text-emerald-100/70 leading-relaxed">
                    Produce quality is rarely verified prior to loading, causing frequent weighbridge disputes and transit rejections at final mandis.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-[#09180e]/90 border border-emerald-500/25 backdrop-blur-md shadow-xl">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xl">🚚</span>
                    <h3 className="text-base font-bold text-white">Uncoordinated Rural Logistics</h3>
                  </div>
                  <p className="text-xs sm:text-sm text-emerald-100/70 leading-relaxed">
                    Rural freight transporters operate without scheduled dispatch queues or synchronized pickup points, leading to idle vehicle runs.
                  </p>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>


      {/* ──────────────────────────────────────────────────────────
          SECTION 3 — INTRODUCING X-MILE: EMERGENCE INTO LIGHT
          (Bright Natural Atmosphere: Warm Cream & Fresh Greens)
      ────────────────────────────────────────────────────────── */}
      <section className="relative py-24 sm:py-32 px-4 sm:px-6 bg-[#faf8f2] text-stone-900 border-t border-emerald-900/10 transition-colors duration-700">
        <div className="max-w-6xl mx-auto space-y-16">
          
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <span className="px-3.5 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300/60 inline-block">
              Section 03 · Introducing X-MILE
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-stone-900 tracking-tight">
              One Connected Platform for Agriculture
            </h2>
            <p className="text-base sm:text-lg text-stone-600 leading-relaxed">
              From the sprout in the soil to regional distribution hubs, X-MILE unifies the three essential participant groups into a synchronized, transparent digital ecosystem.
            </p>
          </div>

          {/* Three Main Participant Groups (Large Editorial Visual Scenes) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Participant 1: Farmers */}
            <div className="rounded-3xl bg-white border border-stone-200/80 p-8 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="h-14 w-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-3xl">
                  🌾
                </div>
                <div>
                  <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-700 block">
                    Group 01
                  </span>
                  <h3 className="text-2xl font-black text-stone-900 mt-1">
                    The Farmers
                  </h3>
                </div>
                <p className="text-sm text-stone-600 leading-relaxed">
                  Manage registered farm plots and acreage, log harvest lots, run AI visual quality triage, publish produce listings with asking rates per kg, and track verified settlement earnings.
                </p>
              </div>
              <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-xs font-semibold text-emerald-800">
                <span>Dedicated Portal: /farmer</span>
                <span>→</span>
              </div>
            </div>

            {/* Participant 2: Buyers */}
            <div className="rounded-3xl bg-white border border-stone-200/80 p-8 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="h-14 w-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-3xl">
                  🏢
                </div>
                <div>
                  <span className="text-xs font-mono font-bold uppercase tracking-widest text-amber-700 block">
                    Group 02
                  </span>
                  <h3 className="text-2xl font-black text-stone-900 mt-1">
                    The Commercial Buyers
                  </h3>
                </div>
                <p className="text-sm text-stone-600 leading-relaxed">
                  Discover verified produce availability across agricultural districts, submit binding rate offers per kg with escrow terms, manage accepted orders, and track incoming deliveries.
                </p>
              </div>
              <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-xs font-semibold text-amber-800">
                <span>Dedicated Portal: /buyer</span>
                <span>→</span>
              </div>
            </div>

            {/* Participant 3: Transporters */}
            <div className="rounded-3xl bg-white border border-stone-200/80 p-8 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="h-14 w-14 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-3xl">
                  🚚
                </div>
                <div>
                  <span className="text-xs font-mono font-bold uppercase tracking-widest text-teal-700 block">
                    Group 03
                  </span>
                  <h3 className="text-2xl font-black text-stone-900 mt-1">
                    The Transport Providers
                  </h3>
                </div>
                <p className="text-sm text-stone-600 leading-relaxed">
                  Discover assigned transport jobs, coordinate farm pickup locations, update milestone dispatch statuses, and verify destination delivery weighbridge receipts.
                </p>
              </div>
              <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-xs font-semibold text-teal-800">
                <span>Dedicated Portal: /logistics</span>
                <span>→</span>
              </div>
            </div>

          </div>

        </div>
      </section>


      {/* ──────────────────────────────────────────────────────────
          SECTION 4 — WHAT X-MILE BRINGS TOGETHER
          (6 Actual Operational Capabilities with Authentic Photography)
      ────────────────────────────────────────────────────────── */}
      <section className="relative py-24 sm:py-32 px-4 sm:px-6 bg-[#f4f0e6] text-stone-900 border-t border-stone-300/40">
        <div className="max-w-6xl mx-auto space-y-16">
          
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <span className="px-3.5 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-stone-200/80 text-stone-800 border border-stone-300 inline-block">
              Section 04 · Platform Capabilities
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-stone-900 tracking-tight">
              What X-MILE Brings Together
            </h2>
            <p className="text-base sm:text-lg text-stone-600 leading-relaxed">
              Six core operational capabilities engineered to make agricultural commerce transparent, reliable, and fair.
            </p>
          </div>

          {/* Capability 1: Agricultural Marketplace */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-white rounded-3xl p-8 sm:p-10 border border-stone-200 shadow-sm">
            <div className="space-y-4">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md">
                01 · Produce Marketplace
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-stone-900">
                Direct Agricultural Procurement
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                Connect farmers and commercial buyers through transparent produce listings. Listings specify crop variety, grade, available quantity in kilograms, harvest date, pickup location, and asking price per kg.
              </p>
              <ul className="text-xs text-stone-700 space-y-2 pt-2">
                <li>✓ District and variety-based discovery</li>
                <li>✓ Verified lot status directly linked to farmer inventory</li>
                <li>✓ Structured negotiation without speculative bidding</li>
              </ul>
            </div>
            <div className="relative h-64 sm:h-80 rounded-2xl overflow-hidden border border-stone-200 shadow-inner">
              <Image
                src="/images/harvest-crops.jpg"
                alt="Fresh agricultural produce harvested in crates"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-center"
              />
            </div>
          </div>

          {/* Capability 2: AI Crop Quality Assessment */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-white rounded-3xl p-8 sm:p-10 border border-stone-200 shadow-sm">
            <div className="order-2 lg:order-1 relative h-64 sm:h-80 rounded-2xl overflow-hidden border border-stone-200 shadow-inner">
              <Image
                src="/images/quality-check.jpg"
                alt="Produce quality examination"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-center"
              />
            </div>
            <div className="order-1 lg:order-2 space-y-4">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md">
                02 · AI Vision Triage
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-stone-900">
                AI-Assisted Crop Quality Assessment
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                Farmers take or upload clear crop photos to generate instant visual quality analysis estimating Grade A, B, or C based on surface color, shape uniformity, and visible defects.
              </p>
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
                ℹ️ <strong>Quality Notice:</strong> Visual AI grading evaluates external characteristics only. It is an indicative triage tool and does not replace certified laboratory chemical assay or food safety testing.
              </div>
            </div>
          </div>

          {/* Capability 3: Farm & Inventory Management */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-white rounded-3xl p-8 sm:p-10 border border-stone-200 shadow-sm">
            <div className="space-y-4">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md">
                03 · Farm Management
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-stone-900">
                Registered Acreage & Inventory Control
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                Growers manage registered land acreage, plot survey codes, soil types, and harvest cycles. Inventory lots track live stock automatically: distinguishing available produce from quantities reserved under pending purchase orders.
              </p>
            </div>
            <div className="relative h-64 sm:h-80 rounded-2xl overflow-hidden border border-stone-200 shadow-inner">
              <Image
                src="/images/agri-tech.jpg"
                alt="Cultivation acreage and soil preparation"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-center"
              />
            </div>
          </div>

          {/* Capability 4: Buyer Offers & Orders */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-white rounded-3xl p-8 sm:p-10 border border-stone-200 shadow-sm">
            <div className="order-2 lg:order-1 p-6 rounded-2xl bg-stone-50 border border-stone-200 space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-stone-200">
                <span className="text-emerald-800 font-bold">Purchase Contract #PO-9412</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[10px] font-bold">ESCROW TERMS</span>
              </div>
              <div className="space-y-1 text-stone-700 text-[11px]">
                <p>Produce: Organic Robusta Banana</p>
                <p>Contract Rate: ₹30 / kg · Volume: 800 kg</p>
                <p>Total Value: ₹24,000</p>
                <p>Destination: APMC Yeshwanthpur</p>
              </div>
              <div className="pt-2 flex justify-between items-center text-[10px] text-emerald-700 font-bold">
                <span>✓ Atomic Stock Reserved</span>
                <span className="text-stone-900">ACCEPTED BY FARMER</span>
              </div>
            </div>
            <div className="order-1 lg:order-2 space-y-4">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md">
                04 · Orders & Offers
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-stone-900">
                Negotiated Offers & Confirmed Orders
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                Commercial buyers place rate offers on farmer listings. Farmers can accept, negotiate, or decline. When accepted, the system atomically reserves inventory, generates binding orders, and assigns logistics without race conditions.
              </p>
            </div>
          </div>

          {/* Capability 5: Transport & Delivery Coordination */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-white rounded-3xl p-8 sm:p-10 border border-stone-200 shadow-sm">
            <div className="space-y-4">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md">
                05 · Transport Coordination
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-stone-900">
                Transport Assignment & Transit Visibility
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                Orders are linked to transport providers who manage pickup origins and destination deliveries. Shipments advance through verified milestones: Accepted → Dispatched → Delivered, concluding with weighbridge quantity confirmation.
              </p>
            </div>
            <div className="relative h-64 sm:h-80 rounded-2xl overflow-hidden border border-stone-200 shadow-inner">
              <Image
                src="/images/rural-transport.jpg"
                alt="Agricultural logistics transport on rural route"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-center"
              />
            </div>
          </div>

          {/* Capability 6: Earnings & Settlement Ledger */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-white rounded-3xl p-8 sm:p-10 border border-stone-200 shadow-sm">
            <div className="order-2 lg:order-1 p-6 rounded-2xl bg-stone-50 border border-stone-200 space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-stone-200">
                <span className="text-stone-900 font-bold">Settlement Transparency</span>
                <span className="text-[10px] text-stone-500">Ledger Verified</span>
              </div>
              <div className="space-y-2 text-[11px] text-stone-700">
                <div className="flex justify-between">
                  <span>Fulfilled Produce Value:</span>
                  <span className="font-bold text-stone-900">₹35,000 (900 kg)</span>
                </div>
                <div className="flex justify-between">
                  <span>Disbursed to Bank:</span>
                  <span className="font-bold text-emerald-700">₹20,000 (Confirmed)</span>
                </div>
                <div className="flex justify-between">
                  <span>Held in Escrow:</span>
                  <span className="font-bold text-blue-700">₹25,000 (Protected)</span>
                </div>
                <div className="pt-2 text-[10px] text-amber-800">
                  ⚡ 1 Order: Delivered · Awaiting settlement confirmation
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2 space-y-4">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md">
                06 · Financial Accuracy
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-stone-900">
                Earnings & Settlement Visibility
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                Order values and completed deliveries are tracked with strict financial honesty. Physical delivery completion is never claimed as &ldquo;Disbursed to Bank&rdquo; unless a verified settlement record confirms payout.
              </p>
            </div>
          </div>

        </div>
      </section>


      {/* ──────────────────────────────────────────────────────────
          SECTION 5 — THE CONNECTED JOURNEY (SUPPLY-CHAIN FLOW)
      ────────────────────────────────────────────────────────── */}
      <section className="relative py-24 sm:py-32 px-4 sm:px-6 bg-[#faf8f2] text-stone-900 border-t border-stone-300/40">
        <div className="max-w-6xl mx-auto space-y-16">
          
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <span className="px-3.5 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300/60 inline-block">
              Section 05 · The Connected Journey
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-stone-900 tracking-tight">
              One Synchronized Supply Chain
            </h2>
            <p className="text-base sm:text-lg text-stone-600 leading-relaxed">
              Experience the end-to-end journey of agricultural produce flowing through X-MILE.
            </p>
          </div>

          {/* Connected Route Journey Path */}
          <div className="relative">
            {/* Desktop Connecting Line */}
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 via-amber-500 to-emerald-600 -translate-y-1/2 z-0" />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 relative z-10">
              
              {/* Step 1: Farmer */}
              <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition">
                <div className="space-y-2">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold text-sm font-mono">
                    01
                  </div>
                  <h4 className="text-base font-black text-stone-900">Farmer Harvest</h4>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Crop is harvested, logged in digital inventory, and triaged with AI visual assessment.
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-800">STAGE: FARM GATE</span>
              </div>

              {/* Step 2: Marketplace */}
              <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition">
                <div className="space-y-2">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold text-sm font-mono">
                    02
                  </div>
                  <h4 className="text-base font-black text-stone-900">Marketplace</h4>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Produce lot is published with verified grade, available quantity, and asking price per kg.
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-800">STAGE: LISTED</span>
              </div>

              {/* Step 3: Buyer */}
              <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition">
                <div className="space-y-2">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold text-sm font-mono">
                    03
                  </div>
                  <h4 className="text-base font-black text-stone-900">Buyer Offer</h4>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Commercial buyer submits purchase offer. Acceptance generates order and reserves stock.
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-800">STAGE: ACCEPTED</span>
              </div>

              {/* Step 4: Transporter */}
              <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition">
                <div className="space-y-2">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold text-sm font-mono">
                    04
                  </div>
                  <h4 className="text-base font-black text-stone-900">Transportation</h4>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Rural transporter coordinates farm pickup, dispatch route, and destination transit.
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-800">STAGE: IN TRANSIT</span>
              </div>

              {/* Step 5: Delivery */}
              <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition">
                <div className="space-y-2">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold text-sm font-mono">
                    05
                  </div>
                  <h4 className="text-base font-black text-stone-900">Mandi Delivery</h4>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Weighbridge verification confirms net delivered weight, completing order fulfillment.
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-800">STAGE: DELIVERED</span>
              </div>

            </div>
          </div>

        </div>
      </section>


      {/* ──────────────────────────────────────────────────────────
          SECTION 6 — FINAL INVITATION & AUTHENTICATION DESTINATION
          (Dark Cinematic Closing Scene with Golden Twilight)
      ────────────────────────────────────────────────────────── */}
      <section className="relative py-28 sm:py-36 px-4 sm:px-6 bg-[#040c06] text-white border-t border-emerald-500/20 overflow-hidden flex flex-col items-center justify-center text-center">
        
        {/* Cinematic Backdrop Image */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <Image
            src="/images/hero-farm.jpg"
            alt="Verdant agricultural fields at dawn"
            fill
            sizes="100vw"
            className="object-cover object-center filter brightness-[0.22] contrast-[1.15] scale-[1.02]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#040c06]/92 via-[#08170d]/88 to-[#040c06]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_35%,rgba(16,185,129,0.18),transparent_70%)]" />
        </div>

        {/* Central Architectural Authentication Hub */}
        <div className="relative z-10 w-full max-w-lg mx-auto p-8 sm:p-12 rounded-[36px] bg-[#0c2214]/90 backdrop-blur-2xl border border-emerald-500/30 shadow-[0_30px_80px_-15px_rgba(0,0,0,0.85)] ring-1 ring-white/10 space-y-8">
          
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
              {labels.tagline}
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-emerald-300 tracking-wide text-balance">
              {labels.finalSupporting}
            </p>
          </div>

          {/* Primary Authentication Action Buttons */}
          <div className="space-y-3.5 pt-2">
            
            {/* Sign In Button */}
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

            {/* Sign Up Button */}
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

          {/* Language Switcher Trigger Button */}
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
      <footer className="relative z-10 w-full bg-[#030904] border-t border-emerald-500/15 py-8 px-4 sm:px-6">
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
