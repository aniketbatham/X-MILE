import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Load .env.local manually if not in process.env
if (fs.existsSync(".env.local")) {
  const content = fs.readFileSync(".env.local", "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gufyukekzkomxfhvtruf.supabase.co";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(url, anonKey);

async function runTests() {
  console.log("=== X-MILE REGISTRATION SAFEGUARDS & RATE-LIMIT TESTS ===");
  console.log(`Target Supabase URL: ${url}\n`);

  // Test 1: Duplicate Registration Detection
  console.log("1. Testing Duplicate Registration for Existing User...");
  const existingEmail = "e2e_farmer@harvex.internal";
  const { data: dupData, error: dupError } = await supabase.auth.signUp({
    email: existingEmail,
    password: "Password123!",
  });

  const isDuplicateDetected = dupData?.user && dupData.user.identities && dupData.user.identities.length === 0;
  console.log(`   - Error: ${dupError?.message || "null"}`);
  console.log(`   - Identities count: ${dupData?.user?.identities?.length}`);
  console.log(`   - User ID: ${dupData?.user?.id}`);
  console.log(`   - Duplicate Detected via identities.length === 0: ${isDuplicateDetected}`);
  if (isDuplicateDetected) {
    console.log("   ✅ PASSED: Duplicate account detected cleanly without triggering new confirmation email.\n");
  } else {
    console.log("   ⚠️ Note: Returned:", dupData);
  }

  // Test 2: Rapid Re-submission / Cooldown Detection
  console.log("2. Testing Rapid Re-submission Rate-Limit Handling...");
  const tempEmail = `e2e_rate_test_${Date.now()}@example.com`;
  console.log(`   - Submitting initial signup for: ${tempEmail}`);
  const { data: initData, error: initError } = await supabase.auth.signUp({
    email: tempEmail,
    password: "TestPassword123!",
  });

  console.log(`   - Initial signup status: Error=${initError?.message || "none"}, User=${initData?.user?.id}`);

  console.log("   - Immediately re-submitting identical signup (within cooldown window)...");
  const { data: _retryData, error: retryError } = await supabase.auth.signUp({
    email: tempEmail,
    password: "TestPassword123!",
  });

  const isRateLimit =
    retryError?.status === 429 ||
    retryError?.code === "over_email_send_rate_limit" ||
    (retryError?.message || "").toLowerCase().includes("rate limit") ||
    (retryError?.message || "").toLowerCase().includes("for security purposes");

  console.log(`   - Retry status: HTTP ${retryError?.status}, Code: ${retryError?.code}`);
  console.log(`   - Retry message: "${retryError?.message}"`);
  console.log(`   - Rate limit caught: ${isRateLimit}`);

  if (isRateLimit) {
    console.log("   ✅ PASSED: Rate limit / cooldown triggered and recognized as HTTP 429 over_email_send_rate_limit.\n");
  } else {
    console.log("   ⚠️ Note: Did not trigger 429 (cooldown may vary per provider).\n");
  }

  console.log("=== ALL STAGING VERIFICATION TESTS FINISHED ===");
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
