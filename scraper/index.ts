import puppeteer from "puppeteer";
import chromium from "@sparticuz/chromium-min";
import puppeteerCore, { Browser, Page } from "puppeteer-core";
import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import { parse } from "json2csv";
import { sendProgressUpdate } from "@/app/api/utils/progress"; // ✅ Import SSE progress updates
import { isScrapingStopped, resetScrapingStatus } from "@/app/api/utils/scraper-control";


//prep for enviorment
const remoteExecutablePath = "https://github.com/Sparticuz/chromium/releases/download/v121.0.0/chromium-v121.0.0-pack.tar";

let browser: Browser | undefined;

async function getBrowser() {
    if (browser) return browser;

    if (process.env.NEXT_PUBLIC_VERCEL_ENVIRONMENT === "production") {
        browser = await puppeteerCore.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath(remoteExecutablePath),
            headless: chromium.headless,
        });
    } else {
        browser = await puppeteer.launch({
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
            headless: true,
        }) as any;
    }
    return browser;
}


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
    const browser = await getBrowser();
    let page: Page | undefined = undefined;

    try {
        page = await browser!.newPage();

        await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 60000,
        });

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

        await page.close(); // ✅ just close the page, not the browser
        return products;
    } catch (error) {
        console.error(`❌ Timeout or navigation error on: ${url}`, error);
        if (page) await page.close(); // close page only if it was created
        return [];
    }
};


// **Save results to CSV**
const formatToCSV = async (data: any[]) => {
    if (data.length === 0) {
        console.log("No product images found. Creating an empty CSV with headers.");
        data = [{ pageUrl: "", name: "No product card found", imageSrc: "", isMissing: "" }];
    }

    const csv = parse(data, { fields: ["pageUrl", "name", "imageSrc", "isMissing"] });

    return csv;
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

    const csvString = await formatToCSV(allResults);

    if (browser) {
        await browser.close(); // ✅ clean up once at the very end
        browser = undefined;         // reset global reference
    }

    return csvString;
}

