import { type Framer } from "framer-api";

export interface ProjectInfo {
  id: string;
  name: string;
}

export async function getProjectDetails(framer: Framer): Promise<ProjectInfo> {
  if (typeof framer.getProjectInfo === "function") {
    const info = await framer.getProjectInfo();
    return {
      id: info.id,
      name: info.name
    };
  }
  throw new Error("getProjectInfo is not supported on this Framer connection.");
}
