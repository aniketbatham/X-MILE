"use client";

import { useState } from "react";

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
  const [result, setResult] = useState<QualityResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function analyzeImage() {
    if (!image) return;

    setLoading(true);
    setError("");
    setResult(null);

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

      // Gemini returns the assessment as text.
      // We try to extract the JSON from that text.
      const text = data.result;

      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error("AI returned an unexpected response.");
      }

      const parsed = JSON.parse(jsonMatch[0]);
      setResult(parsed);
    } catch (err) {
      console.error(err);
      setError("AI analysis failed. Please try another image.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-10">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-emerald-400">
            HARVEX AI
          </p>

          <h1 className="text-4xl font-bold">
            AI Quality Grading
          </h1>

          <p className="mt-3 max-w-2xl text-slate-400">
            Upload a produce image and HARVEX will estimate its visual
            quality using AI.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              setImage(e.target.files?.[0] || null);
              setResult(null);
              setError("");
            }}
            className="block w-full text-sm text-slate-300"
          />

          {image && (
            <p className="mt-4 text-sm text-slate-400">
              Selected: {image.name}
            </p>
          )}

          <button
            onClick={analyzeImage}
            disabled={!image || loading}
            className="mt-6 rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Analyzing..." : "Analyze with HARVEX AI"}
          </button>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-800 bg-red-950/40 p-4 text-red-300">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-sm text-slate-400">AI Grade</p>

              <div className="mt-2 text-6xl font-bold text-emerald-400">
                {result.grade}
              </div>

              <p className="mt-4 text-slate-300">
                Visual Quality Score:{" "}
                <strong>{result.score}/100</strong>
              </p>

              <p className="mt-2 text-slate-300">
                AI Confidence:{" "}
                <strong>{result.confidence}%</strong>
              </p>

              <p className="mt-2 text-slate-300">
                Suitability:{" "}
                <strong>{result.suitability}</strong>
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-xl font-semibold">
                AI Observations
              </h2>

              <ul className="mt-4 space-y-2 text-slate-300">
                {result.observations?.map((item, index) => (
                  <li key={index}>• {item}</li>
                ))}
              </ul>

              {result.visibleDefects?.length > 0 && (
                <>
                  <h3 className="mt-6 font-semibold">
                    Visible Defects
                  </h3>

                  <ul className="mt-2 space-y-2 text-slate-400">
                    {result.visibleDefects.map((item, index) => (
                      <li key={index}>• {item}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/50 p-5 text-sm text-slate-500">
          ⚠️ This is a visual AI estimate. It cannot determine food
          safety, chemical contamination, or internal quality from an
          image alone.
        </div>
      </div>
    </main>
  );
}