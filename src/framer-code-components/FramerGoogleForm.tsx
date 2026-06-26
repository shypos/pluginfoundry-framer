// User instructions: Refactor the existing PluginFoundry Form Code Component to remove mixed architecture and enforce a clean production model.

import { addPropertyControls, ControlType, RenderTarget, useIsStaticRenderer } from "framer"
import React, { startTransition, useCallback, useMemo, useState, useEffect, useRef, type CSSProperties, type FormEvent } from "react"

type FieldType =
    | "text"
    | "email"
    | "phone"
    | "textarea"
    | "select"
    | "radio"
    | "checkbox"
    | "url"
    | "number"
    | "date"
    | "time"

type CaptchaProvider = "none" | "recaptchaV2" | "turnstile"

type TurnstileTheme = "auto" | "light" | "dark"

type TurnstileSize = "normal" | "compact"

type ReCaptchaTheme = "light" | "dark"

interface CaptchaLoadState {
    ready: boolean
    error?: string
}

interface FieldOption {
    value: string
    label?: string
}

interface FieldSchema {
    id: string
    type: FieldType
    label: string
    required?: boolean
    placeholder?: string
    options?: FieldOption[]
}

interface FormPageSchema {
    id: string
    title?: string
    description?: string
    fieldIds: string[]
}

interface SubmitConfig {
    type: "google_forms"
    endpoint: string
    mapping: Record<string, string>
}

interface FormSchema {
    _source?: "pluginfoundry"
    pf_id?: string
    version?: number
    integration?: string
    fields: FieldSchema[]
    pages?: FormPageSchema[]
    submit: SubmitConfig
}

interface Props {
    // FormBridge ID (public - visible in Framer sidebar)
    formBridgeId: string

    // NEW: Base URL override for custom PluginFoundry servers
    baseUrl?: string

    // NEW: Title & Description toggle properties
    showTitle?: boolean
    showDescription?: boolean

    // Injected by PluginFoundry plugin. Intentionally hidden from Framer property controls.
    schema?: FormSchema

    // Styling (public)
    titleOverride: string
    buttonLabel: string
    successMessage: string
    errorMessage: string

    loadingText: string
    showLoadingSpinner: boolean

    redirectUrl: string
    autoResetOnSuccess: boolean
    autoResetDelayMs: number

    backgroundColor: string
    textColor: string
    borderColor: string
    inputBackgroundColor: string
    inputFocusBorderColor: string

    buttonColor: string
    buttonHoverColor: string
    buttonTextColor: string

    successBackgroundColor: string
    successTextColor: string
    errorBackgroundColor: string
    errorTextColor: string

    borderRadius: number
    inputPadding: string
    formMaxWidth: number
    fieldGap: number

    // NEW: Layout
    columns: number
    columnGap: number

    // Multi-page
    showProgress: boolean
    nextLabel: string
    backLabel: string

    headingFont: any
    labelFont: any
    inputFont: any
    buttonFont: any

    captchaProvider: CaptchaProvider
    captchaSiteKey: string
    captchaRequired: boolean
    turnstileTheme: TurnstileTheme
    turnstileSize: TurnstileSize
    recaptchaTheme: ReCaptchaTheme

    // NEW: Additional style controls
    containerRadius: number
    fieldRadius: number
    buttonRadius: number
    spacing: number
    buttonText: string

    style?: CSSProperties
}

const demoSchema: FormSchema = {
    integration: "google_forms",
    fields: [
        { id: "name", type: "text", label: "Name", required: true, placeholder: "Jane Doe" },
        { id: "email", type: "email", label: "Email", required: true, placeholder: "jane@company.com" },
        { id: "message", type: "textarea", label: "Message", required: true, placeholder: "How can we help?" },
        { id: "phone", type: "phone", label: "Phone", required: false, placeholder: "+1 (555) 123-4567" },
        { id: "website", type: "url", label: "Website", required: false, placeholder: "https://example.com" },
        { id: "budget", type: "number", label: "Budget", required: false, placeholder: "1000" },
        {
            id: "channel",
            type: "radio",
            label: "Preferred contact",
            required: true,
            options: [
                { value: "Email", label: "Email" },
                { value: "Phone", label: "Phone" },
            ],
        },
        {
            id: "topic",
            type: "select",
            label: "Topic",
            required: true,
            placeholder: "Select…",
            options: [
                { value: "Support", label: "Support" },
                { value: "Sales", label: "Sales" },
            ],
        },
        { id: "updates", type: "checkbox", label: "Send me updates", required: false, options: [{ value: "Yes" }] },
    ],
    pages: [
        {
            id: "page_1",
            title: "Contact",
            description: "Tell us how to reach you",
            fieldIds: ["name", "email", "phone", "channel"],
        },
        {
            id: "page_2",
            title: "Details",
            description: "A few extra details",
            fieldIds: ["message", "topic", "updates", "website", "budget"],
        },
    ],
    submit: {
        type: "google_forms",
        endpoint: "",
        mapping: {},
    },
}

function isPluginFoundryProductionSchema(schema: FormSchema | undefined | null) {
    if (!schema) return false
    if (schema._source !== "pluginfoundry") return false
    if (!Array.isArray(schema.fields) || schema.fields.length === 0) return false
    if (!schema.submit) return false
    if (!schema.submit.endpoint || !schema.submit.endpoint.trim()) return false
    return true
}

// Custom resolution helpers for FormBridge API host environments
function getBackendUrl(formBridgeId: string, customBaseUrl?: string) {
    if (customBaseUrl?.trim()) {
        return customBaseUrl.trim()
    }
    if (typeof window !== "undefined") {
        const origin = window.location.origin
        if (
            origin.includes("localhost") ||
            origin.includes("127.0.0.1") ||
            origin.includes("3000") ||
            origin.includes("web-platform")
        ) {
            return origin
        }
    }
    return "http://localhost:3000"
}

// Deep resolver for options that may come as strings or objects
function resolveFieldOptions(options: any[] | undefined): Array<{ value: string; label: string }> {
    if (!options || !Array.isArray(options)) return []
    return options.map((opt) => {
        if (typeof opt === "string") {
            return { value: opt, label: opt }
        }
        if (opt && typeof opt === "object") {
            const val = opt.value !== undefined ? String(opt.value) : ""
            const lbl = opt.label !== undefined ? String(opt.label) : val
            return { value: val, label: lbl }
        }
        return { value: String(opt), label: String(opt) }
    })
}

function isValidEmail(value: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value)
}

function isValidPhone(value: string) {
    const phoneRegex = /^\+?[0-9\s\-()]{6,20}$/
    return phoneRegex.test(value)
}

function isValidUrl(value: string) {
    try {
        // eslint-disable-next-line no-new
        new URL(value)
        return true
    } catch {
        return false
    }
}

function validate(formData: FormData, schema: FormSchema, fieldsOverride?: FieldSchema[]) {
    const fields = fieldsOverride ?? schema.fields
    for (const field of fields) {
        const values = formData.getAll(field.id).map((v) => v.toString().trim()).filter(Boolean)
        const first = values[0] ?? ""

        if (field.required) {
            if (field.type === "checkbox") {
                if (values.length === 0) throw new Error(`Required field "${field.label}" is empty.`)
            } else {
                if (!first) throw new Error(`Required field "${field.label}" is empty.`)
            }
        }

        if (!first) continue

        if (field.type === "email" && !isValidEmail(first)) {
            throw new Error(`"${field.label}" is not a valid email address.`)
        }

        if (field.type === "phone" && !isValidPhone(first)) {
            throw new Error(`"${field.label}" must be a valid phone number.`)
        }

        if (field.type === "url" && !isValidUrl(first)) {
            throw new Error(`"${field.label}" must be a valid URL.`)
        }

        if (field.type === "number") {
            const num = Number(first)
            if (!Number.isFinite(num)) throw new Error(`"${field.label}" must be a number.`)
        }

        if (field.type === "date") {
            const d = new Date(first)
            if (Number.isNaN(d.getTime())) throw new Error(`"${field.label}" must be a valid date.`)
        }

        if (field.type === "time") {
            const ok = /^([01]\d|2[0-3]):[0-5]\d$/.test(first)
            if (!ok) throw new Error(`"${field.label}" must be a valid time.`)
        }
    }
}

async function submitToFormBridgeApi(
    formBridgeId: string,
    schema: FormSchema,
    formData: FormData,
    captchaToken: string,
    captchaProvider: string,
    customBaseUrl?: string
) {
    const answers: Record<string, any> = {}
    for (const field of schema.fields) {
        if (field.type === "checkbox") {
            const values = formData.getAll(field.id).map((v) => v.toString())
            answers[field.id] = values
        } else {
            const value = formData.get(field.id)
            answers[field.id] = value !== null ? value.toString() : ""
        }
    }

    const backendUrl = getBackendUrl(formBridgeId, customBaseUrl)
    const submitUrl = `${backendUrl}/api/forms/submit`

    const response = await fetch(submitUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            pf_id: formBridgeId,
            answers,
            captchaToken,
            captchaProvider,
        }),
    })

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || "Submission failed. Please check your inputs and try again.")
    }
}

function useExternalScript(src: string | null) {
    const [state, setState] = useState<CaptchaLoadState>({ ready: false })

    useEffect(() => {
        if (!src) {
            startTransition(() => setState({ ready: true }))
            return
        }

        if (typeof window === "undefined" || typeof document === "undefined") {
            startTransition(() => setState({ ready: false }))
            return
        }

        const existing = document.querySelector(`script[data-pf-script="${src}"]`) as HTMLScriptElement | null
        if (existing) {
            if ((existing as any).__pfLoaded) {
                startTransition(() => setState({ ready: true }))
            } else {
                const onLoad = () => startTransition(() => setState({ ready: true }))
                const onError = () => startTransition(() => setState({ ready: false, error: "Failed to load CAPTCHA script." }))
                existing.addEventListener("load", onLoad)
                existing.addEventListener("error", onError)
                return () => {
                    existing.removeEventListener("load", onLoad)
                    existing.removeEventListener("error", onError)
                }
            }
            return
        }

        const script = document.createElement("script")
        script.src = src
        script.async = true
        script.defer = true
        script.dataset.pfScript = src

        const onLoad = () => {
            ;(script as any).__pfLoaded = true
            startTransition(() => setState({ ready: true }))
        }
        const onError = () => startTransition(() => setState({ ready: false, error: "Failed to load CAPTCHA script." }))

        script.addEventListener("load", onLoad)
        script.addEventListener("error", onError)
        document.head.appendChild(script)

        return () => {
            script.removeEventListener("load", onLoad)
            script.removeEventListener("error", onError)
        }
    }, [src])

    return state
}

function CaptchaWidget(props: {
    provider: CaptchaProvider
    siteKey: string
    isDisabled?: boolean
    borderColor: string
    borderRadius: number
    turnstileTheme: TurnstileTheme
    turnstileSize: TurnstileSize
    recaptchaTheme: ReCaptchaTheme
    font: any
    onToken: (token: string) => void
    onExpire: () => void
    onError: (message: string) => void
}) {
    const {
        provider,
        siteKey,
        isDisabled,
        borderColor,
        borderRadius,
        turnstileTheme,
        turnstileSize,
        recaptchaTheme,
        font,
        onToken,
        onExpire,
        onError,
    } = props

    const containerRef = useRef<HTMLDivElement | null>(null)

    const scriptSrc = useMemo(() => {
        if (provider === "none") return null
        if (!siteKey?.trim()) return null
        if (provider === "turnstile") return "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        if (provider === "recaptchaV2") return "https://www.google.com/recaptcha/api.js?render=explicit"
        return null
    }, [provider, siteKey])

    const { ready, error } = useExternalScript(scriptSrc)

    useEffect(() => {
        if (error) onError(error)
    }, [error, onError])

    useEffect(() => {
        if (isDisabled) return
        if (!ready) return
        if (!containerRef.current) return
        if (!siteKey?.trim()) return
        if (typeof window === "undefined") return

        if (provider === "turnstile") {
            const turnstile = (window as any).turnstile
            if (!turnstile || typeof turnstile.render !== "function") return

            containerRef.current.innerHTML = ""
            turnstile.render(containerRef.current, {
                sitekey: siteKey,
                theme: turnstileTheme,
                size: turnstileSize,
                callback: (token: string) => onToken(token),
                "expired-callback": () => onExpire(),
                "error-callback": () => onError("CAPTCHA verification failed. Please try again."),
            })
        }

        if (provider === "recaptchaV2") {
            const grecaptcha = (window as any).grecaptcha
            if (!grecaptcha || typeof grecaptcha.render !== "function") return

            containerRef.current.innerHTML = ""
            grecaptcha.render(containerRef.current, {
                sitekey: siteKey,
                theme: recaptchaTheme,
                callback: (token: string) => onToken(token),
                "expired-callback": () => onExpire(),
                "error-callback": () => onError("CAPTCHA verification failed. Please try again."),
            })
        }
    }, [isDisabled, onError, onExpire, onToken, provider, ready, recaptchaTheme, siteKey, turnstileSize, turnstileTheme])

    if (provider === "none") return null

    return (
        <div
            style={{
                width: "100%",
                boxSizing: "border-box",
                border: `1px dashed ${borderColor}`,
                borderRadius,
                padding: 12,
                opacity: isDisabled ? 0.6 : 1,
                pointerEvents: isDisabled ? "none" : "auto",
                ...font,
            }}
            aria-label="Spam protection"
        >
            {!siteKey?.trim() ? (
                <div style={{ fontSize: 12, opacity: 0.8 }}>Add a site key to enable CAPTCHA.</div>
            ) : (
                <div ref={containerRef} />
            )}

            {!ready && siteKey?.trim() ? <div style={{ fontSize: 12, opacity: 0.75 }}>Loading CAPTCHA…</div> : null}
        </div>
    )
}

// Memory-based schema cache with a 5-minute expiry to prevent duplicate queries and protect backend resources
const globalSchemaCache = new Map<string, { schema: FormSchema; timestamp: number }>()
const CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutes

/**
 * PluginFoundry Form Renderer (Pure)
 *
 * @framerIntrinsicWidth 520
 * @framerIntrinsicHeight 720
 *
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
export default function FormBridge(props: Props) {
    const {
        formBridgeId,
        baseUrl,
        showTitle = true,
        showDescription = true,
        schema: schemaProp,
        titleOverride,
        buttonLabel,
        successMessage,
        errorMessage,
        loadingText,
        showLoadingSpinner,
        redirectUrl,
        autoResetOnSuccess,
        autoResetDelayMs,
        backgroundColor,
        textColor,
        borderColor,
        inputBackgroundColor,
        inputFocusBorderColor,
        buttonColor,
        buttonHoverColor,
        buttonTextColor,
        successBackgroundColor,
        successTextColor,
        errorBackgroundColor,
        errorTextColor,
        borderRadius,
        inputPadding,
        formMaxWidth,
        fieldGap,
        columns,
        columnGap,
        showProgress,
        nextLabel,
        backLabel,
        headingFont,
        labelFont,
        inputFont,
        buttonFont,
        captchaProvider,
        captchaSiteKey,
        captchaRequired,
        turnstileTheme,
        turnstileSize,
        recaptchaTheme,
        containerRadius,
        fieldRadius,
        buttonRadius,
        spacing,
        buttonText,
        style,
    } = props
    const isStatic = useIsStaticRenderer()

    const [fetchedSchema, setFetchedSchema] = useState<FormSchema | null>(null)
    const [isLoadingAsset, setIsLoadingAsset] = useState(false)
    const [assetError, setAssetError] = useState<string>("")

    // Fetch asset when formBridgeId changes, with strict memory & local storage caching
    useEffect(() => {
        const fbId = formBridgeId?.trim()
        if (!fbId) {
            startTransition(() => {
                setFetchedSchema(null)
                setIsLoadingAsset(false)
                setAssetError("")
            })
            return
        }

        if (typeof window === "undefined") return

        const cacheKey = `pf_fb_cache_${fbId}`
        const now = Date.now()

        // 1. Check in-memory global cache first
        const memCached = globalSchemaCache.get(fbId)
        if (memCached && now - memCached.timestamp < CACHE_DURATION_MS) {
            startTransition(() => {
                setFetchedSchema(memCached.schema)
                setIsLoadingAsset(false)
                setAssetError("")
            })
            return
        }

        // 2. Check localStorage cache
        try {
            const localCachedStr = localStorage.getItem(cacheKey)
            if (localCachedStr) {
                const localCached = JSON.parse(localCachedStr)
                if (localCached && now - localCached.timestamp < CACHE_DURATION_MS && localCached.schema) {
                    // Populate memory cache for instant future lookups
                    globalSchemaCache.set(fbId, { schema: localCached.schema, timestamp: localCached.timestamp })
                    startTransition(() => {
                        setFetchedSchema(localCached.schema)
                        setIsLoadingAsset(false)
                        setAssetError("")
                    })
                    return
                }
            }
        } catch (e) {
            // Silently ignore localStorage errors if sandboxed in framed contexts
        }

        startTransition(() => {
            setIsLoadingAsset(true)
            setAssetError("")
            setFetchedSchema(null)
        })

        const controller = new AbortController()
        const backendUrl = getBackendUrl(fbId, baseUrl)

        fetch(`${backendUrl}/api/forms/assets/${fbId}`, { signal: controller.signal })
            .then(async (res) => {
                if (!res.ok) {
                    throw new Error(`Failed to load FormBridge asset (${res.status})`)
                }
                const data = await res.json()

                // Save to both memory and localStorage cache
                const cacheValue = { schema: data, timestamp: Date.now() }
                globalSchemaCache.set(fbId, cacheValue)
                try {
                    localStorage.setItem(cacheKey, JSON.stringify(cacheValue))
                } catch (e) {
                    // Safely ignore localStorage set errors in sandboxed iframes
                }

                startTransition(() => {
                    setFetchedSchema(data)
                    setIsLoadingAsset(false)
                })
            })
            .catch((err) => {
                if (err.name === "AbortError") return
                startTransition(() => {
                    setAssetError(err.message || "Unable to load FormBridge asset.")
                    setIsLoadingAsset(false)
                })
            })

        return () => controller.abort()
    }, [formBridgeId, baseUrl])

    const schema = useMemo(() => {
        const isCanvas = RenderTarget.current() === RenderTarget.canvas || RenderTarget.current() === RenderTarget.thumbnail

        // Priority 1: Use fetched schema from FormBridge ID
        if (fetchedSchema && isPluginFoundryProductionSchema(fetchedSchema)) {
            return fetchedSchema
        }

        // Priority 2: Use injected schema from plugin
        if (isPluginFoundryProductionSchema(schemaProp)) return schemaProp as FormSchema

        // Priority 3: Show demo in canvas
        if (isCanvas) return demoSchema

        return null
    }, [fetchedSchema, schemaProp])

    const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle")
    const [message, setMessage] = useState<string>("")
    const [focusedFieldId, setFocusedFieldId] = useState<string | null>(null)
    const [isHoveringButton, setIsHoveringButton] = useState(false)
    const [pageIndex, setPageIndex] = useState(0)

    const [captchaToken, setCaptchaToken] = useState<string>("")
    const [captchaMessage, setCaptchaMessage] = useState<string>("")

    const pages = useMemo(() => {
        if (!schema) return null
        const schemaPages = Array.isArray(schema.pages) ? schema.pages : null
        if (!schemaPages || schemaPages.length === 0) {
            return [
                {
                    id: "page_0",
                    title: undefined,
                    description: undefined,
                    fieldIds: schema.fields.map((f) => f.id),
                },
            ]
        }

        const fieldIdSet = new Set(schema.fields.map((f) => f.id))
        const safePages = schemaPages
            .map((p, idx) => ({
                id: p?.id || `page_${idx}`,
                title: p?.title,
                description: p?.description,
                fieldIds: Array.isArray(p?.fieldIds) ? p.fieldIds.filter((id) => fieldIdSet.has(id)) : [],
            }))
            .filter((p) => p.fieldIds.length > 0)

        return safePages.length > 0
            ? safePages
            : [
                  {
                      id: "page_0",
                      title: undefined,
                      description: undefined,
                      fieldIds: schema.fields.map((f) => f.id),
                  },
              ]
    }, [schema])

    useEffect(() => {
        startTransition(() => setPageIndex(0))
    }, [schemaProp])

    const currentPage = pages ? pages[Math.min(pageIndex, pages.length - 1)] : null

    const currentPageFields = useMemo(() => {
        if (!schema || !currentPage) return []
        const byId = new Map(schema.fields.map((f) => [f.id, f] as const))
        return currentPage.fieldIds.map((id) => byId.get(id)).filter(Boolean) as FieldSchema[]
    }, [currentPage, schema])

    const isFirstPage = pageIndex <= 0
    const isLastPage = pages ? pageIndex >= pages.length - 1 : true

    const captchaEnabled = captchaProvider !== "none" && Boolean(captchaSiteKey?.trim())

    useEffect(() => {
        if (status !== "success") return

        if (typeof window === "undefined") return

        const url = redirectUrl?.trim()
        if (url) {
            const t = window.setTimeout(() => {
                try {
                    window.location.href = url
                } catch {
                    // ignore
                }
            }, Math.max(0, autoResetDelayMs || 0))

            return () => window.clearTimeout(t)
        }

        if (!autoResetOnSuccess) return

        const t = window.setTimeout(() => {
            startTransition(() => {
                setStatus("idle")
                setMessage("")
                setCaptchaToken("")
                setCaptchaMessage("")
            })
        }, Math.max(0, autoResetDelayMs || 0))

        return () => window.clearTimeout(t)
    }, [autoResetDelayMs, autoResetOnSuccess, redirectUrl, status])

    const handleSubmit = useCallback(
        async (e: FormEvent<HTMLFormElement>) => {
            e.preventDefault()

            if (isStatic || RenderTarget.current() === RenderTarget.canvas) {
                startTransition(() => {
                    setStatus("error")
                    setMessage("Submissions are disabled on the Framer canvas. Preview or publish to test.")
                })
                return
            }

            if (!schema) {
                startTransition(() => {
                    setStatus("error")
                    setMessage("Connect this form through PluginFoundry to activate.")
                })
                return
            }

            if (captchaRequired && captchaEnabled && !captchaToken) {
                startTransition(() => {
                    setStatus("error")
                    setMessage("Please complete the CAPTCHA before submitting.")
                })
                return
            }

            const formEl = e.currentTarget
            const formData = new FormData(formEl)

            try {
                validate(formData, schema)
            } catch (err) {
                const msg = err instanceof Error ? err.message : "Invalid response."
                startTransition(() => {
                    setStatus("error")
                    setMessage(msg)
                })
                return
            }

            startTransition(() => {
                setStatus("submitting")
                setMessage("")
            })

            try {
                await submitToFormBridgeApi(
                    formBridgeId,
                    schema,
                    formData,
                    captchaToken,
                    captchaProvider,
                    baseUrl
                )

                startTransition(() => {
                    setStatus("success")
                    setMessage(successMessage)
                    setCaptchaToken("")
                    setCaptchaMessage("")
                })

                formEl.reset()
            } catch (err) {
                const msg = err instanceof Error ? err.message : "Submission failed."
                startTransition(() => {
                    setStatus("error")
                    setMessage(msg)
                })
            }
        },
        [formBridgeId, captchaEnabled, captchaRequired, captchaToken, isStatic, schema, successMessage, baseUrl]
    )

    const container: CSSProperties = useMemo(
        () => ({
            position: "relative",
            width: "100%",
            height: "100%",
            boxSizing: "border-box",
            padding: 16,
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            ...style,
        }),
        [style]
    )

    const card: CSSProperties = useMemo(
        () => ({
            width: "100%",
            maxWidth: formMaxWidth,
            boxSizing: "border-box",
            background: backgroundColor,
            color: textColor,
            borderRadius: borderRadius,
            border: `1px solid ${borderColor}` ,
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 16,
        }),
        [backgroundColor, borderColor, borderRadius, formMaxWidth, textColor]
    )

    const inputBase: CSSProperties = useMemo(
        () => ({
            width: "100%",
            boxSizing: "border-box",
            padding: inputPadding,
            background: inputBackgroundColor,
            border: `1px solid ${borderColor}`,
            borderRadius: borderRadius,
            color: textColor,
            outline: "none",
            ...inputFont,
        }),
        [borderColor, borderRadius, inputBackgroundColor, inputFont, inputPadding, textColor]
    )

    const button: CSSProperties = useMemo(
        () => ({
            width: "100%",
            border: "none",
            cursor: status === "submitting" ? "not-allowed" : "pointer",
            background: isHoveringButton && status !== "submitting" ? buttonHoverColor : buttonColor,
            color: buttonTextColor,
            borderRadius: buttonRadius ?? borderRadius,
            padding: "12px 14px",
            opacity: status === "submitting" ? 0.7 : 1,
            transition: "opacity 0.2s ease, background 0.2s ease",
            ...buttonFont,
        }),
        [borderRadius, buttonRadius, buttonColor, buttonFont, buttonHoverColor, buttonTextColor, isHoveringButton, status]
    )

    const headerTitle = useMemo(() => {
        const t = titleOverride?.trim()
        if (t) return t
        return "Form"
    }, [titleOverride])

    const clampedColumns = useMemo(() => {
        const c = Math.round(Number(columns))
        if (!Number.isFinite(c)) return 1
        return Math.max(1, Math.min(4, c))
    }, [columns])

    const clampedColumnGap = useMemo(() => {
        const g = Number(columnGap)
        if (!Number.isFinite(g)) return fieldGap
        return Math.max(0, g)
    }, [columnGap, fieldGap])

    const effectiveSpacing = spacing ?? 16
    const effectiveContainerRadius = containerRadius ?? borderRadius
    const effectiveFieldRadius = fieldRadius ?? borderRadius
    const effectiveButtonText = buttonText?.trim() || buttonLabel

    // Show empty state if no FormBridge ID
    if (!formBridgeId?.trim() && !schemaProp) {
        return (
            <section style={container} aria-label="FormBridge Empty State">
                <div
                    style={{
                        ...card,
                        borderRadius: effectiveContainerRadius,
                        padding: effectiveSpacing * 2,
                        textAlign: "center",
                        gap: effectiveSpacing,
                    }}
                >
                    <div style={{ ...headingFont, fontSize: "18px", opacity: 0.9 }}>FormBridge Not Connected</div>
                    <div style={{ ...inputFont, opacity: 0.7, lineHeight: "1.5" }}>
                        Paste your FormBridge ID in the right sidebar to load your form.
                    </div>
                    <div
                        style={{
                            ...inputFont,
                            fontFamily: "monospace",
                            fontSize: "12px",
                            opacity: 0.5,
                            marginTop: 8,
                        }}
                    >
                        Example: fb_asset_xxxxxxxxx
                    </div>
                </div>
            </section>
        )
    }

    // Show loading state
    if (isLoadingAsset) {
        return (
            <section style={container} aria-label="FormBridge Loading">
                <div
                    style={{
                        ...card,
                        borderRadius: effectiveContainerRadius,
                        padding: effectiveSpacing * 2,
                        textAlign: "center",
                    }}
                >
                    <div style={{ ...inputFont, opacity: 0.8 }}>Loading FormBridge...</div>
                </div>
            </section>
        )
    }

    // Show error state
    if (assetError) {
        return (
            <section style={container} aria-label="FormBridge Error">
                <div
                    style={{
                        ...card,
                        borderRadius: effectiveContainerRadius,
                        padding: effectiveSpacing * 2,
                        textAlign: "center",
                        gap: effectiveSpacing,
                    }}
                >
                    <div style={{ ...headingFont, fontSize: "16px", color: errorTextColor }}>
                        Unable to load FormBridge asset.
                    </div>
                    <div style={{ ...inputFont, opacity: 0.7, lineHeight: "1.5" }}>
                        Check that your FormBridge ID is correct.
                    </div>
                    <div
                        style={{
                            ...inputFont,
                            fontSize: "12px",
                            opacity: 0.5,
                            marginTop: 8,
                            fontFamily: "monospace",
                        }}
                    >
                        {assetError}
                    </div>
                </div>
            </section>
        )
    }

    return (
        <section style={container} aria-label="PluginFoundry Form">
            <style>{`@keyframes pfSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            <div style={{ ...card, borderRadius: effectiveContainerRadius, padding: effectiveSpacing, gap: effectiveSpacing }}>
                {showTitle && (
                    <header style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ margin: 0, ...headingFont }}>
                            {headerTitle}
                        </div>
                        {showDescription && schema?.description && (
                            <div style={{ ...inputFont, opacity: 0.7, lineHeight: "1.4", margin: "4px 0" }}>
                                {schema.description}
                            </div>
                        )}
                        <div style={{ height: 1, width: "100%", background: borderColor, opacity: 0.8 }} />
                    </header>
                )}

                {status === "success" ? (
                    <div
                        style={{
                            borderRadius: borderRadius,
                            padding: "12px",
                            border: `1px solid ${borderColor}` ,
                            background: successBackgroundColor,
                            color: successTextColor,
                            ...inputFont,
                            lineHeight: "1.45",
                        }}
                        role="status"
                        aria-live="polite"
                    >
                        {message || successMessage}
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {!schema ? (
                            <div
                                style={{
                                    borderRadius: borderRadius,
                                    padding: "12px",
                                    border: `1px solid ${borderColor}`,
                                    background: backgroundColor,
                                    color: textColor,
                                    ...inputFont,
                                    lineHeight: "1.45",
                                    opacity: 0.8,
                                }}
                                role="alert"
                            >
                                {RenderTarget.current() === RenderTarget.canvas || RenderTarget.current() === RenderTarget.thumbnail
                                    ? ""
                                    : "Connect this form through PluginFoundry to activate."}
                            </div>
                        ) : (
                            <fieldset
                                style={{
                                    border: 0,
                                    padding: 0,
                                    margin: 0,
                                    display: "grid",
                                    gridTemplateColumns: `repeat(${clampedColumns}, minmax(0, 1fr))`,
                                    columnGap: clampedColumnGap,
                                    rowGap: fieldGap,
                                }}
                            >
                                {pages && pages.length > 1 && showProgress ? (
                                    <div
                                        style={{
                                            gridColumn: "1 / -1",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            gap: 12,
                                            ...inputFont,
                                            fontSize: "12px",
                                            opacity: 0.8,
                                        }}
                                        aria-label="Form progress"
                                    >
                                        <div>
                                            Step {pageIndex + 1} of {pages.length}
                                        </div>
                                        <div
                                            style={{
                                                flex: 1,
                                                height: 4,
                                                background: borderColor,
                                                borderRadius: 999,
                                                opacity: 0.6,
                                                overflow: "hidden",
                                            }}
                                            aria-hidden="true"
                                        >
                                            <div
                                                style={{
                                                    width: `${((pageIndex + 1) / pages.length) * 100}%`,
                                                    height: "100%",
                                                    background: buttonColor,
                                                    borderRadius: 999,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ) : null}

                                {pages && pages.length > 1 && (currentPage?.title || currentPage?.description) ? (
                                    <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 6 }}>
                                        {currentPage?.title ? (
                                            <div style={{ margin: 0, opacity: 0.92, ...labelFont, fontWeight: 700 }}>
                                                {currentPage.title}
                                            </div>
                                        ) : null}
                                        {currentPage?.description ? (
                                            <div style={{ margin: 0, opacity: 0.7, ...inputFont }}>
                                                {currentPage.description}
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}

                                {currentPageFields.map((field) => {
                                    const requiredMark = field.required ? " *" : ""
                                    const label = `${field.label}${requiredMark}`

                                    const resolvedBorderColor =
                                        focusedFieldId === field.id ? inputFocusBorderColor : borderColor

                                    const inputStyle: CSSProperties = {
                                        ...inputBase,
                                        border: `1px solid ${resolvedBorderColor}`,
                                        borderRadius: effectiveFieldRadius,
                                    }

                                    const shouldSpanAll =
                                        clampedColumns <= 1 ||
                                        field.type === "textarea" ||
                                        field.type === "radio" ||
                                        field.type === "checkbox"

                                    return (
                                        <div
                                            key={field.id}
                                            style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: 8,
                                                gridColumn: shouldSpanAll ? "1 / -1" : undefined,
                                                minWidth: 0,
                                            }}
                                        >
                                            <label htmlFor={field.id} style={{ margin: 0, opacity: 0.92, ...labelFont }}>
                                                {label}
                                            </label>

                                            {field.type === "textarea" ? (
                                                <textarea
                                                    id={field.id}
                                                    name={field.id}
                                                    placeholder={field.placeholder || ""}
                                                    style={inputStyle}
                                                    rows={4}
                                                    aria-required={field.required || undefined}
                                                    onFocus={() => startTransition(() => setFocusedFieldId(field.id))}
                                                    onBlur={() => startTransition(() => setFocusedFieldId(null))}
                                                />
                                            ) : field.type === "select" ? (
                                                <select
                                                    id={field.id}
                                                    name={field.id}
                                                    style={{ ...inputStyle, appearance: "none", WebkitAppearance: "none" }}
                                                    defaultValue=""
                                                    aria-required={field.required || undefined}
                                                    onFocus={() => startTransition(() => setFocusedFieldId(field.id))}
                                                    onBlur={() => startTransition(() => setFocusedFieldId(null))}
                                                >
                                                    <option value="" disabled>
                                                        {field.placeholder || "Select…"}
                                                    </option>
                                                    {resolveFieldOptions(field.options).map((opt, idx) => (
                                                        <option key={`${field.id}_opt_${idx}`} value={opt.value}>
                                                            {opt.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : field.type === "radio" ? (
                                                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                                    {resolveFieldOptions(field.options).map((opt, idx) => {
                                                        const id = `${field.id}_${idx}`
                                                        return (
                                                            <label
                                                                key={id}
                                                                htmlFor={id}
                                                                style={{
                                                                    display: "flex",
                                                                    alignItems: "flex-start",
                                                                    gap: 10,
                                                                    cursor: "pointer",
                                                                    userSelect: "none",
                                                                }}
                                                            >
                                                                <input
                                                                    id={id}
                                                                    type="radio"
                                                                    name={field.id}
                                                                    value={opt.value}
                                                                    aria-required={field.required || undefined}
                                                                    style={{ marginTop: 3, accentColor: buttonColor }}
                                                                    onFocus={() =>
                                                                        startTransition(() => setFocusedFieldId(field.id))
                                                                    }
                                                                    onBlur={() =>
                                                                        startTransition(() => setFocusedFieldId(null))
                                                                    }
                                                                />
                                                                <span style={{ opacity: 0.9, ...inputFont, lineHeight: "1.35" }}>
                                                                    {opt.label}
                                                                </span>
                                                            </label>
                                                        )
                                                    })}
                                                </div>
                                            ) : field.type === "checkbox" ? (
                                                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                                    {(field.options && field.options.length > 0
                                                        ? resolveFieldOptions(field.options)
                                                        : [{ value: "true", label: field.placeholder || "" }]
                                                    ).map((opt, idx) => {
                                                        const id = `${field.id}_${idx}`
                                                        return (
                                                            <label
                                                                key={id}
                                                                htmlFor={id}
                                                                style={{
                                                                    display: "flex",
                                                                    alignItems: "flex-start",
                                                                    gap: 10,
                                                                    cursor: "pointer",
                                                                    userSelect: "none",
                                                                }}
                                                            >
                                                                <input
                                                                    id={id}
                                                                    type="checkbox"
                                                                    name={field.id}
                                                                    value={opt.value}
                                                                    aria-required={field.required || undefined}
                                                                    style={{ marginTop: 3, accentColor: buttonColor }}
                                                                    onFocus={() =>
                                                                        startTransition(() => setFocusedFieldId(field.id))
                                                                    }
                                                                    onBlur={() =>
                                                                        startTransition(() => setFocusedFieldId(null))
                                                                    }
                                                                />
                                                                <span
                                                                    style={{
                                                                        opacity: 0.9,
                                                                        ...inputFont,
                                                                        lineHeight: "1.35",
                                                                    }}
                                                                >
                                                                    {opt.label}
                                                                </span>
                                                            </label>
                                                        )
                                                    })}
                                                </div>
                                            ) : field.type === "date" ? (
                                                <input
                                                    id={field.id}
                                                    name={field.id}
                                                    type="date"
                                                    placeholder={field.placeholder || ""}
                                                    style={inputStyle}
                                                    aria-required={field.required || undefined}
                                                    onFocus={() => startTransition(() => setFocusedFieldId(field.id))}
                                                    onBlur={() => startTransition(() => setFocusedFieldId(null))}
                                                />
                                            ) : field.type === "time" ? (
                                                <input
                                                    id={field.id}
                                                    name={field.id}
                                                    type="time"
                                                    placeholder={field.placeholder || ""}
                                                    style={inputStyle}
                                                    aria-required={field.required || undefined}
                                                    onFocus={() => startTransition(() => setFocusedFieldId(field.id))}
                                                    onBlur={() => startTransition(() => setFocusedFieldId(null))}
                                                />
                                            ) : (
                                                <input
                                                    id={field.id}
                                                    name={field.id}
                                                    type={
                                                        field.type === "email"
                                                            ? "email"
                                                            : field.type === "phone"
                                                              ? "tel"
                                                              : field.type === "url"
                                                                ? "url"
                                                                : field.type === "number"
                                                                  ? "number"
                                                                  : "text"
                                                    }
                                                    placeholder={field.placeholder || ""}
                                                    style={inputStyle}
                                                    aria-required={field.required || undefined}
                                                    onFocus={() => startTransition(() => setFocusedFieldId(field.id))}
                                                    onBlur={() => startTransition(() => setFocusedFieldId(null))}
                                                />
                                            )}
                                        </div>
                                    )
                                })}
                            </fieldset>
                        )}

                        {captchaProvider !== "none" ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                <CaptchaWidget
                                    provider={captchaProvider}
                                    siteKey={captchaSiteKey}
                                    isDisabled={status === "submitting" || !schema}
                                    borderColor={borderColor}
                                    borderRadius={borderRadius}
                                    turnstileTheme={turnstileTheme}
                                    turnstileSize={turnstileSize}
                                    recaptchaTheme={recaptchaTheme}
                                    font={inputFont}
                                    onToken={(token) =>
                                        startTransition(() => {
                                            setCaptchaToken(token)
                                            setCaptchaMessage("")
                                        })
                                    }
                                    onExpire={() =>
                                        startTransition(() => {
                                            setCaptchaToken("")
                                            setCaptchaMessage("CAPTCHA expired. Please complete it again.")
                                        })
                                    }
                                    onError={(m) =>
                                        startTransition(() => {
                                            setCaptchaToken("")
                                            setCaptchaMessage(m)
                                        })
                                    }
                                />

                                {captchaMessage ? (
                                    <div
                                        style={{
                                            borderRadius: borderRadius,
                                            padding: "12px",
                                            border: `1px solid ${borderColor}`,
                                            background: errorBackgroundColor,
                                            color: errorTextColor,
                                            ...inputFont,
                                            lineHeight: "1.45",
                                        }}
                                        role="alert"
                                    >
                                        {captchaMessage}
                                    </div>
                                ) : null}
                            </div>
                        ) : null}

                        {status === "error" ? (
                            <div
                                style={{
                                    borderRadius: borderRadius,
                                    padding: "12px",
                                    border: `1px solid ${borderColor}`,
                                    background: errorBackgroundColor,
                                    color: errorTextColor,
                                    ...inputFont,
                                    lineHeight: "1.45",
                                }}
                                role="alert"
                                aria-live="assertive"
                            >
                                {message || errorMessage}
                            </div>
                        ) : null}

                        {status === "submitting" ? (
                            <div
                                style={{
                                    borderRadius: borderRadius,
                                    padding: "12px",
                                    border: `1px solid ${borderColor}`,
                                    background: backgroundColor,
                                    color: textColor,
                                    ...inputFont,
                                    lineHeight: "1.45",
                                    opacity: 0.85,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                }}
                                role="status"
                                aria-live="polite"
                            >
                                {showLoadingSpinner ? (
                                    <div
                                        aria-hidden="true"
                                        style={{
                                            width: 14,
                                            height: 14,
                                            borderRadius: 999,
                                            border: `2px solid ${borderColor}`,
                                            borderTopColor: buttonColor,
                                            boxSizing: "border-box",
                                            animation: "pfSpin 0.9s linear infinite",
                                        }}
                                    />
                                ) : null}
                                <div>{loadingText || "Submitting…"}</div>
                            </div>
                        ) : null}

                        <div style={{ display: "flex", gap: 10, width: "100%" }}>
                            {pages && pages.length > 1 ? (
                                <button
                                    type="button"
                                    disabled={isFirstPage || status === "submitting"}
                                    style={{
                                        ...button,
                                        width: "40%",
                                        background: "transparent",
                                        border: `1px solid ${borderColor}`,
                                        color: textColor,
                                        opacity: isFirstPage || status === "submitting" ? 0.5 : 1,
                                    }}
                                    onClick={() => {
                                        startTransition(() => {
                                            setStatus("idle")
                                            setMessage("")
                                            setPageIndex((i) => Math.max(i - 1, 0))
                                        })
                                    }}
                                >
                                    {backLabel || "Back"}
                                </button>
                            ) : null}

                            {pages && pages.length > 1 && !isLastPage ? (
                                <button
                                    type="button"
                                    disabled={status === "submitting"}
                                    style={{ ...button, width: pages.length > 1 ? "60%" : "100%" }}
                                    onMouseEnter={() => startTransition(() => setIsHoveringButton(true))}
                                    onMouseLeave={() => startTransition(() => setIsHoveringButton(false))}
                                    onClick={(e) => {
                                        if (!schema) return
                                        const formEl = (e.currentTarget as HTMLButtonElement).closest(
                                            "form"
                                        ) as HTMLFormElement | null
                                        if (!formEl) return
                                        const fd = new FormData(formEl)
                                        try {
                                            validate(fd, schema, currentPageFields)
                                        } catch (err) {
                                            const msg = err instanceof Error ? err.message : "Invalid response."
                                            startTransition(() => {
                                                setStatus("error")
                                                setMessage(msg)
                                            })
                                            return
                                        }
                                        startTransition(() => {
                                            setStatus("idle")
                                            setMessage("")
                                            setPageIndex((i) => Math.min(i + 1, (pages?.length || 1) - 1))
                                        })
                                    }}
                                >
                                    {nextLabel || "Next"}
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={status === "submitting" || !schema}
                                    style={{ ...button, width: pages && pages.length > 1 ? "60%" : "100%" }}
                                    onMouseEnter={() => startTransition(() => setIsHoveringButton(true))}
                                    onMouseLeave={() => startTransition(() => setIsHoveringButton(false))}
                                >
                                    {status === "submitting" ? "Submitting…" : effectiveButtonText}
                                </button>
                            )}
                        </div>
                    </form>
                )}
            </div>
        </section>
    )
}

addPropertyControls(FormBridge, {
    // FormBridge ID - visible in Framer sidebar
    formBridgeId: {
        type: ControlType.String,
        title: "FormBridge ID",
        defaultValue: "",
        placeholder: "fb_asset_xxxxxxxxx",
        description: "Paste your FormBridge ID from PluginFoundry",
    },

    // Base URL override for custom backend server environments
    baseUrl: {
        type: ControlType.String,
        title: "Base URL",
        defaultValue: "",
        placeholder: "http://localhost:3000",
        description: "Custom PluginFoundry server URL (leave blank for dynamic)",
    },

    // Title and description display toggle controls
    showTitle: {
        type: ControlType.Boolean,
        title: "Show Title",
        defaultValue: true,
        enabledTitle: "Yes",
        disabledTitle: "No",
    },

    showDescription: {
        type: ControlType.Boolean,
        title: "Show Description",
        defaultValue: true,
        enabledTitle: "Yes",
        disabledTitle: "No",
    },

    // Internal-only injection point. Hidden to designers.
    schema: {
        type: ControlType.Object,
        title: "Schema",
        defaultValue: demoSchema as any,
        hidden: () => true,
        controls: {},
    },

    titleOverride: {
        type: ControlType.String,
        title: "Title",
        defaultValue: "",
    },
    buttonLabel: {
        type: ControlType.String,
        title: "Button",
        defaultValue: "Send",
    },
    successMessage: {
        type: ControlType.String,
        title: "✅ Success",
        defaultValue: "Thanks! Your response has been submitted.",
        displayTextArea: true,
    },
    errorMessage: {
        type: ControlType.String,
        title: "⚠️ Error",
        defaultValue: "Please check your answers and try again.",
        displayTextArea: true,
    },

    backgroundColor: { type: ControlType.Color, title: "Background", defaultValue: "#FFFFFF" },
    textColor: { type: ControlType.Color, title: "Text", defaultValue: "#000000" },
    borderColor: { type: ControlType.Color, title: "Border", defaultValue: "#EEEEEE" },
    inputBackgroundColor: { type: ControlType.Color, title: "Input BG", defaultValue: "#F5F5F5" },
    buttonColor: { type: ControlType.Color, title: "Button BG", defaultValue: "#111111" },
    buttonTextColor: { type: ControlType.Color, title: "Button Text", defaultValue: "#FFFFFF" },

    successBackgroundColor: {
        type: ControlType.Color,
        title: "Success BG",
        defaultValue: "rgba(16,185,129,0.10)",
    },
    successTextColor: {
        type: ControlType.Color,
        title: "Success Text",
        defaultValue: "#10B981",
    },
    errorBackgroundColor: {
        type: ControlType.Color,
        title: "Error BG",
        defaultValue: "rgba(239,68,68,0.10)",
    },
    errorTextColor: {
        type: ControlType.Color,
        title: "Error Text",
        defaultValue: "#EF4444",
    },

    borderRadius: {
        type: ControlType.Number,
        title: "Radius",
        defaultValue: 12,
        min: 0,
        max: 32,
        step: 1,
        unit: "px",
    },
    inputPadding: {
        type: ControlType.Padding,
        title: "Input Padding",
        defaultValue: "10px 14px",
    },
    formMaxWidth: {
        type: ControlType.Number,
        title: "Max Width",
        defaultValue: 720,
        min: 280,
        max: 1200,
        step: 10,
        unit: "px",
    },
    fieldGap: {
        type: ControlType.Number,
        title: "Field Gap",
        defaultValue: 16,
        min: 8,
        max: 40,
        step: 1,
        unit: "px",
    },

    columns: {
        type: ControlType.Number,
        title: "Columns",
        defaultValue: 1,
        min: 1,
        max: 4,
        step: 1,
        unit: "",
    },
    columnGap: {
        type: ControlType.Number,
        title: "Column Gap",
        defaultValue: 16,
        min: 0,
        max: 60,
        step: 1,
        unit: "px",
        hidden: ({ columns }) => (columns ?? 1) <= 1,
    },

    showProgress: {
        type: ControlType.Boolean,
        title: "Progress",
        defaultValue: true,
        enabledTitle: "Show",
        disabledTitle: "Hide",
    },
    nextLabel: { type: ControlType.String, title: "Next", defaultValue: "Next" },
    backLabel: { type: ControlType.String, title: "Back", defaultValue: "Back" },

    headingFont: {
        type: ControlType.Font,
        title: "Heading Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: "18px", variant: "Semibold", letterSpacing: "-0.02em", lineHeight: "1.2em" },
    },
    labelFont: {
        type: ControlType.Font,
        title: "Label Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: "13px", variant: "Medium", letterSpacing: "-0.01em", lineHeight: "1.3em" },
    },
    inputFont: {
        type: ControlType.Font,
        title: "Input Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: "13px", variant: "Medium", letterSpacing: "-0.01em", lineHeight: "1.35em" },
    },
    buttonFont: {
        type: ControlType.Font,
        title: "Button Font",
        controls: "extended",
        defaultFontType: "sans-serif",
        defaultValue: { fontSize: "14px", variant: "Semibold", letterSpacing: "-0.01em", lineHeight: "1em" },
    },

    loadingText: {
        type: ControlType.String,
        title: "⏳ Loading Text",
        defaultValue: "Submitting…",
    },
    showLoadingSpinner: {
        type: ControlType.Boolean,
        title: "⏺ Spinner",
        defaultValue: true,
        enabledTitle: "Show",
        disabledTitle: "Hide",
    },

    redirectUrl: {
        type: ControlType.String,
        title: "🔗 Redirect URL",
        defaultValue: "",
        placeholder: "https://…",
    },
    autoResetOnSuccess: {
        type: ControlType.Boolean,
        title: "↩︎ Auto Reset",
        defaultValue: false,
        enabledTitle: "On",
        disabledTitle: "Off",
        hidden: ({ redirectUrl }) => Boolean(redirectUrl?.trim()),
    },
    autoResetDelayMs: {
        type: ControlType.Number,
        title: "⏱ Delay",
        defaultValue: 0,
        min: 0,
        max: 10000,
        step: 100,
        unit: "ms",
    },

    inputFocusBorderColor: {
        type: ControlType.Color,
        title: "Input Focus",
        defaultValue: "#111111",
    },

    buttonHoverColor: {
        type: ControlType.Color,
        title: "Button Hover",
        defaultValue: "#000000",
    },

    // NEW: Additional style controls
    containerRadius: {
        type: ControlType.Number,
        title: "Container Radius",
        defaultValue: 12,
        min: 0,
        max: 32,
        step: 1,
        unit: "px",
    },
    fieldRadius: {
        type: ControlType.Number,
        title: "Field Radius",
        defaultValue: 12,
        min: 0,
        max: 32,
        step: 1,
        unit: "px",
    },
    buttonRadius: {
        type: ControlType.Number,
        title: "Button Radius",
        defaultValue: 12,
        min: 0,
        max: 32,
        step: 1,
        unit: "px",
    },
    spacing: {
        type: ControlType.Number,
        title: "Spacing",
        defaultValue: 16,
        min: 8,
        max: 40,
        step: 1,
        unit: "px",
    },
    buttonText: {
        type: ControlType.String,
        title: "Button Text",
        defaultValue: "Send",
    },

    captchaProvider: {
        type: ControlType.Enum,
        title: "🛡 CAPTCHA",
        options: ["none", "turnstile", "recaptchaV2"],
        optionTitles: ["None", "Turnstile", "reCAPTCHA v2"],
        defaultValue: "none",
    },
    captchaSiteKey: {
        type: ControlType.String,
        title: "🔑 Site Key",
        defaultValue: "",
        hidden: ({ captchaProvider }) => captchaProvider === "none",
    },
    captchaRequired: {
        type: ControlType.Boolean,
        title: "Required",
        defaultValue: true,
        enabledTitle: "Yes",
        disabledTitle: "No",
        hidden: ({ captchaProvider }) => captchaProvider === "none",
    },
    turnstileTheme: {
        type: ControlType.Enum,
        title: "Turnstile Theme",
        options: ["auto", "light", "dark"],
        defaultValue: "auto",
        hidden: ({ captchaProvider }) => captchaProvider !== "turnstile",
    },
    turnstileSize: {
        type: ControlType.Enum,
        title: "Turnstile Size",
        options: ["normal", "compact"],
        defaultValue: "normal",
        hidden: ({ captchaProvider }) => captchaProvider !== "turnstile",
    },
    recaptchaTheme: {
        type: ControlType.Enum,
        title: "reCAPTCHA Theme",
        options: ["light", "dark"],
        defaultValue: "light",
        hidden: ({ captchaProvider }) => captchaProvider !== "recaptchaV2",
    },
})
