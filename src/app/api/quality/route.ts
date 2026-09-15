import { GoogleGenAI } from "@google/genai";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const image = formData.get("image");
    const produce = formData.get("produce");

    if (!(image instanceof File)) {
      return Response.json(
        { error: "No image was uploaded." },
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
      return Response.json(
        { error: "Gemini API key is missing." },
        { status: 500 }
      );
    }

    const arrayBuffer = await image.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");

    const ai = new GoogleGenAI({
      apiKey,
    });

    const interaction = await ai.interactions.create({
      model: "gemini-3.6-flash",

      input: [
        {
          type: "user_input",

          content: [
            {
              type: "text",

              text: `
You are HARVEX AI Quality Grading Engine.

The farmer has declared that the agricultural produce is:

"${produce}"

Analyze the uploaded image ONLY in the context of this declared produce.

IMPORTANT:
- Do NOT confuse the crop with another crop.
- If the image does not appear to contain the declared produce, mention that clearly in observations.
- Grade only visible external quality.
- Evaluate visible color, size consistency, maturity appearance, bruising, cuts, rot, mold, shriveling, pest damage and other visible defects.
- Do NOT claim food safety.
- Do NOT claim pesticide levels.
- Do NOT claim chemical contamination.
- Do NOT claim internal quality that cannot be seen.
- This is a visual estimate, not a laboratory test.

Return ONLY valid JSON.

Required format:

{
  "grade": "A",
  "score": 90,
  "confidence": 90,
  "observations": [
    "observation 1",
    "observation 2"
  ],
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
- Do not use Markdown
- Do not use triple backticks
- Do not add explanations before or after the JSON

Grading guidance:

A:
Excellent visible quality with minimal defects.

B:
Acceptable visible quality with some noticeable defects.

C:
Poor visible quality with significant visible defects.

Remember:
The declared crop is "${produce}".
`,
            },

            {
              type: "image",
              data: base64Image,
              mime_type: image.type || "image/jpeg",
            },
          ],
        },
      ],
    });

    let resultText = interaction.output_text?.trim();

    if (!resultText) {
      return Response.json(
        { error: "Gemini returned an empty response." },
        { status: 500 }
      );
    }

    // Remove accidental Markdown code fences if Gemini adds them.
    resultText = resultText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsedResult;

    try {
      parsedResult = JSON.parse(resultText);
    } catch {
      console.error("Invalid Gemini JSON:", resultText);

      return Response.json(
        {
          error: "Gemini returned an invalid quality result.",
          rawResult: resultText,
        },
        { status: 500 }
      );
    }

    // Basic validation
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

    return Response.json({
      result: JSON.stringify(parsedResult),
    });
  } catch (error) {
    console.error("HARVEX AI error:", error);

    return Response.json(
      {
        error:
          error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}