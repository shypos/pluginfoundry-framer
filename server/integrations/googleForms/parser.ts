export function extractLoadData(html: string): any {
  const varName = 'FB_PUBLIC_LOAD_DATA_';
  const varIndex = html.indexOf(varName);
  if (varIndex === -1) return null;

  const equalsIndex = html.indexOf('=', varIndex);
  if (equalsIndex === -1) return null;

  const bracketIndex = html.indexOf('[', equalsIndex);
  if (bracketIndex === -1) return null;

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
    try {
      const payloadText = payloadStart.substring(0, jsonEndIndex);
      return JSON.parse(payloadText);
    } catch (e) {
      console.error("Failed to parse FB_PUBLIC_LOAD_DATA_", e);
      return null;
    }
  }

  return null;
}

export function parseGoogleHtml(html: string) {
  const data = extractLoadData(html);
  if (!data) throw new Error("Could not extract Google Form data");

  // Title is under data[1][8] or data[1][0] or document title
  let title = "Linked Google Form";
  if (data[1] && data[1][8]) {
    title = data[1][8];
  } else if (data[1] && data[1][0]) {
    title = data[1][0];
  }

  // Description is under data[1][1] or data[1][3]
  let description = "Automatically parsed from Google Form URL";
  if (data[1] && data[1][3]) {
    description = data[1][3];
  }

  const fieldsData = (data[1] && data[1][1]) || [];
  const fields: any[] = [];
  const pages: any[] = [];

  fieldsData.forEach((item: any, idx: number) => {
    if (!item || !item[1]) return;

    const rawId = item[0] || idx;
    const label = item[1];
    const itemType = item[3];

    // Section break has itemType === 13 or similar
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
    const required = controlArray ? (controlArray[2] === 1 || controlArray[2] === true) : false;
    
    // Extract options
    const rawOptions = controlArray ? (controlArray[1] || []) : [];
    const options = rawOptions.map((opt: any) => opt[0]).filter(Boolean);

    let type = "text";
    if (itemType === 0) {
      type = "text";
      const lowerLabel = label.toLowerCase();
      if (lowerLabel.includes('email')) {
        type = "email";
      } else if (lowerLabel.includes('phone') || lowerLabel.includes('tel') || lowerLabel.includes('mobile')) {
        type = "phone";
      }
    } else if (itemType === 1) {
      type = "textarea";
    } else if (itemType === 2) {
      type = "radio";
    } else if (itemType === 3) {
      type = "select";
    } else if (itemType === 4) {
      type = "checkbox";
    } else if (itemType === 5) {
      type = "radio"; // linear scale
    } else if (itemType === 9) {
      type = "date";
    } else if (itemType === 10) {
      type = "time";
    } else if (itemType === 14) {
      type = "unsupported"; // Google File Upload is not allowed
    }

    fields.push({
      id: `field_node_${idx}_${entryIdNum || 'node'}`, // Normalized field ID
      label,
      type,
      required,
      options: options.length > 0 ? options : undefined,
      entryId
    });
  });

  if (pages.length === 0) {
    pages.push({ index: 1, title: "Page 1", description: "" });
  }

  return { title, description, fields, pages };
}
