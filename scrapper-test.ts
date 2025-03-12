import { runScraper } from "./scraper/index";

const test = async () => {
    console.log("Starting test...");

    const testSitemaps = [
        "https://www.aluminess.com/post-sitemap.xml",
        "https://www.aluminess.com/page-sitemap.xml"
    ];

    try {
        const csvPath = await runScraper(testSitemaps);
        console.log(`✅ Test completed! CSV saved at: ${csvPath}`);
    } catch (error) {
        console.error("❌ Test failed:", error);
    }
};

test();
