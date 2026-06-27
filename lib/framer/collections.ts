import { type Framer, type Collection, type CollectionItem, type Field } from "framer-api";

export function mapValueToFramerField(framerFieldType: string, rawValue: any): { type: string; value: any } | null {
  if (rawValue === undefined || rawValue === null) {
    return null;
  }

  // Standard framer-api types:
  // "string" | "number" | "boolean" | "image" | "date" | "link" | "formattedText" | "color" | "enum" | "file"
  let type = "string";
  let value = rawValue;

  const normalizedType = framerFieldType.toLowerCase();

  switch (normalizedType) {
    case "number":
      type = "number";
      value = typeof rawValue === "number" ? rawValue : parseFloat(rawValue);
      if (isNaN(value)) value = 0;
      break;
    case "boolean":
      type = "boolean";
      value = rawValue === "true" || rawValue === true || rawValue === 1;
      break;
    case "image":
      type = "image";
      value = typeof rawValue === "string" ? rawValue : (rawValue.src || rawValue.url || "");
      break;
    case "date":
      type = "date";
      value = typeof rawValue === "string" ? rawValue : new Date(rawValue).toISOString();
      break;
    case "richtext":
    case "formattedtext":
    case "formattedText":
      type = "formattedText";
      value = String(rawValue);
      break;
    case "color":
      type = "color";
      value = String(rawValue);
      break;
    case "enum":
      type = "enum";
      value = String(rawValue);
      break;
    case "link":
      type = "link";
      value = String(rawValue);
      break;
    case "file":
      type = "file";
      value = typeof rawValue === "string" ? rawValue : (rawValue.url || "");
      break;
    default:
      type = "string";
      value = String(rawValue);
  }

  return { type, value };
}

export async function getCmsCollections(framer: Framer): Promise<Collection[]> {
  if (typeof framer.getCollections !== "function") {
    throw new Error("CMS catalog operations are not supported on this Framer connection.");
  }
  return await framer.getCollections();
}

export async function getCmsCollection(framer: Framer, collectionId: string): Promise<Collection | null> {
  if (typeof framer.getCollection !== "function") {
    throw new Error("CMS single retrieval features are not supported on this Framer connection.");
  }
  return await framer.getCollection(collectionId);
}

export async function getCollectionSchemaFields(collection: Collection): Promise<Field[]> {
  if (typeof collection.getFields !== "function") {
    return [];
  }
  return await collection.getFields();
}

export async function getCollectionItemsList(collection: Collection): Promise<CollectionItem[]> {
  if (typeof collection.getItems !== "function") {
    return [];
  }
  return await collection.getItems();
}

export async function syncItemsToCollection(
  collection: Collection,
  items: { id?: string; slug: string; name: string; fieldData: Record<string, any> }[]
): Promise<void> {
  if (typeof collection.addItems !== "function") {
    throw new Error("Adding or updating item entries is not supported on this collection.");
  }

  const fields = await collection.getFields();
  const fieldsMap = new Map(fields.map(f => [f.id, f]));

  const mappedItems = items.map(item => {
    const formattedFieldData: Record<string, any> = {};

    Object.entries(item.fieldData).forEach(([fieldId, val]) => {
      const fieldDef = fieldsMap.get(fieldId);
      if (fieldDef) {
        const mapped = mapValueToFramerField(fieldDef.type, val);
        if (mapped) {
          formattedFieldData[fieldId] = mapped;
        }
      } else {
        // Fallback for default name & slug fields if present or raw values
        if (fieldId !== "slug" && fieldId !== "id") {
          formattedFieldData[fieldId] = { type: "string", value: String(val) };
        }
      }
    });

    return {
      id: item.id || undefined,
      slug: item.slug,
      fieldData: formattedFieldData
    };
  });

  await collection.addItems(mappedItems);
}

export async function removeItemsFromCollection(collection: Collection, itemIds: string[]): Promise<void> {
  if (typeof collection.removeItems !== "function") {
    throw new Error("Deleting item entries is not supported on this collection.");
  }
  await collection.removeItems(itemIds);
}
