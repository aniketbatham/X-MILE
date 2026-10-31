# X-MILE

> **Every MILE Matters, Every FARMER Matters.**

X-MILE is an intelligent, farmer-first agricultural marketplace and supply aggregation platform. It bridges smallholder farmers and bulk buyers through AI-assisted visual produce inspection, smart harvest pooling, optimized logistics routing, and transparent milestone tracking.

## Core Features

- **Farmer Portal**: List produce, join pooled regional inventory, and fulfill incoming buyer orders.
- **Buyer Portal**: State procurement requirements, aggregate smallholder supplies automatically, and optimize multi-stop pickup routes.
- **AI Quality Vision**: Visual quality estimation (Grade A/B/C, defect detection, confidence score) powered by Google Gemini.
- **Smart Harvest Pool**: Algorithmic supply aggregation prioritizing quality, pickup proximity, and volume fulfillment.
- **Demand Forecasting**: Predictive demand insights to guide regional procurement and inventory balancing.
- **Milestone Escrow & Logistics**: End-to-end transparent order tracking from acceptance to dispatch and delivery.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org) (App Router, React 19, TypeScript)
- **Styling**: Tailwind CSS v4
- **Database**: Supabase
- **AI / Computer Vision**: Google GenAI SDK (`@google/genai`)
- **Mapping**: Leaflet / React Leaflet

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to experience X-MILE.

## Environment Variables

Configure the following environment variables in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
GEMINI_API_KEY=your-gemini-api-key
```
