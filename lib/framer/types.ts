export interface FramerConfig {
  projectUrl: string;
  apiKey: string;
}

export interface FramerCollectionMeta {
  id: string;
  name: string;
  slug: string;
}

export interface FramerFieldMeta {
  id: string;
  name: string;
  type: string;
}

export interface FramerSyncItemSpec {
  id?: string;
  slug: string;
  name: string;
  fields: Record<string, { type: string; value: any }>;
}

export interface FramerPublishResult {
  deploymentId: string;
  url: string;
  hostnames: string[];
}
