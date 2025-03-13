import { NextResponse } from "next/server";
import path from "path";
import { runScraper } from "@/scraper/index"; // Absolute import


export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { selectedSitemaps } = body;

        if (!selectedSitemaps || !Array.isArray(selectedSitemaps)) {
            return NextResponse.json({ error: "Invalid request format. Provide an array of sitemaps." }, { status: 400 });
        }

        console.log("🚀 Starting scraper with sitemaps:", selectedSitemaps);

        // Run the scraper
        const csvPath = await runScraper(selectedSitemaps);

        // Get relative path for frontend download
        const relativeCsvPath = `/downloads/${path.basename(csvPath)}`;

        console.log("✅ Scraping complete. CSV saved at:", relativeCsvPath);

        return NextResponse.json({ message: "Scraping completed successfully", csvPath: relativeCsvPath });
    } catch (error) {
        console.error("❌ Error during scraping:", error);
        return NextResponse.json({ error: "Scraping failed", details: error }, { status: 500 });
    }
}
