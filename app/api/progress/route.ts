import { NextRequest } from "next/server";

let progress = 0;
let progressCallback: ((message: string) => void) | null = null;

// Function to send progress updates
export function sendProgressUpdate(message: string) {
    progress = parseInt(message.replace(/\D/g, ""), 10) || progress;

    if (progressCallback) {
        try {
            progressCallback(message);
        } catch (err) {
            console.error("⚠ Error sending progress update:", err);
        }
    }
}

export async function GET(req: NextRequest) {
    const encoder = new TextEncoder();

    return new Response(
        new ReadableStream({
            start(controller) {
                progressCallback = (message) => {
                    try {
                        controller.enqueue(encoder.encode(`data: ${message}\n\n`));
                    } catch (err) {
                        console.error("⚠ SSE Controller closed early:", err);
                    }
                };

                controller.enqueue(encoder.encode(`data: Starting scraping...\n\n`));
            },
            cancel() {
                console.log("ℹ SSE connection closed.");
                progressCallback = null;
            },
        }),
        {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        }
    );
}
