import { connectProject, disconnectProject } from "./connection";
import { 
  getCmsCollections, 
  getCmsCollection, 
  getCollectionSchemaFields, 
  getCollectionItemsList, 
  syncItemsToCollection, 
  removeItemsFromCollection 
} from "./collections";
import { 
  getPublishDetails, 
  getChangedPathsFromConnection, 
  createPreviewDeployment, 
  getProjectDeployments, 
  promoteDeploymentToProduction 
} from "./publishing";
import { getProjectDetails } from "./project";
import { type Framer } from "framer-api";

export class FramerClient {
  private framerInstance: Framer | null = null;

  constructor(
    private projectUrl: string,
    private apiKey: string
  ) {}

  async connect(): Promise<Framer> {
    if (!this.framerInstance) {
      this.framerInstance = await connectProject(this.projectUrl, this.apiKey);
    }
    return this.framerInstance;
  }

  async disconnect(): Promise<void> {
    if (this.framerInstance) {
      await disconnectProject(this.framerInstance);
      this.framerInstance = null;
    }
  }

  // Collections
  async getCollections() {
    const conn = await this.connect();
    return await getCmsCollections(conn);
  }

  async getCollection(collectionId: string) {
    const conn = await this.connect();
    return await getCmsCollection(conn, collectionId);
  }

  async createCollection(name: string) {
    const conn = await this.connect();
    if (typeof conn.createCollection !== "function") {
      throw new Error("CMS collection creation is not supported on this Framer connection.");
    }
    return await conn.createCollection(name);
  }

  // Schema
  async getCollectionSchema(collectionId: string) {
    const collection = await this.getCollection(collectionId);
    if (!collection) {
      throw new Error(`Collection not found: ${collectionId}`);
    }
    return await getCollectionSchemaFields(collection);
  }

  // Items
  async getCollectionItems(collectionId: string) {
    const collection = await this.getCollection(collectionId);
    if (!collection) {
      throw new Error(`Collection not found: ${collectionId}`);
    }
    return await getCollectionItemsList(collection);
  }

  async syncItems(collectionId: string, items: { id?: string; slug: string; name: string; fieldData: Record<string, any> }[]) {
    const collection = await this.getCollection(collectionId);
    if (!collection) {
      throw new Error(`Collection not found: ${collectionId}`);
    }
    return await syncItemsToCollection(collection, items);
  }

  async deleteItems(collectionId: string, itemIds: string[]) {
    const collection = await this.getCollection(collectionId);
    if (!collection) {
      throw new Error(`Collection not found: ${collectionId}`);
    }
    return await removeItemsFromCollection(collection, itemIds);
  }

  // Project
  async getProjectDetails() {
    const conn = await this.connect();
    return await getProjectDetails(conn);
  }

  // Publishing
  async getPublishInfo() {
    const conn = await this.connect();
    return await getPublishDetails(conn);
  }

  async getChangedPaths() {
    const conn = await this.connect();
    return await getChangedPathsFromConnection(conn);
  }

  async publish() {
    const conn = await this.connect();
    return await createPreviewDeployment(conn);
  }

  async getDeployments() {
    const conn = await this.connect();
    return await getProjectDeployments(conn);
  }

  async deploy(deploymentId: string, domains?: string[]) {
    const conn = await this.connect();
    return await promoteDeploymentToProduction(conn, deploymentId, domains);
  }
}
