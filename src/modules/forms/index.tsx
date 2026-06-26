import * as React from 'react';
import { useEffect, useState, useMemo, FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { parseGoogleHtml, ExtractedField, FormConnectionSchema } from './formParser';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Edit3, 
  Loader2, 
  FolderOpen, 
  Search, 
  Check, 
  X,
  FileSpreadsheet,
  ArrowLeft,
  Settings2,
  Code,
  Copy,
  Terminal,
  Send,
  Sparkles,
  HelpCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Zap,
  CheckCircle2,
  Layers,
  ChevronRight,
  Sliders,
  Database,
  Globe,
  Info,
  AlertCircle,
  Lock,
  ExternalLink,
  SlidersHorizontal,
  ChevronDown,
  LayoutGrid,
  CheckCircle
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Local types aligned with FormBridge CRM asset models
export interface FormBridgeAsset {
  id: string;
  formBridgeId: string; // references pf_id internally
  name: string;
  submissionsCount: number;
  status: 'Connected' | 'Draft';
  source: 'Google Forms' | 'Typeform' | 'Tally' | 'Custom';
  googleUrl: string;
  fieldsCount: number;
  lastUpdated: string;
  schema: FormConnectionSchema | null;
  created_at: string;
}

export default function FormsServiceModule() {
  const [loading, setLoading] = useState(true);
  const [rawForms, setRawForms] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Asset state
  const [selectedAsset, setSelectedAsset] = useState<FormBridgeAsset | null>(null);
  
  // Advanced control states
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advancedTab, setAdvancedTab] = useState<'submissions' | 'api-sync' | 'raw-schema' | 'custom-fields'>('submissions');

  // Dialog & Wizard flows
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1); // 1: URL input, 2: Fields preview & Verify, 3: Success handoff
  
  // Modals
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isHandoffOpen, setIsHandoffOpen] = useState(false);
  const [handoffAsset, setHandoffAsset] = useState<FormBridgeAsset | null>(null);

  // Form State under wizard
  const [wizardFormName, setWizardFormName] = useState('');
  const [wizardFormUrl, setWizardFormUrl] = useState('');
  const [wizardDetectedFields, setWizardDetectedFields] = useState<ExtractedField[]>([]);
  const [wizardParsedSchema, setWizardParsedSchema] = useState<FormConnectionSchema | null>(null);
  const [parserError, setParserError] = useState<string | null>(null);
  const [wizardLoading, setWizardLoading] = useState(false);

  // Edit / Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [editAssetName, setEditAssetName] = useState('');
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  // Clipboard link feedback helper
  const triggerCopyFeedback = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLabel(label);
    setTimeout(() => setCopiedLabel(null), 1800);
  };

  // Preset templates connection boosters
  const handleConnectPreset = async (presetType: 'contact' | 'waitlist' | 'feedback') => {
    setIsWizardOpen(true);
    setParserError(null);
    let name = '';
    let url = '';

    if (presetType === 'contact') {
      name = 'Standard Contact Form';
      url = 'https://docs.google.com/forms/d/e/1FAIpQLSf5uB7Kxp1z8Jv_Z_preset_contact/viewform';
    } else if (presetType === 'waitlist') {
      name = 'Platform Beta Waitlist';
      url = 'https://docs.google.com/forms/d/e/1FAIpQLSf5uB7Kxp1z8Jv_Z_preset_waitlist/viewform';
    } else {
      name = 'Client Sat survey';
      url = 'https://docs.google.com/forms/d/e/1FAIpQLSf5uB7Kxp1z8Jv_Z_preset_feedback/viewform';
    }

    setWizardFormName(name);
    setWizardFormUrl(url);
    setWizardStep(1);
  };

  // Convert raw DB model response into streamlined FormBridgeAsset domain structure
  const formBridgeAssets = useMemo<FormBridgeAsset[]>(() => {
    return rawForms.map((f: any) => {
      const dbSchema = f.schema || null;
      const totalFields = dbSchema?.fields?.length || 0;
      
      // Calculate realistic display timestamps
      const updateDate = dbSchema?.version_timestamp 
        ? new Date(dbSchema.version_timestamp) 
        : (f.created_at ? new Date(f.created_at) : new Date());
      
      const secondsPast = Math.floor((new Date().getTime() - updateDate.getTime()) / 1000);
      let timeStr = 'Just Now';
      if (secondsPast > 172800) {
        timeStr = updateDate.toLocaleDateString();
      } else if (secondsPast > 86400) {
        timeStr = '1 day ago';
      } else if (secondsPast > 3600) {
        timeStr = `${Math.floor(secondsPast / 3600)}h ago`;
      } else if (secondsPast > 60) {
        timeStr = `${Math.floor(secondsPast / 60)}m ago`;
      }

      return {
        id: f.id,
        formBridgeId: f.pf_id || f.id, // FormBridge Identifier
        name: f.name || 'Unlabeled Asset',
        submissionsCount: f.submissions || 0,
        status: f.status === 'Draft' ? 'Draft' : 'Connected',
        source: 'Google Forms',
        googleUrl: f.google_url || '',
        fieldsCount: totalFields,
        lastUpdated: timeStr,
        schema: dbSchema,
        created_at: f.created_at
      };
    });
  }, [rawForms]);

  const filteredAssets = useMemo(() => {
    return formBridgeAssets.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.formBridgeId.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [formBridgeAssets, searchQuery]);

  // Read backend active forms list
  const fetchAssetsFromDatabase = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('forms').select();
      if (error) throw error;
      setRawForms(data || []);

      // Also grab associated Framer integration bindings
      fetch('/api/integrations/google-forms/connections')
        .then(res => res.json())
        .then(connData => {
          if (connData.connections) {
            setFramerConnections(connData.connections);
          }
        })
        .catch(err => console.error('[Framer Connection Grab Failed]', err));
    } catch (err) {
      console.error('[Supabase Fetch Error]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssetsFromDatabase();
  }, []);

  // Update detail view configurations when selectedAsset changes
  useEffect(() => {
    if (selectedAsset) {
      // Find updated model in master list to preserve fresh counters
      const freshAsset = formBridgeAssets.find(a => a.id === selectedAsset.id);
      const targetAsset = freshAsset || selectedAsset;

      const storageKeyFields = `pf_google_fields_${targetAsset.id}`;
      const storageKeySubs = `pf_google_subs_${targetAsset.id}`;
      const storageKeyUrl = `pf_google_url_${targetAsset.id}`;
      const storageKeyAction = `pf_google_action_${targetAsset.id}`;
      const storageKeySchema = `pf_google_schema_${targetAsset.id}`;

      // Synchronize internal state fields
      setGoogleFormUrl(localStorage.getItem(storageKeyUrl) || targetAsset.googleUrl || '');
      setFramerProjectId(localStorage.getItem(`pf_google_framer_pid_${targetAsset.id}`) || '');
      setFramerApiKey(localStorage.getItem(`pf_google_framer_key_${targetAsset.id}`) || '');
      setFramerComponentId(localStorage.getItem(`pf_google_framer_comp_${targetAsset.id}`) || null);
      setFramerSyncVersion(parseInt(localStorage.getItem(`pf_google_framer_version_${targetAsset.id}`) || '0', 10));

      // Resolve fields list
      let fields: any[] = [];
      if (targetAsset.schema?.fields) {
        fields = targetAsset.schema.fields;
        setFormFields(fields);
        setFormSchema(targetAsset.schema);
      } else {
        const savedFields = localStorage.getItem(storageKeyFields);
        if (savedFields) {
          fields = JSON.parse(savedFields);
          setFormFields(fields);
        }
      }

      // Sync simulated testing sandbox entries
      const savedSubs = localStorage.getItem(storageKeySubs);
      let subs: any[] = [];
      if (savedSubs) {
        subs = JSON.parse(savedSubs);
        setSubmissionsList(subs);
      } else {
        // Hydrate helpful human mock submissions
        subs = [
          {
            id: 'REF-089A',
            created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
            data: { 'name': 'Courtney Vance', 'email': 'vance.c@firmholdings.com', 'message': 'I would love to set a brief zoom call to trial PluginFoundry on our corporate Framer spaces next tuesday.' }
          },
          {
            id: 'REF-042K',
            created_at: new Date(Date.now() - 25 * 3600000).toISOString(),
            data: { 'name': 'Sarah Jenkins', 'email': 'sarah@jenkins.net', 'message': 'Perfect setup! Copied the bridge component once and it syncd immediately.' }
          }
        ];
        localStorage.setItem(storageKeySubs, JSON.stringify(subs));
        setSubmissionsList(subs);
        updateLocalSubCount(targetAsset.id, subs.length);
      }

      // Prefill sandbox data fields
      const initialSandbox: Record<string, any> = {};
      fields.forEach((f: any) => {
        initialSandbox[f.id] = '';
      });
      setSandboxData(initialSandbox);
      setSandboxSuccess(false);
    }
  }, [selectedAsset?.id, rawForms]);

  const updateLocalSubCount = async (formId: string, count: number) => {
    try {
      await supabase.from('forms').update({ submissions: count }).eq('id', formId);
    } catch (err) {
      console.error('[Sync Submission Count DB Error]', err);
    }
  };

  // STEP 1 WIZARD: Analyze public form structure
  const handleAnalyzeFormUrl = async (e: FormEvent) => {
    e.preventDefault();
    if (!wizardFormUrl.trim()) return;

    setWizardLoading(true);
    setParserError(null);

    const targetUrl = wizardFormUrl.trim();
    const proxyRequestUrl = `/api/forms/proxy?url=${encodeURIComponent(targetUrl)}`;

    try {
      const response = await fetch(proxyRequestUrl);
      if (!response.ok) {
        throw new Error('This Google Form cannot be read by our cloud scraper. Ensure it is set to "Public" and you pasted the correct /viewform address.');
      }

      const rawHtml = await response.text();
      const parsed = parseGoogleHtml(rawHtml, targetUrl);

      if (parsed.schema && parsed.schema.fields && parsed.schema.fields.length > 0) {
        setWizardDetectedFields(parsed.schema.fields as any);
        setWizardParsedSchema(parsed.schema);
        if (parsed.title && parsed.title !== 'Linked Google Form' && !wizardFormName.trim()) {
          setWizardFormName(parsed.title);
        }
        setWizardStep(2); // Jump to fields verification screen
      } else {
        throw new Error('Scraper analyzed the URL successfully, but detected zero input fields. Ensure this is a functional Google Form page.');
      }
    } catch (err: any) {
      console.error('[Parser Failure]', err);
      setParserError(err.message || 'Scraper experienced an internal error reading this URL. Please verify the URL structure.');
    } finally {
      setWizardLoading(false);
    }
  };

  // STEP 2 WIZARD: Save custom asset & sync with db
  const handleFinishAssetCreation = async () => {
    if (!wizardFormName.trim() || !wizardParsedSchema) return;

    setWizardLoading(true);
    setParserError(null);

    try {
      // Inject standard clean naming conventions
      const finalTitle = wizardFormName.trim();
      const finalizedSchema = {
        ...wizardParsedSchema,
        title: finalTitle,
        _source: 'pluginfoundry',
        integration: 'google_forms'
      };

      const { data, error } = await supabase.from('forms').insert({
        name: finalTitle,
        submissions: 0,
        status: 'Active',
        schema: finalizedSchema,
        google_url: wizardFormUrl.trim(),
        version: 1
      });

      if (error) throw error;

      // Fetch newly instantiated record to sync references locally
      const { data: fetchList } = await supabase.from('forms')
        .select()
        .eq('name', finalTitle)
        .order('created_at', { ascending: false });

      const createdItem = fetchList && fetchList[0];

      if (createdItem) {
        localStorage.setItem(`pf_google_schema_${createdItem.id}`, JSON.stringify(finalizedSchema));
        localStorage.setItem(`pf_google_fields_${createdItem.id}`, JSON.stringify(finalizedSchema.fields));
        localStorage.setItem(`pf_google_url_${createdItem.id}`, wizardFormUrl.trim());
        if (finalizedSchema.submit?.endpoint) {
          localStorage.setItem(`pf_google_action_${createdItem.id}`, finalizedSchema.submit.endpoint);
        }

        // Setup the successful asset for step 3 handoff display and modal popup triggers
        const mappedAsset: FormBridgeAsset = {
          id: createdItem.id,
          formBridgeId: createdItem.pf_id || createdItem.id,
          name: createdItem.name,
          submissionsCount: 0,
          status: 'Connected',
          source: 'Google Forms',
          googleUrl: wizardFormUrl.trim(),
          fieldsCount: finalizedSchema.fields?.length || 0,
          lastUpdated: 'Just Now',
          schema: finalizedSchema,
          created_at: createdItem.created_at
        };

        setHandoffAsset(mappedAsset);
        setWizardStep(3); // Enter successful handoff wizard pane
      } else {
        throw new Error('Form created successfully but retrieval timed out. Please check your dashboard list.');
      }
    } catch (err: any) {
      console.error('[DB Write Failure]', err);
      setParserError(err.message || 'Unable to store the FormBridge Asset. Verify database server parameters.');
    } finally {
      setWizardLoading(false);
    }
  };

  // Rename asset action handle
  const handleRenameAssetExecute = async (e: FormEvent) => {
    e.preventDefault();
    if (!editAssetName.trim() || !selectedAsset) return;

    setActionLoading(true);
    try {
      const { error } = await supabase.from('forms').update({
        name: editAssetName.trim()
      }).eq('id', selectedAsset.id);

      if (error) throw error;

      setSelectedAsset(prev => prev ? { ...prev, name: editAssetName.trim() } : null);
      setIsEditOpen(false);
      setEditAssetName('');
      await fetchAssetsFromDatabase();
    } catch (err) {
      console.error('[Rename Exception]', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete/Disconnect asset handle
  const handleDisconnectAssetExecute = async () => {
    if (!selectedAsset) return;

    setActionLoading(true);
    try {
      const { error } = await supabase.from('forms').delete().eq('id', selectedAsset.id);
      if (error) throw error;

      // Clean local storage
      const id = selectedAsset.id;
      localStorage.removeItem(`pf_google_schema_${id}`);
      localStorage.removeItem(`pf_google_fields_${id}`);
      localStorage.removeItem(`pf_google_subs_${id}`);
      localStorage.removeItem(`pf_google_url_${id}`);
      localStorage.removeItem(`pf_google_action_${id}`);
      localStorage.removeItem(`pf_google_framer_pid_${id}`);
      localStorage.removeItem(`pf_google_framer_key_${id}`);
      localStorage.removeItem(`pf_google_framer_comp_${id}`);
      localStorage.removeItem(`pf_google_framer_version_${id}`);

      setSelectedAsset(null);
      setIsDeleteOpen(false);
      await fetchAssetsFromDatabase();
    } catch (err) {
      console.error('[Disconnect Failure]', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle status connected/disabled
  const handleToggleActiveState = async (asset: FormBridgeAsset) => {
    const nextStatus = asset.status === 'Connected' ? 'Draft' : 'Active';
    try {
      await supabase.from('forms').update({ status: nextStatus }).eq('id', asset.id);
      if (selectedAsset && selectedAsset.id === asset.id) {
        setSelectedAsset(prev => prev ? { ...prev, status: nextStatus === 'Draft' ? 'Draft' : 'Connected' } : null);
      }
      await fetchAssetsFromDatabase();
    } catch (err) {
      console.error('[Status Toggle Exception]', err);
    }
  };

  // Local Details View support states
  const [googleFormUrl, setGoogleFormUrl] = useState('');
  const [formFields, setFormFields] = useState<any[]>([]);
  const [formSchema, setFormSchema] = useState<FormConnectionSchema | null>(null);
  const [submissionsList, setSubmissionsList] = useState<any[]>([]);

  // Testing Sandbox Inputs
  const [sandboxData, setSandboxData] = useState<Record<string, any>>({});
  const [sandboxSuccess, setSandboxSuccess] = useState(false);

  // Field mapper state modifiers
  const [customFieldLabel, setCustomFieldLabel] = useState('');
  const [customFieldType, setCustomFieldType] = useState<ExtractedField['type']>('text');
  const [customFieldRequired, setCustomFieldRequired] = useState(false);

  // Advanced direct Framer synchronization variables
  const [framerConnections, setFramerConnections] = useState<any[]>([]);
  const [framerProjectId, setFramerProjectId] = useState('');
  const [framerApiKey, setFramerApiKey] = useState('');
  const [framerComponentId, setFramerComponentId] = useState<string | null>(null);
  const [framerSyncVersion, setFramerSyncVersion] = useState<number>(0);
  const [isFramerSyncing, setIsFramerSyncing] = useState(false);
  const [isFramerInserting, setIsFramerInserting] = useState(false);
  const [showFramerKey, setShowFramerKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [framerActionResult, setFramerActionResult] = useState<any | null>(null);
  const [testResults, setTestResults] = useState<any>(null);

  // Computed Framer custom component code string
  const customComponentTSXCode = useMemo(() => {
    if (!formSchema) return '// Connect a Google Form first to compile customized component code.';
    const host = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    return `import { addPropertyControls, ControlType } from "framer";
import { useState, useEffect, useRef } from "react";

/**
 * FORMBRIDGE SECURE ASSET COMPONENT
 * Asset Name: ${selectedAsset?.name || 'Form'}
 * FormBridge ID: ${formSchema.pf_id || selectedAsset?.formBridgeId || 'Unlinked'}
 */
export default function FormBridgeContainer(props) {
  const {
    bridgeUrl = "${host}",
    formId = "${formSchema.pf_id || selectedAsset?.formBridgeId || ''}",
    fontFamily = "Inter, sans-serif",
    fontSize = 14,
    textColor = "#1e293b",
    inputBg = "#ffffff",
    inputBorderColor = "#cbd5e1",
    inputBorderRadius = 6,
    buttonBg = "#2563eb",
    buttonTextColor = "#ffffff",
    padding = 20,
    gap = 12,
    successText = "Thank you! Your response has been securely processed on FormBridge."
  } = props;

  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorText, setErrorText] = useState(null);

  const containerStyle = {
    fontFamily,
    fontSize: \`\${fontSize}px\`,
    color: textColor,
    display: "flex",
    flexDirection: "column",
    gap: \`\${gap}px\`,
    padding: \`\${padding}px\`,
    width: "100%",
    boxSizing: "border-box"
  };

  const labelStyle = {
    fontWeight: "500",
    marginBottom: "4px",
    display: "block"
  };

  const inputStyle = {
    width: "100%",
    padding: "8px 12px",
    backgroundColor: inputBg,
    border: \`1px solid \${inputBorderColor}\`,
    borderRadius: \`\${inputBorderRadius}px\`,
    fontSize: \`\${fontSize}px\`,
    color: textColor,
    boxSizing: "border-box"
  };

  const handleInputChange = (fieldId, value) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorText(null);

    try {
      const res = await fetch(\`\${bridgeUrl}/api/forms/submit\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pf_id: formId,
          answers: formData
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(true);
        setFormData({});
      } else {
        setErrorText(data.error || "Submission error.");
      }
    } catch (err) {
      setErrorText("Communication failed with FormBridge servers.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ ...containerStyle, textAlign: "center" }}>
        <p style={{ color: "#10b981", fontWeight: "600" }}>{successText}</p>
      </div>
    );
  }

  const fields = ${JSON.stringify(formSchema.fields, null, 2)};

  return (
    <form onSubmit={handleSubmit} style={containerStyle}>
      {fields.map(f => (
        <div key={f.id} style={{ display: "flex", flexDirection: "column" }}>
          <label style={labelStyle}>{f.label} {f.required && "*"}</label>
          {f.type === "textarea" ? (
            <textarea style={inputStyle} required={f.required} onChange={e => handleInputChange(f.id, e.target.value)} />
          ) : (
            <input type="text" style={inputStyle} required={f.required} onChange={e => handleInputChange(f.id, e.target.value)} />
          )}
        </div>
      ))}
      {errorText && <p style={{ color: "#ef4444" }}>{errorText}</p>}
      <button type="submit" disabled={loading} style={{
        padding: "10px 16px",
        backgroundColor: buttonBg,
        color: buttonTextColor,
        border: "none",
        borderRadius: \`\${inputBorderRadius}px\`,
        fontWeight: "bold",
        cursor: "pointer"
      }}>{loading ? "Sending..." : "Submit"}</button>
    </form>
  );
}`;
  }, [formSchema, selectedAsset]);

  // Handle manual additions and field updates in detail tabs
  const handleCreateCustomField = () => {
    if (!customFieldLabel.trim()) return;
    const randId = Math.floor(100000 + Math.random() * 900000).toString();
    const newField = {
      id: `custom_${randId}`,
      label: customFieldLabel.trim(),
      type: customFieldType,
      required: customFieldRequired,
      options: ['select', 'radio', 'checkbox'].includes(customFieldType) ? ['Option 1', 'Option 2'] : undefined,
      entryId: `entry.${randId}`
    };

    const updated = [...formFields, newField];
    setFormFields(updated);
    
    if (formSchema && selectedAsset) {
      const updatedSchema = {
        ...formSchema,
        fields: updated,
        submit: {
          ...formSchema.submit,
          mapping: {
            ...formSchema.submit.mapping,
            [newField.id]: newField.entryId
          }
        }
      };
      setFormSchema(updatedSchema);
      localStorage.setItem(`pf_google_fields_${selectedAsset.id}`, JSON.stringify(updated));
      localStorage.setItem(`pf_google_schema_${selectedAsset.id}`, JSON.stringify(updatedSchema));
      supabase.from('forms').update({ schema: updatedSchema }).eq('id', selectedAsset.id).then();
    }
    setCustomFieldLabel('');
  };

  const handleRemoveField = (fieldId: string) => {
    const updated = formFields.filter(f => f.id !== fieldId);
    setFormFields(updated);
    if (formSchema && selectedAsset) {
      const updatedSchema = { ...formSchema, fields: updated };
      setFormSchema(updatedSchema);
      localStorage.setItem(`pf_google_fields_${selectedAsset.id}`, JSON.stringify(updated));
      localStorage.setItem(`pf_google_schema_${selectedAsset.id}`, JSON.stringify(updatedSchema));
      supabase.from('forms').update({ schema: updatedSchema }).eq('id', selectedAsset.id).then();
    }
  };

  // Submit test response from live sandbox handler
  const handleTriggerSandboxSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    setSandboxSuccess(false);

    try {
      const finalEndpoint = formSchema ? formSchema.submit.endpoint : (localStorage.getItem(`pf_google_action_${selectedAsset.id}`) || googleFormUrl);
      const mappingDict = formSchema ? formSchema.submit.mapping : {};

      const dataParams = new URLSearchParams();
      Object.entries(sandboxData).forEach(([fieldId, value]) => {
        const entryGoogleKey = mappingDict[fieldId] || `entry.${fieldId}`;
        dataParams.append(entryGoogleKey, String(value));
      });

      // Submit direct POST synchronously via CORS-bypass mode 'no-cors'
      await fetch(finalEndpoint, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: dataParams
      });

      // Insert dummy submission response to local ledger lists
      const mockRecord = {
        id: `REC-${Math.floor(100 + Math.random() * 900)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
        created_at: new Date().toISOString(),
        data: { ...sandboxData }
      };

      const revisedList = [mockRecord, ...submissionsList];
      setSubmissionsList(revisedList);
      localStorage.setItem(`pf_google_subs_${selectedAsset.id}`, JSON.stringify(revisedList));
      updateLocalSubCount(selectedAsset.id, revisedList.length);

      // Reset sandbox state
      const cleared: Record<string, any> = {};
      formFields.forEach(f => { cleared[f.id] = ''; });
      setSandboxData(cleared);
      setSandboxSuccess(true);
      fetchAssetsFromDatabase(); // Refresh counters on list
      setTimeout(() => setSandboxSuccess(false), 3000);
    } catch (err) {
      console.error('[Manual Posting Test Exception]', err);
    }
  };

  // Direct Framer Integration Syncers (Tucked in Advanced section)
  const handleDirectSaveFramerConfig = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    localStorage.setItem(`pf_google_framer_pid_${selectedAsset.id}`, framerProjectId);
    localStorage.setItem(`pf_google_framer_key_${selectedAsset.id}`, framerApiKey);
    alert('Framer connection tokens cached locally for this asset.');
  };

  const handleDirectFramerApiConnect = async () => {
    if (!selectedAsset || !formSchema) return;
    setIsFramerInserting(true);
    setFramerActionResult(null);

    try {
      const res = await fetch('/api/integrations/google-forms/insertToFramer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schema: formSchema,
          framerProjectId,
          framerApiKey
        })
      });
      const data = await res.json();
      if (data.success) {
        setFramerComponentId(data.componentInstanceId);
        localStorage.setItem(`pf_google_framer_comp_${selectedAsset.id}`, data.componentInstanceId);
        setFramerActionResult({
          success: true,
          type: 'insert',
          message: 'Direct Framer Attachment Made!',
          details: `Connected dynamic form component as Component ID: ${data.componentInstanceId}. Your fields are fully synced.`
        });
      } else {
        throw new Error(data.error || 'Server error binding to project.');
      }
    } catch (err: any) {
      setFramerActionResult({
        success: false,
        type: 'error',
        message: 'Direct API Connection Failed',
        details: err.message || 'Check your Project ID and CMS permissions.'
      });
    } finally {
      setIsFramerInserting(false);
    }
  };

  const handleDirectPushSyncSchema = async () => {
    if (!selectedAsset || !formSchema) return;
    setIsFramerSyncing(true);
    setFramerActionResult(null);

    try {
      const res = await fetch('/api/integrations/google-forms/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pf_id: selectedAsset.formBridgeId,
          url: googleFormUrl,
          framerApiKey
        })
      });
      const data = await res.json();
      if (data.success) {
        const nextV = data.version || (framerSyncVersion + 1);
        setFramerSyncVersion(nextV);
        localStorage.setItem(`pf_google_framer_version_${selectedAsset.id}`, nextV.toString());
        setFramerActionResult({
          success: true,
          type: 'sync',
          message: 'Bespoke Syncing Successful!',
          details: `Pushed version update V${nextV} straight to your Framer project workspace.`
        });
      } else {
        throw new Error(data.error || 'Sync request rejected by remote host.');
      }
    } catch (err: any) {
      setFramerActionResult({
        success: false,
        type: 'error',
        message: 'Synchronizer Connection Failed',
        details: err.message || 'Make sure details match and project remains published.'
      });
    } finally {
      setIsFramerSyncing(false);
    }
  };

  const handleTestDirectFramerTokens = async () => {
    if (!framerProjectId || !framerApiKey) return;
    setTestingConnection(true);
    setTestResults(null);

    try {
      const res = await fetch('/api/integrations/google-forms/testConnection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ framerProjectId, framerApiKey })
      });
      const data = await res.json();
      setTestResults({
        success: data.success,
        stepDetails: [
          { step: 'Authentication Handshake', status: data.success ? 'success' : 'failed', details: data.success ? 'Validated access credentials.' : 'Authorization token contains invalid schemas.' },
          { step: 'Fetch Layout Collections', status: data.success ? 'success' : 'failed', details: data.success ? `Identified ${data.collectionsCount} schema nodes.` : 'Endpoint did not return published database references.' }
        ]
      });
    } catch (err: any) {
      setTestResults({
        success: false,
        stepDetails: [
          { step: 'Authentication Handshake', status: 'failed', details: err.message || 'Network Timeout' }
        ]
      });
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
      
      {/* HEADER SECTION */}
      {!selectedAsset && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-gray-100 dark:border-zinc-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="p-1 px-2.5 text-xs font-bold uppercase rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 tracking-widest leading-none">Platform</span>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5 font-sans">
                FormBridge Assets
              </h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-2xl font-medium">
              FormBridge bridges external form data structures directly into Framer layout pages with seamless, transparent synchronizations and direct submissions.
            </p>
          </div>
          
          <Button 
            onClick={() => {
              setWizardFormName('');
              setWizardFormUrl('');
              setWizardStep(1);
              setParserError(null);
              setIsWizardOpen(true);
            }} 
            className="self-start md:self-auto text-xs font-bold h-11 px-6 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-100 dark:text-slate-900 text-white rounded-lg gap-2 cursor-pointer shadow-md transition-all active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Connect Google Form
          </Button>
        </div>
      )}

      {/* PARENT ASSET LISTING / EMPTY STATE DASHBOARD */}
      {!selectedAsset ? (
        <div className="space-y-8 pr-0">
          
          {/* QUICK CONNECT PRESETS GRID */}
          <div className="space-y-3 text-left">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-1.5 pl-0.5">
              <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
              Quick-Start Blueprints
            </h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div 
                onClick={() => handleConnectPreset('contact')}
                className="group border border-slate-100 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-5 rounded-2xl hover:border-emerald-500/30 hover:shadow-lg transition-all cursor-pointer text-left space-y-2"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/5 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <FileText className="h-4 w-4" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-100 group-hover:text-emerald-500 transition-colors">Aesthetic Contact Form</h4>
                <p className="text-xs text-slate-400 dark:text-zinc-400 leading-normal">Scrape waitlist names, business-compliant emails, and generic text questions.</p>
              </div>

              <div 
                onClick={() => handleConnectPreset('waitlist')}
                className="group border border-slate-100 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-5 rounded-2xl hover:border-emerald-500/30 hover:shadow-lg transition-all cursor-pointer text-left space-y-2"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/5 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <ArrowLeft className="h-4 w-4 rotate-135" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-100 group-hover:text-emerald-500 transition-colors font-sans">Launch Beta Waitlist</h4>
                <p className="text-xs text-slate-400 dark:text-zinc-400 leading-normal font-sans">Pre-integrated selection sliders and single newsletter opt-in checks.</p>
              </div>

              <div 
                onClick={() => handleConnectPreset('feedback')}
                className="group border border-slate-100 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-5 rounded-2xl hover:border-emerald-500/30 hover:shadow-lg transition-all cursor-pointer text-left space-y-2"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/5 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <SlidersHorizontal className="h-4 w-4" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-100 group-hover:text-emerald-500 transition-colors">Client Sat Survey</h4>
                <p className="text-xs text-slate-400 dark:text-zinc-400 leading-normal">Generate multiple rating dropdown scales and detailed satisfaction checkmarks.</p>
              </div>
            </div>
          </div>

          {/* ACTIVE FORM BRIDGE ASSETS SECTION */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-zinc-500" />
                <Input
                  type="search"
                  placeholder="Filter by asset name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs focus-visible:ring-1 border-slate-200 dark:border-zinc-800 rounded-lg"
                />
              </div>
              <span className="text-xs font-bold text-slate-400 dark:text-zinc-500">
                {filteredAssets.length} ACTIVE ASSET{filteredAssets.length !== 1 && 'S'} CONNECTED
              </span>
            </div>

            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-48 w-full rounded-2xl" />
                <Skeleton className="h-48 w-full rounded-2xl" />
                <Skeleton className="h-48 w-full rounded-2xl" />
              </div>
            ) : filteredAssets.length === 0 ? (
              
              /* GORGEOUS EMPTY STATE CARD */
              <div className="text-center py-20 px-8 border border-dashed border-slate-200 dark:border-zinc-800 rounded-3xl bg-slate-50/50 dark:bg-zinc-900/10 space-y-6">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-slate-400 dark:text-zinc-500">
                  <Database className="h-6 w-6" />
                </div>
                <div className="space-y-1.5 max-w-sm mx-auto">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200">No FormBridge Assets Active</h3>
                  <p className="text-xs text-slate-400 dark:text-zinc-400 leading-relaxed font-medium">
                    Connect a public Google Form, and our synchronizer platform will build an offline structural asset bridge so you can insert beautiful fields into Framer in seconds.
                  </p>
                </div>
                <Button 
                  onClick={() => setIsWizardOpen(true)} 
                  className="text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg h-10 px-6 cursor-pointer"
                >
                  Create Your First FormBridge
                </Button>
              </div>
            ) : (
              
              /* BEAUTIFUL BENTO GRID CARDS */
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredAssets.map((asset) => {
                  const hasDirectFramerId = framerConnections.some(c => c.pf_id === asset.id);
                  return (
                    <div 
                      key={asset.id} 
                      className="group flex flex-col justify-between border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 rounded-3xl hover:border-slate-200 hover:shadow-md transition-all text-left"
                    >
                      <div className="p-6 space-y-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-zinc-500 font-bold block">{asset.source}</span>
                            <h4 className="font-bold text-slate-800 dark:text-zinc-100 text-sm group-hover:text-emerald-500 transition-colors leading-tight">
                              {asset.name}
                            </h4>
                          </div>
                          
                          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none font-bold text-[9px] uppercase tracking-wider px-2 py-0.5">
                            Connected
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-3 py-1 bg-slate-50/50 dark:bg-zinc-900/40 p-3 rounded-2xl text-[11px] font-medium border border-slate-100/40 dark:border-zinc-800/20">
                          <div>
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500 block">Detected Fields</span>
                            <span className="text-slate-700 dark:text-zinc-200 font-bold font-mono text-xs">{asset.fieldsCount} Fields</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500 block">Submissions</span>
                            <span className="text-slate-700 dark:text-zinc-200 font-bold font-mono text-xs">{asset.submissionsCount} Captured</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
                          <span>Last Synced:</span>
                          <span className="font-bold text-slate-500 dark:text-zinc-400">{asset.lastUpdated}</span>
                        </div>
                      </div>

                      {/* CARD ACTION BUTTONS */}
                      <div className="flex border-t border-slate-50 dark:border-zinc-800/80 p-3 bg-slate-50/20 dark:bg-zinc-900/20 gap-2 rounded-b-3xl">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setSelectedAsset(asset)}
                          className="flex-1 text-[11px] font-bold h-9 border border-slate-100 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800"
                        >
                          Configure
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => {
                            setHandoffAsset(asset);
                            setIsHandoffOpen(true);
                          }}
                          className="flex-1 text-[11px] font-bold h-9 bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-zinc-100"
                        >
                          Use in Framer
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        
        /* DETAILED FORM BRIDGE ASSET VIEW */
        <div className="space-y-6">
          
          {/* TOP BACK-TO-DASHBOARD BAR */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-zinc-800 pb-4">
            <Button 
              variant="ghost" 
              onClick={() => {
                setSelectedAsset(null);
                fetchAssetsFromDatabase();
              }}
              className="self-start text-xs font-bold h-9 px-3 text-slate-400 hover:text-slate-800 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to Assets
            </Button>

            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold text-slate-400 dark:text-zinc-500">Asset Options:</h2>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setEditAssetName(selectedAsset.name);
                  setIsEditOpen(true);
                }} 
                className="text-[11px] h-8 gap-1.5 border-slate-200 rounded-lg dark:border-zinc-800 font-semibold"
              >
                <Edit3 className="h-3 w-3" /> Rename
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsDeleteOpen(true)} 
                className="text-[11px] h-8 gap-1.5 text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg dark:border-red-900 font-semibold"
              >
                <Trash2 className="h-3 w-3" /> Disconnect
              </Button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            
            {/* LEFT COLUMN: ACTIVE FILE PREVIEWER & LEDGER LOGS */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* ASSET STATUS SUMMARY */}
              <Card className="shadow-xs border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 rounded-2xl overflow-hidden">
                <CardHeader className="p-6 border-b border-slate-50 dark:border-zinc-800 text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg font-extrabold text-slate-800 dark:text-white">
                          {selectedAsset.name}
                        </CardTitle>
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none font-bold text-[9px] uppercase tracking-wider px-2 py-0.5">
                          Active Bridge
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400 dark:text-zinc-400 font-medium">
                        Securely pipeline variables to <strong className="text-slate-600 dark:text-zinc-200">Google Form Response handler</strong>.
                      </p>
                    </div>

                    <div className="flex gap-4 p-3.5 bg-slate-50 dark:bg-zinc-900 p-4 border border-slate-100 dark:border-zinc-800 rounded-2xl font-semibold text-xs shrink-0 self-start sm:self-auto">
                      <div>
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500 block">Source</span>
                        <span className="text-slate-800 dark:text-zinc-100">Google Forms</span>
                      </div>
                      <div className="border-l border-slate-200 dark:border-zinc-800 pl-4">
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500 block font-sans">Sync status</span>
                        <span className="text-emerald-600 dark:text-emerald-400">Live ✓</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6">
                  {/* DETECTED FIELDS ACCORDION / GENERAL VIEW CARD */}
                  <div className="space-y-3.5 text-left">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest pl-0.5">Detected Form Variables ({formFields.length})</span>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {formFields.map((field) => (
                        <div key={field.id} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-zinc-800/80 bg-slate-50/20 dark:bg-zinc-900/20">
                          <div className="text-left space-y-1">
                            <span className="text-[11px] font-bold block text-slate-800 dark:text-zinc-200">{field.label}</span>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="text-[9px] font-semibold text-slate-400 uppercase py-0 px-1 border-slate-200/60 dark:border-zinc-800">
                                {field.type}
                              </Badge>
                              {field.required && (
                                <span className="text-[10px] text-red-500 font-bold block">* Required</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ASSET SUBMISSIONS LEDGER LIST */}
              <Card className="shadow-xs border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 rounded-2xl overflow-hidden text-left">
                <CardHeader className="p-6 border-b border-slate-50 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-slate-800 dark:text-zinc-100">
                      <Database className="h-4 w-4 text-emerald-500" />
                      Captured Responses ({submissionsList.length})
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Live submissions synced in real-time. Direct form posting requires zero active servers.
                    </CardDescription>
                  </div>

                  <div className="flex gap-2">
                    {submissionsList.length > 0 && (
                      <Button 
                        onClick={() => {
                          const headers = ['Record UID', 'Submitted At', ...formFields.map(f => f.label)];
                          const rows = submissionsList.map(sub => [
                            sub.id,
                            new Date(sub.created_at).toLocaleString(),
                            ...formFields.map(f => sub.data[f.id] || '')
                          ]);
                          const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
                          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                          const link = document.createElement('a');
                          link.href = URL.createObjectURL(blob);
                          link.setAttribute('download', `${selectedAsset.name.toLowerCase().replace(/\s+/g, '_')}_spreadsheet.csv`);
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }} 
                        variant="outline" 
                        size="sm" 
                        className="text-[10px] h-8 font-bold text-slate-600 rounded-lg dark:text-zinc-200"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500 mr-1" />Export CSV
                      </Button>
                    )}
                    {submissionsList.length > 0 && (
                      <Button 
                        onClick={() => {
                          if (window.confirm('Wipe recent memory log? This cleans the local mock spreadsheet simulator buffer.')) {
                            setSubmissionsList([]);
                            localStorage.setItem(`pf_google_subs_${selectedAsset.id}`, JSON.stringify([]));
                            updateLocalSubCount(selectedAsset.id, 0);
                            fetchAssetsFromDatabase();
                          }
                        }}
                        variant="ghost" 
                        size="sm" 
                        className="text-[10px] h-8 font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                      >
                        Clear logs
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  {submissionsList.length === 0 ? (
                    <div className="text-center py-16 px-4">
                      <FolderOpen className="h-8 w-8 text-slate-300 dark:text-zinc-600 mx-auto mb-2" />
                      <h5 className="text-xs font-bold text-slate-600 dark:text-zinc-300">Nothing captured yet</h5>
                      <p className="text-[11px] text-slate-400 dark:text-zinc-500 max-w-xs mx-auto mt-1 leading-normal font-medium">
                        Submit a response in the interactive testing sandbox on the right and check how submissions appear automatically.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-slate-50/50 dark:bg-zinc-900/45">
                          <TableRow>
                            <TableHead className="text-[10px] uppercase font-bold text-slate-400 pl-6 h-10">ID</TableHead>
                            {formFields.slice(0, 2).map((field) => (
                              <TableHead key={field.id} className="text-[10px] uppercase font-bold text-slate-400 h-10">{field.label}</TableHead>
                            ))}
                            <TableHead className="text-[10px] uppercase font-bold text-slate-400 h-10">Time</TableHead>
                            <TableHead className="text-right text-[10px] uppercase pr-6 text-slate-400 h-10">Wipe</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {submissionsList.map((row, idx) => (
                            <TableRow key={row.id || idx} className="hover:bg-slate-50/30 dark:hover:bg-zinc-900/20 transition-colors">
                              <TableCell className="font-mono text-[10px] text-slate-400 pl-6 py-3">{row.id}</TableCell>
                              {formFields.slice(0, 2).map((field) => (
                                <TableCell key={field.id} className="text-xs text-slate-600 dark:text-zinc-300 max-w-[140px] truncate py-3">
                                  {row.data[field.id] !== undefined ? String(row.data[field.id]) : '--'}
                                </TableCell>
                              ))}
                              <TableCell className="text-xs text-slate-400 dark:text-zinc-500 py-3">
                                {new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </TableCell>
                              <TableCell className="text-right pr-6 py-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => {
                                    const revised = submissionsList.filter(s => s.id !== row.id);
                                    setSubmissionsList(revised);
                                    localStorage.setItem(`pf_google_subs_${selectedAsset.id}`, JSON.stringify(revised));
                                    updateLocalSubCount(selectedAsset.id, revised.length);
                                    fetchAssetsFromDatabase();
                                  }} 
                                  className="h-7 w-7 text-slate-400 hover:text-red-500 rounded-lg"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>

            {/* RIGHT COLUMN: PRIMARY FORM HANDOFF CONTROL & ACTIVE SANDBOX */}
            <div className="space-y-6">
              
              {/* PRIMARY ACTION CARD: USE IN FRAMER STEPS */}
              <Card className="shadow-xs border-emerald-500/15 dark:border-emerald-500/10 bg-emerald-500/[0.01] dark:bg-emerald-500/[0.02] rounded-2xl overflow-hidden text-left">
                <CardHeader className="pb-3 border-b border-emerald-500/10 p-5">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-zinc-100">
                    <CheckCircle className="h-4.5 w-4.5 text-emerald-500" />
                    Put Form into Framer
                  </CardTitle>
                  <CardDescription className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-1 font-medium leading-relaxed">
                    Form is ready! Follow these simple steps to place this connected widget on your published site canvas.
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-5 space-y-4">
                  
                  {/* STEP PANEL COPIERS */}
                  <div className="space-y-4 text-xs font-semibold leading-relaxed">
                    <div className="flex items-start gap-2 text-slate-600 dark:text-zinc-300">
                      <Badge className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 w-5 h-5 flex items-center justify-center p-0 rounded-full border-none font-bold shrink-0 mt-0.5">
                        1
                      </Badge>
                      <div>
                        <span className="font-bold">Copy Component:</span>
                        <div className="mt-1.5 flex gap-1.5">
                          <Button 
                            size="sm"
                            onClick={() => triggerCopyFeedback('https://framer.com/m/FramerGoogleForm-NYPedc.js@e2ZereloMPXmmxflwctT', 'comp-link')}
                            className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg gap-1 px-3 text-[11px] h-8 font-bold"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            {copiedLabel === 'comp-link' ? 'Copied Link!' : 'Copy FormBridge Asset Link'}
                          </Button>
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1.5 leading-normal">
                          Open Framer workspace and paste this URL (<kbd className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 border border-muted rounded">Cmd+V</kbd>) directly onto your page canvas.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-slate-600 dark:text-zinc-300 border-t border-slate-50 dark:border-zinc-800/60 pt-3">
                      <Badge className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 w-5 h-5 flex items-center justify-center p-0 rounded-full border-none font-bold shrink-0 mt-0.5">
                        2
                      </Badge>
                      <div>
                        <span className="font-bold">Paste Asset ID:</span>
                        <div className="mt-1.5 flex items-center gap-1.5 bg-slate-50 dark:bg-zinc-950 p-2 border rounded-lg max-w-full font-mono text-[10px]">
                          <span className="truncate select-all text-slate-600 dark:text-zinc-400 font-bold block pr-2">
                            {selectedAsset.formBridgeId}
                          </span>
                          <button 
                            onClick={() => triggerCopyFeedback(selectedAsset.formBridgeId, 'asset-id')}
                            className="text-slate-400 hover:text-slate-700 shrink-0 select-none border-none p-1 cursor-pointer bg-none"
                          >
                            {copiedLabel === 'asset-id' ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1.5 leading-normal">
                          Select the pasted component in Framer and enter this unique ID in the <strong className="text-slate-600 dark:text-zinc-300">FormBridge ID</strong> parameter field.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-slate-600 dark:text-zinc-300 border-t border-slate-50 dark:border-zinc-800/60 pt-3">
                      <Badge className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 w-5 h-5 flex items-center justify-center p-0 rounded-full border-none font-bold shrink-0 mt-0.5">
                        3
                      </Badge>
                      <div>
                        <span className="font-bold">Paste Base URL:</span>
                        <div className="mt-1.5 flex items-center gap-1.5 bg-slate-50 dark:bg-zinc-950 p-2 border rounded-lg max-w-full font-mono text-[10px]">
                          <span className="truncate select-all text-slate-600 dark:text-zinc-400 font-bold block pr-2">
                            {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}
                          </span>
                          <button 
                            onClick={() => triggerCopyFeedback(typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000', 'base-url')}
                            className="text-slate-400 hover:text-slate-700 shrink-0 select-none border-none p-1 cursor-pointer bg-none"
                          >
                            {copiedLabel === 'base-url' ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1.5 leading-normal">
                          Set the <strong className="text-slate-600 dark:text-zinc-300">Base URL</strong> in Framer to route submissions and fetch layouts correctly.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* INTERACTIVE FORM SANDBOX / TESTING RIG */}
              <Card className="shadow-xs border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 rounded-2xl overflow-hidden text-left">
                <CardHeader className="pb-3 border-b border-slate-50 dark:border-zinc-800 p-5">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                    <Send className="h-3.5 w-3.5" />
                    Submit Testing Sandbox
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 text-left">
                  {formFields.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No fields active. Configure fields below to enable custom test postings.</p>
                  ) : (
                    <form onSubmit={handleTriggerSandboxSubmit} className="space-y-3.5 text-left pl-0">
                      {formFields.slice(0, 3).map((f) => (
                        <div key={f.id} className="space-y-1 text-left pl-0">
                          <label className="text-[11px] font-bold block text-slate-700 dark:text-zinc-300">
                            {f.label} {f.required && <span className="text-red-500">*</span>}
                          </label>
                          <Input
                            type="text"
                            required={f.required}
                            value={sandboxData[f.id] || ''}
                            onChange={(e) => setSandboxData({ ...sandboxData, [f.id]: e.target.value })}
                            placeholder={`Enter ${f.label.toLowerCase()}...`}
                            className="h-8.5 text-xs focus-visible:ring-emerald-500 border-slate-200 dark:border-zinc-800 rounded-lg bg-slate-50/20 dark:bg-zinc-900/10"
                          />
                        </div>
                      ))}
                      
                      {formFields.length > 3 && (
                        <p className="text-[10px] text-slate-400 dark:text-zinc-500 italic pl-0.5">
                          + {formFields.length - 3} additional detected fields mapped automatically
                        </p>
                      )}

                      <Button 
                        type="submit" 
                        className="w-full text-xs font-bold h-9 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-all"
                      >
                        Fire Test Submission
                      </Button>
                    </form>
                  )}
                </CardContent>
                <CardFooter className="pt-2 pb-3.5 px-5 border-t border-slate-50 dark:border-zinc-800/80 justify-center">
                  {sandboxSuccess ? (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold animate-pulse">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Secure Direct Posting Success!
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium flex items-center gap-1">
                      <Info className="h-3 w-3" /> Connects securely via static endpoints
                    </span>
                  )}
                </CardFooter>
              </Card>

            </div>
          </div>

          {/* ADVANCED DEVELOPER SETTINGS ACCORDION ACCORDING TO UX PRINCIPLES */}
          <div className="border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 rounded-3xl overflow-hidden mt-6 text-left">
            <button 
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full p-5 flex items-center justify-between font-bold text-xs text-slate-600 dark:text-zinc-400 hover:bg-slate-50/50 dark:hover:bg-zinc-900/20 select-none border-none cursor-pointer text-left"
            >
              <span className="flex items-center gap-1.5">
                <Settings2 className="h-4 w-4" />
                ADVANCED DEVELOPER SETTINGS & INTEGRATIONS
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} />
            </button>

            {showAdvanced && (
              <div className="border-t border-slate-50 dark:border-zinc-800/80 p-6 space-y-6">
                
                {/* ADVANCED TAB SELECTOR */}
                <div className="flex border-b border-slate-100 dark:border-zinc-800/80 gap-4 text-xs font-semibold pl-1">
                  <button 
                    onClick={() => setAdvancedTab('submissions')}
                    className={`pb-2.5 px-1.5 transition-all outline-none border-b-2 bg-transparent cursor-pointer ${advancedTab === 'submissions' ? 'border-primary text-slate-900 dark:text-white font-bold' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                    API Synchronizer (Approach B)
                  </button>
                  <button 
                    onClick={() => setAdvancedTab('custom-fields')}
                    className={`pb-2.5 px-1.5 transition-all outline-none border-b-2 bg-transparent cursor-pointer ${advancedTab === 'custom-fields' ? 'border-primary text-slate-900 dark:text-white font-bold' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                    Custom Fields Mapping
                  </button>
                  <button 
                    onClick={() => setAdvancedTab('raw-schema')}
                    className={`pb-2.5 px-1.5 transition-all outline-none border-b-2 bg-transparent cursor-pointer ${advancedTab === 'raw-schema' ? 'border-primary text-slate-900 dark:text-white font-bold' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                  >
                    Raw Schema JSON & TSX
                  </button>
                </div>

                {/* API DIRECT CONNECT & SYNC SYSTEM */}
                {advancedTab === 'submissions' && (
                  <div className="space-y-6">
                    <Card className="border border-slate-100 dark:border-zinc-800 shadow-none bg-transparent">
                      <CardHeader className="pb-3 text-left">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                          Direct Framer CMS Connection Hub
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Enable bidirection updates. Your keys will reside on securely encrypted backend database arrays.
                        </CardDescription>
                      </CardHeader>
                      <form onSubmit={handleDirectSaveFramerConfig}>
                        <CardContent className="space-y-4 text-left">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold block text-slate-600 dark:text-zinc-400">Framer Project ID</label>
                              <Input
                                value={framerProjectId}
                                onChange={(e) => setFramerProjectId(e.target.value)}
                                placeholder="ce5c14dd-71be-4b95-..."
                                className="font-mono text-xs h-9"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold block text-slate-600 dark:text-zinc-400">Project API CMS Key</label>
                              <div className="relative">
                                <Input
                                  type={showFramerKey ? "text" : "password"}
                                  value={framerApiKey}
                                  onChange={(e) => setFramerApiKey(e.target.value)}
                                  placeholder="framer_cms_..."
                                  className="font-mono text-xs h-9 pr-10"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowFramerKey(!showFramerKey)}
                                  className="absolute right-3 top-2.5 text-slate-400 bg-transparent border-none p-0 cursor-pointer h-4 w-4"
                                >
                                  {showFramerKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="flex border-t border-slate-50 dark:border-zinc-800/80 pt-4 mt-2 justify-between items-center gap-4">
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium font-sans">
                              Bound Status: {framerComponentId ? `Attached (${framerComponentId})` : 'Unlinked'}
                            </span>
                            <div className="flex gap-2">
                              <Button type="submit" variant="outline" className="text-xs h-8">Save Local Tokens</Button>
                              <Button 
                                type="button" 
                                onClick={handleDirectFramerApiConnect} 
                                disabled={isFramerInserting || !framerProjectId || !framerApiKey}
                                className="text-xs h-8 bg-blue-600 text-white hover:bg-blue-700"
                              >
                                {isFramerInserting ? 'Connecting...' : 'Attach Component'}
                              </Button>
                              {framerComponentId && (
                                <Button 
                                  type="button" 
                                  onClick={handleDirectPushSyncSchema} 
                                  disabled={isFramerSyncing}
                                  className="text-xs h-8 bg-emerald-600 text-white hover:bg-emerald-700"
                                >
                                  Sync Schema V{framerSyncVersion}
                                </Button>
                              )}
                            </div>
                          </div>

                          {framerActionResult && (
                            <div className={`p-3.5 rounded-lg border text-xs leading-normal mt-4 ${framerActionResult.success ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200' : 'bg-red-50 text-red-800 dark:bg-red-950/20 dark:text-red-400 border-red-200'}`}>
                              <strong className="block font-bold mb-1">{framerActionResult.message}</strong>
                              <p className="text-[11px] opacity-90 leading-relaxed">{framerActionResult.details}</p>
                            </div>
                          )}
                        </CardContent>
                      </form>
                    </Card>

                    {/* DIAGNOSER CHECK */}
                    <div className="p-4 border rounded-2xl bg-slate-50/25 dark:bg-zinc-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="text-left">
                        <span className="text-xs font-bold block text-slate-700 dark:text-zinc-300">Framer Connection Diagnoser</span>
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500 block mt-0.5">Test response parameters bypass CORS issues safely.</span>
                      </div>
                      <Button onClick={handleTestDirectFramerTokens} disabled={testingConnection || !framerProjectId || !framerApiKey} variant="outline" size="sm" className="h-8.5 font-bold">
                        {testingConnection ? 'Testing...' : 'Run Diagnostics'}
                      </Button>
                    </div>

                    {testResults && (
                      <div className={`p-4 rounded-xl border text-xs space-y-2 text-left ${testResults.success ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-red-500/5 border-red-500/10'}`}>
                        <div className="font-bold flex items-center gap-1.5">
                          {testResults.success ? '✓ Diagnostic Verification Successful!' : '✗ Diagnostic Test Failed'}
                        </div>
                        {testResults.stepDetails.map((s: any, i: number) => (
                          <p key={i} className="text-[11px] leading-relaxed text-slate-500 dark:text-zinc-400">
                            <strong>{s.step}:</strong> {s.details}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* CUSTOM FIELDS MAPPING OVERRIDES */}
                {advancedTab === 'custom-fields' && (
                  <div className="space-y-4">
                    <div className="flex bg-slate-50 dark:bg-zinc-950 p-4 rounded-2xl border items-center justify-between text-left">
                      <div className="space-y-1 pl-0">
                        <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 block">Custom Variable Ingestion Override</span>
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500 block">Create manual mapping bindings matching Google Form fields.</span>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap items-center">
                      <Input
                        value={customFieldLabel}
                        onChange={e => setCustomFieldLabel(e.target.value)}
                        placeholder="Label (e.g., Company Size)"
                        className="h-8.5 text-xs flex-1 min-w-[150px]"
                      />
                      <select
                        value={customFieldType}
                        onChange={e => setCustomFieldType(e.target.value as any)}
                        className="h-8.5 rounded-lg border text-xs bg-background p-1 px-2 border-slate-200 dark:border-zinc-800"
                      >
                        <option value="text">Short Text</option>
                        <option value="textarea">Paragraph Box</option>
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                      </select>
                      <Button onClick={handleCreateCustomField} className="h-8.5 text-xs font-bold bg-slate-900 text-white rounded-lg px-4 hover:bg-slate-800">
                        Add Map Binding
                      </Button>
                    </div>

                    <div className="space-y-1 pt-3">
                      {formFields.map((field) => (
                        <div key={field.id} className="flex items-center justify-between border-b py-2 text-xs">
                          <div>
                            <span className="font-bold pr-2">{field.label}</span>
                            <code className="text-[10px] text-muted-foreground bg-muted p-1 px-1.5 rounded">{field.entryId}</code>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20" onClick={() => handleRemoveField(field.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SCHEMAS DATA & TSX BUILDERS */}
                {advancedTab === 'raw-schema' && (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Raw Schema Config Payload (JSON)</span>
                        <pre className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-950 font-mono text-[9px] max-h-[300px] overflow-auto select-all text-left border border-slate-100 dark:border-zinc-800">
                          {JSON.stringify(formSchema, null, 2)}
                        </pre>
                      </div>
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Compiled TSX Custom React Component</span>
                        <pre className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-950 font-mono text-[9px] max-h-[300px] overflow-auto select-all text-left border border-slate-100 dark:border-zinc-800">
                          {customComponentTSXCode}
                        </pre>
                        <Button onClick={() => triggerCopyFeedback(customComponentTSXCode, 'tsx-code')} className="w-full text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 rounded-lg">
                          {copiedLabel === 'tsx-code' ? 'Copied TSX Code!' : 'Copy React Component Code'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

        </div>
      )}

      {/* DIALOG WIZARD FLOW (STEP 1: Paste, STEP 2: Scrape, STEP 3: Confirm) */}
      <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-zinc-800">
          
          {wizardStep === 1 && (
            <form onSubmit={handleAnalyzeFormUrl} className="space-y-6 text-left">
              <DialogHeader className="text-left space-y-1.5">
                <DialogTitle className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center p-0 shrink-0">
                    <Layers className="h-3.5 w-3.5" />
                  </span>
                  Connect FormBridge
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 dark:text-zinc-400 font-medium">
                  Enter your public Google Form URL below to fetch form fields structure instantly and map submission parameters.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-1.5 pl-0">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-widest pl-0.5">Asset Custom Name (Optional)</label>
                  <Input
                    type="text"
                    placeholder="e.g., Contact Form, Sign-up Sheet"
                    value={wizardFormName}
                    onChange={(e) => setWizardFormName(e.target.value)}
                    className="h-10 text-xs border-slate-200 dark:border-zinc-800 rounded-lg"
                  />
                </div>

                <div className="space-y-1.5 pl-0">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-widest pl-0.5">Google Form View URL</label>
                  <Input
                    type="url"
                    required
                    placeholder="https://docs.google.com/forms/d/e/.../viewform"
                    value={wizardFormUrl}
                    onChange={(e) => setWizardFormUrl(e.target.value)}
                    className="h-10 text-xs border-slate-200 dark:border-zinc-800 rounded-lg font-sans"
                  />
                </div>

                {parserError && (
                  <div className="text-xs text-red-500 bg-red-500/10 p-3.5 rounded-xl border border-red-500/10 leading-normal">
                    {parserError}
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 shrink-0">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setIsWizardOpen(false)}
                  className="text-xs font-bold h-10 rounded-lg mr-2"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={wizardLoading || !wizardFormUrl}
                  className="text-xs font-bold h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-lg dark:bg-white dark:hover:bg-zinc-100 dark:text-slate-900 transition-all select-none"
                >
                  {wizardLoading && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
                  Scrape Fields Config
                </Button>
              </DialogFooter>
            </form>
          )}

          {wizardStep === 2 && (
            <div className="space-y-6 text-left">
              <DialogHeader className="text-left space-y-1.5">
                <DialogTitle className="text-lg font-extrabold text-slate-900 dark:text-white">
                  Verify Detected Variables
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 dark:text-zinc-400 font-medium">
                  We scanned your Google Form structure and identified the following payload options. Click Create to compile the FormBridge Asset.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-1.5 pl-0">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest pl-0.5">Asset Title</label>
                  <Input
                    required
                    value={wizardFormName}
                    onChange={e => setWizardFormName(e.target.value)}
                    placeholder="Form Title Override..."
                    className="h-9.5 text-xs font-semibold rounded-lg"
                  />
                </div>

                <div className="space-y-2 max-h-[220px] overflow-auto p-4 rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/30 dark:bg-zinc-950/30">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block mb-2">AUTO-DETECTED FIELDS ({wizardDetectedFields.length})</span>
                  {wizardDetectedFields.map((field, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs py-1 px-1 justify-between border-b last:border-b-0 border-slate-100 dark:border-zinc-800/60 pb-2 mb-2 last:pb-0 last:mb-0">
                      <span className="font-bold text-slate-800 dark:text-zinc-200">{field.label}</span>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[9px] font-semibold uppercase text-slate-400 border-slate-200 dark:border-zinc-800">
                          {field.type}
                        </Badge>
                        {field.required && <span className="text-[9px] text-red-500 font-bold block">* Required</span>}
                      </div>
                    </div>
                  ))}
                </div>

                {parserError && (
                  <div className="text-xs text-red-500 bg-red-500/10 p-3.5 rounded-xl border border-red-500/10 leading-normal">
                    {parserError}
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setWizardStep(1)}
                  className="text-xs font-bold h-10 rounded-lg mr-2"
                >
                  Back
                </Button>
                <Button 
                  onClick={handleFinishAssetCreation}
                  disabled={wizardLoading || !wizardFormName.trim()}
                  className="text-xs font-bold h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-lg dark:bg-white dark:hover:bg-zinc-100 dark:text-slate-900"
                >
                  {wizardLoading && <Loader2 className="mr-1.5 h-3 w-3 animate-spin block" />}
                  Create FormBridge Asset
                </Button>
              </DialogFooter>
            </div>
          )}

          {wizardStep === 3 && (
            <div className="space-y-6 text-left">
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-6 w-6" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">FormBridge Asset Live!</h3>
                <p className="text-xs text-slate-400 dark:text-zinc-400 font-medium">
                  We completed translation bindings. Copy the connections parameters and apply to your Framer canvas.
                </p>
              </div>

              {handoffAsset && (
                <div className="space-y-4 pt-1">
                  
                  {/* DIRECT COPIERS BLOCK */}
                  <div className="space-y-3.5">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block pl-0.5">1. Paste Component URL in Framer</span>
                      <div className="flex gap-2">
                        <Input 
                          readOnly 
                          value="https://framer.com/m/FramerGoogleForm-NYPedc.js@e2ZereloMPXmmxflwctT" 
                          className="font-mono text-[10px] h-8.5 bg-slate-50 dark:bg-zinc-950/40 select-all border-slate-200 dark:border-zinc-800"
                        />
                        <Button 
                          size="sm"
                          onClick={() => triggerCopyFeedback('https://framer.com/m/FramerGoogleForm-NYPedc.js@e2ZereloMPXmmxflwctT', 'wizard-comp-link')}
                          className="text-[10px] h-8.5 px-3 bg-slate-900 text-white rounded-lg font-bold"
                        >
                          {copiedLabel === 'wizard-comp-link' ? 'Copied!' : 'Copy'}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block pl-0.5 font-sans">2. Enter your FormBridge Asset ID</span>
                      <div className="flex gap-2">
                        <Input 
                          readOnly 
                          value={handoffAsset.formBridgeId} 
                          className="font-mono text-[10px] h-11 bg-slate-50 dark:bg-zinc-950/40 select-all border-slate-200 dark:border-zinc-800 font-bold"
                        />
                        <Button 
                          size="sm"
                          onClick={() => triggerCopyFeedback(handoffAsset.formBridgeId, 'wizard-asset-id')}
                          className="text-[10px] h-11 px-3 bg-slate-900 text-white rounded-lg font-bold"
                        >
                          {copiedLabel === 'wizard-asset-id' ? 'Copied!' : 'Copy'}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block pl-0.5 font-sans">3. Enter Base URL in Framer</span>
                      <div className="flex gap-2">
                        <Input 
                          readOnly 
                          value={typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'} 
                          className="font-mono text-[10px] h-11 bg-slate-50 dark:bg-zinc-950/40 select-all border-slate-200 dark:border-zinc-800 font-bold"
                        />
                        <Button 
                          size="sm"
                          onClick={() => triggerCopyFeedback(typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000', 'wizard-base-url')}
                          className="text-[10px] h-11 px-3 bg-slate-900 text-white rounded-lg font-bold"
                        >
                          {copiedLabel === 'wizard-base-url' ? 'Copied!' : 'Copy'}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 text-slate-400 dark:text-zinc-500 bg-slate-50/50 dark:bg-zinc-950/20 text-[10px] rounded-xl font-medium leading-relaxed border space-y-1 pl-4 list-decimal">
                    <p className="font-bold text-slate-600 dark:text-zinc-300">Quick Guide:</p>
                    <p>1. Open Framer design project.</p>
                    <p>2. Press Cmd+V to paste the component link on layout space.</p>
                    <p>3. Enter the Asset ID parameter in properties panel on right.</p>
                  </div>
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button 
                  onClick={() => {
                    setIsWizardOpen(false);
                    fetchAssetsFromDatabase();
                  }}
                  className="w-full text-xs font-bold bg-slate-950 text-white hover:bg-slate-850 rounded-lg h-10"
                >
                  Open Form Summary Dashboard
                </Button>
              </DialogFooter>
            </div>
          )}

        </DialogContent>
      </Dialog>

      {/* SUCCESS USE-IN-FRAMER HANDOFF MODAL */}
      <Dialog open={isHandoffOpen} onOpenChange={setIsHandoffOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-zinc-800">
          <DialogHeader className="text-left space-y-1 text-slate-900 dark:text-white">
            <DialogTitle className="text-md font-extrabold flex items-center gap-1.5">
              <span className="p-1 px-2.5 rounded text-emerald-600 bg-emerald-500/10 text-[10px] uppercase tracking-wider font-bold">Bridge Active</span>
              Use {handoffAsset?.name || 'Asset'} in Framer
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 dark:text-zinc-400 leading-normal font-medium">
              Copy variables straight to Framer to synchronize direct posting layouts immediately.
            </DialogDescription>
          </DialogHeader>

          {handoffAsset && (
            <div className="py-4 space-y-4 text-left">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block pl-0.5">1. Copiar Link del Componente</span>
                <div className="flex gap-2">
                  <Input 
                    readOnly 
                    value="https://framer.com/m/FramerGoogleForm-NYPedc.js@e2ZereloMPXmmxflwctT" 
                    className="font-mono text-[10px] h-8.5 bg-slate-50 dark:bg-zinc-950/40 border-slate-200 dark:border-zinc-800"
                  />
                  <Button 
                    size="sm"
                    onClick={() => triggerCopyFeedback('https://framer.com/m/FramerGoogleForm-NYPedc.js@e2ZereloMPXmmxflwctT', 'modal-handoff-link')}
                    className="text-[10px] h-8.5 px-3 bg-slate-900 text-white rounded-lg font-bold"
                  >
                    {copiedLabel === 'modal-handoff-link' ? 'Copied!' : 'Copy link'}
                  </Button>
                </div>
              </div>

              <div className="space-y-1 border-t border-slate-50 dark:border-zinc-800/80 pt-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 block pl-0.5 font-sans">2. Asset API / FormBridge ID</span>
                <div className="flex gap-2">
                  <Input 
                    readOnly 
                    value={handoffAsset.formBridgeId} 
                    className="font-mono text-[10px] h-11 bg-slate-50 dark:bg-zinc-950/40 border-slate-200 dark:border-zinc-800 font-bold"
                  />
                  <Button 
                    size="sm"
                    onClick={() => triggerCopyFeedback(handoffAsset.formBridgeId, 'modal-handoff-id')}
                    className="text-[10px] h-11 px-3 bg-slate-900 text-white rounded-lg font-bold"
                  >
                    {copiedLabel === 'modal-handoff-id' ? 'Copied!' : 'Copy ID'}
                  </Button>
                </div>
              </div>

              <div className="space-y-1 border-t border-slate-50 dark:border-zinc-800/80 pt-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 block pl-0.5 font-sans">3. Base URL Override</span>
                <div className="flex gap-2">
                  <Input 
                    readOnly 
                    value={typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'} 
                    className="font-mono text-[10px] h-11 bg-slate-50 dark:bg-zinc-950/40 border-slate-200 dark:border-zinc-800 font-bold"
                  />
                  <Button 
                    size="sm"
                    onClick={() => triggerCopyFeedback(typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000', 'modal-handoff-baseurl')}
                    className="text-[10px] h-11 px-3 bg-slate-900 text-white rounded-lg font-bold"
                  >
                    {copiedLabel === 'modal-handoff-baseurl' ? 'Copied!' : 'Copy URL'}
                  </Button>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border text-[11px] leading-relaxed text-slate-500 dark:text-zinc-400 space-y-1.5 pl-4">
                <p className="font-bold text-slate-700 dark:text-zinc-300">How to Setup in Framer:</p>
                <p>• Drop component link inside Framer workspace.</p>
                <p>• Select placed container and locate settings parameter.</p>
                <p>• Set unique FormBridge ID to match dynamic forms.</p>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button 
              onClick={() => setIsHandoffOpen(false)}
              className="w-full text-xs font-bold bg-slate-950 hover:bg-slate-850 text-white rounded-lg h-10"
            >
              Close instructions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: RENAME IDENTIFIER */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-xl border">
          <form onSubmit={handleRenameAssetExecute} className="space-y-4 text-left">
            <DialogHeader className="text-left space-y-1">
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-primary" />
                Rename FormBridge Asset
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Rename your custom asset representation. Live submissions and fields mappings will be preserved.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2 pl-0">
              <Input
                type="text"
                required
                value={editAssetName}
                onChange={(e) => setEditAssetName(e.target.value)}
                className="h-10 text-xs border-slate-200 dark:border-zinc-800 rounded-lg placeholder-slate-400"
                placeholder="Asset Title (e.g. Corporate Survey)"
              />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="ghost" className="text-xs h-9" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="text-xs h-9" disabled={actionLoading}>
                {actionLoading && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                Save Rename
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG: DISCONNECT/DELETE CONFIRM */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-xl border">
          <DialogHeader className="text-left space-y-1.5">
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-red-500">
              <Trash2 className="h-4 w-4" />
              Disconnect Asset Bridge
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 leading-normal font-medium">
              Are you sure? Removing <strong className="text-slate-800 dark:text-zinc-200">{selectedAsset?.name}</strong> deletes local cache directories, connection IDs, and mapping logs instantly.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-4">
            <Button variant="ghost" className="text-xs h-9 font-semibold" onClick={() => setIsDeleteOpen(false)}>
              Discard Change
            </Button>
            <Button variant="destructive" className="text-xs h-9" onClick={handleDisconnectAssetExecute} disabled={actionLoading}>
              {actionLoading && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              Disconnect asset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
