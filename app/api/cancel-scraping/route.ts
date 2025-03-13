import { NextResponse } from "next/server";

let isScrapingCanceled = false; // ✅ Global flag to track cancellation

export function cancelScraping() {
    isScrapingCanceled = true;
}

export function resetScrapingStatus() {
    isScrapingCanceled = false;
}

export function GET() {
    return NextResponse.json({ message: "Scraper cancel status", isScrapingCanceled });
}

export function POST() {
    cancelScraping();
    return NextResponse.json({ message: "Scraping process has been canceled" });
}

export function isScrapingStopped() {
    return isScrapingCanceled;
}
