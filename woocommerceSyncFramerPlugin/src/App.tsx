import "./App.css"

import { framer, type ManagedCollection, type ManagedCollectionFieldInput } from "framer-plugin"
import { useEffect, useLayoutEffect, useState } from "react"
import { ConnectionScreen } from "./screens/ConnectionScreen"
import { ConfigScreen } from "./screens/ConfigScreen"
import { SyncProgressScreen } from "./screens/SyncProgressScreen"
import { LicenseScreen } from "./screens/LicenseScreen"
import { StorefrontComponents } from "./components/StorefrontComponents"
import { WooCommerceCreds, SyncPreferences } from "./types"

interface AppProps {
    collection: ManagedCollection
}

// Predefined WooCommerce Product fields that can be mapped to Framer CMS
const wooProductFields: ManagedCollectionFieldInput[] = [
    { id: "name", name: "Product Name", type: "string" },
    { id: "slug", name: "Product Slug", type: "string" },
    { id: "sku", name: "SKU / Stock Keeping Unit", type: "string" },
    { id: "type", name: "Product Type", type: "string" },
    { id: "status", name: "Product Status", type: "string" },
    { id: "description", name: "Description", type: "formattedText" },
    { id: "short_description", name: "Short Description", type: "formattedText" },
    { id: "price", name: "Current Price", type: "number" },
    { id: "regular_price", name: "Regular Price", type: "number" },
    { id: "sale_price", name: "Sale Price", type: "number" },
    { id: "stock_status", name: "Stock Status", type: "string" },
    { id: "stock_quantity", name: "Stock Quantity", type: "number" },
    { id: "weight", name: "Product Weight", type: "string" },
    { id: "featured_image", name: "Featured Image", type: "image" },
    { id: "categories", name: "Categories (Text)", type: "string" },
    { id: "tags", name: "Tags (Text)", type: "string" },
    { id: "attributes", name: "Attributes (Text)", type: "string" },
]

export function App({ collection }: AppProps) {
    const [step, setStep] = useState<"loading" | "license" | "connection" | "config" | "mapping" | "progress">("loading")
    const [isLicensed, setIsLicensed] = useState(false)
    const [activeTab, setActiveTab] = useState<"sync" | "components">("sync")
    const [creds, setCreds] = useState<WooCommerceCreds | null>(null)
    const [storeName, setStoreName] = useState("")
    const [prefs, setPrefs] = useState<SyncPreferences | null>(null)

    // Field mapping states
    const [fields, setFields] = useState<ManagedCollectionFieldInput[]>(wooProductFields)
    const [ignoredFieldIds, setIgnoredFieldIds] = useState<Set<string>>(new Set(["type", "status", "weight"]))
    const [selectedSlugField, setSelectedSlugField] = useState<ManagedCollectionFieldInput>(
        wooProductFields.find(f => f.id === "slug") || wooProductFields[1]
    )

    // Adjust Framer UI Frame Size for each wizard step to match Native sizing perfectly
    useLayoutEffect(() => {
        let width = 360
        let height = 450

        if (activeTab === "components") {
            width = 460
            height = 580
        } else {
            if (step === "license") {
                width = 360
                height = 420
            } else if (step === "connection") {
                width = 360
                height = 540
            } else if (step === "config") {
                width = 380
                height = 560
            } else if (step === "mapping") {
                width = 420
                height = 620
            } else if (step === "progress") {
                width = 440
                height = 540
            }
        }

        framer.showUI({
            width,
            height,
            minWidth: width,
            minHeight: height,
            resizable: true,
        })
    }, [step, activeTab])

    // Load previously configured WooCommerce Settings & Licensing on Init
    useEffect(() => {
        const loadSettings = async () => {
            try {
                // Verify license first
                const localLicense = localStorage.getItem("polar_license_active") === "true"
                const savedKey = await collection.getPluginData("polar_license_key")

                if (localLicense || savedKey) {
                    setIsLicensed(true)
                    
                    const prevUrl = await collection.getPluginData("woo_url")
                    const prevCk = await collection.getPluginData("woo_ck")
                    const prevCs = await collection.getPluginData("woo_cs")

                    if (prevUrl && prevCk && prevCs) {
                        setCreds({
                            url: prevUrl,
                            consumerKey: prevCk,
                            consumerSecret: prevCs,
                            sslBypass: true,
                        })
                        setStoreName("Saved Store Connection")
                        setStep("config")
                    } else {
                        setStep("connection")
                    }
                } else {
                    setStep("license")
                }
            } catch (error) {
                console.error("Failed to load plugin settings:", error)
                setStep("license")
            }
        }
        loadSettings()
    }, [collection])

    const handleActivateLicense = async (key: string) => {
        try {
            await collection.setPluginData("polar_license_key", key)
            localStorage.setItem("polar_license_active", "true")
            setIsLicensed(true)
            setStep("connection")
        } catch (err) {
            console.error("Failed to persist license activation:", err)
        }
    }

    const handleConnect = (newCreds: WooCommerceCreds, name: string) => {
        setCreds(newCreds)
        setStoreName(name)
        setStep("config")
    }

    const handleDisconnect = async () => {
        await collection.setPluginData("woo_url", "")
        await collection.setPluginData("woo_ck", "")
        await collection.setPluginData("woo_cs", "")
        setCreds(null)
        setStoreName("")
        setStep("connection")
    }

    const handleNextConfig = (newPrefs: SyncPreferences) => {
        setPrefs(newPrefs)
        setStep("mapping")
    }

    const handleToggleFieldIgnored = (fieldId: string) => {
        if (fieldId === "name" || fieldId === "slug") return // essential
        setIgnoredFieldIds(prev => {
            const copy = new Set(prev)
            if (copy.has(fieldId)) {
                copy.delete(fieldId)
            } else {
                copy.add(fieldId)
            }
            return copy
        })
    }

    const handleFieldNameChange = (fieldId: string, newName: string) => {
        setFields(prev =>
            prev.map(f => (f.id === fieldId ? { ...f, name: newName } : f))
        )
    }

    const handleStartSync = async (e: React.FormEvent) => {
        e.preventDefault()
        setStep("progress")
    }

    if (step === "loading") {
        return (
            <main className="loading">
                <div className="framer-spinner" />
            </main>
        )
    }

    if (step === "license") {
        return <LicenseScreen onActivate={handleActivateLicense} />
    }

    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            {/* Navigation Tabs */}
            {isLicensed && (
                <div style={{
                    display: "flex",
                    borderBottom: "1px solid var(--framer-color-bg-tertiary)",
                    backgroundColor: "var(--framer-color-bg)",
                    padding: "0 16px",
                    gap: "16px",
                    zIndex: 10
                }}>
                    <button
                        onClick={() => setActiveTab("sync")}
                        style={{
                            padding: "12px 0",
                            fontSize: "11px",
                            fontWeight: "600",
                            border: "none",
                            background: "none",
                            color: activeTab === "sync" ? "var(--framer-color-text)" : "var(--framer-color-text-tertiary)",
                            borderBottom: activeTab === "sync" ? "2px solid var(--framer-color-tint)" : "none",
                            cursor: "pointer"
                        }}
                    >
                        ⚡ Sync Core
                    </button>
                    <button
                        onClick={() => setActiveTab("components")}
                        style={{
                            padding: "12px 0",
                            fontSize: "11px",
                            fontWeight: "600",
                            border: "none",
                            background: "none",
                            color: activeTab === "components" ? "var(--framer-color-text)" : "var(--framer-color-text-tertiary)",
                            borderBottom: activeTab === "components" ? "2px solid var(--framer-color-tint)" : "none",
                            cursor: "pointer"
                        }}
                    >
                        🎨 Storefront Components
                    </button>
                </div>
            )}

            {activeTab === "components" ? (
                <StorefrontComponents />
            ) : (
                <>
                    {step === "connection" && <ConnectionScreen onConnect={handleConnect} />}

                    {step === "config" && (
                        <ConfigScreen
                            storeName={storeName}
                            storeUrl={creds?.url || ""}
                            onNext={handleNextConfig}
                            onDisconnect={handleDisconnect}
                        />
                    )}

                    {step === "mapping" && (
                        <main className="framer-hide-scrollbar mapping" style={{ height: "100%", overflowY: "auto" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: "5px" }}>
                                <span style={{ fontSize: "10px", color: "var(--framer-color-text-tertiary)", textTransform: "uppercase", fontWeight: "600" }}>
                                    Field Mapping
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setStep("config")}
                                    style={{ background: "none", border: "none", color: "var(--framer-color-text-tertiary)", cursor: "pointer", fontSize: "11px" }}
                                >
                                    ← Back
                                </button>
                            </div>

                            <form onSubmit={handleStartSync}>
                                <label className="slug-field" htmlFor="slugField">
                                    Slug Matching Field
                                    <select
                                        required
                                        name="slugField"
                                        className="field-input"
                                        value={selectedSlugField.id}
                                        onChange={e => {
                                            const field = fields.find(f => f.id === e.target.value)
                                            if (field) setSelectedSlugField(field)
                                        }}
                                    >
                                        {fields
                                            .filter(f => f.type === "string")
                                            .map(f => (
                                                <option key={f.id} value={f.id}>
                                                    {f.name}
                                                </option>
                                            ))}
                                    </select>
                                </label>

                                <div className="fields" style={{ marginTop: "15px" }}>
                                    <span className="fields-column">WooCommerce Field</span>
                                    <span>Framer Target Name</span>
                                    {fields.map(field => {
                                        const isIgnored = ignoredFieldIds.has(field.id)
                                        const isEssential = field.id === "name" || field.id === "slug"

                                        return (
                                            <div key={field.id} style={{ display: "contents" }}>
                                                <button
                                                    type="button"
                                                    className={`source-field ${isIgnored ? "ignored" : ""}`}
                                                    onClick={() => handleToggleFieldIgnored(field.id)}
                                                    style={{ display: "flex", gap: "8px", alignItems: "center" }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={!isIgnored}
                                                        disabled={isEssential}
                                                        tabIndex={-1}
                                                        readOnly
                                                    />
                                                    <span>{field.name}</span>
                                                </button>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" fill="none">
                                                    <title>maps to</title>
                                                    <path
                                                        fill="transparent"
                                                        stroke="#999"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth="1.5"
                                                        d="m2.5 7 3-3-3-3"
                                                    />
                                                </svg>
                                                <input
                                                    type="text"
                                                    disabled={isIgnored}
                                                    placeholder={field.id}
                                                    value={field.name}
                                                    onChange={e => handleFieldNameChange(field.id, e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === "Enter") {
                                                            e.preventDefault()
                                                        }
                                                    }}
                                                />
                                            </div>
                                        )
                                    })}
                                </div>

                                <footer>
                                    <hr />
                                    <button type="submit" style={{ width: "100%" }}>
                                        Begin Synchronization
                                    </button>
                                </footer>
                            </form>
                        </main>
                    )}

                    {step === "progress" && (
                        <SyncProgressScreen
                            collection={collection}
                            creds={creds!}
                            prefs={prefs!}
                            selectedFields={fields.filter(f => !ignoredFieldIds.has(f.id))}
                            slugField={selectedSlugField}
                            onFinished={() => framer.closePlugin("Synchronization complete!", { variant: "success" })}
                            onCancel={() => setStep("mapping")}
                        />
                    )}
                </>
            )}
        </div>
    )
}
