import { useEffect, useRef, useState } from "react"
import type { WooCommerceCreds, SyncPreferences, WooCommerceCategory } from "../types"
import { WooCommerceService } from "../services/woocommerce"
import { sanitizeAndCleanHtml } from "../utils/html-converter"
import { framer, type ManagedCollection, type ManagedCollectionFieldInput } from "framer-plugin"

interface SyncProgressScreenProps {
    collection: ManagedCollection
    creds: WooCommerceCreds
    prefs: SyncPreferences
    selectedFields: readonly ManagedCollectionFieldInput[]
    slugField: ManagedCollectionFieldInput
    onFinished: () => void
    onCancel: () => void
}

export function SyncProgressScreen({
    collection,
    creds,
    prefs,
    selectedFields,
    slugField,
    onFinished,
    onCancel,
}: SyncProgressScreenProps) {
    const [progress, setProgress] = useState(0)
    const [currentTask, setCurrentTask] = useState("Initializing...")
    const [logs, setLogs] = useState<string[]>([])
    const [metrics, setMetrics] = useState({
        total: 0,
        processed: 0,
        updated: 0,
        failed: 0,
    })
    const [elapsedTime, setElapsedTime] = useState(0)
    const [isFinished, setIsFinished] = useState(false)
    const [isFailed, setIsFailed] = useState(false)
    const [errorMsg, setErrorMsg] = useState("")

    const logsEndRef = useRef<HTMLDivElement>(null)
    const timerRef = useRef<any>(null)
    const isAborted = useRef(false)

    const addLog = (msg: string) => {
        const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        setLogs(prev => [...prev, `[${time}] ${msg}`])
    }

    // Scroll to bottom of logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [logs])

    // Timer
    useEffect(() => {
        timerRef.current = setInterval(() => {
            setElapsedTime(prev => prev + 1)
        }, 1000)

        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [])

    // Primary Sync Logic
    useEffect(() => {
        const runSync = async () => {
            try {
                addLog("Connecting to WooCommerce REST API...")
                const client = new WooCommerceService(creds)

                // 1. Fetch Categories (if selected)
                let wooCategories: WooCommerceCategory[] = []
                if (prefs.syncCategories) {
                    setCurrentTask("Fetching categories...")
                    addLog("Requesting categories from store...")
                    wooCategories = await client.fetchCategories()
                    addLog(`Successfully retrieved ${wooCategories.length} product categories.`)
                }

                // 2. Fetch Products
                setCurrentTask("Fetching product catalogs...")
                addLog("Requesting paginated products from store...")
                const wooProducts = await client.fetchProducts(msg => addLog(msg))
                addLog(`Successfully fetched ${wooProducts.length} total products.`)

                if (isAborted.current) return

                // Set total counts
                const totalItems = wooProducts.length
                setMetrics(prev => ({ ...prev, total: totalItems }))

                // 3. Image Upload Mapping / Cache to prevent duplicate uploads
                const imageCacheKey = `framer_uploaded_images_${creds.url.replace(/[^a-zA-Z0-9]/g, "_")}`
                let localImageCache: Record<string, string> = {}
                try {
                    const cached = localStorage.getItem(imageCacheKey)
                    if (cached) localImageCache = JSON.parse(cached)
                } catch (e) {
                    console.error("Failed to read image upload cache:", e)
                }

                // Helper to download and upload image
                const getOrUploadImage = async (url: string, productName: string): Promise<string> => {
                    if (!url) return ""
                    if (localImageCache[url]) {
                        addLog(`Reusing cached asset library upload for: ${productName}`)
                        return localImageCache[url]
                    }

                    try {
                        addLog(`Downloading external product image for: ${productName}`)
                        const response = await fetch(url)
                        const blob = await response.blob()
                        const filename = url.split("/").pop() || "image.jpg"
                        const file = new File([blob], filename, { type: blob.type })

                        addLog(`Uploading image file natively to Framer assets: ${filename}`)
                        const imageAsset = await framer.uploadImage(file)
                        const framerAssetUrl = imageAsset.url

                        // Store to cache
                        localImageCache[url] = framerAssetUrl
                        localStorage.setItem(imageCacheKey, JSON.stringify(localImageCache))

                        return framerAssetUrl
                    } catch (e: any) {
                        addLog(`⚠️ Image download/upload failed for: ${productName}. Falling back to source URL.`)
                        return url
                    }
                }

                // 4. Synchronize CMS Items
                setCurrentTask("Importing items into CMS...")
                const finalCmsItems: any[] = []
                const existingItemIds = new Set(await collection.getItemIds())

                for (let i = 0; i < wooProducts.length; i++) {
                    if (isAborted.current) return

                    const p = wooProducts[i]
                    if (!p) continue
                    setCurrentTask(`Processing product: ${p.name}`)
                    addLog(`Processing product [${i + 1}/${wooProducts.length}]: ${p.name}`)

                    // Image downloading
                    let featuredImage = p.featured_image
                    if (prefs.importImages && featuredImage) {
                        featuredImage = await getOrUploadImage(featuredImage, p.name)
                    }

                    // HTML conversion
                    const desc = prefs.convertHtml ? sanitizeAndCleanHtml(p.description) : p.description
                    const shortDesc = prefs.convertHtml ? sanitizeAndCleanHtml(p.short_description) : p.short_description

                    // Map all product properties to fields
                    const rawItemData: Record<string, any> = {
                        id: p.id,
                        name: p.name,
                        slug: p.slug,
                        sku: p.sku,
                        type: p.type,
                        status: p.status,
                        description: desc,
                        short_description: shortDesc,
                        price: p.price,
                        regular_price: p.regular_price,
                        sale_price: p.sale_price,
                        stock_status: p.stock_status,
                        stock_quantity: p.stock_quantity,
                        weight: p.weight,
                        featured_image: featuredImage,
                        categories: p.categories,
                        tags: p.tags,
                        attributes: p.attributes,
                    }

                    // Pick selected ones
                    const fieldData: Record<string, any> = {}
                    for (const field of selectedFields) {
                        const rawValue = rawItemData[field.id]
                        if (rawValue !== undefined) {
                            fieldData[field.id] = rawValue
                        }
                    }

                    const slugVal = rawItemData[slugField.id] || p.slug

                    finalCmsItems.push({
                        id: slugVal,
                        slug: slugVal,
                        draft: p.status !== "publish",
                        fieldData,
                    })

                    const existed = existingItemIds.has(slugVal)
                    existingItemIds.delete(slugVal)

                    setMetrics(prev => ({
                        ...prev,
                        processed: prev.processed + 1,
                        updated: existed ? prev.updated + 1 : prev.updated,
                    }))

                    setProgress(Math.round(((i + 1) / wooProducts.length) * 100))
                }

                // 5. Clean up removed items if deleteRemoved option is selected
                if (prefs.deleteRemoved && existingItemIds.size > 0) {
                    addLog(`Auto-cleaning ${existingItemIds.size} removed products from collection...`)
                    await collection.removeItems(Array.from(existingItemIds))
                }

                // Add to collection
                addLog("Writing all product items into Framer CMS Collection...")
                await collection.addItems(finalCmsItems)

                // Store metadata settings on collection
                await collection.setPluginData("woo_url", creds.url)
                await collection.setPluginData("woo_ck", creds.consumerKey)
                await collection.setPluginData("woo_cs", creds.consumerSecret)
                await collection.setPluginData("slugFieldId", slugField.id)

                addLog("🎉 Synchronization completed successfully!")
                setIsFinished(true)
                if (timerRef.current) clearInterval(timerRef.current)
            } catch (err: any) {
                console.error("Sync aborted:", err)
                setErrorMsg(err.message || "An unexpected error occurred during sync.")
                setIsFailed(true)
                addLog(`❌ Sync Failure: ${err.message || err}`)
                if (timerRef.current) clearInterval(timerRef.current)
            }
        }

        runSync()

        return () => {
            isAborted.current = true
        }
    }, [])

    const handleAbort = () => {
        isAborted.current = true
        addLog("Sync aborted by user.")
        if (timerRef.current) clearInterval(timerRef.current)
        onCancel()
    }

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60).toString().padStart(2, "0")
        const s = (secs % 60).toString().padStart(2, "0")
        return `${m}:${s}`
    }

    return (
        <main className="setup" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "10px", color: "var(--framer-color-text-tertiary)", textTransform: "uppercase", fontWeight: "600", width: "100%" }}>
                Syncing Store
            </span>

            <div style={{ width: "100%", margin: "10px 0" }}>
                <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "4px" }}>
                    {isFinished ? "Sync Completed!" : isFailed ? "Sync Failed" : currentTask}
                </div>
                <div style={{ width: "100%", height: "6px", backgroundColor: "var(--framer-color-bg-tertiary)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{
                        width: `${progress}%`,
                        height: "100%",
                        backgroundColor: isFailed ? "var(--framer-color-error)" : "var(--framer-color-tint)",
                        transition: "width 0.3s ease"
                    }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--framer-color-text-tertiary)", marginTop: "4px" }}>
                    <span>{progress}% complete</span>
                    <span>Elapsed: {formatTime(elapsedTime)}</span>
                </div>
            </div>

            {/* Metrics */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "8px",
                width: "100%",
                backgroundColor: "var(--framer-color-bg-tertiary)",
                borderRadius: "8px",
                padding: "10px",
                marginBottom: "10px",
                textAlign: "center"
            }}>
                <div>
                    <div style={{ fontSize: "16px", fontWeight: "700" }}>{metrics.total}</div>
                    <div style={{ fontSize: "10px", color: "var(--framer-color-text-tertiary)" }}>Total</div>
                </div>
                <div>
                    <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--framer-color-tint)" }}>{metrics.processed}</div>
                    <div style={{ fontSize: "10px", color: "var(--framer-color-text-tertiary)" }}>Processed</div>
                </div>
                <div>
                    <div style={{ fontSize: "16px", fontWeight: "700", color: isFailed ? "var(--framer-color-error)" : "inherit" }}>
                        {metrics.failed}
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--framer-color-text-tertiary)" }}>Failed</div>
                </div>
            </div>

            {/* Running Logs */}
            <div style={{
                flex: 1,
                width: "100%",
                backgroundColor: "var(--framer-color-bg-tertiary)",
                border: "1px solid var(--framer-color-bg-secondary)",
                borderRadius: "8px",
                padding: "10px",
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "10px",
                color: "var(--framer-color-text-secondary)",
                overflowY: "auto",
                whiteSpace: "pre-wrap",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                maxHeight: "150px"
            }}>
                {logs.map((log, index) => (
                    <div key={index}>{log}</div>
                ))}
                <div ref={logsEndRef} />
            </div>

            {isFailed && (
                <div style={{ width: "100%", color: "var(--framer-color-error)", fontSize: "11px", marginTop: "10px", lineHeight: "1.4" }}>
                    ⚠️ {errorMsg}
                </div>
            )}

            <div style={{ width: "100%", marginTop: "15px" }}>
                {isFinished || isFailed ? (
                    <button onClick={onFinished} style={{ width: "100%" }}>
                        Finish & Close
                    </button>
                ) : (
                    <button onClick={handleAbort} style={{ width: "100%", backgroundColor: "var(--framer-color-error)" }}>
                        Abort Sync
                    </button>
                )}
            </div>
        </main>
    )
}
