import puppeteer from "puppeteer";
import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import fs from "fs";
import path from "path";
import { parse } from "json2csv";

// Fetch URLs from the selected sitemaps
const fetchSitemapUrls = async (sitemaps: string[]): Promise<string[]> => {
    try {
        let allUrls: string[] = [];

        for (const sitemapUrl of sitemaps) {
            const response = await axios.get(sitemapUrl);
            const parser = new XMLParser();
            const parsedData = parser.parse(response.data);

            if (parsedData.urlset && parsedData.urlset.url) {
                const urls = parsedData.urlset.url.map((entry: { loc: string }) => entry.loc);
                allUrls = allUrls.concat(urls);
            }
        }

        console.log(`Total product pages found: ${allUrls.length}`);
        return allUrls;
    } catch (error) {
        console.error("Error fetching sitemaps:", error);
        return [];
    }
};

// Check images on a single product page
const checkImagesOnPage = async (url: string) => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: "networkidle2" });

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

// Save results to CSV
const saveToCSV = async (data: any[]) => {
    if (data.length === 0) {
        console.log("No data to write to CSV.");
        return "";
    }

    const csv = parse(data, { fields: ["pageUrl", "name", "imageSrc", "isMissing"] });

    // Save file with timestamp
    const filePath = path.join(process.cwd(), "public", `missing-images-${Date.now()}.csv`);
    fs.writeFileSync(filePath, csv);

    console.log(`\nCSV file saved: ${filePath}`);
    return filePath;
};

// **Exported function to be used in the API**
export async function runScraper(selectedSitemaps: string[]): Promise<string> {
    console.log(`Starting scraper for selected sitemaps:`, selectedSitemaps);

    const urls = await fetchSitemapUrls(selectedSitemaps);
    let allResults: any[] = [];

    for (const url of urls) {
        const products = await checkImagesOnPage(url);
        allResults = allResults.concat(products);
    }

    console.log("\nImage check completed.");
    return await saveToCSV(allResults);
}
