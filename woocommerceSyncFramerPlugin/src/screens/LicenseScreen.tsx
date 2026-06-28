import { useState } from "react"
import { PolarLicenseService } from "../services/polar"

interface LicenseScreenProps {
    onActivate: (key: string) => void
}

export function LicenseScreen({ onActivate }: LicenseScreenProps) {
    const [licenseKey, setLicenseKey] = useState("")
    const [isVerifying, setIsVerifying] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const cleanKey = licenseKey.trim()

        if (!cleanKey) {
            setErrorMsg("Please enter a valid license key.")
            return
        }

        setIsVerifying(true)
        setErrorMsg(null)

        try {
            const res = await PolarLicenseService.activateLicense(cleanKey)
            if (res.active) {
                onActivate(cleanKey)
            } else {
                setErrorMsg("This license key is inactive or expired.")
            }
        } catch (err: any) {
            console.error("License validation error:", err)
            setErrorMsg(err.message || "Failed to validate license key. Please check your connection and try again.")
        } finally {
            setIsVerifying(false)
        }
    }

    const handleFillDemoKey = () => {
        setLicenseKey("WOO_FRAMER_ACTIVE_PREMIUM")
        setErrorMsg(null)
    }

    return (
        <main className="setup" style={{ display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "100%" }}>
            <div className="intro" style={{ marginBottom: "20px" }}>
                <div style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(0, 153, 255, 0.1)",
                    color: "var(--framer-color-tint)",
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    fontSize: "24px",
                    marginBottom: "12px"
                }}>
                    🔑
                </div>
                <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "8px", color: "var(--framer-color-text)" }}>
                    Activate WooCommerce Sync
                </h2>
                <p style={{ fontSize: "12px", color: "var(--framer-color-text-tertiary)", lineHeight: "1.4" }}>
                    Please enter your Polar license key to activate the zero-latency WooCommerce synchronizer and access bundled code components.
                </p>
            </div>

            <form onSubmit={handleSubmit} style={{ width: "100%" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "11px", fontWeight: "600", color: "var(--framer-color-text-secondary)" }}>
                    License Key
                    <input
                        type="text"
                        placeholder="POL-XXXXXX-XXXXXX"
                        value={licenseKey}
                        onChange={e => setLicenseKey(e.target.value)}
                        required
                        disabled={isVerifying}
                        style={{
                            width: "100%",
                            padding: "8px 12px",
                            backgroundColor: "var(--framer-color-bg-secondary)",
                            border: "1px solid var(--framer-color-bg-tertiary)",
                            borderRadius: "6px",
                            color: "var(--framer-color-text)",
                            fontSize: "13px",
                            fontFamily: "var(--font-mono, monospace)"
                        }}
                    />
                </label>

                {errorMsg && (
                    <div style={{ color: "var(--framer-color-error)", fontSize: "11px", marginTop: "8px", lineHeight: "1.3", display: "flex", gap: "4px" }}>
                        <span>⚠️</span>
                        <span>{errorMsg}</span>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isVerifying}
                    style={{
                        marginTop: "16px",
                        width: "100%",
                        padding: "10px",
                        backgroundColor: "var(--framer-color-tint)",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "13px",
                        fontWeight: "600",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px"
                    }}
                >
                    {isVerifying ? (
                        <>
                            <div className="framer-spinner" style={{ width: "14px", height: "14px" }} />
                            Verifying...
                        </>
                    ) : (
                        "Activate Extension"
                    )}
                </button>
            </form>

            <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--framer-color-bg-tertiary)", textAlign: "center", width: "100%" }}>
                <span style={{ fontSize: "11px", color: "var(--framer-color-text-tertiary)" }}>
                    Don't have a license key?{" "}
                    <button
                        type="button"
                        onClick={handleFillDemoKey}
                        style={{
                            background: "none",
                            border: "none",
                            color: "var(--framer-color-tint)",
                            padding: 0,
                            fontSize: "11px",
                            fontWeight: "600",
                            cursor: "pointer",
                            textDecoration: "underline"
                        }}
                    >
                        Activate Free Evaluation Key
                    </button>
                </span>
            </div>
        </main>
    )
}
