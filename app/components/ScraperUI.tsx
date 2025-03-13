"use client";

import { useState, useEffect } from "react";

export default function ScraperUI() {
    const [sitemapUrl, setSitemapUrl] = useState("");
    const [sitemaps, setSitemaps] = useState<string[]>([]);
    const [selectedSitemaps, setSelectedSitemaps] = useState<string[]>([]);
    const [progress, setProgress] = useState<string>("");
    const [isScraping, setIsScraping] = useState(false);
    const [csvPath, setCsvPath] = useState("");

    // Fetch sitemaps from the entered URL
    const fetchSitemaps = async () => {
        const response = await fetch("/api/fetch-sitemaps", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sitemapUrl }),
        });
        const data = await response.json();
        if (data.subSitemaps) setSitemaps(data.subSitemaps);
    };

    // Start scraping process
    const startScraping = async () => {
        setIsScraping(true);
        setProgress("Starting scraping...");

        // Open SSE connection to track progress
        const eventSource = new EventSource("/api/progress");
        eventSource.onmessage = (event) => {
            setProgress(event.data);
        };

        // Send request to start scraping
        const response = await fetch("/api/start-scraping", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ selectedSitemaps }),
        });

        const data = await response.json();
        setCsvPath(data.csvPath || "");
        setIsScraping(false);
        eventSource.close();
    };

    // Cancel the scraping process
    const cancelScraping = async () => {
        await fetch("/api/cancel-scraping", { method: "POST" });
        setIsScraping(false);
        setProgress("Scraping canceled.");
    };

    // Download the CSV file
    const downloadCSV = () => {
        if (csvPath) {
            window.location.href = csvPath;
        }
    };

    return (
        <div className="p-6 max-w-lg mx-auto bg-white rounded-lg shadow-md">
            <h1 className="text-2xl font-bold mb-4">Product Card Scraper</h1>

            {/* Sitemap Input */}
            <div className="mb-4">
                <input
                    type="text"
                    className="w-full p-2 border rounded"
                    placeholder="Enter sitemap URL..."
                    value={sitemapUrl}
                    onChange={(e) => setSitemapUrl(e.target.value)}
                />
                <button className="mt-2 p-2 bg-blue-500 text-white rounded" onClick={fetchSitemaps}>
                    Fetch Sitemaps
                </button>
            </div>

            {/* Display Sitemap List */}
            <div className="mb-4">
                {sitemaps.length > 0 && (
                    <>
                        <h2 className="font-bold">Select Sitemaps:</h2>
                        {sitemaps.map((sitemap) => (
                            <div key={sitemap} className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={selectedSitemaps.includes(sitemap)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedSitemaps([...selectedSitemaps, sitemap]);
                                        } else {
                                            setSelectedSitemaps(selectedSitemaps.filter((s) => s !== sitemap));
                                        }
                                    }}
                                />
                                <span className="ml-2">{sitemap}</span>
                            </div>
                        ))}
                    </>
                )}
            </div>

            {/* Start Scraping Button */}
            {/* Show Start Scraping button only if sitemaps were fetched */}
            {sitemaps.length > 0 && (
                <button
                    className={`w-full p-2 mt-4 rounded ${selectedSitemaps.length > 0 ? "bg-green-500 text-white" : "bg-gray-400"}`}
                    onClick={startScraping}
                    disabled={selectedSitemaps.length === 0}
                >
                    {isScraping ? "Scraping in Progress..." : "Start Scraping"}
                </button>
            )}

            {/* Cancel Button */}
            {isScraping && (
                <button className="w-full p-2 mt-2 bg-red-500 text-white rounded" onClick={cancelScraping}>
                    Cancel Scraping
                </button>
            )}

            {/* Progress Bar */}
            {progress && (
                <div className="mt-4 w-full bg-gray-300 rounded-full h-4">
                    <div
                        className="bg-green-500 h-4 rounded-full"
                        style={{
                            width: typeof progress === "string" && progress.match(/\d+/)
                                ? `${progress.match(/\d+/)?.[0] ?? "0"}%`
                                : "0%",
                        }}

                    ></div>
                </div>
            )}
            <p className="text-center mt-2">{progress}</p>

            {/* Download Button */}
            {csvPath && (
                <a href="/api/download" download className="w-full p-2 mt-4 bg-blue-500 text-white rounded text-center block">
                    Download CSV
                </a>
            )}
        </div>
    );
}
