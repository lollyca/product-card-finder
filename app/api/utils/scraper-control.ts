// 📌 app/api/utils/scraper-control.ts
let isScrapingCanceled = false; // ✅ Global flag to track cancellation

export function cancelScraping() {
    isScrapingCanceled = true;
    console.log("🛑 API Scraping has been manually canceled.");
}

export function resetScrapingStatus() {
    isScrapingCanceled = false;
}

export function isScrapingStopped() {
    return isScrapingCanceled;
}
