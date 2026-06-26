export interface GoogleFormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  options?: string[];
}

export interface GoogleFormSubmit {
  type: "google_forms";
  endpoint: string;
  mapping: Record<string, string>;
}

export interface GoogleFormSchema {
  _source: "pluginfoundry";
  pf_id: string;
  integration: "google_forms";
  version: number;
  title: string;
  description: string;
  fields: GoogleFormField[];
  pages?: any[];
  submit: GoogleFormSubmit;
}

export interface GoogleFormsConnection {
  id: string;
  userId: string;
  framerProjectId: string;
  componentInstanceId?: string;
  pf_id: string;
  lastSyncedVersion: number;
  createdAt: string;
}

export interface GoogleFormsSyncJob {
  id: string;
  pf_id: string;
  status: "success" | "failed";
  message: string;
  timestamp: string;
}
