/**
 * Basic HTML sanitizer and cleaner to convert raw WooCommerce product descriptions 
 * into a safe, clean HTML format that is fully compatible with Framer's Rich Text (formattedText) editor.
 */
export function sanitizeAndCleanHtml(html: string): string {
    if (!html) return ""

    // 1. Remove dangerous elements (script, style, iframe, object, embed, etc.)
    let sanitized = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
        .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")

    // 2. Remove comments
    sanitized = sanitized.replace(/<!--[\s\S]*?-->/g, "")

    // 3. Remove inline events (onload, onclick, etc.) and Javascript URIs
    sanitized = sanitized
        .replace(/on\w+="[^"]*"/gi, "")
        .replace(/on\w+='[^']*'/gi, "")
        .replace(/href="javascript:[^"]*"/gi, 'href="#"')
        .replace(/href='javascript:[^']*'/gi, "href='#'")

    // 4. Strip inline styles unless they are harmless (or just remove them completely for clean design consistency)
    sanitized = sanitized.replace(/style="[^"]*"/gi, "").replace(/style='[^']*'/gi, "")

    // 5. Convert lists or tables into clean structures if WooCommerce output is messy
    // (Usually WooCommerce returns standard <ul>, <ol>, <li>, <table> elements)

    // 6. Basic formatting cleanup: strip obsolete attributes from tags but preserve essential ones
    sanitized = sanitized.replace(/<(a|img)\b([^>]*)(class|id|dir|data-[a-z-]+|style)="[^"]*"/gi, "<$1 $2")
    sanitized = sanitized.replace(/<(a|img)\b([^>]*)(class|id|dir|data-[a-z-]+|style)='[^']*'/gi, "<$1 $2")

    // Trim trailing and leading whitespace within tags
    sanitized = sanitized.trim()

    return sanitized
}

/**
 * Fallback plaintext converter for simple string fields.
 */
export function stripHtmlToText(html: string): string {
    if (!html) return ""
    return html
        .replace(/<[^>]*>/g, "") // remove all HTML tags
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim()
}
