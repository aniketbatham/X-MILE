/**
 * Client-side Speech Synthesis helper for multilingual accessibility.
 * Reads text aloud using browser Web Speech API in the user's selected language.
 * Fails safely and silently if Web Speech is unavailable or blocked.
 */

const LANG_CODE_MAP: Record<string, string> = {
  hi: "hi-IN",
  kn: "kn-IN",
  te: "te-IN",
  ta: "ta-IN",
  mr: "mr-IN",
  bn: "bn-IN",
  gu: "gu-IN",
  pa: "pa-IN",
  en: "en-IN",
  ur: "ur-IN",
  ml: "ml-IN",
  or: "or-IN",
  as: "as-IN",
  sa: "sa-IN",
  ne: "ne-NP",
  sd: "sd-IN",
  kok: "kok-IN",
  doi: "doi-IN",
  mni: "mni-IN",
  sat: "sat-IN",
  ks: "ks-IN",
  ma: "mai-IN",
};

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function stopSpeaking(): void {
  if (isSpeechSupported()) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore cancellation failures
    }
  }
}

export function speakText(
  text: string,
  langCode: string = "en",
  onEnd?: () => void
): boolean {
  if (!isSpeechSupported() || !text || !text.trim()) {
    return false;
  }

  try {
    window.speechSynthesis.cancel();

    const cleanText = text
      .replace(/[#*_~`]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const targetLang = LANG_CODE_MAP[langCode] || `${langCode}-IN`;
    utterance.lang = targetLang;
    utterance.rate = 0.92; // Slightly slower, measured cadence for clear understanding
    utterance.pitch = 1.0;

    if (onEnd) {
      utterance.onend = () => onEnd();
      utterance.onerror = () => onEnd();
    }

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.warn("Speech synthesis error:", err);
    if (onEnd) onEnd();
    return false;
  }
}
