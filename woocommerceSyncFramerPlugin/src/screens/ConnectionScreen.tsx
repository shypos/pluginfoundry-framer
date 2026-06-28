import { useState } from "react"
import { WooCommerceCreds } from "../types"
import { WooCommerceService } from "../services/woocommerce"
import { framer } from "framer-plugin"

interface ConnectionScreenProps {
    onConnect: (creds: WooCommerceCreds, storeName: string) => void
}

export function ConnectionScreen({ onConnect }: ConnectionScreenProps) {
    const [url, setUrl] = useState("")
    const [consumerKey, setConsumerKey] = useState("")
    const [consumerSecret, setConsumerSecret] = useState("")
    const [sslBypass, setSslBypass] = useState(true)
    const [isConnecting, setIsConnecting] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!url || !consumerKey || !consumerSecret) {
            setErrorMsg("All credential fields are required.")
            return
        }

        setIsConnecting(true)
        setErrorMsg(null)

        try {
            const creds: WooCommerceCreds = {
                url: url.trim(),
                consumerKey: consumerKey.trim(),
                consumerSecret: consumerSecret.trim(),
                sslBypass,
            }

            const client = new WooCommerceService(creds)
            const metadata = await client.getStoreMetadata()

            onConnect(creds, metadata.name)
        } catch (err: any) {
            console.error("Connection failed:", err)
            setErrorMsg(err.message || "Failed to validate credentials. Check URL or API keys.")
        } finally {
            setIsConnecting(false)
        }
    }

    const fillMockStore = (type: "coffee" | "wood") => {
        if (type === "coffee") {
            setUrl("https://gourmetcoffee.mock")
            setConsumerKey("ck_coffee_premium_key_12345")
            setConsumerSecret("cs_coffee_premium_secret_abcde")
        } else {
            setUrl("https://artisanwood.store")
            setConsumerKey("ck_woodwork_native_key_67890")
            setConsumerSecret("cs_woodwork_native_secret_fghij")
        }
        setErrorMsg(null)
    }

    return (
        <main className="setup">
            <div className="intro">
                <h2>WooCommerce Sync</h2>
                <p>Connect your WooCommerce store directly to Framer's native CMS with zero-latency synchronization.</p>
            </div>

            <form onSubmit={handleSubmit}>
                <label>
                    Store Base URL
                    <input
                        type="url"
                        placeholder="https://example.com"
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        required
                        disabled={isConnecting}
                    />
                </label>

                <label>
                    Consumer Key
                    <input
                        type="text"
                        placeholder="ck_..."
                        value={consumerKey}
                        onChange={e => setConsumerKey(e.target.value)}
                        required
                        disabled={isConnecting}
                    />
                </label>

                <label>
                    Consumer Secret
                    <input
                        type="password"
                        placeholder="cs_..."
                        value={consumerSecret}
                        onChange={e => setConsumerSecret(e.target.value)}
                        required
                        disabled={isConnecting}
                    />
                </label>

                <div style={{ display: "flex", gap: "8px", alignItems: "center", width: "100%", margin: "4px 0" }}>
                    <input
                        type="checkbox"
                        id="sslBypass"
                        checked={sslBypass}
                        onChange={e => setSslBypass(e.target.checked)}
                        disabled={isConnecting}
                    />
                    <label htmlFor="sslBypass" style={{ fontSize: "11px", color: "var(--framer-color-text-tertiary)", cursor: "pointer", margin: 0 }}>
                        Bypass SSL / CORS warnings
                    </label>
                </div>

                {errorMsg && (
                    <div style={{ color: "var(--framer-color-error)", fontSize: "11px", marginTop: "4px", lineHeight: "1.3" }}>
                        ⚠️ {errorMsg}
                    </div>
                )}

                <button type="submit" disabled={isConnecting} style={{ marginTop: "10px", width: "100%" }}>
                    {isConnecting ? <div className="framer-spinner" /> : "Connect WooCommerce"}
                </button>
            </form>

            <div style={{ width: "100%", marginTop: "15px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "10px", color: "var(--framer-color-text-tertiary)", textTransform: "uppercase", fontWeight: "600" }}>
                    Quick Test Presets
                </span>
                <div style={{ display: "flex", gap: "8px" }}>
                    <button
                        type="button"
                        onClick={() => fillMockStore("coffee")}
                        style={{ flex: 1, padding: "4px 8px", fontSize: "11px", backgroundColor: "var(--framer-color-bg-tertiary)" }}
                    >
                        ☕ Coffee Shop (Mock)
                    </button>
                    <button
                        type="button"
                        onClick={() => fillMockStore("wood")}
                        style={{ flex: 1, padding: "4px 8px", fontSize: "11px", backgroundColor: "var(--framer-color-bg-tertiary)" }}
                    >
                        🪵 Woodworking (Mock)
                    </button>
                </div>
            </div>
        </main>
    )
}
