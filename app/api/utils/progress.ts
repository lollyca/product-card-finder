// 📌 app/api/utils/progress.ts
let progressCallback: ((progress: number, message: string) => void) | null = null;

// ✅ Function to send progress updates
export function sendProgressUpdate(progress: number, message: string) {
    if (progressCallback) {
        try {
            progressCallback(progress, message);
        } catch (err) {
            console.error("⚠ Error sending progress update:", err);
        }
    }
}

// ✅ Function to set the progress callback
export function setProgressCallback(callback: (progress: number, message: string) => void) {
    progressCallback = callback;
}
