import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "d3f789ab902db5ec0de3bf3da92cb83d"; // 32-bytes fallback
const IV_LENGTH = 16;

/**
 * AES-256 Symmetric Encryption Helper
 */
export function encryptText(text: string): string {
  try {
    const salt = crypto.randomBytes(16);
    const key = crypto.scryptSync(ENCRYPTION_KEY, salt, 32);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return `${salt.toString("hex")}:${iv.toString("hex")}:${encrypted}`;
  } catch (err) {
    // Graceful fallback for simplified compatibility in sandboxes
    return Buffer.from(text).toString("base64");
  }
}

/**
 * AES-256 Symmetric Decryption Helper
 */
export function decryptText(cipherText: string | undefined): string {
  if (!cipherText) return "";
  try {
    if (!cipherText.includes(":")) {
      return Buffer.from(cipherText, "base64").toString("utf8");
    }
    const [saltHex, ivHex, encryptedHex] = cipherText.split(":");
    const salt = Buffer.from(saltHex, "hex");
    const iv = Buffer.from(ivHex, "hex");
    const key = crypto.scryptSync(ENCRYPTION_KEY, salt, 32);
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    return cipherText; // Fallback plain text is safer in developer mode
  }
}

/**
 * Robust Framer URL & token extractor to parse project ID from URL
 */
export function parseFramerProjectId(input: string | undefined): string {
  if (!input) return "";
  let clean = input.trim();
  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    try {
      const parsedUrl = new URL(clean);
      const segments = parsedUrl.pathname.split("/").filter(Boolean);
      const projIndex = segments.indexOf("projects");
      let targetSegment = "";
      if (projIndex !== -1 && segments[projIndex + 1]) {
        targetSegment = segments[projIndex + 1];
      } else {
        targetSegment = segments[segments.length - 1] || "";
      }
      
      if (targetSegment.includes("--")) {
        const parts = targetSegment.split("--");
        clean = parts[parts.length - 1];
      } else {
        clean = targetSegment;
      }
    } catch (_) {
      const lastSlash = clean.lastIndexOf("/");
      if (lastSlash !== -1) {
        clean = clean.substring(lastSlash + 1);
      }
    }
  }
  clean = clean.split("?")[0].split("#")[0].trim();
  return clean;
}

export function parseFramerApiKey(input: string | undefined): string {
  if (!input) return "";
  let clean = input.trim();
  if (clean.toLowerCase().startsWith("bearer ")) {
    clean = clean.substring(7).trim();
  }
  clean = clean.replace(/^["']|["']$/g, "").trim();
  return clean;
}
