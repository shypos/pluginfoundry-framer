import express from "express";
import { 
  getGoogleForms, 
  saveGoogleForms, 
  getFormById, 
  getFormByPfId, 
  getLatestSchemaByPfId, 
  saveSchema, 
  generateUuid, 
  generatePfId 
} from "../db_prisma_simulator";

export const googleformsRouter = express.Router();

// 1. GET /api/forms
googleformsRouter.get("/api/forms", (req, res) => {
  const forms = getGoogleForms();
  // Return forms mapped with their latest active schema structure
  const richForms = forms.map(f => {
    const latestSchemaRow = getLatestSchemaByPfId(f.pf_id);
    return {
      ...f,
      schema: latestSchemaRow ? latestSchemaRow.schema : undefined
    };
  });
  res.json(richForms);
});

// 2. POST /api/forms
googleformsRouter.post("/api/forms", (req, res) => {
  const { name, status, schema, google_url, version } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Form name is required" });
  }

  const forms = getGoogleForms();
  const formId = generateUuid();
  const pf_id = generatePfId();
  const formVersion = version !== undefined ? Number(version) : 1;

  const newForm = {
    id: formId,
    pf_id,
    name: name.trim(),
    submissions: 0,
    status: status === "Draft" ? "Draft" : "Active",
    created_at: new Date().toISOString(),
    google_url: google_url || undefined,
    version: formVersion
  };

  forms.push(newForm);
  saveGoogleForms(forms);

  // If a schema block is provided, persist it securely under the versioned schemas table
  if (schema) {
    // Ensure schema has matching public credentials attributes
    const normalizedSchema = {
      ...schema,
      pf_id,
      version: formVersion
    };
    saveSchema(formId, pf_id, normalizedSchema, formVersion);
    (newForm as any).schema = normalizedSchema;
  }

  res.status(201).json(newForm);
});

// 3. PUT /api/forms/:id
googleformsRouter.put("/api/forms/:id", (req, res) => {
  const { id } = req.params;
  const { name, status, submissions, schema, google_url, version } = req.body;

  const forms = getGoogleForms();
  const formIndex = forms.findIndex(f => f.id === id);

  if (formIndex === -1) {
    return res.status(404).json({ error: "Form not found" });
  }

  const form = forms[formIndex];

  if (name !== undefined) form.name = name.trim();
  if (status !== undefined) form.status = status;
  if (submissions !== undefined) form.submissions = Number(submissions);
  if (google_url !== undefined) form.google_url = google_url;
  if (version !== undefined) form.version = Number(version);

  saveGoogleForms(forms);

  // If schema is updated, save it under the specific version to build historical timeline
  if (schema !== undefined && schema !== null) {
    const updatedVersion = Number(version || form.version || 1);
    const normalizedSchema = {
      ...schema,
      pf_id: form.pf_id,
      version: updatedVersion
    };
    saveSchema(form.id, form.pf_id, normalizedSchema, updatedVersion);
    (form as any).schema = normalizedSchema;
  } else {
    const latestSchemaRow = getLatestSchemaByPfId(form.pf_id);
    if (latestSchemaRow) {
      (form as any).schema = latestSchemaRow.schema;
    }
  }

  res.json({ success: true, form });
});

// 4. DELETE /api/forms/:id
googleformsRouter.delete("/api/forms/:id", (req, res) => {
  const { id } = req.params;
  const forms = getGoogleForms();
  const index = forms.findIndex(f => f.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Form not found" });
  }

  forms.splice(index, 1);
  saveGoogleForms(forms);

  res.json({ success: true, message: "Form configuration removed." });
});

// 5. GET /api/forms/proxy (Proxies requests to Google Forms to bypass CORS)
googleformsRouter.get("/api/forms/proxy", async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Missing or invalid url parameter" });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch from Google Forms" });
    }
    const html = await response.text();
    res.send(html);
  } catch (err: any) {
    console.error("[CORS Proxy Error]", err);
    res.status(500).json({ error: "Internal proxy error", message: err.message });
  }
});

// 6. POST /api/forms/submit
// Secure production proxy for Google Forms with optional CAPTCHA validation
googleformsRouter.post("/api/forms/submit", async (req, res) => {
  try {
    const { pf_id, answers, captchaToken, captchaProvider } = req.body;

    if (!pf_id) {
      return res.status(400).json({ error: "Missing pf_id identifier" });
    }

    const form = getFormByPfId(pf_id);
    if (!form) {
      return res.status(404).json({ error: `Registered form ${pf_id} not found.` });
    }

    const latestSchemaRow = getLatestSchemaByPfId(pf_id);
    if (!latestSchemaRow || !latestSchemaRow.schema) {
      return res.status(404).json({ error: `Active schema configuration not found for form ${pf_id}.` });
    }

    const schema = latestSchemaRow.schema;

    // Perform CAPTCHA secret validation if enabled and token present
    if (captchaProvider && captchaProvider !== "none" && captchaToken) {
      try {
        if (captchaProvider === "turnstile") {
          const secretKey = process.env.TURNSTILE_SECRET_KEY || "1x0000000000000000000000000000000AA"; // Standard testing key
          const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              secret: secretKey,
              response: captchaToken,
            }),
          });
          const verifyData: any = await verifyRes.json();
          if (!verifyData.success) {
            return res.status(400).json({ error: "CAPTCHA validation failed. Invalid Cloudflare Turnstile token." });
          }
        } else if (captchaProvider === "recaptchaV2") {
          const secretKey = process.env.RECAPTCHA_SECRET_KEY || "6LeIxAcTAAAAAGG-vFI1TnFTxW2mY77Y8aaW17Gs"; // Web test key
          const verifyRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              secret: secretKey,
              response: captchaToken,
            }),
          });
          const verifyData: any = await verifyRes.json();
          if (!verifyData.success) {
            return res.status(400).json({ error: "CAPTCHA validation failed. Invalid Google reCAPTCHA token." });
          }
        }
      } catch (captchaErr: any) {
        console.error("[CAPTCHA Verification Error]", captchaErr);
        return res.status(502).json({ error: "Upstream CAPTCHA security verification failed", details: captchaErr.message });
      }
    }

    // Map answer values to Google entry targets
    const endpoint = schema.submit?.endpoint;
    if (!endpoint) {
      return res.status(400).json({ error: "This form schema is missing google submit targets." });
    }

    const mapping = (schema.submit?.mapping || {}) as Record<string, string>;
    const urlParams = new URLSearchParams();

    for (const [fieldId, entryId] of Object.entries(mapping)) {
      const value = answers[fieldId];
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          for (const val of value) {
            urlParams.append(entryId, String(val));
          }
        } else {
          urlParams.append(entryId, String(value));
        }
      }
    }

    // Proxy the submission to Google Forms on the server-side
    const submitResponse = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: urlParams,
    });

    // Increment submissions metrics
    const forms = getGoogleForms();
    const formIndex = forms.findIndex((f) => f.pf_id === pf_id);
    if (formIndex !== -1) {
      forms[formIndex].submissions = (forms[formIndex].submissions || 0) + 1;
      saveGoogleForms(forms);
    }

    res.json({
      success: true,
      message: "Form response submitted and registered safely on PluginFoundry servers.",
      googleResponseStatus: submitResponse.status,
    });
  } catch (err: any) {
    console.error("[Google Submission Proxy Failure]", err);
    res.status(502).json({ error: "Failed to dispatch form variables to Google target", message: err.message });
  }
});

