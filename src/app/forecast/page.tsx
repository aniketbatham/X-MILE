"use client";

import { useState } from "react";
import { forecastDemand } from "../../lib/forecast";
import { useLanguage } from "@/i18n/LanguageContext";
import LanguageSelector from "@/components/LanguageSelector";

const demandData = [
  { date: "Sep 1", quantity: 3200 },
  { date: "Sep 3", quantity: 3600 },
  { date: "Sep 5", quantity: 3900 },
  { date: "Sep 7", quantity: 4300 },
  { date: "Sep 9", quantity: 4700 },
  { date: "Sep 11", quantity: 5100 },
];

export default function ForecastPage() {
  const { t, formatNumber } = useLanguage();
  const [produce, setProduce] = useState("Tomato");
  const [result, setResult] = useState<ReturnType<
    typeof forecastDemand
  > | null>(null);

  function runForecast() {
    const forecast = forecastDemand(
      produce,
      demandData.map((item) => ({
        date: item.date,
        quantity: item.quantity,
      }))
    );

    setResult(forecast);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="border-b bg-white px-6 py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#172019] text-sm font-black text-white shadow-sm">
              X
            </a>
            <div>
              <h1 className="text-xl font-bold">X-MILE</h1>
              <p className="text-xs text-slate-500">
                Every MILE Matters, Every FARMER Matters
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSelector />

            <a
              href="/"
              className="rounded-lg border px-4 py-2 text-sm hover:bg-slate-50"
            >
              ← {t("common.home")}
            </a>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">
          {t("nav.forecast")}
        </p>

        <h2 className="mt-2 text-4xl font-bold">
          {t("forecast.title")}
        </h2>

        <p className="mt-3 max-w-2xl text-slate-600">
          {t("forecast.subtitle")}
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* INPUT */}
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold">
              {t("forecast.demandTrendTitle")}
            </h3>

            <label className="mt-6 block text-sm font-medium">
              {t("farmer.cropLabel")}
            </label>

            <select
              value={produce}
              onChange={(event) =>
                setProduce(event.target.value)
              }
              className="mt-2 w-full rounded-lg border px-4 py-3"
            >
              <option value="Tomato">{t("quality.produceTypes.tomato")}</option>
              <option value="Potato">{t("quality.produceTypes.potato")}</option>
              <option value="Onion">{t("quality.produceTypes.onion")}</option>
              <option value="Carrot">{t("quality.produceTypes.carrot")}</option>
            </select>

            <button
              onClick={runForecast}
              className="mt-5 w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800"
            >
              Run AI Forecast
            </button>

            <div className="mt-6 rounded-xl bg-slate-50 p-4">
              <h4 className="font-semibold">
                Historical Demand
              </h4>

              <div className="mt-3 space-y-2">
                {demandData.map((item) => (
                  <div
                    key={item.date}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-slate-500">
                      {item.date}
                    </span>

                    <span className="font-medium">
                      {item.quantity.toLocaleString()} kg
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RESULT */}
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            {!result ? (
              <div className="flex min-h-[350px] items-center justify-center text-center">
                <div>
                  <div className="text-4xl">🧠</div>

                  <h3 className="mt-4 text-lg font-semibold">
                    Forecast not generated
                  </h3>

                  <p className="mt-2 text-sm text-slate-500">
                    Click the button to run the X-MILE demand
                    forecasting engine.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500">
                      Forecast for
                    </p>

                    <h3 className="text-2xl font-bold">
                      {result.produce}
                    </h3>
                  </div>

                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    AI Forecast
                  </span>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-5">
                    <p className="text-sm text-slate-500">
                      Predicted Demand
                    </p>

                    <p className="mt-2 text-3xl font-bold">
                      {result.forecastQuantity.toLocaleString()}
                      <span className="ml-1 text-sm font-medium text-slate-500">
                        kg
                      </span>
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-5">
                    <p className="text-sm text-slate-500">
                      Historical Average
                    </p>

                    <p className="mt-2 text-3xl font-bold">
                      {result.historicalAverage.toLocaleString()}
                      <span className="ml-1 text-sm font-medium text-slate-500">
                        kg
                      </span>
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-5">
                    <p className="text-sm text-slate-500">
                      Demand Trend
                    </p>

                    <p className="mt-2 text-2xl font-bold">
                      {result.trend}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-5">
                    <p className="text-sm text-slate-500">
                      Confidence
                    </p>

                    <p className="mt-2 text-2xl font-bold">
                      {result.confidence}%
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-xl bg-emerald-50 p-5">
                  <p className="text-xs font-semibold uppercase text-emerald-700">
                    X-MILE Recommendation
                  </p>

                  <p className="mt-2 text-sm text-emerald-950">
                    {result.recommendation}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Prototype:</strong> Forecasting currently uses
          sample historical demand data. Later we will connect it
          to real buyer orders and market signals.
        </div>
      </section>
    </main>
  );
}