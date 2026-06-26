export interface ExtractedField {
  id: string; // Internal component ID
  label: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'checkbox' | 'radio' | 'select' | 'date' | 'time' | 'section' | 'unsupported';
  required: boolean;
  options?: string[];
  entryId: string; // The Google entry.XXXXX identifier
}

export interface FormConnectionSchema {
  _source?: "pluginfoundry";
  pf_id?: string;
  version?: number;
  integration?: "google_forms";
  title?: string;
  description?: string;
  fields: Array<{
    id: string;
    type: string;
    label: string;
    required: boolean;
    options?: string[];
  }>;
  pages?: any[];
  submit: {
    type: "google_forms";
    endpoint: string;
    mapping: Record<string, string>;
  };
}

export interface ExtractedForm {
  title: string;
  description: string;
  actionUrl: string;
  schema: FormConnectionSchema;
}

export function parseGoogleHtml(html: string, originalUrl: string): ExtractedForm {
  let title = "Linked Google Form";
  let description = "Automatically parsed from Google Form URL";
  let rawFields: ExtractedField[] = [];
  let pages: any[] = [];
  
  // Clean URL to formResponse
  // Supports:
  // - https://docs.google.com/forms/d/e/.../viewform
  // - https://docs.google.com/forms/d/.../viewform
  // - https://docs.google.com/forms/d/.../copy
  let actionUrl = originalUrl;
  let formId = "unknown";

  // Match and build clean formResponse
  const matchE = originalUrl.match(/\/forms\/d\/e\/([a-zA-Z0-9-_]+)/);
  const matchNormal = originalUrl.match(/\/forms\/d\/([a-zA-Z0-9-_]+)/);

  if (matchE && matchE[1]) {
    formId = matchE[1];
    actionUrl = `https://docs.google.com/forms/d/e/${formId}/formResponse`;
  } else if (matchNormal && matchNormal[1]) {
    formId = matchNormal[1];
    actionUrl = `https://docs.google.com/forms/d/${formId}/formResponse`;
  } else {
    actionUrl = originalUrl.replace(/\/(viewform|edit|copy)(\?.*)?$/, '/formResponse');
  }

  try {
    // Extract the internal Google Forms public load state array variable with supreme resilience
    const varName = 'FB_PUBLIC_LOAD_DATA_';
    const varIndex = html.indexOf(varName);
    if (varIndex !== -1) {
      const equalsIndex = html.indexOf('=', varIndex);
      if (equalsIndex !== -1) {
        const bracketIndex = html.indexOf('[', equalsIndex);
        if (bracketIndex !== -1) {
          const payloadStart = html.substring(bracketIndex);
          let openBrackets = 0;
          let jsonEndIndex = -1;
          let inString = false;
          let escapeNext = false;
          
          for (let i = 0; i < payloadStart.length; i++) {
            const char = payloadStart[i];
            if (escapeNext) {
              escapeNext = false;
              continue;
            }
            if (char === '\\') {
              escapeNext = true;
              continue;
            }
            if (char === '"') {
              inString = !inString;
              continue;
            }
            
            if (!inString) {
              if (char === '[') openBrackets++;
              else if (char === ']') {
                openBrackets--;
                if (openBrackets === 0) {
                  jsonEndIndex = i + 1;
                  break;
                }
              }
            }
          }
          
          if (jsonEndIndex !== -1) {
            const payloadText = payloadStart.substring(0, jsonEndIndex);
            const data = JSON.parse(payloadText);
          
            // Title is under data[1][8] or data[1][0] or document title
            if (data[1] && data[1][8]) {
              title = data[1][8];
            } else if (data[1] && data[1][0]) {
              title = data[1][0];
            }
            
            // Description is under data[1][1] or data[1][3]
            if (data[1] && data[1][3]) {
              description = data[1][3];
            }
            
            // Form Items array is under data[1][1]
            const formItems = (data[1] && data[1][1]) || [];
            
            formItems.forEach((item: any, idx: number) => {
              // item[1] is the Label
              // item[3] is the itemTypeVal
              // item[4] is the control options array
              if (!item || !item[1]) return;
              
              const label = item[1];
              const itemType = item[3];

              // Section break has itemType === 13 or similar, keep track
              if (itemType === 13) {
                pages.push({
                  index: pages.length + 1,
                  title: label,
                  description: item[2] || ""
                });
                return;
              }

              const controlArray = item[4] && item[4][0];
              if (!controlArray && itemType !== 13) return;
              
              // Extract entryId from controlArray[0]
              const entryIdNum = controlArray ? controlArray[0] : null;
              if (!entryIdNum && itemType !== 13) return;
              
              const entryId = `entry.${entryIdNum}`;
              const isRequired = controlArray ? (controlArray[2] === 1 || controlArray[2] === true) : false;
              
              // Extract options if applicable
              const rawOptions = controlArray ? (controlArray[1] || []) : [];
              const options = rawOptions.map((opt: any) => opt[0]).filter(Boolean);
              
              let type: ExtractedField['type'] = 'text';
              
              if (itemType === 0) {
                type = 'text';
                const lowerLabel = label.toLowerCase();
                if (lowerLabel.includes('email')) {
                  type = 'email';
                } else if (lowerLabel.includes('phone') || lowerLabel.includes('tel') || lowerLabel.includes('mobile')) {
                  type = 'phone';
                }
              } else if (itemType === 1) {
                type = 'textarea';
              } else if (itemType === 2) {
                type = 'radio';
              } else if (itemType === 3) {
                type = 'select';
              } else if (itemType === 4) {
                type = 'checkbox';
              } else if (itemType === 5) {
                type = 'radio'; // linear scale
              } else if (itemType === 9) {
                type = 'date';
              } else if (itemType === 10) {
                type = 'time';
              } else if (itemType === 14) {
                type = 'unsupported'; // Google File Upload is not allowed
              }
              
              rawFields.push({
                id: `field_${formId}_${idx}_${entryIdNum || 'node'}`, // Normalized Field ID
                label,
                type,
                required: isRequired,
                options: options.length > 0 ? options : undefined,
                entryId
              });
            });
          }
        }
      }
    }
  } catch (err) {
    console.error("Failed to parse Google Form script array:", err);
  }
  
  if (rawFields.length === 0) {
    throw new Error("Unable to extract fields. The form might be private, require a Google sign-in, or be an invalid URL.");
  }
  
  // Transform to normalized schema format
  const schema: FormConnectionSchema = {
    _source: "pluginfoundry",
    version: 1,
    integration: "google_forms",
    title,
    description,
    fields: rawFields.map(f => ({
      id: f.id,
      type: f.type,
      label: f.label,
      required: f.required,
      options: f.options
    })),
    pages: pages.length > 0 ? pages : [{ index: 1, title: "Page 1", description: "" }],
    submit: {
      type: "google_forms",
      endpoint: actionUrl,
      mapping: {}
    }
  };
  
  rawFields.forEach(f => {
    if (f.type !== 'unsupported') {
      schema.submit.mapping[f.id] = f.entryId;
    }
  });

  return {
    title,
    description,
    actionUrl,
    schema
  };
}
