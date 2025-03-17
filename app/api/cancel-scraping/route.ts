import { NextResponse } from "next/server";

let isScrapingCanceled = false; // ✅ Global flag to track cancellation

export function cancelScraping() {
    isScrapingCanceled = true;
    console.log("🛑 Scraping has been manually canceled.");
}

export function resetScrapingStatus() {
    isScrapingCanceled = false;
}

export function isScrapingStopped() {
    return isScrapingCanceled;
}

// ✅ Ensure Next.js API Routes follow proper HTTP method exports
export async function GET() {
    return NextResponse.json({ message: "Scraper cancel status", isScrapingCanceled });
}

export async function POST() {
    cancelScraping();
    return NextResponse.json({ message: "Scraping process has been canceled" });
}
