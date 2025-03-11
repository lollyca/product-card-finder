import puppeteer from "puppeteer";
import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import fs from "fs";
import path from "path";
import { parse } from "json2csv";

// Function to fetch URLs from the main sitemap
const fetchSitemapUrls = async (sitemapUrl: string): Promise<string[]> => {
    try {
        const response = await axios.get(sitemapUrl);
        const parser = new XMLParser();
        const parsedData = parser.parse(response.data);

        console.log("Parsed Sitemap Data:", JSON.stringify(parsedData, null, 2));

        if (parsedData.sitemapindex && parsedData.sitemapindex.sitemap) {
            // Only select required sitemaps
            const allowedSitemaps = ["post-sitemap.xml", "page-sitemap.xml"];
            const subSitemaps = parsedData.sitemapindex.sitemap
                .map((entry: { loc: string }) => entry.loc)
                .filter((url) => allowedSitemaps.some((allowed) => url.includes(allowed)));

            console.log("Filtered Sub-Sitemaps:", subSitemaps);

            let allUrls: string[] = [];
            for (const subSitemap of subSitemaps) {
                console.log(`Fetching URLs from: ${subSitemap}`);
                const urls = await fetchProductUrlsFromSitemap(subSitemap);
                allUrls = allUrls.concat(urls);
            }

            console.log(`Total product pages found: ${allUrls.length}`);
            return allUrls;
        }

        console.error("Error: Sitemap structure is different than expected.");
        return [];
    } catch (error) {
        console.error("Error fetching sitemap:", error);
        return [];
    }
};

// Fetch product page URLs from a product sitemap
const fetchProductUrlsFromSitemap = async (sitemapUrl: string): Promise<string[]> => {
    try {
        const response = await axios.get(sitemapUrl);
        const parser = new XMLParser();
        const parsedData = parser.parse(response.data);

        if (parsedData.urlset && parsedData.urlset.url) {
            return parsedData.urlset.url.map((entry: { loc: string }) => entry.loc);
        }

        return [];
    } catch (error) {
        console.error(`Error fetching product sitemap: ${sitemapUrl}`, error);
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

    console.log(`\nResults for ${url}:`);
    console.log(products);
    console.log(`Total product cards found: ${products.length}`);

    await browser.close();
    return products;
};

// Save results to CSV
const saveToCSV = async (data: any[]) => {
    if (data.length === 0) {
        console.log("No data to write to CSV.");
        return;
    }

    const csv = parse(data, { fields: ["pageUrl", "name", "imageSrc", "isMissing"] });

    // Save file with timestamp
    const filePath = path.join(__dirname, `missing-images-${Date.now()}.csv`);
    fs.writeFileSync(filePath, csv);

    console.log(`\nCSV file saved: ${filePath}`);
};

// Run image check on all product pages from the sitemap
const runImageCheckOnSitemap = async () => {
    const sitemapUrl = "https://www.aluminess.com/sitemap_index.xml";
    const urls = await fetchSitemapUrls(sitemapUrl);

    console.log(`\nStarting image check on ${urls.length} pages...\n`);

    let allResults: any[] = [];

    for (const url of urls) {
        const products = await checkImagesOnPage(url);
        allResults = allResults.concat(products);
    }

    console.log("\nImage check completed for all pages.");
    console.log("Final results:", allResults);
    await saveToCSV(allResults);
};

// Start the process
runImageCheckOnSitemap();
