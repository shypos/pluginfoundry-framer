import fs from "fs";
import path from "path";
import crypto from "crypto";
import { encryptText, decryptText } from "./crypto";

// Directory of DB tables
const DB_DIR = path.join(process.cwd(), "db_data");
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Simulated relational tables
const TABLES = {
  USERS: path.join(DB_DIR, "users.json"),
  GOOGLE_FORMS: path.join(DB_DIR, "google_forms.json"),
  GOOGLE_FORM_SCHEMAS: path.join(DB_DIR, "google_form_schemas.json"),
  FRAMER_CONNECTIONS: path.join(DB_DIR, "framer_connections.json"),
  FRAMER_COMPONENT_BINDINGS: path.join(DB_DIR, "framer_component_bindings.json"),
};

// Seed/init databases
function initTable<T>(filePath: string, defaultData: T[]): T[] {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), "utf8");
    return defaultData;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), "utf8");
    return defaultData;
  }
}

function saveTable<T>(filePath: string, data: T[]) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

// Pre-seed some dummy elements matching requested schema
export function initPrismaSimulator() {
  const defaultUsers = [
    { id: "u_9a8df412-ee98-4b71-b51f-6da76bc380e1", email: "studiolazin@gmail.com", created_at: "2026-06-16T10:00:00Z" }
  ];

  const defaultForms = [
    {
      id: "f_bc430e31-bdab-45fa-bb2a-fa13702a0a20",
      pf_id: "pf_gf_x121A",
      name: "Contact Us Page Form",
      submissions: 142,
      status: "Active",
      google_url: "https://docs.google.com/forms/d/e/1FAIpQLSfD_Z.../viewform",
      created_at: "2026-05-10T14:22:00Z",
      version: 1
    },
    {
      id: "f_de93a110-8fa3-42e7-91a9-cb1e6ae8f180",
      pf_id: "pf_gf_x122B",
      name: "SaaS Beta Waitlist",
      submissions: 890,
      status: "Active",
      google_url: "https://docs.google.com/forms/d/e/1FAIpQLSfD_Y.../viewform",
      created_at: "2026-06-01T09:12:00Z",
      version: 1
    },
    {
      id: "f_ac832b80-ab97-4fe0-9421-2ba7dbac92b1",
      pf_id: "pf_gf_x123C",
      name: "Product Feedback Survey",
      submissions: 0,
      status: "Draft",
      google_url: "https://docs.google.com/forms/d/e/1FAIpQLSfD_Z.../viewform",
      created_at: "2026-06-11T16:45:00Z",
      version: 1
    }
  ];

  const dummyFields = [
    { id: "field_name", type: "text", label: "Full Name", required: true },
    { id: "field_email", type: "email", label: "Email Address", required: true },
    { id: "field_msg", type: "textarea", label: "Message / Inquiries", required: false }
  ];

  const defaultSchemas = defaultForms.map(form => ({
    id: `schema_uuid_${Math.random().toString(36).substr(2, 9)}`,
    form_id: form.id,
    pf_id: form.pf_id,
    version: 1,
    schema: {
      _source: "pluginfoundry",
      pf_id: form.pf_id,
      version: 1,
      integration: "google_forms",
      title: form.name,
      description: "Parsed Google Form",
      fields: dummyFields,
      pages: [],
      submit: {
        type: "google_forms",
        endpoint: form.google_url.replace(/\/viewform$/, '/formResponse'),
        mapping: {
          "field_name": "entry.1000001",
          "field_email": "entry.1000002",
          "field_msg": "entry.1000003"
        }
      }
    },
    created_at: form.created_at
  }));

  initTable(TABLES.USERS, defaultUsers);
  initTable(TABLES.GOOGLE_FORMS, defaultForms);
  initTable(TABLES.GOOGLE_FORM_SCHEMAS, defaultSchemas);
  initTable(TABLES.FRAMER_CONNECTIONS, []);
  initTable(TABLES.FRAMER_COMPONENT_BINDINGS, []);
}

// Generate new secure random pf_id prefix
export function generatePfId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 7; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `pf_gf_${token}`;
}

export function generateUuid(): string {
  return crypto.randomUUID();
}

// GOOGLE FORMS TABLE
export function getGoogleForms() {
  return initTable(TABLES.GOOGLE_FORMS, []);
}

export function saveGoogleForms(forms: any[]) {
  saveTable(TABLES.GOOGLE_FORMS, forms);
}

export function getFormByPfId(pfId: string) {
  const forms = getGoogleForms();
  return forms.find(f => f.pf_id === pfId) || null;
}

export function getFormById(id: string) {
  const forms = getGoogleForms();
  return forms.find(f => f.id === id) || null;
}

// SCHEMAS TABLE
export function getSchemas() {
  return initTable(TABLES.GOOGLE_FORM_SCHEMAS, []);
}

export function getSchemasByFormId(formId: string) {
  const schemas = getSchemas();
  return schemas.filter(s => s.form_id === formId).sort((a, b) => b.version - a.version);
}

export function getLatestSchemaByPfId(pfId: string) {
  const schemas = getSchemas();
  const formSchemas = schemas.filter(s => s.pf_id === pfId).sort((a, b) => b.version - a.version);
  return formSchemas[0] || null;
}

export function getSpecificSchema(pfId: string, version: number) {
  const schemas = getSchemas();
  return schemas.find(s => s.pf_id === pfId && s.version === version) || null;
}

export function saveSchema(formId: string, pfId: string, schemaObj: any, version: number) {
  const schemas = getSchemas();
  const newSchemaRow = {
    id: generateUuid(),
    form_id: formId,
    pf_id: pfId,
    version,
    schema: schemaObj,
    created_at: new Date().toISOString()
  };
  schemas.push(newSchemaRow);
  saveTable(TABLES.GOOGLE_FORM_SCHEMAS, schemas);
  return newSchemaRow;
}

// FRAMER CONNECTIONS TABLE
export function getFramerConnections() {
  return initTable(TABLES.FRAMER_CONNECTIONS, []);
}

export function saveFramerConnections(connections: any[]) {
  saveTable(TABLES.FRAMER_CONNECTIONS, connections);
}

export function getFramerConnectionByPfId(pfId: string) {
  const conns = getFramerConnections();
  const conn = conns.find(c => c.pf_id === pfId);
  if (!conn) return null;
  return {
    ...conn,
    projectToken: decryptText(conn.projectToken) // Return decrypted inside backend memory context safely
  };
}

export function upsertFramerConnection(pfId: string, formId: string, projectId: string, projectToken: string) {
  const conns = getFramerConnections();
  const index = conns.findIndex(c => c.pf_id === pfId);
  const encryptedToken = encryptText(projectToken);

  const updatedConn = {
    id: index !== -1 ? conns[index].id : generateUuid(),
    form_id: formId,
    pf_id: pfId,
    projectId,
    projectToken: encryptedToken,
    created_at: index !== -1 ? conns[index].created_at : new Date().toISOString()
  };

  if (index !== -1) {
    conns[index] = updatedConn;
  } else {
    conns.push(updatedConn);
  }
  saveFramerConnections(conns);
  return updatedConn;
}

// FRAMER BINDINGS TABLE
export function getFramerBindings() {
  return initTable(TABLES.FRAMER_COMPONENT_BINDINGS, []);
}

export function saveFramerBindings(bindings: any[]) {
  saveTable(TABLES.FRAMER_COMPONENT_BINDINGS, bindings);
}

export function getFramerBindingsByPfId(pfId: string) {
  const bindings = getFramerBindings();
  return bindings.find(b => b.pf_id === pfId) || null;
}

export function upsertFramerBinding(pfId: string, connectionId: string, componentInstanceId: string) {
  const bindings = getFramerBindings();
  const index = bindings.findIndex(b => b.pf_id === pfId);

  const updatedBinding = {
    id: index !== -1 ? bindings[index].id : generateUuid(),
    connection_id: connectionId,
    componentInstanceId,
    pf_id: pfId,
    created_at: index !== -1 ? bindings[index].created_at : new Date().toISOString()
  };

  if (index !== -1) {
    bindings[index] = updatedBinding;
  } else {
    bindings.push(updatedBinding);
  }
  saveFramerBindings(bindings);
  return updatedBinding;
}
