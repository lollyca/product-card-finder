import { NextRequest } from "next/server";

let progress = 0;
let progressCallback: ((progress: number, message: string) => void) | null = null;

// Function to send progress updates
export function sendProgressUpdate(progress: number, message: string) {
    if (progressCallback) {
        try {
            progressCallback(progress, message);
        } catch (err) {
            console.error("⚠ Error sending progress update:", err);
        }
    }
}

export async function GET(req: NextRequest) {
    return new Response(
        new ReadableStream({
            start(controller) {
                progressCallback = (progress, message) => {
                    try {
                        controller.enqueue(getEncodedMessage(progress, message));
                    } catch (err) {
                        console.error("⚠ SSE Controller closed early:", err);
                    }
                };

                controller.enqueue(getEncodedMessage(0, 'Starting scraping...'));
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

function getEncodedMessage(progress: number, message: string): Uint8Array {
    const encoder = new TextEncoder();
    const text = JSON.stringify({ progress, message });
    return encoder.encode(`data: ${text}\n\n`);
}