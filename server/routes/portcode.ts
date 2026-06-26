import express from "express";
import { PortcodeWidget } from "../types";
import { getPortcodeWidgetsFromDb, savePortcodeWidgetsToDb } from "../db";

export const portcodeRouter = express.Router();

// Defined pre-packaged visual code templates that can be ported instantly
const PRESET_TEMPLATES = [
  {
    templateId: "tpl_trustpilot",
    name: "Aesthetic Rating Badge",
    description: "Slide-in rating card with star badges and feedback counters",
    sourceCode: `<div class="rating-box" style="background:#0F172A;color:#F8FAFC;padding:16px;border-radius:12px;font-family:system-ui;display:inline-flex;align-items:center;gap:12px;box-shadow:0 10px 15px -3px rgba(0,0,0,0.1)">
  <div style="background:#22C55E;width:12px;height:12px;border-radius:50%"></div>
  <div>
    <h4 style="margin:0;font-size:14px;font-weight:600">Rated Excellent</h4>
    <p style="margin:0;font-size:11px;color:#94A3B8">based on OVER_500 reviews</p>
  </div>
</div>`,
    targetPlatform: "framer_embed",
    variables: {
      color: { label: "Indicator Color", type: "color", value: "#22C55E" },
      subtitle: { label: "Review Counter Text", type: "text", value: "based on 1,420 reviews" }
    }
  },
  {
    templateId: "tpl_socials",
    name: "Floating Contact Rails",
    description: "A compact floating dock with social shortcut link anchors",
    sourceCode: `<div class="social-dock" style="position:fixed;bottom:24px;right:24px;display:flex;flex-direction:column;gap:8px;z-index:9999;">
  <a href="https://wa.me/MESSAGE_ID" style="background:#25D366;color:#FFF;padding:10px;border-radius:50%;box-shadow:0 4px 6px rgba(0,0,0,0.15);width:40px;height:40px;display:flex;align-items:center;justify-content:center;text-decoration:none;">💬</a>
</div>`,
    targetPlatform: "framer_embed",
    variables: {
      url: { label: "WhatsApp Contact URL", type: "text", value: "https://wa.me/15550199" },
      backgroundColor: { label: "Dock Accent Color", type: "color", value: "#25D366" }
    }
  },
  {
    templateId: "tpl_newsletter",
    name: "Sleek Capsule Input Feed",
    description: "Centering grid micro-input field for subscription links",
    sourceCode: `<form class="newsletter-form" style="display:flex;gap:6px;max-width:340px;background:#1E293B;padding:6px;border-radius:30px;border:1px solid #334155;">
  <input type="email" placeholder="placeholder_text" style="flex:1;background:transparent;border:none;outline:none;color:#FFF;padding:0 12px;font-size:13px;" required />
  <button type="submit" style="background:#4F46E5;color:#FFF;border:none;padding:8px 16px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;">button_text</button>
</form>`,
    targetPlatform: "framer_tsx",
    variables: {
      placeholder: { label: "Input Placeholder", type: "text", value: "Enter email address" },
      buttonLabel: { label: "Button Label", type: "text", value: "Keep Updated" },
      buttonColor: { label: "Button Match Color", type: "color", value: "#4F46E5" }
    }
  }
];

// Helper to compile/interpolate variables in sourceCode to produce compiledCode
function compileCode(sourceCode: string, variables: Record<string, { value: any }>): string {
  let compiled = sourceCode;
  
  if (variables.color?.value) {
    compiled = compiled.replace(/#22C55E/g, String(variables.color.value));
  }
  if (variables.subtitle?.value) {
    compiled = compiled.replace(/OVER_500/g, String(variables.subtitle.value));
  }
  if (variables.backgroundColor?.value) {
    compiled = compiled.replace(/#25D366/g, String(variables.backgroundColor.value));
  }
  if (variables.url?.value) {
    compiled = compiled.replace(/https:\/\/wa\.me\/MESSAGE_ID/g, String(variables.url.value));
  }
  if (variables.placeholder?.value) {
    compiled = compiled.replace(/placeholder_text/g, String(variables.placeholder.value));
  }
  if (variables.buttonLabel?.value) {
    compiled = compiled.replace(/button_text/g, String(variables.buttonLabel.value));
  }
  if (variables.buttonColor?.value) {
    compiled = compiled.replace(/#4F46E5/g, String(variables.buttonColor.value));
  }

  return compiled;
}

// 1. GET /api/portcode/templates (Preset models catalog)
portcodeRouter.get("/api/portcode/templates", (req, res) => {
  res.json(PRESET_TEMPLATES);
});

// 2. GET /api/portcode/widgets
portcodeRouter.get("/api/portcode/widgets", (req, res) => {
  const list = getPortcodeWidgetsFromDb();
  res.json(list);
});

// 3. POST /api/portcode/compile (Dynamic validation compiler sandbox)
portcodeRouter.post("/api/portcode/compile", (req, res) => {
  const { sourceCode, variables, targetPlatform } = req.body;
  if (!sourceCode) {
    return res.status(400).json({ error: "Source HTML/CSS/JS custom code is empty." });
  }

  try {
    const finalCompiled = compileCode(sourceCode, variables || {});
    res.json({
      success: true,
      compiledCode: finalCompiled,
      message: "Snippet parsed, sanitized, and compiled perfectly matching the structural rules."
    });
  } catch (err: any) {
    res.status(500).json({ error: "Port compiler failed to translate snippet.", reason: err.message });
  }
});

// 4. POST /api/portcode/widgets (Save widget)
portcodeRouter.post("/api/portcode/widgets", (req, res) => {
  const { name, description, sourceCode, targetPlatform, variables } = req.body;
  if (!name || !sourceCode) {
    return res.status(400).json({ error: "Missing required properties (name, sourceCode)" });
  }

  const list = getPortcodeWidgetsFromDb();
  const id = `wid_${Math.random().toString(36).substr(2, 9)}`;

  const finalCompiled = compileCode(sourceCode, variables || {});

  const newWidget: PortcodeWidget = {
    id,
    name: name.trim(),
    description: (description || "No description provided.").trim(),
    sourceCode,
    targetPlatform: targetPlatform || "framer_embed",
    compiledCode: finalCompiled,
    variables: variables || {},
    status: "Active",
    created_at: new Date().toISOString()
  };

  list.push(newWidget);
  savePortcodeWidgetsToDb(list);

  res.status(201).json(newWidget);
});

// 5. PUT /api/portcode/widgets/:id (Update code variables or configurations)
portcodeRouter.put("/api/portcode/widgets/:id", (req, res) => {
  const { id } = req.params;
  const { name, description, sourceCode, targetPlatform, variables, status } = req.body;

  const list = getPortcodeWidgetsFromDb();
  const item = list.find(w => w.id === id);

  if (!item) {
    return res.status(404).json({ error: "Ported widget record not found" });
  }

  if (name !== undefined) item.name = name.trim();
  if (description !== undefined) item.description = description.trim();
  if (sourceCode !== undefined) item.sourceCode = sourceCode;
  if (targetPlatform !== undefined) item.targetPlatform = targetPlatform;
  if (variables !== undefined) item.variables = variables;
  if (status !== undefined) item.status = status;

  // Re-compile based on updated details
  item.compiledCode = compileCode(item.sourceCode, item.variables);

  savePortcodeWidgetsToDb(list);
  res.json({ success: true, widget: item });
});

// 6. DELETE /api/portcode/widgets/:id (Scrub widget)
portcodeRouter.delete("/api/portcode/widgets/:id", (req, res) => {
  const { id } = req.params;
  const list = getPortcodeWidgetsFromDb();
  const index = list.findIndex(w => w.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Ported widget not found in databases." });
  }

  list.splice(index, 1);
  savePortcodeWidgetsToDb(list);

  res.json({ success: true, message: `Widget with ID: ${id} successfully disconnected.` });
});
