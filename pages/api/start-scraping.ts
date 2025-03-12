import { NextApiRequest, NextApiResponse } from "next";
import { runScraper } from "../../scraper/index"; // Import the scraper function
import path from "path";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { selectedSitemaps } = req.body;

    if (!selectedSitemaps || !Array.isArray(selectedSitemaps)) {
        return res.status(400).json({ error: "Invalid request. Please provide selectedSitemaps as an array." });
    }

    try {
        console.log("🚀 Starting scraper with sitemaps:", selectedSitemaps);

        // Run the scraper
        const csvPath = await runScraper(selectedSitemaps);

        // Get the relative path for frontend download
        const relativeCsvPath = path.relative(process.cwd(), csvPath);

        console.log("✅ Scraping complete. CSV saved at:", relativeCsvPath);

        return res.status(200).json({ message: "Scraping started successfully", csvPath: `/public/${path.basename(csvPath)}` });
    } catch (error) {
        console.error("❌ Error in scraper:", error);
        return res.status(500).json({ error: "Scraping failed", details: error });
    }
}
