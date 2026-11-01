import { GoogleGenAI } from "@google/genai";

// In-memory rate limiting map for serverless execution: ip -> timestamps[]
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 15; // 15 quality checks per minute per IP
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB limit

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];

  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    rateLimitMap.set(ip, recent);
    return true;
  }

  recent.push(now);
  rateLimitMap.set(ip, recent);

  // Periodic memory cleanup
  if (rateLimitMap.size > 1000) {
    for (const [key, times] of rateLimitMap.entries()) {
      const valid = times.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
      if (valid.length === 0) rateLimitMap.delete(key);
      else rateLimitMap.set(key, valid);
    }
  }

  return false;
}

export async function POST(request: Request) {
  try {
    // 1. Enforce rate limiting
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    if (isRateLimited(clientIp)) {
      return Response.json(
        { error: "Too many quality assessment requests. Please wait a moment before trying again." },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const image = formData.get("image");
    const produce = formData.get("produce");

    if (!(image instanceof File)) {
      return Response.json(
        { error: "No image was uploaded." },
        { status: 400 }
      );
    }

    if (image.size > MAX_IMAGE_BYTES) {
      return Response.json(
        { error: "Image size exceeds 10MB limit. Please upload a smaller photo." },
        { status: 400 }
      );
    }

    if (typeof produce !== "string" || !produce.trim()) {
      return Response.json(
        { error: "Produce type is required." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("X-MILE: GEMINI_API_KEY is missing.");
      return Response.json(
        { error: "Gemini API key is not configured on the server." },
        { status: 500 }
      );
    }

    const arrayBuffer = await image.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");

    const ai = new GoogleGenAI({
      apiKey,
    });

    const prompt = `
You are X-MILE AI Quality Grading Engine.

The farmer has declared that the agricultural produce is:
"${produce.trim()}"

Analyze the uploaded image ONLY in the context of this declared produce.

IMPORTANT:
- Do NOT confuse the crop with another crop.
- If the image does not appear to contain the declared produce, mention that clearly in observations.
- Grade only visible external quality.
- Evaluate visible color, size consistency, maturity appearance, bruising, cuts, rot, mold, shriveling, pest damage and other visible defects.
- Do NOT claim food safety or chemical residue testing (this is a visual estimate only).

Return ONLY valid JSON matching this exact structure:
{
  "grade": "A",
  "score": 90,
  "confidence": 90,
  "observations": ["observation 1", "observation 2"],
  "visibleDefects": [],
  "suitability": "High"
}

Rules:
- grade must be exactly A, B, or C
- score must be an integer from 0 to 100
- confidence must be an integer from 0 to 100
- observations must be an array of strings
- visibleDefects must be an array of strings
- suitability must be exactly High, Medium, or Low
- Do not use Markdown fences or extra prose.
`;

    const preferredModel = process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash";

    let response: any;
    try {
      response = await ai.models.generateContent({
        model: preferredModel,
        contents: [
          {
            inlineData: {
              mimeType: image.type || "image/jpeg",
              data: base64Image,
            },
          },
          { text: prompt },
        ],
      });
    } catch (modelErr: any) {
      console.warn(`Primary model ${preferredModel} failed, trying fallback model...`, modelErr.message);
      // Fallback to gemini-3.8-flash if primary encounters issues
      response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: [
          {
            inlineData: {
              mimeType: image.type || "image/jpeg",
              data: base64Image,
            },
          },
          { text: prompt },
        ],
      });
    }

    let resultText = response.text?.trim();

    if (!resultText) {
      return Response.json(
        { error: "Gemini returned an empty quality result." },
        { status: 500 }
      );
    }

    // Clean any accidental Markdown fences
    resultText = resultText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsedResult: {
      grade: string;
      score: number;
      confidence: number;
      observations: string[];
      visibleDefects: string[];
      suitability: string;
    };

    try {
      parsedResult = JSON.parse(resultText);
    } catch {
      return Response.json(
        { error: "Gemini returned an invalid non-JSON quality result." },
        { status: 500 }
      );
    }

    if (
      !["A", "B", "C"].includes(parsedResult.grade) ||
      typeof parsedResult.score !== "number" ||
      typeof parsedResult.confidence !== "number" ||
      !Array.isArray(parsedResult.observations) ||
      !Array.isArray(parsedResult.visibleDefects) ||
      !["High", "Medium", "Low"].includes(parsedResult.suitability)
    ) {
      return Response.json(
        { error: "Gemini returned an invalid quality structure." },
        { status: 500 }
      );
    }

    // Clamp numeric ranges
    parsedResult.score = Math.max(0, Math.min(100, Math.round(parsedResult.score)));
    parsedResult.confidence = Math.max(0, Math.min(100, Math.round(parsedResult.confidence)));

    return Response.json({
      result: JSON.stringify(parsedResult),
    });
  } catch (error: any) {
    console.error("X-MILE AI quality error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
