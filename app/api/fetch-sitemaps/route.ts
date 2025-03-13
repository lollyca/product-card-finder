import { NextResponse } from "next/server";
import axios from "axios";
import { XMLParser } from "fast-xml-parser";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { sitemapUrl } = body;

        if (!sitemapUrl) {
            return NextResponse.json({ error: "Missing sitemapUrl" }, { status: 400 });
        }

        console.log("📡 Fetching sub-sitemaps from:", sitemapUrl);

        // Fetch sitemap
        const response = await axios.get(sitemapUrl);
        const parser = new XMLParser();
        const parsedData = parser.parse(response.data);

        if (!parsedData.sitemapindex || !parsedData.sitemapindex.sitemap) {
            return NextResponse.json({ error: "Invalid sitemap structure" }, { status: 400 });
        }

        // Filter only the required sub-sitemaps
        const allowedSitemaps = ["post-sitemap.xml", "page-sitemap.xml"];
        const subSitemaps = parsedData.sitemapindex.sitemap
            .map((entry: { loc: string }) => entry.loc)
            .filter((url: string) => allowedSitemaps.some((allowed) => url.includes(allowed)));

        console.log("✅ Found relevant sub-sitemaps:", subSitemaps);

        return NextResponse.json({ subSitemaps });
    } catch (error) {
        console.error("❌ Error fetching sitemaps:", error);
        return NextResponse.json({ error: "Failed to fetch sitemaps", details: error }, { status: 500 });
    }
}
