"use client";

import { useState } from "react";
import { FetchSitemapsRequest } from "../api/fetch-sitemaps/route";
import { symlink } from "fs";

export default function ScraperUI() {
    const [sitemapUrl, setSitemapUrl] = useState("");
    const [sitemaps, setSitemaps] = useState<string[]>([]);
    const [selectedSitemaps, setSelectedSitemaps] = useState<string[]>([]);
    const [progress, setProgress] = useState<string>("");
    const [progressPercentage, setProgressPercentage] = useState(0);
    const [isScraping, setIsScraping] = useState(false);
    const [csvText, setCsvText] = useState("");
    const [isScrapingComplete, setIsScrapingComplete] = useState(false);


    // Fetch sitemaps from the entered URL
    const fetchSitemaps = async () => {
        const urlInput: FetchSitemapsRequest = {
            sitemapUrl: sitemapUrl
        }

        const response = await fetch("/api/fetch-sitemaps", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(urlInput),
        });
        const data = await response.json();
        if (data.subSitemaps) setSitemaps(data.subSitemaps);
    };

    // Start scraping process
    const startScraping = async () => {
        setIsScraping(true);
        setIsScrapingComplete(false);
        setProgress("Starting scraping...");
        setProgressPercentage(0);

        const eventSource = new EventSource("/api/progress");
        eventSource.onmessage = (event) => {
            if (event.data) {
                const { progress, message } = JSON.parse(event.data);
                setProgress(message);
                setProgressPercentage(progress);
            }
        };

        try {
            const response = await fetch("/api/start-scraping", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ selectedSitemaps }),
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.error === "Scraping was canceled") {
                    console.warn("ℹ Scraping was manually canceled. No error.");
                    setProgress("Scraping canceled."); // ✅ Display a normal message
                    return;
                }
                throw new Error(data.error || "Scraping failed.");
            }

            setCsvText(data.csvData || "");
            if (data.csvData) {
                setIsScrapingComplete(true);
            }
        } catch (error) {
            console.error("❌ Scraping failed:", error);
            setProgress("Scraping failed. Please try again.");
        } finally {
            setIsScraping(false);
            eventSource.close();
        }
    };

    // Cancel the scraping process
    const cancelScraping = async () => {
        await fetch("/api/cancel-scraping", { method: "POST" });
        setIsScraping(false);
        setProgress("Scraping canceled.");
        setIsScrapingComplete(false); // ✅ Reset completion status
        console.log("🚨 Scraping canceled! isScrapingComplete:", isScrapingComplete);
    };

    const restartScraper = async () => {
        if (isScraping) {
            await fetch("/api/cancel-scraping", { method: "POST" });
        }

        setSitemapUrl("");
        setSitemaps([]);
        setSelectedSitemaps([]);
        setProgress("");
        setProgressPercentage(0);
        setIsScraping(false);
        setCsvText("");
        setIsScrapingComplete(false); // ✅ Reset completion status
        console.log("🔄 Restart clicked! isScrapingComplete:", isScrapingComplete);
    };

    return (
        <div className="p-6 max-w-lg mx-auto bg-white rounded-lg shadow-md">
            <h1 className="text-2xl font-bold mb-4">Product Card Scraper</h1>

            {/* Sitemap Input */}
            <div className="mb-4">
                <input
                    autoFocus
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

            {/* Select All & Clear All Buttons */}
            {sitemaps.length > 0 && (
                <div className="flex gap-2 mb-2">
                    <button
                        className="p-2 bg-gray-300 rounded text-sm"
                        onClick={() => setSelectedSitemaps([...sitemaps])} // ✅ Select all
                    >
                        Select All
                    </button>
                    <button
                        className="p-2 bg-gray-300 rounded text-sm"
                        onClick={() => setSelectedSitemaps([])} // ✅ Clear all
                    >
                        Clear All
                    </button>
                </div>
            )}

            {/* Start Scraping Button */}
            {!isScraping && sitemaps.length > 0 && !progress && (
                <button
                    className={`w-full p-2 mt-4 rounded ${selectedSitemaps.length > 0 ? "bg-green-500 text-white" : "bg-gray-400"
                        }`}
                    onClick={startScraping}
                    disabled={selectedSitemaps.length === 0}
                >
                    Start Scraping
                </button>
            )}

            {/* Cancel Button */}
            {isScraping && (
                <button className="w-full p-2 mt-2 bg-red-500 text-white rounded" onClick={cancelScraping}>
                    Cancel Scraping
                </button>
            )}

            {/* Progress Bar - Only Show When Scraping */}
            {progress && (
                <>
                    <div className="mt-4 w-full bg-gray-300 rounded-full h-4 overflow-hidden">
                        <div
                            className="bg-green-500 h-4 rounded-full transition-all duration-500 ease-in-out"
                            style={{ width: `${progressPercentage}%` }}
                        ></div>
                    </div>
                    <p className="text-center mt-2">{progress}</p>
                </>
            )}

            {/* Download Button */}
            {csvText && isScrapingComplete && !isScraping && (
                <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(csvText)}`} download="new_data.csv" className="w-full p-2 mt-4 bg-blue-500 text-white rounded text-center block">
                    Download CSV
                </a>
            )}

            {/* Restart Button - Always Visible Once Sitemaps Are Fetched */}
            {sitemaps.length > 0 && (
                <button
                    className="w-full p-2 mt-4 bg-yellow-500 text-white rounded"
                    onClick={restartScraper}
                >
                    Restart
                </button>
            )}
        </div>
    );
}
