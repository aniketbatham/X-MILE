"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

type ChatbotProps = {
  isOpen?: boolean;
  onClose?: () => void;
  showStandaloneToggle?: boolean;
};

export default function Chatbot({
  isOpen: controlledIsOpen,
  onClose,
  showStandaloneToggle = true,
}: ChatbotProps = {}) {
  const { locale, currentLanguage, t } = useLanguage();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = typeof controlledIsOpen === "boolean" ? controlledIsOpen : internalIsOpen;

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  const handleToggle = () => {
    if (typeof controlledIsOpen === "boolean" && onClose) {
      if (isOpen) {
        onClose();
      }
    } else {
      setInternalIsOpen((prev) => !prev);
    }
  };
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-msg",
      role: "assistant",
      content: t("chatbot.welcomeMessage"),
      timestamp: "",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Module 17: Voice Assistant capabilities (Speech-to-Text & Text-to-Speech)
  const [isListening, setIsListening] = useState(false);
  const [isSpeakingId, setIsSpeakingId] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Map app locale to BCP-47 locale code for Web Speech recognition & synthesis
  const getSpeechLocale = (appLocale: string): string => {
    const map: Record<string, string> = {
      en: "en-IN",
      hi: "hi-IN",
      kn: "kn-IN",
      ta: "ta-IN",
      te: "te-IN",
      mr: "mr-IN",
      bn: "bn-IN",
      gu: "gu-IN",
      pa: "pa-IN",
      ml: "ml-IN",
      ur: "ur-IN",
      or: "or-IN",
      as: "as-IN",
    };
    return map[appLocale] || "en-IN";
  };

  // Speak assistant message aloud
  const handleSpeak = (messageId: string, text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setErrorMessage("Text-to-speech is not supported by your browser.");
      return;
    }

    if (isSpeakingId === messageId) {
      window.speechSynthesis.cancel();
      setIsSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#`]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = getSpeechLocale(locale);
    utterance.rate = 0.95;

    utterance.onend = () => setIsSpeakingId(null);
    utterance.onerror = () => setIsSpeakingId(null);

    setIsSpeakingId(messageId);
    window.speechSynthesis.speak(utterance);
  };

  // Toggle voice recognition for input
  const handleToggleVoiceInput = () => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage("Voice recognition is not supported in this browser. Please type your query.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = getSpeechLocale(locale);
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMessage(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error !== "no-speech") {
          setErrorMessage(`Microphone error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setIsListening(false);
      setErrorMessage("Could not initialize microphone.");
    }
  };

  // When locale changes, update welcome message if only 1 message exists
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].role === "assistant") {
        return [
          {
            ...prev[0],
            content: t("chatbot.welcomeMessage"),
          },
        ];
      }
      return prev;
    });
  }, [locale, t]);

  // Restore conversation and open state from sessionStorage on mount
  useEffect(() => {
    try {
      const savedMessages = sessionStorage.getItem("xmile_chat_messages");
      if (savedMessages) {
        const parsed = JSON.parse(savedMessages);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }

      const savedOpenState = sessionStorage.getItem("xmile_chat_open");
      if (savedOpenState === "true") {
        setInternalIsOpen(true);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Save conversation whenever it changes
  useEffect(() => {
    try {
      sessionStorage.setItem("xmile_chat_messages", JSON.stringify(messages));
    } catch {
      // Ignore storage errors
    }
  }, [messages]);

  // Save open/close state
  useEffect(() => {
    try {
      sessionStorage.setItem("xmile_chat_open", isOpen ? "true" : "false");
    } catch {
      // Ignore storage errors
    }
  }, [isOpen]);

  // Scroll to bottom when messages update or panel opens
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, isOpen]);

  // Adjust textarea height dynamically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  }, [input]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    setErrorMessage(null);
    setInput("");

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      // Prepare payload: map to role & content, exclude welcome system note if needed
      const payloadMessages = updatedMessages
        .filter((m) => m.id !== "welcome-msg")
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      // If user started directly, ensure at least this user message is passed
      if (payloadMessages.length === 0) {
        payloadMessages.push({ role: "user", content: text });
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: payloadMessages,
          locale,
          languageName: currentLanguage.name,
          nativeLanguageName: currentLanguage.nativeName,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error || `Failed to receive answer (Status: ${response.status})`
        );
      }

      if (!data?.message) {
        throw new Error("Received an empty answer from the assistant.");
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.message,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : t("common.error");
      setErrorMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearConversation = () => {
    if (confirm(t("chatbot.confirmClear"))) {
      const resetMessages = [
        {
          id: `welcome-${Date.now()}`,
          role: "assistant" as const,
          content: t("chatbot.welcomeMessage"),
          timestamp: "",
        },
      ];
      setMessages(resetMessages);
      setErrorMessage(null);
      try {
        sessionStorage.removeItem("xmile_chat_messages");
      } catch {
        // Ignore
      }
    }
  };

  // Helper to render text with markdown bold, lists, and linebreaks
  const renderFormattedContent = (content: string) => {
    const lines = content.split("\n");

    return lines.map((line, idx) => {
      // Render bullet list
      const isBullet = line.trim().startsWith("- ") || line.trim().startsWith("* ");
      const cleanedLine = isBullet ? line.trim().substring(2) : line;

      // Handle bold **text**
      const parts = cleanedLine.split(/(\*\*[^*]+\*\*)/g);

      const renderedParts = parts.map((part, pIdx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={pIdx} className="font-semibold text-emerald-950">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      if (isBullet) {
        return (
          <li key={idx} className="ml-4 list-disc text-sm leading-6">
            {renderedParts}
          </li>
        );
      }

      if (!line.trim()) {
        return <div key={idx} className="h-2" />;
      }

      return (
        <p key={idx} className="text-sm leading-relaxed">
          {renderedParts}
        </p>
      );
    });
  };

  return (
    <>
      {/* Floating Toggle Button (Used only in standalone mode) */}
      {showStandaloneToggle && (
        <div className="fixed bottom-5 right-5 z-50">
          <button
            onClick={handleToggle}
            aria-label={isOpen ? t("chatbot.closeChat") : t("common.chatWithAi")}
            className="group relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[#173b2a] text-white shadow-xl transition-all duration-300 hover:scale-105 hover:bg-[#1f6b3b] hover:shadow-2xl active:scale-95 focus:outline-none focus:ring-4 focus:ring-emerald-400/40"
          >
            {isOpen ? (
              <svg
                className="h-6 w-6 transition-transform duration-200 group-hover:rotate-90"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <div className="relative flex items-center justify-center">
                <span className="text-2xl">🌱</span>
                {/* Online pulse indicator */}
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
                </span>
              </div>
            )}
          </button>
        </div>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <div
          role="dialog"
          aria-labelledby="chatbot-title"
          className="fixed bottom-22 right-4 z-50 flex h-[580px] max-h-[calc(100vh-6.5rem)] w-[92vw] max-w-[410px] flex-col overflow-hidden rounded-3xl border border-[#dce8df] bg-white shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 sm:right-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#e1ece3] bg-[#173b2a] px-4 py-3.5 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-lg shadow-sm">
                🌱
              </div>
              <div>
                <div id="chatbot-title" className="text-sm font-black tracking-tight">
                  {t("chatbot.assistantName")}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-200/90">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{t("chatbot.tagline")}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearConversation}
                title={t("chatbot.clearChat")}
                className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                aria-label={t("chatbot.clearChat")}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>

              <button
                onClick={handleClose}
                title={t("chatbot.closeChat")}
                className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                aria-label={t("chatbot.closeChat")}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Quick Platform Navigation Links */}
          <div className="flex items-center gap-2 overflow-x-auto border-b border-[#eef4ef] bg-[#f8fbf8] px-3 py-1.5 text-[11px] font-semibold text-[#3b6647] scrollbar-none">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 shrink-0">
              {t("common.details")}:
            </span>
            <Link
              href="/farmer"
              onClick={() => {}}
              className="rounded-md bg-white px-2 py-0.5 border border-[#dce8df] hover:bg-[#edf6ee] transition-colors shrink-0"
            >
              {t("chatbot.quickFarmer")}
            </Link>
            <Link
              href="/buyer"
              onClick={() => {}}
              className="rounded-md bg-white px-2 py-0.5 border border-[#dce8df] hover:bg-[#edf6ee] transition-colors shrink-0"
            >
              {t("chatbot.quickBuyer")}
            </Link>
            <Link
              href="/quality"
              onClick={() => {}}
              className="rounded-md bg-white px-2 py-0.5 border border-[#dce8df] hover:bg-[#edf6ee] transition-colors shrink-0"
            >
              {t("chatbot.quickQuality")}
            </Link>
            <Link
              href="/forecast"
              onClick={() => {}}
              className="rounded-md bg-white px-2 py-0.5 border border-[#dce8df] hover:bg-[#edf6ee] transition-colors shrink-0"
            >
              {t("chatbot.quickForecast")}
            </Link>
          </div>

          {/* Message List */}
          <div className="flex-1 space-y-3.5 overflow-y-auto p-4 bg-[#fbfdfb]">
            {messages.map((message) => {
              const isUser = message.role === "user";
              return (
                <div
                  key={message.id}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-xs ${
                      isUser
                        ? "bg-[#1f6b3b] text-white rounded-tr-xs"
                        : "bg-[#edf6ed] border border-[#d8e6db] text-[#142e20] rounded-tl-xs"
                    }`}
                  >
                    {isUser ? (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {renderFormattedContent(message.content)}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1 px-1">
                    {message.timestamp && (
                      <span className="text-[10px] text-gray-400">
                        {message.timestamp}
                      </span>
                    )}

                    {!isUser && (
                      <button
                        type="button"
                        onClick={() => handleSpeak(message.id, message.content)}
                        title={
                          isSpeakingId === message.id
                            ? "Stop reading"
                            : "Read aloud (Voice Assistant)"
                        }
                        className={`text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded transition ${
                          isSpeakingId === message.id
                            ? "text-emerald-800 bg-emerald-100 font-bold animate-pulse"
                            : "text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                        }`}
                      >
                        {isSpeakingId === message.id ? "🔊 Speaking..." : "🔈 Read aloud"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Starter Questions (shown only when conversation is fresh) */}
            {messages.length <= 1 && !isLoading && (
              <div className="mt-4 pt-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                  {t("firstVisit.popularTitle")}:
                </p>
                <div className="flex flex-col gap-1.5">
                  {[
                    t("chatbot.starter1"),
                    t("chatbot.starter2"),
                    t("chatbot.starter3"),
                    t("chatbot.starter4"),
                  ].map((question, i) => (
                    <button
                      key={i}
                      onClick={() => handleSendMessage(question)}
                      className="text-left rounded-xl border border-[#dbe7dc] bg-white px-3 py-2 text-xs font-medium text-[#234c32] hover:border-[#a9c9af] hover:bg-[#f1f8f2] transition-colors shadow-2xs"
                    >
                      💡 {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-start gap-2">
                <div className="flex items-center gap-1.5 rounded-2xl border border-[#d8e6db] bg-[#edf6ed] px-4 py-3 rounded-tl-xs text-xs text-[#2a5538]">
                  <span className="font-semibold text-xs">{t("chatbot.thinking")}</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#3c9656] animate-bounce" />
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-[#3c9656] animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-[#3c9656] animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                <div className="flex items-start justify-between gap-2">
                  <span>⚠️ {errorMessage}</span>
                  <button
                    onClick={() => setErrorMessage(null)}
                    className="text-red-600 hover:text-red-800 font-bold"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="border-t border-[#e5ede7] bg-white p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-end gap-2"
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder={t("chatbot.placeholder")}
                disabled={isLoading}
                className="max-h-28 flex-1 resize-none rounded-xl border border-[#dce8df] bg-[#fbfdfb] px-3.5 py-2.5 text-xs text-[#173b2a] placeholder:text-gray-400 focus:border-[#277443] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#cfe2d2] disabled:opacity-60"
              />

              <button
                type="button"
                onClick={handleToggleVoiceInput}
                disabled={isLoading}
                aria-label={isListening ? "Listening... click to stop" : "Voice input"}
                title={
                  isListening
                    ? "Listening... click to stop"
                    : "Speak your question (Voice Assistant)"
                }
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all ${
                  isListening
                    ? "bg-red-500 text-white animate-pulse ring-4 ring-red-200"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                }`}
              >
                {isListening ? (
                  <span className="text-xs">⏹️</span>
                ) : (
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
                )}
              </button>

              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                aria-label={t("chatbot.sendMessage")}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1f6b3b] text-white shadow-xs transition-colors hover:bg-[#18532e] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </form>

            <div className="mt-1.5 flex items-center justify-between text-[10px] text-gray-400 px-1">
              <span>{t("chatbot.inputHint")}</span>
              <span>OpenRouter AI</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
