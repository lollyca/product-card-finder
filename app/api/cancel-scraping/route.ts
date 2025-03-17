import { NextResponse } from "next/server";
import { cancelScraping, isScrapingStopped } from "../utils/scraper-control";

// ✅ Ensure Next.js API Routes follow proper HTTP method exports
export async function GET() {
    return NextResponse.json({ message: "Scraper cancel status", isScrapingCanceled: isScrapingStopped() });
}

export async function POST() {
    cancelScraping();
    return NextResponse.json({ message: "Scraping process has been canceled" });
}
