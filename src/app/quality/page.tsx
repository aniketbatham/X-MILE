"use client";

import { useEffect, useState } from "react";

type QualityResult = {
  grade: string;
  score: number;
  confidence: number;
  observations: string[];
  visibleDefects: string[];
  suitability: string;
};

export default function QualityPage() {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<QualityResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scanProgress, setScanProgress] = useState(0);

  useEffect(() => {
    if (!loading) {
      setScanProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setScanProgress((current) => {
        if (current >= 94) return 94;
        return current + 2;
      });
    }, 90);

    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function analyzeImage() {
    if (!image) return;

    setLoading(true);
    setError("");
    setResult(null);
    setScanProgress(0);

    const formData = new FormData();
    formData.append("image", image);

    try {
      const response = await fetch("/api/quality", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      const text = data.result;
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error("AI returned an unexpected response.");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      setScanProgress(100);

      setTimeout(() => {
        setResult(parsed);
      }, 500);
    } catch (err) {
      console.error(err);
      setError("AI analysis failed. Please try another image.");
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 500);
    }
  }

  function handleImageChange(file: File | null) {
    setImage(file);
    setResult(null);
    setError("");

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    if (file) {
      setPreview(URL.createObjectURL(file));
    } else {
      setPreview(null);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7faf7] text-[#102218]">
      <style jsx global>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(22px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scan {
          0% {
            top: 4%;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          50% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            top: 94%;
            opacity: 0;
          }
        }

        @keyframes scanGlow {
          0%,
          100% {
            opacity: 0.15;
          }
          50% {
            opacity: 0.8;
          }
        }

        @keyframes pulsePoint {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.55;
          }
          50% {
            transform: scale(1.55);
            opacity: 1;
          }
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        @keyframes reveal {
          from {
            opacity: 0;
            transform: scale(0.94);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes fillBar {
          from {
            width: 0%;
          }
          to {
            width: var(--target-width);
          }
        }

        @keyframes blink {
          0%,
          45% {
            opacity: 1;
          }
          50%,
          100% {
            opacity: 0.3;
          }
        }

        .fade-up {
          animation: fadeUp 0.7s ease-out both;
        }

        .scan-line {
          animation: scan 3.4s ease-in-out infinite;
        }

        .scan-glow {
          animation: scanGlow 2s ease-in-out infinite;
        }

        .pulse-point {
          animation: pulsePoint 1.8s ease-in-out infinite;
        }

        .float {
          animation: float 4s ease-in-out infinite;
        }

        .reveal {
          animation: reveal 0.6s ease-out both;
        }

        .blink {
          animation: blink 1.5s ease-in-out infinite;
        }

        .card-hover {
          transition:
            transform 0.3s ease,
            box-shadow 0.3s ease,
            border-color 0.3s ease;
        }

        .card-hover:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 50px rgba(20, 60, 30, 0.08);
          border-color: #bfd7c3;
        }

        .button-hover {
          transition:
            transform 0.25s ease,
            box-shadow 0.25s ease;
        }

        .button-hover:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 25px rgba(31, 107, 59, 0.18);
        }
      `}</style>

      {/* NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-[#dfe9e1]/80 bg-[#f7faf7]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <a href="/" className="group flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1f6b3b] text-lg transition-transform duration-300 group-hover:rotate-6">
              🌱
            </div>

            <div>
              <div className="text-lg font-black tracking-tight">
                HARVEX
              </div>

              <div className="hidden text-[9px] font-semibold tracking-[0.18em] text-[#6a7c70] sm:block">
                FARMER-FIRST AGRI NETWORK
              </div>
            </div>
          </a>

          <div className="flex items-center gap-3">
            <a
              href="/"
              className="rounded-full px-4 py-2 text-sm font-semibold text-[#52655a] transition hover:bg-white hover:text-[#1f6b3b]"
            >
              ← Home
            </a>

            <div className="hidden rounded-full border border-[#dce7df] bg-white px-4 py-2 text-xs font-bold text-[#347247] sm:block">
              🤖 AI QUALITY
            </div>
          </div>
        </div>
      </header>

      {/* PAGE */}
      <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
        {/* INTRO */}
        <div className="fade-up mx-auto max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#cfe2d2] bg-white px-4 py-2 text-xs font-black tracking-[0.16em] text-[#327247] shadow-sm">
            <span className="blink h-2 w-2 rounded-full bg-[#3c9656]" />
            HARVEX AI VISION
          </div>

          <h1 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl lg:text-6xl">
            See the quality.
            <br />
            <span className="text-[#277443]">
              Before you sell.
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#66766c] sm:text-lg">
            Upload a produce image and HARVEX AI Vision
            analyzes visible characteristics to estimate
            quality, grade and suitability.
          </p>
        </div>

        {/* MAIN AI AREA */}
        <div className="mt-12 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          {/* IMAGE / SCANNER */}
          <div className="card-hover overflow-hidden rounded-[2rem] border border-[#dce8df] bg-white p-5 shadow-[0_25px_70px_rgba(25,70,38,0.07)] sm:p-7">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-black tracking-[0.18em] text-[#327247]">
                  COMPUTER VISION
                </div>

                <h2 className="mt-1 text-xl font-black">
                  Harvest Scanner
                </h2>
              </div>

              <div className="rounded-full bg-[#eff8f0] px-3 py-1.5 text-[10px] font-black text-[#347247]">
                {loading ? "SCANNING" : "READY"}
              </div>
            </div>

            {/* Scanner */}
            <div className="relative mt-6 aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-[#e5efe4]">
              {preview ? (
                <img
                  src={preview}
                  alt="Selected produce"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,#f2f7e8_0%,#d1e3ce_42%,#adc9aa_100%)]" />

                  <div className="float absolute left-[25%] top-[30%] h-28 w-28 rounded-full bg-[#d7a83d] shadow-[inset_-12px_-14px_25px_rgba(85,58,10,0.15),0_20px_30px_rgba(47,70,39,0.16)] sm:h-36 sm:w-36" />

                  <div
                    className="float absolute left-[48%] top-[43%] h-32 w-32 rounded-full bg-[#e0b84c] shadow-[inset_-15px_-16px_25px_rgba(85,58,10,0.15),0_20px_30px_rgba(47,70,39,0.16)]"
                    style={{ animationDelay: "0.8s" }}
                  />

                  <div className="absolute left-[36%] top-[58%] h-24 w-24 rounded-full bg-[#c9942e] shadow-[inset_-10px_-12px_20px_rgba(85,58,10,0.18)]" />

                  <div className="absolute left-[36%] top-[20%] h-9 w-20 -rotate-25 rounded-full bg-[#4d824e]" />

                  <div className="absolute left-[52%] top-[27%] h-9 w-20 rotate-20 rounded-full bg-[#5b8f57]" />
                </>
              )}

              {/* Scan frame */}
              <div className="absolute inset-[8%] rounded-xl border border-white/50">
                <div className="absolute left-0 top-0 h-9 w-9 border-l-2 border-t-2 border-white" />
                <div className="absolute right-0 top-0 h-9 w-9 border-r-2 border-t-2 border-white" />
                <div className="absolute bottom-0 left-0 h-9 w-9 border-b-2 border-l-2 border-white" />
                <div className="absolute bottom-0 right-0 h-9 w-9 border-b-2 border-r-2 border-white" />

                {loading && (
                  <div className="scan-line absolute left-0 right-0 h-[3px] bg-white shadow-[0_0_20px_7px_rgba(237,255,232,0.75)]">
                    <div className="scan-glow absolute -top-8 h-16 w-full bg-white/20 blur-xl" />
                  </div>
                )}
              </div>

              {/* Detection points */}
              {loading && (
                <>
                  <div className="pulse-point absolute left-[28%] top-[36%] h-3 w-3 rounded-full border-2 border-white bg-[#277443] shadow-lg" />

                  <div
                    className="pulse-point absolute left-[58%] top-[48%] h-3 w-3 rounded-full border-2 border-white bg-[#277443] shadow-lg"
                    style={{ animationDelay: "0.4s" }}
                  />

                  <div
                    className="pulse-point absolute left-[43%] top-[65%] h-3 w-3 rounded-full border-2 border-white bg-[#277443] shadow-lg"
                    style={{ animationDelay: "0.8s" }}
                  />
                </>
              )}

              {/* AI labels */}
              {loading && (
                <>
                  <div className="absolute left-[12%] top-[31%] rounded-md bg-[#173523]/85 px-2 py-1 text-[8px] font-black tracking-wider text-white">
                    COLOR
                  </div>

                  <div className="absolute right-[9%] top-[42%] rounded-md bg-[#173523]/85 px-2 py-1 text-[8px] font-black tracking-wider text-white">
                    TEXTURE
                  </div>

                  <div className="absolute left-[29%] bottom-[13%] rounded-md bg-[#173523]/85 px-2 py-1 text-[8px] font-black tracking-wider text-white">
                    SIZE
                  </div>
                </>
              )}

              {/* Bottom scanner status */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-xl border border-white/20 bg-[#122a1b]/80 px-4 py-3 text-white backdrop-blur-md">
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-black tracking-[0.15em]">
                    <span className="blink h-1.5 w-1.5 rounded-full bg-[#b9ed9f]" />
                    {loading
                      ? "ANALYZING HARVEST"
                      : preview
                        ? "IMAGE READY"
                        : "AI SCANNER READY"}
                  </div>

                  <div className="mt-1 text-xs text-white/60">
                    {loading
                      ? "Detecting visual indicators..."
                      : preview
                        ? "Ready for computer vision analysis"
                        : "Upload an image to begin"}
                  </div>
                </div>

                {loading && (
                  <div className="text-lg font-black">
                    {scanProgress}%
                  </div>
                )}
              </div>
            </div>

            {/* Upload */}
            <div className="mt-5 rounded-2xl border border-dashed border-[#cbdccd] bg-[#f8fbf8] p-5">
              <label className="block cursor-pointer">
                <div className="text-sm font-black text-[#294432]">
                  Upload harvest image
                </div>

                <div className="mt-1 text-xs leading-5 text-[#7a887f]">
                  JPG, PNG or other supported image format.
                </div>

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    handleImageChange(
                      e.target.files?.[0] || null
                    )
                  }
                  className="mt-4 block w-full cursor-pointer text-sm text-[#53665a] file:mr-4 file:rounded-xl file:border-0 file:bg-[#e7f1e8] file:px-4 file:py-2.5 file:font-bold file:text-[#317247] file:transition hover:file:bg-[#dcebdd]"
                />
              </label>

              {image && (
                <div className="mt-4 rounded-xl bg-white px-4 py-3 text-xs text-[#617168]">
                  <span className="font-bold text-[#294432]">
                    Selected:
                  </span>{" "}
                  {image.name}
                </div>
              )}
            </div>

            <button
              onClick={analyzeImage}
              disabled={!image || loading}
              className="button-hover mt-4 w-full rounded-2xl bg-[#1f6b3b] px-6 py-4 font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading
                ? `HARVEX AI IS SCANNING · ${scanProgress}%`
                : "Analyze with HARVEX AI →"}
            </button>
          </div>

          {/* RIGHT INFORMATION */}
          <div className="space-y-5">
            {/* AI PROCESS */}
            <div className="card-hover rounded-[2rem] border border-[#dce8df] bg-white p-6 shadow-sm">
              <div className="text-xs font-black tracking-[0.18em] text-[#327247]">
                HOW AI VISION WORKS
              </div>

              <div className="mt-5 space-y-4">
                <VisionStep
                  number="01"
                  title="Upload"
                  description="Provide a clear harvest image."
                  active={!!image}
                />

                <VisionStep
                  number="02"
                  title="Scan"
                  description="HARVEX analyzes visible characteristics."
                  active={loading}
                />

                <VisionStep
                  number="03"
                  title="Evaluate"
                  description="AI estimates quality indicators."
                  active={!!result}
                />

                <VisionStep
                  number="04"
                  title="Grade"
                  description="Receive a visual quality assessment."
                  active={!!result}
                />
              </div>
            </div>

            {/* RESULT */}
            {result ? (
              <div className="reveal rounded-[2rem] border border-[#cfe1d2] bg-[#edf7ee] p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-black tracking-[0.18em] text-[#4b8055]">
                      ANALYSIS COMPLETE
                    </div>

                    <div className="mt-2 text-xl font-black">
                      HARVEX AI Assessment
                    </div>
                  </div>

                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-4xl font-black text-[#277443] shadow-sm">
                    {result.grade}
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <Metric
                    label="QUALITY SCORE"
                    value={`${result.score}/100`}
                  />

                  <Metric
                    label="CONFIDENCE"
                    value={`${result.confidence}%`}
                  />
                </div>

                <div className="mt-3 rounded-xl bg-white p-4">
                  <div className="text-[9px] font-black tracking-[0.15em] text-[#849188]">
                    SUITABILITY
                  </div>

                  <div className="mt-1 text-sm font-bold text-[#294432]">
                    {result.suitability}
                  </div>
                </div>
              </div>
            ) : (
              <div className="card-hover rounded-[2rem] border border-[#dce8df] bg-[#173c25] p-6 text-white">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-xl">
                    🧠
                  </div>

                  <div>
                    <div className="text-xs font-black tracking-[0.16em] text-[#b6d9bb]">
                      HARVEX INTELLIGENCE
                    </div>

                    <div className="mt-1 font-black">
                      AI-assisted quality insights
                    </div>
                  </div>
                </div>

                <p className="mt-5 text-sm leading-6 text-white/65">
                  Computer vision helps create a
                  consistent first-level visual assessment
                  before a produce transaction.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {[
                    "Color",
                    "Texture",
                    "Size",
                    "Surface",
                    "Visual defects",
                  ].map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold text-white/75"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* DETAILED RESULT */}
        {result && (
          <div className="reveal mt-6 grid gap-6 md:grid-cols-2">
            <div className="card-hover rounded-[2rem] border border-[#dce8df] bg-white p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf6ee]">
                  👁️
                </div>

                <div>
                  <h2 className="font-black">
                    AI Observations
                  </h2>

                  <p className="text-xs text-[#819087]">
                    Visual indicators detected
                  </p>
                </div>
              </div>

              <ul className="mt-5 space-y-3">
                {result.observations?.map(
                  (item, index) => (
                    <li
                      key={index}
                      className="flex gap-3 rounded-xl bg-[#f7faf7] p-3 text-sm leading-5 text-[#52645a]"
                    >
                      <span className="font-black text-[#347247]">
                        ✓
                      </span>

                      {item}
                    </li>
                  )
                )}
              </ul>
            </div>

            <div className="card-hover rounded-[2rem] border border-[#dce8df] bg-white p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff7e6]">
                  🔎
                </div>

                <div>
                  <h2 className="font-black">
                    Visible Defects
                  </h2>

                  <p className="text-xs text-[#819087]">
                    AI-detected visual concerns
                  </p>
                </div>
              </div>

              {result.visibleDefects?.length > 0 ? (
                <ul className="mt-5 space-y-3">
                  {result.visibleDefects.map(
                    (item, index) => (
                      <li
                        key={index}
                        className="rounded-xl bg-[#fffaf0] p-3 text-sm leading-5 text-[#756444]"
                      >
                        • {item}
                      </li>
                    )
                  )}
                </ul>
              ) : (
                <div className="mt-5 rounded-xl bg-[#f1f8f1] p-4 text-sm font-semibold text-[#3e7349]">
                  ✓ No obvious visible defects
                  detected.
                </div>
              )}
            </div>
          </div>
        )}

        {/* DISCLAIMER */}
        <div className="mt-8 rounded-2xl border border-[#e4e8e4] bg-white p-5 text-xs leading-6 text-[#7b867f]">
          <span className="font-black text-[#56645b]">
            ⚠️ Important:
          </span>{" "}
          This is a visual AI estimate. It cannot
          determine food safety, chemical contamination,
          or internal quality from an image alone.
        </div>
      </div>
    </main>
  );
}

function VisionStep({
  number,
  title,
  description,
  active,
}: {
  number: string;
  title: string;
  description: string;
  active: boolean;
}) {
  return (
    <div className="flex items-center gap-4">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-black transition-all duration-500 ${
          active
            ? "bg-[#1f6b3b] text-white shadow-md"
            : "bg-[#edf3ed] text-[#8b998f]"
        }`}
      >
        {active ? "✓" : number}
      </div>

      <div className="flex-1">
        <div className="text-sm font-black text-[#294432]">
          {title}
        </div>

        <div className="mt-0.5 text-xs text-[#78867d]">
          {description}
        </div>
      </div>

      {active && (
        <div className="h-2 w-2 rounded-full bg-[#3f8b51] shadow-[0_0_10px_rgba(63,139,81,0.5)]" />
      )}
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-white p-4">
      <div className="text-[9px] font-black tracking-[0.14em] text-[#849188]">
        {label}
      </div>

      <div className="mt-1 text-2xl font-black text-[#277443]">
        {value}
      </div>
    </div>
  );
}