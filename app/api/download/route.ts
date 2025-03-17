import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
    try {
        const publicDir = path.join(process.cwd(), "public");
        const files = fs.readdirSync(publicDir).filter(file => file.startsWith("missing-images-") && file.endsWith(".csv"));

        if (files.length === 0) {
            return NextResponse.json({ error: "No CSV file found" }, { status: 404 });
        }

        // Get the latest CSV file based on timestamp
        const latestFile = files.sort((a, b) => {
            const timeA = parseInt(a.split("-")[2].split(".")[0], 10);
            const timeB = parseInt(b.split("-")[2].split(".")[0], 10);
            return timeB - timeA; // Sort descending
        })[0];

        const filePath = path.join(publicDir, latestFile);

        // ✅ Convert `fs.createReadStream()` to a `ReadableStream`
        const fileStream = fs.createReadStream(filePath);
        const stream = new ReadableStream({
            start(controller) {
                fileStream.on("data", (chunk) => controller.enqueue(chunk));
                fileStream.on("end", () => controller.close());
                fileStream.on("error", (err) => controller.error(err));
            },
        });

        return new Response(stream, {
            headers: {
                "Content-Disposition": `attachment; filename=${latestFile}`,
                "Content-Type": "text/csv",
            },
        });
    } catch (error) {
        console.error("❌ Error serving CSV file:", error);
        return NextResponse.json({ error: "Failed to download CSV" }, { status: 500 });
    }
}
