import { connect, type Framer } from "framer-api";
import { FramerConnectionError, FramerAuthError } from "./errors";

export async function connectProject(
  projectUrl: string,
  apiKey: string,
  retries: number = 3,
  delayMs: number = 1000
): Promise<Framer> {
  if (!projectUrl) {
    throw new Error("Project URL/ID is required.");
  }
  if (!apiKey) {
    throw new FramerAuthError("Framer API Key is required.");
  }

  let attempt = 0;
  while (true) {
    try {
      const framer = await connect(projectUrl, apiKey);
      return framer;
    } catch (err: any) {
      attempt++;
      const isUnauthorized = 
        err.message?.toLowerCase().includes("unauthorized") || 
        err.message?.toLowerCase().includes("auth") ||
        err.message?.toLowerCase().includes("key") ||
        err.status === 401;

      if (isUnauthorized) {
        throw new FramerAuthError(`Failed to authenticate with Framer API key: ${err.message}`, err);
      }

      if (attempt >= retries) {
        throw new FramerConnectionError(
          `Failed to connect to Framer project after ${retries} attempts: ${err.message}`,
          err
        );
      }

      console.warn(`Framer connection attempt ${attempt} failed: ${err.message}. Retrying in ${delayMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }
}

export async function disconnectProject(framer: Framer): Promise<void> {
  if (framer && typeof framer.disconnect === "function") {
    try {
      await framer.disconnect();
    } catch (err) {
      console.error("Error disconnecting Framer connection: ", err);
    }
  }
}
