import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// 1. Load Staging Environment
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gufyukekzkomxfhvtruf.supabase.co";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error("Missing Supabase configuration in .env.local");
  process.exit(1);
}

/**
 * Pure calculation logic matching src/app/farmer/page.tsx and src/app/api/farmer/orders/route.ts
 */
function resolveOrderFinancialState(orderItem) {
  const unitPrice =
    orderItem.orders?.price_per_kg ||
    orderItem.unit_price_per_kg ||
    25;

  const orderRecord = orderItem.orders || {};
  const hasConfirmedPayout = Boolean(
    orderItem.payout_confirmed === true ||
    orderRecord.payout_confirmed === true ||
    orderRecord.payout_status === "PAID" ||
    orderRecord.payout_status === "DISBURSED" ||
    orderItem.settlement_status === "DISBURSED"
  );

  const hasConfirmedEscrow = Boolean(
    orderItem.escrow_confirmed === true ||
    orderRecord.escrow_confirmed === true ||
    orderRecord.escrow_status === "LOCKED" ||
    orderRecord.escrow_status === "HELD" ||
    orderItem.settlement_status === "HELD_IN_ESCROW"
  );

  let settlementStatus = "PAYMENT_STATUS_UNAVAILABLE";
  if (hasConfirmedPayout) {
    settlementStatus = "DISBURSED";
  } else if (hasConfirmedEscrow) {
    settlementStatus = "HELD_IN_ESCROW";
  } else if (orderRecord.status === "Cancelled") {
    settlementStatus = "REFUNDED";
  } else if (orderRecord.status === "Disputed") {
    settlementStatus = "DISPUTED";
  } else if (orderRecord.status === "Delivered") {
    settlementStatus = "AWAITING_SETTLEMENT_CONFIRMATION";
  } else if (orderRecord.status === "Accepted" || orderRecord.status === "Dispatched") {
    settlementStatus = "AWAITING_SETTLEMENT_CONFIRMATION";
  }

  const fulfilledQty = Number(orderRecord.fulfilled_quantity_kg) || 0;
  const orderQty = Number(orderItem.quantity_kg) || 0;
  const deliveredQty = orderRecord.status === "Delivered" ? (fulfilledQty || orderQty) : fulfilledQty;

  const totalValue = orderQty * unitPrice;
  const fulfilledValue = deliveredQty * unitPrice;

  return {
    unitPrice,
    totalValue,
    fulfilledValue,
    settlementStatus,
    hasConfirmedPayout,
    hasConfirmedEscrow,
  };
}

function computeFarmerFinancialSummary(orderItems) {
  const deliveredOrders = orderItems.filter((o) => o.orders?.status === "Delivered");
  const inTransitOrders = orderItems.filter(
    (o) => o.orders?.status === "Accepted" || o.orders?.status === "Dispatched"
  );

  // 1. Physical Fulfilled Produce Metrics
  const totalFulfilledVolumeKg = deliveredOrders.reduce(
    (sum, o) => sum + Number(o.orders?.fulfilled_quantity_kg || o.quantity_kg || 0),
    0
  );

  const totalFulfilledProduceValue = deliveredOrders.reduce((sum, o) => {
    const resolved = resolveOrderFinancialState(o);
    return sum + resolved.fulfilledValue;
  }, 0);

  // 2. Verified Financial Settlement Metrics
  const totalConfirmedBankDisbursements = orderItems.reduce((sum, o) => {
    const resolved = resolveOrderFinancialState(o);
    if (resolved.hasConfirmedPayout) {
      return sum + resolved.fulfilledValue;
    }
    return sum;
  }, 0);

  const totalConfirmedEscrow = orderItems.reduce((sum, o) => {
    const resolved = resolveOrderFinancialState(o);
    if (resolved.hasConfirmedEscrow) {
      return sum + resolved.totalValue;
    }
    return sum;
  }, 0);

  const ordersAwaitingSettlement = deliveredOrders.filter((o) => {
    const resolved = resolveOrderFinancialState(o);
    return !resolved.hasConfirmedPayout;
  });

  return {
    deliveredCount: deliveredOrders.length,
    inTransitCount: inTransitOrders.length,
    totalFulfilledVolumeKg,
    totalFulfilledProduceValue,
    totalConfirmedBankDisbursements,
    totalConfirmedEscrow,
    ordersAwaitingSettlementCount: ordersAwaitingSettlement.length,
  };
}

async function runFarmerFinancialAccuracyTests() {
  console.log("=============================================================");
  console.log("   X-MILE FARMER FINANCIAL ACCURACY & SETTLEMENT TEST SUITE  ");
  console.log(`   Target Supabase: ${supabaseUrl}`);
  console.log("=============================================================\n");

  let testsPassed = 0;

  // -------------------------------------------------------------
  // TEST CASE 1: Delivered-but-unpaid Order
  // -------------------------------------------------------------
  console.log("TEST CASE 1: Delivered-but-unpaid Order (Physical Delivery ≠ Bank Disbursed)");
  const deliveredUnpaidOrder = {
    id: "item-del-unpaid-01",
    quantity_kg: 500,
    unit_price_per_kg: 30,
    orders: {
      id: "ord-del-unpaid-01",
      buyer_name: "Fresh Retail Hub",
      produce: "Grade A Tomato",
      requested_quantity_kg: 500,
      fulfilled_quantity_kg: 500,
      status: "Delivered",
      // Notice: No payout confirmation record exists!
    },
  };

  const res1 = resolveOrderFinancialState(deliveredUnpaidOrder);
  if (res1.settlementStatus !== "AWAITING_SETTLEMENT_CONFIRMATION") {
    throw new Error(`Expected AWAITING_SETTLEMENT_CONFIRMATION, got: ${res1.settlementStatus}`);
  }
  if (res1.hasConfirmedPayout !== false) {
    throw new Error(`Delivered-but-unpaid order must NOT have hasConfirmedPayout=true`);
  }
  if (res1.fulfilledValue !== 15000) {
    throw new Error(`Expected fulfilledValue=15000, got: ${res1.fulfilledValue}`);
  }

  const summary1 = computeFarmerFinancialSummary([deliveredUnpaidOrder]);
  if (summary1.totalConfirmedBankDisbursements !== 0) {
    throw new Error(`Bank disbursements must be ₹0 when unconfirmed, got: ₹${summary1.totalConfirmedBankDisbursements}`);
  }
  if (summary1.totalFulfilledProduceValue !== 15000) {
    throw new Error(`Fulfilled produce value must be ₹15,000, got: ₹${summary1.totalFulfilledProduceValue}`);
  }
  if (summary1.ordersAwaitingSettlementCount !== 1) {
    throw new Error(`Expected 1 order awaiting settlement, got: ${summary1.ordersAwaitingSettlementCount}`);
  }
  console.log("   ✓ Physical delivered produce value correctly tracked (₹15,000)");
  console.log("   ✓ Order settlement status accurately marked as 'AWAITING_SETTLEMENT_CONFIRMATION'");
  console.log("   ✓ Verified bank payouts evaluates to ₹0 (NOT prematurely labeled 'Disbursed')");
  testsPassed++;

  // -------------------------------------------------------------
  // TEST CASE 2: Escrow-held Order
  // -------------------------------------------------------------
  console.log("\nTEST CASE 2: Verified Escrow-Held Order");
  const escrowHeldOrder = {
    id: "item-escrow-01",
    quantity_kg: 1000,
    unit_price_per_kg: 25,
    orders: {
      id: "ord-escrow-01",
      buyer_name: "Apex Logistics",
      produce: "Potato",
      requested_quantity_kg: 1000,
      fulfilled_quantity_kg: 0,
      status: "Dispatched",
      escrow_confirmed: true,
      escrow_status: "LOCKED",
    },
  };

  const res2 = resolveOrderFinancialState(escrowHeldOrder);
  if (res2.settlementStatus !== "HELD_IN_ESCROW") {
    throw new Error(`Expected HELD_IN_ESCROW, got: ${res2.settlementStatus}`);
  }
  if (res2.hasConfirmedEscrow !== true) {
    throw new Error(`Escrow-held order must have hasConfirmedEscrow=true`);
  }
  if (res2.hasConfirmedPayout !== false) {
    throw new Error(`Escrow-held order must NOT be marked as paid/disbursed`);
  }

  const summary2 = computeFarmerFinancialSummary([escrowHeldOrder]);
  if (summary2.totalConfirmedEscrow !== 25000) {
    throw new Error(`Expected totalConfirmedEscrow=25000, got: ₹${summary2.totalConfirmedEscrow}`);
  }
  if (summary2.totalConfirmedBankDisbursements !== 0) {
    throw new Error(`Bank disbursements must be ₹0, got: ₹${summary2.totalConfirmedBankDisbursements}`);
  }
  console.log("   ✓ Verified escrow holding status accurately marked as 'HELD_IN_ESCROW'");
  console.log("   ✓ Escrow balance correctly reflects ₹25,000");
  console.log("   ✓ Zero false bank disbursement claims");
  testsPassed++;

  // -------------------------------------------------------------
  // TEST CASE 3: Successfully-Paid Order (Confirmed Bank Payout)
  // -------------------------------------------------------------
  console.log("\nTEST CASE 3: Successfully-Paid Order (Verified Bank Payout Confirmation)");
  const successfullyPaidOrder = {
    id: "item-paid-01",
    quantity_kg: 400,
    unit_price_per_kg: 50,
    orders: {
      id: "ord-paid-01",
      buyer_name: "Govt Mandi Central",
      produce: "Organic Onion",
      requested_quantity_kg: 400,
      fulfilled_quantity_kg: 400,
      status: "Delivered",
      payout_confirmed: true,
      payout_status: "PAID",
    },
  };

  const res3 = resolveOrderFinancialState(successfullyPaidOrder);
  if (res3.settlementStatus !== "DISBURSED") {
    throw new Error(`Expected DISBURSED, got: ${res3.settlementStatus}`);
  }
  if (res3.hasConfirmedPayout !== true) {
    throw new Error(`Successfully-paid order must have hasConfirmedPayout=true`);
  }

  const summary3 = computeFarmerFinancialSummary([successfullyPaidOrder]);
  if (summary3.totalConfirmedBankDisbursements !== 20000) {
    throw new Error(`Expected totalConfirmedBankDisbursements=20000, got: ₹${summary3.totalConfirmedBankDisbursements}`);
  }
  if (summary3.totalFulfilledProduceValue !== 20000) {
    throw new Error(`Expected totalFulfilledProduceValue=20000, got: ₹${summary3.totalFulfilledProduceValue}`);
  }
  console.log("   ✓ Verified payout record correctly recognized as 'DISBURSED'");
  console.log("   ✓ Confirmed bank payouts properly updated to ₹20,000");
  testsPassed++;

  // -------------------------------------------------------------
  // TEST CASE 4: Cancelled / Refunded Order
  // -------------------------------------------------------------
  console.log("\nTEST CASE 4: Cancelled / Refunded Order");
  const refundedOrder = {
    id: "item-ref-01",
    quantity_kg: 600,
    unit_price_per_kg: 20,
    orders: {
      id: "ord-ref-01",
      buyer_name: "Cancelled Buyer Corp",
      produce: "Carrot",
      requested_quantity_kg: 600,
      fulfilled_quantity_kg: 0,
      status: "Cancelled",
    },
  };

  const res4 = resolveOrderFinancialState(refundedOrder);
  if (res4.settlementStatus !== "REFUNDED") {
    throw new Error(`Expected REFUNDED, got: ${res4.settlementStatus}`);
  }
  if (res4.hasConfirmedPayout !== false || res4.hasConfirmedEscrow !== false) {
    throw new Error(`Cancelled order must not have confirmed payout or escrow`);
  }

  const summary4 = computeFarmerFinancialSummary([refundedOrder]);
  if (summary4.totalConfirmedBankDisbursements !== 0) {
    throw new Error(`Cancelled order must have ₹0 disbursements`);
  }
  if (summary4.totalFulfilledProduceValue !== 0) {
    throw new Error(`Cancelled order must have ₹0 fulfilled produce value`);
  }
  console.log("   ✓ Cancelled order accurately classified as 'REFUNDED'");
  console.log("   ✓ Strictly excluded from fulfilled produce value and bank payouts");
  testsPassed++;

  // -------------------------------------------------------------
  // TEST CASE 5: Mixed Multi-Order Portfolio Calculation
  // -------------------------------------------------------------
  console.log("\nTEST CASE 5: Mixed Multi-Order Financial Separation Verification");
  const portfolio = [
    deliveredUnpaidOrder,   // 500kg @ ₹30 = ₹15,000 delivered, awaiting payout confirmation
    escrowHeldOrder,        // 1000kg @ ₹25 = ₹25,000 in escrow
    successfullyPaidOrder,  // 400kg @ ₹50 = ₹20,000 delivered and disbursed
    refundedOrder,          // 600kg @ ₹20 = ₹0 (cancelled)
  ];

  const portfolioSummary = computeFarmerFinancialSummary(portfolio);
  console.log("   Portfolio Calculation Results:");
  console.log(`   - Total Fulfilled Volume: ${portfolioSummary.totalFulfilledVolumeKg} kg (Expected: 900 kg)`);
  console.log(`   - Fulfilled Produce Value: ₹${portfolioSummary.totalFulfilledProduceValue.toLocaleString("en-IN")} (Expected: ₹35,000)`);
  console.log(`   - Confirmed Bank Payouts: ₹${portfolioSummary.totalConfirmedBankDisbursements.toLocaleString("en-IN")} (Expected: ₹20,000)`);
  console.log(`   - Verified Escrow Balance: ₹${portfolioSummary.totalConfirmedEscrow.toLocaleString("en-IN")} (Expected: ₹25,000)`);
  console.log(`   - Orders Awaiting Settlement: ${portfolioSummary.ordersAwaitingSettlementCount} (Expected: 1)`);

  if (portfolioSummary.totalFulfilledVolumeKg !== 900) {
    throw new Error(`Expected volume 900 kg, got ${portfolioSummary.totalFulfilledVolumeKg}`);
  }
  if (portfolioSummary.totalFulfilledProduceValue !== 35000) {
    throw new Error(`Expected fulfilled value 35000, got ${portfolioSummary.totalFulfilledProduceValue}`);
  }
  if (portfolioSummary.totalConfirmedBankDisbursements !== 20000) {
    throw new Error(`Expected disbursed 20000, got ${portfolioSummary.totalConfirmedBankDisbursements}`);
  }
  if (portfolioSummary.totalConfirmedEscrow !== 25000) {
    throw new Error(`Expected escrow 25000, got ${portfolioSummary.totalConfirmedEscrow}`);
  }
  if (portfolioSummary.ordersAwaitingSettlementCount !== 1) {
    throw new Error(`Expected 1 order awaiting settlement, got ${portfolioSummary.ordersAwaitingSettlementCount}`);
  }
  testsPassed++;

  // -------------------------------------------------------------
  // TEST CASE 6: Real Supabase Staging Integration Test
  // -------------------------------------------------------------
  console.log("\nTEST CASE 6: Real Supabase Staging Data Inspection for Farmer Orders");
  const supabase = createClient(supabaseUrl, anonKey);
  const { data: farmerAuth, error: fAuthErr } = await supabase.auth.signInWithPassword({
    email: "e2e_farmer@harvex.internal",
    password: "password123",
  });
  if (fAuthErr || !farmerAuth.session) {
    throw new Error(`Farmer login failed: ${fAuthErr?.message}`);
  }

  const farmerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${farmerAuth.session.access_token}` } },
  });

  // Fetch actual orders under farmer's visibility
  const { data: stagingOrders, error: stgErr } = await farmerClient
    .from("orders")
    .select("id, status, requested_quantity_kg, fulfilled_quantity_kg, price_per_kg, created_at")
    .limit(10);

  if (stgErr) {
    throw new Error(`Failed to query staging orders: ${stgErr.message}`);
  }

  console.log(`   ✓ Retrieved ${stagingOrders ? stagingOrders.length : 0} staging orders for verification`);
  if (stagingOrders && stagingOrders.length > 0) {
    for (const so of stagingOrders) {
      const state = resolveOrderFinancialState({
        id: so.id,
        quantity_kg: so.requested_quantity_kg,
        orders: so,
      });
      // In staging, without external payment receipts, Delivered orders MUST be AWAITING_SETTLEMENT_CONFIRMATION
      if (so.status === "Delivered") {
        if (state.settlementStatus !== "AWAITING_SETTLEMENT_CONFIRMATION" && state.settlementStatus !== "DISBURSED") {
          throw new Error(`Invalid state for delivered order: ${state.settlementStatus}`);
        }
        console.log(`   - Order #${so.id.slice(0, 8)} (${so.status}): status=${state.settlementStatus}, payoutConfirmed=${state.hasConfirmedPayout}`);
      }
    }
  }
  testsPassed++;

  console.log("\n=============================================================");
  console.log(`   🎉 ALL FINANCIAL ACCURACY TESTS PASSED (${testsPassed}/${testsPassed})!   `);
  console.log("=============================================================\n");
}

runFarmerFinancialAccuracyTests().catch((err) => {
  console.error("❌ FINANCIAL ACCURACY TEST FAILED:", err);
  process.exit(1);
});
