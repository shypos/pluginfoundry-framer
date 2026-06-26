import { type Framer, type Deployment, type Hostname } from "framer-api";

export interface PublishInfoResponse {
  production: { url: string; lastDeployed: string } | null;
  staging: { url: string; lastDeployed: string } | null;
}

export async function getPublishDetails(framer: Framer): Promise<any> {
  if (typeof framer.getPublishInfo === "function") {
    return await framer.getPublishInfo();
  }
  throw new Error("getPublishInfo is not supported on this Framer connection.");
}

export async function getChangedPathsFromConnection(framer: Framer): Promise<{ added: string[]; removed: string[]; modified: string[] }> {
  if (typeof framer.getChangedPaths === "function") {
    return await framer.getChangedPaths();
  }
  return { added: [], removed: [], modified: [] };
}

export async function createPreviewDeployment(framer: Framer): Promise<any> {
  if (typeof framer.publish === "function") {
    return await framer.publish();
  }
  throw new Error("publish is not supported on this Framer connection.");
}

export async function getProjectDeployments(framer: Framer): Promise<Deployment[]> {
  if (typeof framer.getDeployments === "function") {
    return await framer.getDeployments();
  }
  return [];
}

export async function promoteDeploymentToProduction(
  framer: Framer,
  deploymentId: string,
  domains?: string[]
): Promise<Hostname[]> {
  if (typeof framer.deploy === "function") {
    return await framer.deploy(deploymentId, domains);
  }
  throw new Error("deploy is not supported on this Framer connection.");
}
