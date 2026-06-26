import { FramerClient } from "../../../lib/framer/client";
import { GoogleFormSchema } from "./types";

const COMPONENT_URL = "https://framer.com/m/FramerGoogleForm-NYPedc.js@e2ZereloMPXmmxflwctT";

export class GoogleFormsFramerService {
  constructor(private framerUrl: string, private apiKey: string) {}

  async insertForm(schema: GoogleFormSchema): Promise<string> {
    const client = new FramerClient(this.framerUrl, this.apiKey);
    const conn = await client.connect();

    if (typeof conn.addComponentInstance !== "function") {
      throw new Error("addComponentInstance is not supported by this Framer connection. Must use a plugin context or simulated.");
    }

    // Insert the code component
    const node = await conn.addComponentInstance({
      url: COMPONENT_URL,
      attributes: {
        controls: {
          schema: JSON.stringify(schema)
        }
      }
    });

    return node.id;
  }

  async updateFormSchema(componentInstanceId: string, schema: GoogleFormSchema): Promise<void> {
    const client = new FramerClient(this.framerUrl, this.apiKey);
    const conn = await client.connect();

    if (typeof conn.setAttributes !== "function") {
      throw new Error("setAttributes is not supported.");
    }

    // Update ONLY the schema prop to preserve presentation (width, height, radius, etc)
    await conn.setAttributes(componentInstanceId, {
      controls: {
        schema: JSON.stringify(schema)
      }
    });
  }
}
