import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ number: 39982 });
}

export async function GET() {
  return NextResponse.json({ number: 39982 });
}
