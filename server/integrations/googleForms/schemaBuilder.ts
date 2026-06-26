import { GoogleFormSchema, GoogleFormField } from "./types";
import { parseGoogleHtml } from "./parser";

export function buildSchema(pfId: string, url: string, html: string, version: number): GoogleFormSchema {
  const parsed = parseGoogleHtml(html);
  
  // Clean URL to base endpoint
  let endpoint = url;
  const matchE = url.match(/\/forms\/d\/e\/([a-zA-Z0-9-_]+)/);
  const matchNormal = url.match(/\/forms\/d\/([a-zA-Z0-9-_]+)/);

  if (matchE && matchE[1]) {
    endpoint = `https://docs.google.com/forms/d/e/${matchE[1]}/formResponse`;
  } else if (matchNormal && matchNormal[1]) {
    endpoint = `https://docs.google.com/forms/d/${matchNormal[1]}/formResponse`;
  } else {
    endpoint = url.replace(/\/(viewform|edit|copy)(\?.*)?$/, '/formResponse');
  }

  const fields: GoogleFormField[] = parsed.fields.map((f: any) => ({
    id: f.id,
    type: f.type,
    label: f.label,
    required: f.required,
    ...(f.options ? { options: f.options } : {})
  }));

  const mapping: Record<string, string> = {};
  parsed.fields.forEach((f: any) => {
    if (f.type !== 'unsupported') {
      mapping[f.id] = f.entryId;
    }
  });

  return {
    _source: "pluginfoundry",
    pf_id: pfId,
    integration: "google_forms",
    version,
    title: parsed.title,
    description: parsed.description,
    fields,
    pages: parsed.pages,
    submit: {
      type: "google_forms",
      endpoint,
      mapping
    }
  };
}
