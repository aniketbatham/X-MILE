import { generateText } from "ai";

// Load .env.local if running standalone script in Node
if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // .env.local loaded via environment or CLI flag
  }
}

async function main() {
  const { text } = await generateText({
    model: "moonshotai/kimi-k3",
    prompt: "Invent a new holiday and describe its traditions.",
  });

  console.log(text);
}

main().catch((error) => {
  console.error("Error generating text:", error?.message || error);
  process.exit(1);
});
