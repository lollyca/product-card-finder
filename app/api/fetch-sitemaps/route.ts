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

        console.log("📡 API Fetching sub-sitemaps from:", sitemapUrl);

        // Fetch sitemap
        const response = await axios.get(sitemapUrl);
        const parser = new XMLParser();
        const parsedData = parser.parse(response.data);

        if (!parsedData.sitemapindex || !parsedData.sitemapindex.sitemap) {
            return NextResponse.json({ error: "Invalid sitemap structure" }, { status: 400 });
        }

        // ✅ No filtering – Return ALL sub-sitemaps
        const subSitemaps = parsedData.sitemapindex.sitemap.map((entry: { loc: string }) => entry.loc);

        console.log("✅ API Found sub-sitemaps:", subSitemaps);

        return NextResponse.json({ subSitemaps });
    } catch (error) {
        console.error("❌ Error fetching sitemaps:", error);
        return NextResponse.json({ error: "Failed to fetch sitemaps", details: error }, { status: 500 });
    }
}
