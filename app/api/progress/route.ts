import { setProgressCallback } from "../utils/progress";

export async function GET() {
    return new Response(
        new ReadableStream({
            start(controller) {
                setProgressCallback((progress, message) => {
                    try {
                        controller.enqueue(getEncodedMessage(progress, message));
                    } catch (err) {
                        console.error("⚠ SSE Controller closed early:", err);
                    }
                });

                controller.enqueue(getEncodedMessage(0, 'Starting scraping...'));
            },
            cancel() {
                console.log("API SSE connection closed.");
                setProgressCallback(() => { }); // Reset callback
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
