/**
 * GET/POST /api/cron/market-syllabus-bridge
 * Polls Flomisma High Velocity / metrics; on surge in Supply Chain Finance errors
 * or Spice Trade transactions, increases Trade Finance Compliance weight and sets isTrending.
 * Call from cron (e.g. every 15 min).
 */

import { NextResponse } from "next/server";
import { runMarketSyllabusBridge } from "@/src/services/market-syllabus-bridge";

export async function GET(req: Request) {
  const auth = req.headers.get("Authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const result = await runMarketSyllabusBridge();
  return NextResponse.json(result);
}

export async function POST(req: Request) {
  return GET(req);
}
