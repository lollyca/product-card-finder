import puppeteer from "puppeteer";
import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import fs from "fs";
import path from "path";
import { parse } from "json2csv";
import { sendProgressUpdate } from "@/app/api/progress/route"; // ✅ Import SSE progress updates
import { isScrapingStopped, resetScrapingStatus } from "@/app/api/cancel-scraping/route";

// **Fetch URLs from the selected sitemaps**
const fetchSitemapUrls = async (sitemaps: string[]): Promise<string[]> => {
    try {
        let allUrls: string[] = [];

        for (const sitemapUrl of sitemaps) {
            const response = await axios.get(sitemapUrl);
            const parser = new XMLParser();
            const parsedData = parser.parse(response.data);

            if (parsedData.urlset && parsedData.urlset.url) {
                const urls = Array.isArray(parsedData.urlset.url)
                    ? parsedData.urlset.url.map((entry: { loc: string }) => entry.loc) // ✅ If it's an array, map normally
                    : [parsedData.urlset.url.loc]; // ✅ If it's a single object, wrap it in an array

                allUrls = allUrls.concat(urls);
            }
        }

        console.log(`Total product pages found: ${allUrls.length}`);
        return allUrls;
    } catch (error) {
        console.error("❌ Error fetching sitemaps:", error);
        return [];
    }
};

// **Check images on a single product page**
const checkImagesOnPage = async (url: string) => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto(url, {
            waitUntil: "domcontentloaded", // Faster than "networkidle2"
            timeout: 60000, // ✅ Increase timeout to 60 seconds
        });
    } catch (error) {
        console.error(`❌ Timeout or navigation error on: ${url}`, error);
        await browser.close();
        return []; // ✅ Return empty results to prevent crashing
    }

    const products = await page.evaluate(() => {
        return Array.from(document.querySelectorAll(".bpag-product-card")).map((card) => {
            const img = card.querySelector("img");
            const imgSrc = img?.getAttribute("src") || "No Image";
            const productName =
                card.querySelector(".my-4.text-lg.font-bold.heading-font")?.textContent?.trim() || "Unknown Product";

            return {
                pageUrl: window.location.href,
                name: productName,
                imageSrc: imgSrc,
                isMissing: !imgSrc || imgSrc === "No Image",
            };
        });
    });

    console.log(`\nResults for ${url}:`, products);
    console.log(`Total product cards found: ${products.length}`);

    await browser.close();
    return products;
};

// **Save results to CSV**
const saveToCSV = async (data: any[]) => {
    if (data.length === 0) {
        console.log("⚠ No product images found. Creating an empty CSV with headers.");
        data = [{ pageUrl: "", name: "No product card found", imageSrc: "", isMissing: "" }];
    }

    const csv = parse(data, { fields: ["pageUrl", "name", "imageSrc", "isMissing"] });

    // Save file with timestamp
    const filePath = path.join(process.cwd(), "public", `missing-images-${Date.now()}.csv`);
    fs.writeFileSync(filePath, csv);

    console.log(`✅ CSV file saved: ${filePath}`);
    return filePath;
};

// **Exported function to be used in the API**
export async function runScraper(selectedSitemaps: string[]): Promise<string | null> {
    console.log(`🚀 Starting scraper for selected sitemaps:`, selectedSitemaps);
    resetScrapingStatus(); // ✅ Reset cancel status at the start

    const urls = await fetchSitemapUrls(selectedSitemaps);
    let allResults: any[] = [];
    const totalPages = urls.length;

    for (let i = 0; i < totalPages; i++) {
        if (isScrapingStopped()) {
            console.log("🛑 Scraping was canceled. Stopping process...");
            return null; // ✅ Stops scraping early
        }

        const url = urls[i];

        sendProgressUpdate(Math.round(((i + 1) / totalPages) * 100), `Scraping ${i + 1}/${totalPages} pages... (${Math.round(((i + 1) / totalPages) * 100)}%)`);
        console.log(`🔍 Scraping page ${i + 1}/${totalPages}:`, url);

        try {
            const products = await checkImagesOnPage(url);
            allResults = allResults.concat(products);
        } catch (error) {
            console.error(`❌ Skipping failed page: ${url}`, error);
        }

    }

    const filePath = await saveToCSV(allResults);
    const relativePath = "/" + path.basename(filePath); // ✅ Get only the filename
    console.log(`✅ Scraping complete. CSV available at: ${relativePath}`);
    return relativePath;

}

