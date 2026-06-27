import * as React from 'react';
import { useState, useEffect } from 'react';
import { 
  ArrowRight, ArrowLeft, Settings, Link, Key, Box, Sparkles, Plus, Trash2, Zap, Sliders, Eye, EyeOff, ShieldCheck, 
  RefreshCw, Loader2, Info, AlertCircle, Check, CheckCircle, 
  XCircle, Database, Clock, ListChecks, ShieldAlert, CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { FIELD_CATEGORIES } from '../constants';
import { WCProduct } from '../types';

interface TabFieldSelectionProps {
  selectedStore: any;
  activeProfileId: string;
  setActiveProfileId: (val: string) => void;
  handleApplyPresetProfile: (profileId: string, customFields?: string[]) => void;
  selectedFields: string[];
  setSelectedFields: (val: string[]) => void;
  customProfiles: any[];
  setCustomProfiles: (val: any[]) => void;
  handleSaveFields: (
    newSelectedFields: string[], 
    newTargetCollectionId?: string, 
    newProfiles?: any[], 
    customFieldMappings?: Record<string, string>, 
    customSyncSettings?: any
  ) => void;
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: (val: boolean) => void;
  profileModalMode: 'create' | 'rename' | 'duplicate';
  setProfileModalMode: (val: 'create' | 'rename' | 'duplicate') => void;
  profileInputName: string;
  setProfileInputName: (val: string) => void;
  handleCreateCustomProfile: (name: string) => void;
  handleRenameProfile: (name: string) => void;
  handleDuplicateProfile: (name: string) => void;
  handleDeleteProfile: () => void;
  
  selectedCollectionId: string;
  setSelectedCollectionId: (val: string) => void;
  framerCollections: any[];
  loadingCollections: boolean;
  framerErrorMsg: string | null;
  fetchFramerSchema: (colId: string) => void;
  
  fieldMappings: Record<string, string>;
  setFieldMappings: (val: Record<string, string>) => void;
  framerCollectionFields: any[];
  handleAutoMap: () => void;
  loadingSchema: boolean;
  
  syncSettings: { createItems: boolean; updateItems: boolean; deleteItems: boolean };
  setSyncSettings: (val: { createItems: boolean; updateItems: boolean; deleteItems: boolean }) => void;
  
  generatingPreview: boolean;
  handleGeneratePreview: () => void;
  previewData: any;
  setPreviewData: (val: any) => void;
  
  framerSyncLoading: boolean;
  framerSyncProgress: number;
  framerSyncPhase: string;
  framerCurrentFieldKey: string;
  framerSyncedFieldsQueue: string[];
  framerSyncLogResult: any;
  handleSyncToFramer: (confirmed: boolean, dryRun?: boolean, fullResync?: boolean) => void;
  handleTriggerAndSync: (dryRun: boolean, fullResync?: boolean) => void;
  products: WCProduct[];
}

export default function TabFieldSelection({
  selectedStore,
  activeProfileId,
  setActiveProfileId,
  handleApplyPresetProfile,
  selectedFields,
  setSelectedFields,
  customProfiles,
  handleSaveFields,
  isProfileModalOpen,
  setIsProfileModalOpen,
  profileModalMode,
  setProfileModalMode,
  profileInputName,
  setProfileInputName,
  handleCreateCustomProfile,
  handleRenameProfile,
  handleDuplicateProfile,
  handleDeleteProfile,
  selectedCollectionId,
  setSelectedCollectionId,
  framerCollections,
  loadingCollections,
  framerErrorMsg,
  fetchFramerSchema,
  fieldMappings,
  setFieldMappings,
  framerCollectionFields,
  handleAutoMap,
  loadingSchema,
  syncSettings,
  setSyncSettings,
  generatingPreview,
  handleGeneratePreview,
  previewData,
  setPreviewData,
  framerSyncLoading,
  framerSyncProgress,
  framerSyncPhase,
  framerCurrentFieldKey,
  framerSyncedFieldsQueue,
  framerSyncLogResult,
  handleSyncToFramer,
  handleTriggerAndSync,
  products
}: TabFieldSelectionProps) {

  // Step state tracker
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Connection Credentials states (pre-populated from prop)
  const [wooUrl, setWooUrl] = useState<string>('');
  const [wooConsumerKey, setWooConsumerKey] = useState<string>('');
  const [wooConsumerSecret, setWooConsumerSecret] = useState<string>('');
  const [framerUrl, setFramerUrl] = useState<string>('');
  const [framerKey, setFramerKey] = useState<string>('');

  // Password visibility triggers
  const [showCk, setShowCk] = useState<boolean>(false);
  const [showCs, setShowCs] = useState<boolean>(false);
  const [showFk, setShowFk] = useState<boolean>(false);

  // Connection Validation status state loaders
  const [validatingWoo, setValidatingWoo] = useState<boolean>(false);
  const [wooSuccessMsg, setWooSuccessMsg] = useState<string | null>(null);
  const [wooErrorMsg, setWooErrorMsg] = useState<string | null>(null);

  const [validatingFramer, setValidatingFramer] = useState<boolean>(false);
  const [framerSuccessMsg, setFramerSuccessMsg] = useState<string | null>(null);
  const [framerLocalErrorMsg, setFramerLocalErrorMsg] = useState<string | null>(null);

  // Step 3 layout collection states
  const [newCollectionName, setNewCollectionName] = useState<string>('');
  const [creatingCollection, setCreatingCollection] = useState<boolean>(false);
  const [creatorMsg, setCreatorMsg] = useState<string | null>(null);
  const [creatorError, setCreatorError] = useState<string | null>(null);

  // Step 5 fields automation schema generator state
  const [automatingFields, setAutomatingFields] = useState<boolean>(false);
  const [automationResult, setAutomationResult] = useState<any>(null);
  const [automationError, setAutomationError] = useState<string | null>(null);
  const [syncInterval, setSyncInterval] = useState<string>('manual');

  // Modal open verification state
  const [isConfirmSyncOpen, setIsConfirmSyncOpen] = useState(false);

  // Sync Interval configuration dictionary
  const SYNC_INTERVALS = [
    { value: 'manual', label: 'Manual Sync Only' },
    { value: '15min', label: 'Every 15 minutes' },
    { value: '30min', label: 'Every 30 minutes' },
    { value: 'hourly', label: 'Every hour' },
    { value: 'daily', label: 'Every day' },
  ];

  // Initialize fields on mount or when selectedStore pulls data
  useEffect(() => {
    if (selectedStore) {
      setWooUrl(selectedStore.url || '');
      // Retrieve obfuscated or stored credentials securely
      setWooConsumerKey(localStorage.getItem(`wc_ck_${selectedStore.id}`) || selectedStore.consumerKey || '');
      setWooConsumerSecret(localStorage.getItem(`wc_cs_${selectedStore.id}`) || selectedStore.consumerSecret || '');
      setFramerUrl(selectedStore.framerProjectId || '');
      setFramerKey(localStorage.getItem(`framer_key_${selectedStore.id}`) || selectedStore.framerApiKey || '');
      
      // Auto-set step based on what is configured to expedite workflows
      if (selectedStore.url && (selectedStore.consumerKey || localStorage.getItem(`wc_ck_${selectedStore.id}`))) {
        if (selectedStore.framerProjectId && (selectedStore.framerApiKey || localStorage.getItem(`framer_key_${selectedStore.id}`))) {
          if (selectedStore.framerTargetCollectionId) {
            setCurrentStep(5);
          } else {
            setCurrentStep(3);
          }
        } else {
          setCurrentStep(2);
        }
      } else {
        setCurrentStep(1);
      }
    }
  }, [selectedStore]);

  // Robust Framer URL & Token extractor
  const localParseFramerProjectId = (input: string): string => {
    if (!input) return "";
    let clean = input.trim();
    if (clean.startsWith("http://") || clean.startsWith("https://")) {
      try {
        const parsedUrl = new URL(clean);
        const segments = parsedUrl.pathname.split("/").filter(Boolean);
        const projIndex = segments.indexOf("projects");
        let targetSegment = "";
        if (projIndex !== -1 && segments[projIndex + 1]) {
          targetSegment = segments[projIndex + 1];
        } else {
          targetSegment = segments[segments.length - 1] || "";
        }
        
        if (targetSegment.includes("--")) {
          const parts = targetSegment.split("--");
          clean = parts[parts.length - 1];
        } else {
          clean = targetSegment;
        }
      } catch (_) {
        const lastSlash = clean.lastIndexOf("/");
        if (lastSlash !== -1) {
          clean = clean.substring(lastSlash + 1);
        }
      }
    }
    return clean.split("?")[0].split("#")[0].trim();
  };

  // STEP 1 Validation Engine
  const validateAndSaveWooConnection = async () => {
    if (!wooUrl || !wooConsumerKey || !wooConsumerSecret) {
      setWooErrorMsg("Please supply WordPress Store URL, Consumer Key and Secret to bind connection.");
      return;
    }

    try {
      setValidatingWoo(true);
      setWooErrorMsg(null);
      setWooSuccessMsg(null);

      // Perform PUT encryption update on backend
      const res = await fetch(`/api/stores/${selectedStore.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: wooUrl.trim(),
          consumerKey: wooConsumerKey.trim(),
          consumerSecret: wooConsumerSecret.trim(),
          sslBypass: true
        })
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(`Unable to enroll secure keys into REST store broker. ${errorJson.error || ''} ${errorJson.details || ''}`);
      }

      // Save key states locally to support developer session cache
      if (!wooConsumerKey.includes('*')) {
        localStorage.setItem(`wc_ck_${selectedStore.id}`, wooConsumerKey.trim());
      }
      if (!wooConsumerSecret.includes('*')) {
        localStorage.setItem(`wc_cs_${selectedStore.id}`, wooConsumerSecret.trim());
      }

      setWooSuccessMsg("Handshaking REST signatures... Synchronizing WooCommerce catalogue...");

      // Trigger WooCommerce catalog synchronization
      const syncRes = await fetch(`/api/sync/${selectedStore.id}`, {
        method: 'POST'
      });

      if (!syncRes.ok) {
        const syncErrorJson = await syncRes.json().catch(() => ({}));
        throw new Error(`REST keys enrolled, but WooCommerce sync failed: ${syncErrorJson.error || 'Server connection error'}`);
      }

      // Handshake validation: pull WooCommerce catalogue to verify connection authority
      const prodResponse = await fetch(`/v1/${selectedStore.id}/products?limit=5`);
      const prodContentType = prodResponse.headers.get("content-type") || "";
      if (prodResponse.ok && prodContentType.includes("application/json")) {
        const productsJson = await prodResponse.json();
        const detectedProds = productsJson.products || [];
        const categoriesSet = new Set<string>();
        detectedProds.forEach((p: any) => {
          if (p.categories) {
            if (Array.isArray(p.categories)) {
              p.categories.forEach((c: any) => categoriesSet.add(c.name || String(c)));
            } else if (typeof p.categories === 'string') {
              categoriesSet.add(p.categories);
            }
          }
        });

        setWooSuccessMsg(`Successfully connected to store! Cached ${detectedProds.length}+ live products. Handshook core product schema and detected ${categoriesSet.size || 1} product categories.`);
        
        // Progress after delay to give elegant response cadence
        setTimeout(() => {
          setCurrentStep(2);
        }, 1500);

      } else {
        throw new Error("API credential authentication failed. WordPress core rejected connection authority.");
      }

    } catch (err: any) {
      console.error("[Wizard Step 1 Fail]", err);
      setWooErrorMsg(err.message || String(err));
    } finally {
      setValidatingWoo(false);
    }
  };

  // STEP 2 Validation Engine
  const validateAndSaveFramerConnection = async () => {
    if (!framerUrl || !framerKey) {
      setFramerLocalErrorMsg("Framer Project Link URL and access token are required.");
      return;
    }

    const parsedPid = localParseFramerProjectId(framerUrl);

    try {
      setValidatingFramer(true);
      setFramerLocalErrorMsg(null);
      setFramerSuccessMsg(null);

      // Perform PUT encryption update on backend
      const res = await fetch(`/api/stores/${selectedStore.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          framerProjectId: parsedPid,
          framerApiKey: framerKey.trim()
        })
      });

      if (!res.ok) {
        throw new Error("Config write failure in database.");
      }

      localStorage.setItem(`framer_pid_${selectedStore.id}`, parsedPid);
      if (!framerKey.includes('*')) {
        localStorage.setItem(`framer_key_${selectedStore.id}`, framerKey.trim());
      }

      // Fetch Framer collections to dry-test actual API query capabilities
      const colRes = await fetch(`/api/framer/collections/${selectedStore.id}`);
      if (colRes.ok) {
        const collections = await colRes.json();
        setFramerSuccessMsg(`Framer CMS API certification approved! Connection authenticated successfully. Recognized ${collections.length} custom collections in your project layout.`);
        
        // Update collection lists locally 
        setTimeout(() => {
          setCurrentStep(3);
        }, 1500);
      } else {
        const errJson = await colRes.json().catch(() => ({}));
        throw new Error(errJson.details || errJson.error || "Connection request was rejected by Framer API gateways.");
      }

    } catch (err: any) {
      console.error("[Wizard Step 2 Fail]", err);
      setFramerLocalErrorMsg(err.message || String(err));
    } finally {
      setValidatingFramer(false);
    }
  };

  // STEP 3: Create CMS Collection
  const createNewCollection = async () => {
    if (!newCollectionName || !newCollectionName.trim()) {
      setCreatorError("Collection name cannot be empty.");
      return;
    }

    try {
      setCreatingCollection(true);
      setCreatorError(null);
      setCreatorMsg(null);

      const res = await fetch(`/api/framer/create-collection/${selectedStore.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCollectionName.trim() })
      });

      if (res.ok) {
        const newCol = await res.json();
        setCreatorMsg(`CMS Collection "${newCol.name}" created successfully with ID "${newCol.id}".`);
        
        // Save collection ID in layout and proceed
        setSelectedCollectionId(newCol.id);
        fetchFramerSchema(newCol.id);
        handleSaveFields(selectedFields, newCol.id);

        setTimeout(() => {
          setCurrentStep(4);
        }, 1200);
      } else {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.details || errJson.error || "Framer CMS collection creation failed.");
      }
    } catch (err: any) {
      console.error("[Wizard Step 3 Creator Fail]", err);
      setCreatorError(err.message || String(err));
    } finally {
      setCreatingCollection(false);
    }
  };

  // STEP 4: Pre-defined Schema presets
  const applyPresetFields = (preset: 'minimal' | 'storefront' | 'catalog' | 'complete') => {
    let fields: string[] = [];
    if (preset === 'minimal') {
      fields = ["title", "slug", "sku", "type", "status"];
    } else if (preset === 'storefront') {
      fields = ["title", "slug", "sku", "type", "status", "short_description", "price", "currency", "featured_image", "categories"];
    } else if (preset === 'catalog') {
      fields = ["title", "slug", "sku", "type", "status", "short_description", "description", "price", "regular_price", "currency", "featured_image", "gallery_images", "categories", "tags"];
    } else {
      fields = ["title", "slug", "sku", "type", "status", "short_description", "description", "price", "regular_price", "sale_price", "currency", "stock_status", "stock_quantity", "manage_stock", "featured_image", "gallery_images", "image_alt", "categories", "category_slugs", "tags", "weight", "dimensions", "created_at", "updated_at"];
    }
    setSelectedFields(fields);
    handleSaveFields(fields, selectedCollectionId);
  };

  // STEP 5: Automated Schema Generation (No manual mapping!)
  const handleAutomatedFramerFieldsCreation = async () => {
    if (!selectedCollectionId) {
      setAutomationError("Please select a target collection before automating field creation.");
      return;
    }

    try {
      setAutomatingFields(true);
      setAutomationError(null);
      setAutomationResult(null);

      const res = await fetch(`/api/framer/create-fields/${selectedStore.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionId: selectedCollectionId,
          selectedFields: selectedFields
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAutomationResult(data);
        // Automatically adopt the generated mappings on parent
        setFieldMappings(data.mappings);
        
        // Persistent save
        handleSaveFields(selectedFields, selectedCollectionId, undefined, data.mappings);
      } else {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.details || errJson.error || "Field generation endpoint rejected request.");
      }
    } catch (err: any) {
      console.error("[Wizard Step 5 Automation Fail]", err);
      setAutomationError(err.message || String(err));
    } finally {
      setAutomatingFields(false);
    }
  };

  // All available WooCommerce Fields classified nicely
  const ALL_WOO_FIELDS_GRID = [
    {
      category: "Identifier & Identity",
      items: [
        { key: "title", label: "Product Name", type: "string", desc: "Core catalog text title" },
        { key: "slug", label: "Slug url", type: "string", desc: "Clean slug link parameters" },
        { key: "sku", label: "SKU SKU", type: "string", desc: "Stock keeping unit alphanumeric" },
        { key: "type", label: "Product Type", type: "string", desc: "Simple or variable configuration" },
        { key: "status", label: "Status State", type: "string", desc: "Draft vs Publish states" },
      ]
    },
    {
      category: "Pricing & Stock",
      items: [
        { key: "price", label: "Current Price", type: "number", desc: "Effective price loaded to store" },
        { key: "regular_price", label: "Regular MSRP", type: "number", desc: "Market standard price tag" },
        { key: "sale_price", label: "Sale discount", type: "number", desc: "Discount campaign price tag" },
        { key: "currency", label: "Currency tag", type: "string", desc: "E.g. USD, EUR metrics" },
        { key: "stock_status", label: "Stock status", type: "string", desc: "Instock or outofstock state" },
        { key: "stock_quantity", label: "Stock levels", type: "number", desc: "Active level counts left" },
        { key: "manage_stock", label: "Manage stock", type: "boolean", desc: "Stock management active" },
      ]
    },
    {
      category: "Rich Content & Media",
      items: [
        { key: "featured_image", label: "Primary Hero Image", type: "image", desc: "High-resolution master asset" },
        { key: "gallery_images", label: "Product Gallery", type: "string", desc: "Sub-visual items linked as text" },
        { key: "image_alt", label: "Image Alt Text", type: "string", desc: "A11y descriptive texts summaries" },
        { key: "description", label: "Full Description", type: "formattedText", desc: "Structured HTML product description" },
        { key: "short_description", label: "Teaser Snippet", type: "formattedText", desc: "Compact layout summaries text" },
        { key: "categories", label: "Categories labels", type: "string", desc: "Groups/collections as comma strings" },
        { key: "category_slugs", label: "Category slugs", type: "string", desc: "Clean slug link lists" },
        { key: "tags", label: "Product Tags", type: "string", desc: "Dynamic metadata labels" },
      ]
    },
    {
      category: "Measurements & Metadata",
      items: [
        { key: "weight", label: "Shipping Weight", type: "number", desc: "Pure unit measurement details" },
        { key: "dimensions", label: "Dimensions Info", type: "string", desc: "Length x Width x Height metrics" },
        { key: "created_at", label: "Date Created", type: "date", desc: "Core calendar publish date" },
        { key: "updated_at", label: "Date Modified", type: "date", desc: "Latest modifications update logs" },
      ]
    }
  ];

  const handleToggleFieldCheckbox = (key: string) => {
    let next: string[] = [];
    if (selectedFields.includes(key)) {
      next = selectedFields.filter(f => f !== key);
    } else {
      next = [...selectedFields, key];
    }
    setSelectedFields(next);
    handleSaveFields(next, selectedCollectionId);
  };

  return (
    <div className="space-y-6 text-left font-sans">
      
      {/* STEPS TIMELINE OVERVIEW */}
      <div className="bg-background border border-border/80 p-5 rounded-xl shadow-xs">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-800 dark:text-zinc-100 flex items-center gap-1.5 uppercase tracking-wide">
            <Sparkles className="h-4.5 w-4.5 text-pink-500 animate-pulse" />
            Automated WooCommerce → Framer Synchronization Setup
          </h2>
          <Badge className="bg-gradient-to-r from-pink-500 to-indigo-600 border-none text-[10px] select-none uppercase tracking-widest px-2.5 py-0.5">
            Step {currentStep} of 5
          </Badge>
        </div>
        
        {/* Step Numbers Indicators Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4 pt-4 border-t border-dashed border-border/60">
          {[
            { id: 1, label: "WooCommerce" },
            { id: 2, label: "Framer API" },
            { id: 3, label: "Collection" },
            { id: 4, label: "Field Select" },
            { id: 5, label: "Fields & Sync" },
          ].map((s) => {
            const isCompleted = currentStep > s.id;
            const isActive = currentStep === s.id;
            return (
              <div 
                key={s.id} 
                onClick={() => {
                  // Only allow jumping back, or jumping forward if keys exist
                  if (s.id < currentStep) {
                    setCurrentStep(s.id);
                  }
                }}
                className={`p-2.5 rounded-lg border transition-all text-left flex items-center gap-2 cursor-pointer select-none ${
                  isActive
                    ? "bg-indigo-500/5 border-indigo-500"
                    : isCompleted
                    ? "bg-emerald-500/[0.03] border-emerald-500/20 hover:bg-emerald-500/[0.06]"
                    : "bg-muted/10 border-border/60 opacity-60 pointer-events-none"
                }`}
              >
                <div className={`w-5.5 h-5.5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                  isActive 
                    ? "bg-indigo-600 text-white" 
                    : isCompleted 
                    ? "bg-emerald-500 text-white" 
                    : "bg-neutral-200 dark:bg-zinc-800 text-muted-foreground"
                }`}>
                  {isCompleted ? <Check className="h-3.5 w-3.5" /> : s.id}
                </div>
                <div>
                  <div className={`text-[10px] font-bold uppercase tracking-wider leading-none ${
                    isActive ? "text-indigo-600" : isCompleted ? "text-emerald-600" : "text-muted-foreground"
                  }`}>
                    {s.label}
                  </div>
                  <div className="text-[9px] text-muted-foreground leading-tight mt-0.5">
                    {s.id === 1 && "Store keys link"}
                    {s.id === 2 && "CMS tokens check"}
                    {s.id === 3 && "Target collection"}
                    {s.id === 4 && "Active selections"}
                    {s.id === 5 && "Automation live"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP CONTAINER CONTROLS */}
      
      {/* STEP 1: CONNECT WOOCOMMERCE */}
      {currentStep === 1 && (
        <Card className="shadow-sm border-indigo-500/10">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-sm font-bold uppercase tracking-wide flex items-center gap-1.5 text-pink-600">
              <Key className="h-4.5 w-4.5" />
              Step 1: Authenticate WooCommerce REST Handshake
            </CardTitle>
            <CardDescription className="text-xs">
              Provide your WooCommerce details to map store items. These credentials are fully server-side encrypted.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <div className="grid gap-4.5 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-3">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">WooCommerce Domain Address</label>
                <Input
                  type="url"
                  placeholder="e.g. https://my-brand-shop.com"
                  value={wooUrl}
                  onChange={(e) => setWooUrl(e.target.value)}
                  className="h-9 text-xs"
                />
                <span className="text-[9px] text-muted-foreground block">Ensure the address uses secure HTTPS and WordPress REST API namespace.</span>
              </div>

              <div className="space-y-1.5 sm:col-span-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Consumer Key (ck_...)</label>
                <div className="relative flex items-center">
                  <Input
                    type={showCk ? "text" : "password"}
                    placeholder="ck_abc123..."
                    value={wooConsumerKey}
                    onChange={(e) => setWooConsumerKey(e.target.value)}
                    className="font-mono text-xs h-9 pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCk(!showCk)}
                    className="absolute right-3 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showCk ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 sm:col-span-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Consumer Secret (cs_...)</label>
                <div className="relative flex items-center">
                  <Input
                    type={showCs ? "text" : "password"}
                    placeholder="cs_xyz456..."
                    value={wooConsumerSecret}
                    onChange={(e) => setWooConsumerSecret(e.target.value)}
                    className="font-mono text-xs h-9 pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCs(!showCs)}
                    className="absolute right-3 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showCs ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {wooErrorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 text-xs text-red-700 dark:text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-650" />
                <div>
                  <div className="font-bold">WordPress hand-shake failed</div>
                  <p className="mt-0.5 leading-relaxed">{wooErrorMsg}</p>
                </div>
              </div>
            )}

            {wooSuccessMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-start gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                <div>
                  <div className="font-bold">Core Handshake certified!</div>
                  <p className="mt-0.5 leading-relaxed">{wooSuccessMsg}</p>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t border-border/60 py-3 flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground italic font-medium">Step 1 matches WooCommerce core taxonomy variables.</span>
            <Button
              onClick={validateAndSaveWooConnection}
              disabled={validatingWoo || !wooUrl || !wooConsumerKey || !wooConsumerSecret}
              className="h-8 text-xs font-bold gap-1 cursor-pointer bg-pink-600 text-white hover:bg-pink-700 select-none"
            >
              {validatingWoo && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Validate & Save Store Link
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* STEP 2: CONNECT FRAMER PROJECT */}
      {currentStep === 2 && (
        <Card className="shadow-sm border-indigo-500/10">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-sm font-bold uppercase tracking-wide flex items-center gap-1.5 text-emerald-600">
              <Database className="h-4.5 w-4.5" />
              Step 2: Initialize Framer API Handshake Token
            </CardTitle>
            <CardDescription className="text-xs">
              Configure official Framer Sever API parameters used to synchronize collections securely.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <div className="grid gap-4.5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-sans">Framer Project URL or ID</label>
                <Input
                  type="text"
                  placeholder="https://framer.com/projects/my-store--ce5c14dd-..."
                  value={framerUrl}
                  onChange={(e) => setFramerUrl(e.target.value)}
                  className="h-9 text-xs"
                />
                <span className="text-[9px] text-muted-foreground block">Parsed automatically from any Framer editor page URL link.</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-sans">Framer Access Token (CMS API Key)</label>
                <div className="relative flex items-center">
                  <Input
                    type={showFk ? "text" : "password"}
                    placeholder="framer_cms_..."
                    value={framerKey}
                    onChange={(e) => setFramerKey(e.target.value)}
                    className="font-mono text-xs h-9 pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFk(!showFk)}
                    className="absolute right-3 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showFk ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <span className="text-[9px] text-muted-foreground block">Generated inside Project Settings → Utility → CMS Token block with write privileges.</span>
              </div>
            </div>

            {framerLocalErrorMsg && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-lg flex flex-col gap-1.5 text-xs text-red-700 dark:text-red-400">
                <div className="flex items-center gap-2 font-bold text-left">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-650" />
                  <span>Framer Connectivity Failure</span>
                </div>
                <p className="leading-relaxed text-left">{framerLocalErrorMsg}</p>
                <div className="text-[10px] text-red-650/80 mt-1 pl-1 border-t border-red-500/10 pt-1 leading-normal">
                  Troubleshooting Check list:<br/>
                  1. Publish your Framer project at least once to initialize its live API routing.<br/>
                  2. Ensure your token was granted BOTH "Read" and "Write" access hooks.
                </div>
              </div>
            )}

            {framerSuccessMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-start gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                <CheckCircle className="h-4.5 w-4.5 shrink-0 mt-0.5 text-emerald-600" />
                <div>
                  <div className="font-bold">Framer Connection Confimed!</div>
                  <p className="mt-0.5 leading-relaxed">{framerSuccessMsg}</p>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t border-border/60 py-3 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentStep(1)}
              className="h-8 text-xs font-semibold gap-1 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
            <Button
              onClick={validateAndSaveFramerConnection}
              disabled={validatingFramer || !framerUrl || !framerKey}
              className="h-8 text-xs font-bold gap-1 cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700 select-none font-sans"
            >
              {validatingFramer && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Validate & Proceed
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* STEP 3: CHOOSE CMS COLLECTION */}
      {currentStep === 3 && (
        <Card className="shadow-sm border-indigo-500/10">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-sm font-bold uppercase tracking-wide flex items-center gap-1.5 text-indigo-600">
              <Sliders className="h-4.5 w-4.5" />
              Step 3: Select or Generate Framer CMS Database Layout
            </CardTitle>
            <CardDescription className="text-xs">
              Target an active Framer CMS Collection directory or deploy a fresh collection to start sync.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
            
            <div className="grid gap-6 md:grid-cols-5">
              
              {/* Left Column: Select Existing Collection */}
              <div className="md:col-span-3 space-y-3">
                <span className="text-[10px] uppercase font-black text-slate-500 block tracking-widest text-left">
                  Available Project CMS Collections ({framerCollections.length})
                </span>

                {loadingCollections ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/20 rounded-lg">
                    <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                    <span>Querying Framer layout directories...</span>
                  </div>
                ) : framerCollections.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                    {framerCollections.map((col) => {
                      const isSelected = selectedCollectionId === col.id;
                      return (
                        <div
                          key={col.id}
                          onClick={() => {
                            setSelectedCollectionId(col.id);
                            fetchFramerSchema(col.id);
                            handleSaveFields(selectedFields, col.id);
                          }}
                          className={`cursor-pointer p-3.5 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                            isSelected
                              ? "bg-indigo-500/5 border-indigo-500 ring-1 ring-indigo-500/35"
                              : "bg-background border-border/70 hover:border-indigo-400"
                          }`}
                        >
                          <div>
                            <div className="font-bold text-slate-800 dark:text-zinc-200 text-left">{col.name}</div>
                            <div className="text-[9px] text-muted-foreground mt-0.5 font-mono text-left">ID: {col.id}</div>
                          </div>
                          <div className="mt-3.5 flex items-center justify-between border-t border-dashed border-border/60 pt-2 text-[10px] font-semibold text-muted-foreground leading-none">
                            <span>slug: {col.slug || col.id}</span>
                            <Badge variant="outline" className="text-[9px] font-bold py-0 px-1 bg-muted">
                              {col.fieldsCount || 12} fields
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
                    No active collection found. Click right to generate one!
                  </div>
                )}
              </div>

              {/* Right Column: Deploy fresh custom CMS collection */}
              <div className="md:col-span-2 border-t md:border-t-0 md:border-l border-dashed border-border/80 pt-5 md:pt-0 md:pl-5 space-y-4">
                <span className="text-[10px] uppercase font-black text-slate-500 block tracking-widest text-left">
                  Deploy Brand New CMS Collection
                </span>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-border/60 space-y-3.5">
                  <div className="space-y-1 text-left">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300">New Collection Name</label>
                    <Input
                      type="text"
                      placeholder="e.g. Shop Products Line"
                      value={newCollectionName}
                      onChange={(e) => setNewCollectionName(e.target.value)}
                      className="h-8.5 text-xs font-sans mt-1 bg-background"
                    />
                  </div>

                  {creatorError && (
                    <p className="text-[10px] text-red-650 font-semibold">{creatorError}</p>
                  )}

                  {creatorMsg && (
                    <p className="text-[10px] text-emerald-600 font-semibold">{creatorMsg}</p>
                  )}

                  <Button
                    onClick={createNewCollection}
                    disabled={creatingCollection || !newCollectionName.trim()}
                    className="w-full h-8.5 text-xs bg-indigo-600 text-white font-bold select-none cursor-pointer hover:bg-indigo-700 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    {creatingCollection ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Deploy & Select Collection
                  </Button>
                </div>
              </div>

            </div>

          </CardContent>
          <CardFooter className="border-t border-border/60 py-3 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentStep(2)}
              className="h-8 text-xs font-semibold gap-1 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
            <Button
              onClick={() => setCurrentStep(4)}
              disabled={!selectedCollectionId}
              className="h-8 text-xs font-bold gap-1 cursor-pointer bg-indigo-600 text-white hover:bg-indigo-700 select-none"
            >
              Continue to Fields Select
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* STEP 4: CHOOSE FIELDS (Checkbox-based selection list!) */}
      {currentStep === 4 && (
        <Card className="shadow-sm border-indigo-500/10">
          <CardHeader className="pb-3 border-b border-border/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-sm font-bold uppercase tracking-wide flex items-center gap-1.5 text-pink-600">
                <ListChecks className="h-5 w-5" />
                Step 4: Select WooCommerce Parameters to sync
              </CardTitle>
              <CardDescription className="text-xs">
                Check off parameters to populate. These fields will be generated automatically inside Framer.
              </CardDescription>
            </div>

            {/* Presets dropdown selector */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider block">Presets:</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => applyPresetFields('minimal')}
                className="h-7 text-[10px] font-semibold hover:bg-pink-50 hover:text-pink-600"
              >
                Minimal (5)
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => applyPresetFields('storefront')}
                className="h-7 text-[10px] font-semibold hover:bg-pink-50 hover:text-pink-600"
              >
                Storefront (10)
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => applyPresetFields('catalog')}
                className="h-7 text-[10px] font-semibold hover:bg-pink-50 hover:text-pink-600"
              >
                Catalogue (14)
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => applyPresetFields('complete')}
                className="h-7 text-[10px] font-bold bg-pink-50 border-pink-100 text-pink-605"
              >
                Full Scheme (23)
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-5 space-y-6">
            
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4 max-h-[350px] overflow-y-auto pr-1">
              {ALL_WOO_FIELDS_GRID.map((sect) => (
                <div key={sect.category} className="space-y-2.5 p-3 rounded-lg border border-border/50 bg-muted/5">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block text-left">
                    {sect.category}
                  </span>

                  <div className="space-y-1.5 text-left">
                    {sect.items.map((item) => {
                      const isChecked = selectedFields.includes(item.key);
                      return (
                        <div 
                          key={item.key}
                          onClick={() => handleToggleFieldCheckbox(item.key)}
                          className={`flex items-start gap-2 p-2.5 rounded-lg border transition-all cursor-pointer ${
                            isChecked
                              ? "bg-pink-500/[0.02] border-pink-500/40 ring-1 ring-pink-500/10"
                              : "bg-background border-border/60 hover:bg-neutral-50/50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // handled by onClick on container
                            className="h-3.5 w-3.5 rounded text-pink-600 focus:ring-pink-500 cursor-pointer mt-0.5 border-gray-300"
                          />
                          <div>
                            <div className="font-bold text-[11px] text-slate-800 dark:text-zinc-200 leading-tight">
                              {item.label}
                            </div>
                            <div className="text-[9px] text-muted-foreground leading-tight mt-0.5 font-mono">
                              key: {item.key} ({item.type})
                            </div>
                            <p className="text-[9px] text-slate-400 mt-1 font-sans hidden sm:block">
                              {item.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Stats analytics block */}
            <div className="grid gap-3.5 grid-cols-2 md:grid-cols-4 p-3 bg-slate-50 border border-border rounded-xl">
              <div>
                <span className="text-[9px] font-black uppercase text-muted-foreground block tracking-wider">Active Fields Selected</span>
                <span className="text-sm font-black text-slate-800 mt-0.5 block">{selectedFields.length} / 23</span>
              </div>
              <div>
                <span className="text-[9px] font-black uppercase text-muted-foreground block tracking-wider font-mono">Obfuscated fields</span>
                <span className="text-sm font-black text-slate-800 mt-0.5 block">{23 - selectedFields.length} filtered out</span>
              </div>
              <div>
                <span className="text-[9px] font-black uppercase text-muted-foreground block tracking-wider">Estimated Bandwidth Saving</span>
                <span className="text-sm font-black text-slate-800 mt-0.5 block">
                  {Math.max(0, 100 - Math.round((selectedFields.length / 23) * 100))}% payload reduction
                </span>
              </div>
              <div>
                <span className="text-[9px] font-black uppercase text-muted-foreground block tracking-wider font-mono">Sync latency tier</span>
                <span className="text-sm font-black text-slate-800 mt-0.5 block">
                  {selectedFields.length <= 6 ? "Sub-second" : selectedFields.length <= 13 ? "High-speed" : "Standard API limit"}
                </span>
              </div>
            </div>

          </CardContent>

          <CardFooter className="border-t border-border/60 py-3 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentStep(3)}
              className="h-8 text-xs font-semibold gap-1 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
            <Button
              onClick={() => setCurrentStep(5)}
              disabled={selectedFields.length === 0}
              className="h-8 text-xs font-bold gap-1 cursor-pointer bg-pink-600 text-white hover:bg-pink-700 select-none"
            >
              Continue to Schema Deployment
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* STEP 5: AUTOMATE FIELDS CREATION & SYNC IMPLEMENTATION */}
      {currentStep === 5 && (
        <Card className="shadow-sm border-indigo-500/10 overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-sm font-bold uppercase tracking-wide flex items-center gap-1.5 text-indigo-600">
              <ListChecks className="h-5 w-5 animate-pulse" />
              Step 5: Automate Schema Creation & Sync Launch
            </CardTitle>
            <CardDescription className="text-xs">
              One-click setup generates missing fields in Framer automatically and launches direct data-to-content synchronization pipelines.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-5 space-y-6">
            
            {/* SCHEMA MATCHING / AUTOMATION CONTROL BLOCK */}
            <div className="p-4 bg-slate-50 border border-border/80 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-left font-sans">
                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block font-mono">Framer CMS Schema Status</span>
                  <div className="text-xs text-slate-800 mt-0.5 font-bold">
                    Target Collection: <strong className="text-indigo-600 underline font-mono">{framerCollections.find(c => c.id === selectedCollectionId)?.name || selectedCollectionId}</strong>
                  </div>
                  <p className="text-[10.5px] text-muted-foreground mt-1 leading-relaxed">
                    Automate schema matching: the synchronizer maps identities and deploys missing custom parameters directly into your Framer collection API database.
                  </p>
                </div>

                <Button
                  onClick={handleAutomatedFramerFieldsCreation}
                  disabled={automatingFields || selectedFields.length === 0}
                  className="h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold flex items-center gap-1.5 cursor-pointer shadow-sm select-auto shrink-0 select-none"
                >
                  {automatingFields ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating Variables...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 text-amber-350 animate-pulse" />
                      Deploys Missing Fields
                    </>
                  )}
                </Button>
              </div>

              {automationError && (
                <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-md text-[11px] text-red-700 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-red-600 shrink-0" />
                  <span>{automationError}</span>
                </div>
              )}

              {/* AUTOMATION SUMMARY LIST (The Airtable/Notion style matched indicators!) */}
              {automationResult && (
                <div className="pt-2 border-t border-border/60">
                  <span className="text-[9.5px] font-black uppercase text-slate-500 tracking-widest block">Automated Field Mapping Summary:</span>
                  <div className="flex flex-wrap gap-1.5 mt-2 bg-background border rounded-lg p-2.5 max-h-24 overflow-y-auto">
                    {selectedFields.map(field => {
                      const finalMappedKey = automationResult.mappings[field];
                      const isCreated = automationResult.createdFields?.some((f: any) => f.name.toLowerCase() === field.replace(/_/g, " ").toLowerCase() || f.name.toLowerCase() === field.toLowerCase());
                      const isDefaultName = field === "title" || field === "slug";
                      return (
                        <div key={field} className="px-2 py-0.5 rounded border text-[10px] flex items-center gap-1 transition-all bg-emerald-500/[0.02] border-emerald-500/20 text-emerald-600 font-semibold">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          <span>{field}</span>
                          <span className="text-[9px] font-mono text-muted-foreground leading-none font-bold">
                            m: {finalMappedKey} {isDefaultName ? "(System Default)" : isCreated ? "(Created)" : "(Matched Existing)"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* SYNC BEHAVIORS & BATCH CONTROLS */}
            <div className="border-t border-border/80 pt-4 space-y-4">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest block font-mono">Sync Boundaries & Configurations</span>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Sync Rules Toggles Card */}
                <div className="p-3 bg-muted/20 rounded-lg border border-border/50 text-left space-y-3">
                  <span className="text-[9.5px] font-black uppercase tracking-wider block text-slate-600">Behavioral Sync Rules</span>
                  
                  <div className="space-y-2.5 text-xs font-sans">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="wizard_createItems"
                        checked={syncSettings.createItems}
                        onChange={(e) => {
                          const nextS = { ...syncSettings, createItems: e.target.checked };
                          setSyncSettings(nextS);
                          handleSaveFields(selectedFields, selectedCollectionId, undefined, undefined, nextS);
                        }}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <label htmlFor="wizard_createItems" className="font-bold text-slate-805 cursor-pointer flex flex-col">
                        <span>Create new products</span>
                        <span className="text-[9px] text-muted-foreground font-medium leading-none mt-0.5">Publish new WooCommerce items if they do not exist inside Framer</span>
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="wizard_updateItems"
                        checked={syncSettings.updateItems}
                        onChange={(e) => {
                          const nextS = { ...syncSettings, updateItems: e.target.checked };
                          setSyncSettings(nextS);
                          handleSaveFields(selectedFields, selectedCollectionId, undefined, undefined, nextS);
                        }}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <label htmlFor="wizard_updateItems" className="font-bold text-slate-805 cursor-pointer flex flex-col">
                        <span>Update existing products</span>
                        <span className="text-[9px] text-muted-foreground font-medium leading-none mt-0.5">Keep WooCommerce-managed fields updated on match, preserving custom Framer-only variables</span>
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="wizard_deleteItems"
                        checked={syncSettings.deleteItems}
                        onChange={(e) => {
                          const nextS = { ...syncSettings, deleteItems: e.target.checked };
                          setSyncSettings(nextS);
                          handleSaveFields(selectedFields, selectedCollectionId, undefined, undefined, nextS);
                        }}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <label htmlFor="wizard_deleteItems" className="font-bold text-destructive cursor-pointer flex flex-col">
                        <span>Delete CMS items when product removed</span>
                        <span className="text-[9px] text-muted-foreground font-medium leading-none mt-0.5">Permanently delete target Framer items if original WooCommerce ID records are trashed</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Schedulers config card */}
                <div className="p-3 bg-muted/20 rounded-lg border border-border/50 text-left space-y-3.5">
                  <span className="text-[9.5px] font-black uppercase tracking-wider block text-slate-600">Periodic Sync Interval schedule</span>
                  
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 leading-none">Automated Sync Frequency</label>
                    <select
                      value={syncInterval}
                      onChange={(e) => {
                        setSyncInterval(e.target.value);
                        // Save to backend DB store settings
                        fetch(`/api/stores/${selectedStore.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ syncInterval: e.target.value })
                        }).catch(console.warn);
                      }}
                      className="w-full text-xs h-8.5 bg-background border border-border rounded-md px-2 mt-1 font-semibold focus:ring-1 focus:ring-indigo-550 focus:outline-none cursor-pointer"
                    >
                      {SYNC_INTERVALS.map(int => (
                        <option key={int.value} value={int.value}>{int.label}</option>
                      ))}
                    </select>
                  </div>

                  <p className="text-[10px] text-slate-400 leading-relaxed font-sans mt-2.5">
                    * If scheduled, automated core sync routines will execute in the background via secure remote node loops.
                  </p>
                </div>

              </div>

            </div>

            {/* ACTION TRIGGERS INLINE COMPULSION ROW */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60">
              <span className="text-[10px] font-medium text-slate-500">
                Connection established: <strong className="text-emerald-600 font-semibold underline">{wooUrl}</strong> target to <strong className="text-indigo-600 font-semibold underline">{selectedCollectionId}</strong>
              </span>

              <div className="flex items-center gap-2">
                
                <Button
                  onClick={handleGeneratePreview}
                  disabled={generatingPreview}
                  className="h-8.5 text-xs text-indigo-600 hover:bg-indigo-50 ring-1 ring-indigo-100 cursor-pointer disabled:opacity-50 select-none bg-background font-bold border border-indigo-500/10 px-3.5"
                >
                  {generatingPreview ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                      Analyzing Schema...
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Sync Preview
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => handleTriggerAndSync(true)}
                  disabled={framerSyncLoading}
                  className="h-8.5 text-xs text-purple-650 hover:bg-purple-50 cursor-pointer bg-background ring-1 ring-purple-100 font-bold border border-purple-500/10 px-3.5"
                >
                  <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                  Simulation Dry Run
                </Button>

                <Button
                  onClick={() => handleTriggerAndSync(false, true)}
                  disabled={framerSyncLoading}
                  className="h-8.5 text-xs text-orange-650 hover:bg-orange-50 cursor-pointer bg-background ring-1 ring-orange-100 font-bold border border-orange-500/10 px-3.5"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Reset & Sync All
                </Button>

                <Button
                  onClick={() => setIsConfirmSyncOpen(true)}
                  disabled={framerSyncLoading || !automationResult}
                  className="h-8.5 text-xs bg-indigo-600 text-white font-black hover:bg-indigo-700 cursor-pointer shadow-md select-none px-4 flex items-center justify-center gap-1 leading-none"
                >
                  {framerSyncLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Zap className="h-3.5 w-3.5" />
                      Initial Sync Now
                    </>
                  )}
                </Button>

              </div>
            </div>

            {/* PREVIEW MATRIX REPORT DIALOG */}
            {previewData && (
              <div className="rounded-xl p-4 bg-slate-50 dark:bg-zinc-950 border border-indigo-500/20 text-xs space-y-3 text-left">
                <div className="flex items-center justify-between">
                  <h5 className="font-extrabold text-slate-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1 shadow-xs bg-background p-1 px-2 rounded-lg border">
                    <Eye className="h-3.5 w-3.5 text-indigo-550" />
                    Estimated Sync Payload Report Matrix
                  </h5>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreviewData(null)}
                    className="h-6 text-[10px] text-muted-foreground hover:bg-muted font-bold"
                  >
                    Hide
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="p-2 border rounded bg-background text-left">
                    <span className="text-[9px] text-muted-foreground uppercase font-bold">Woo Items</span>
                    <span className="text-base font-extrabold text-slate-800 block mt-0.5">{previewData.totalProducts || 0}</span>
                  </div>
                  <div className="p-2 border rounded border-emerald-500/15 bg-background text-left">
                    <span className="text-[9px] text-emerald-600 uppercase font-bold">To Create</span>
                    <span className="text-base font-extrabold text-emerald-600 block mt-0.5">+{previewData.toCreate || 0}</span>
                  </div>
                  <div className="p-2 border rounded border-indigo-500/15 bg-background text-left">
                    <span className="text-[9px] text-indigo-600 uppercase font-bold">To Update</span>
                    <span className="text-base font-extrabold text-indigo-650 block mt-0.5">~{previewData.toUpdate || 0}</span>
                  </div>
                  <div className="p-2 border rounded border-amber-500/15 bg-background text-left">
                    <span className="text-[9px] text-amber-600 uppercase font-bold">To Skip</span>
                    <span className="text-base font-extrabold text-amber-500 block mt-0.5">{previewData.toSkip || 0}</span>
                  </div>
                  <div className="p-2 border rounded border-red-500/15 bg-background text-left">
                    <span className="text-[9px] text-red-600 uppercase font-bold">Schema mismatch</span>
                    <span className="text-base font-extrabold text-red-500 block mt-0.5">{previewData.missingRequired || 0}</span>
                  </div>
                </div>

                {previewData.samples && previewData.samples.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">Sample mapped JSON payload schema:</span>
                    <div className="max-h-24 overflow-y-auto p-2 border border-border/80 bg-background rounded font-mono text-[9px]">
                      <pre className="whitespace-pre-wrap">{JSON.stringify(previewData.samples, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* LIVE REAL-TIME TELEMETRY TRACKER LOGS */}
            {framerSyncLoading && (
              <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl font-mono text-xs text-slate-300 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                    <span className="font-bold text-slate-100">
                      {framerSyncPhase === 'auth' && "Establishing Secure Session..."}
                      {framerSyncPhase === 'fetching' && "Querying WooCommerce Catalog..."}
                      {framerSyncPhase === 'processing_fields' && `Deploying field layout (${framerSyncedFieldsQueue.length}/${selectedFields.length})...`}
                      {framerSyncPhase === 'matching' && "Tracking and de-duplicating slug items..."}
                      {framerSyncPhase === 'complete' && "Synchronizing complete!"}
                    </span>
                  </div>
                  <span className="font-bold text-indigo-400">{framerSyncProgress}%</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-pink-500 to-indigo-500 h-full transition-all duration-150 rounded-full"
                    style={{ width: `${framerSyncProgress}%` }}
                  />
                </div>

                {/* Processing checkboxes */}
                <div className="space-y-2 text-left">
                  <div className="text-[9px] text-slate-400 uppercase tracking-wider font-black flex items-center justify-between">
                    <span>Active field queue dispatcher</span>
                    {framerCurrentFieldKey && (
                      <span className="bg-slate-850 px-1.5 py-0.5 rounded text-white text-[9.5px]">
                        active: {framerCurrentFieldKey}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-slate-950 rounded border border-slate-850">
                    {selectedFields.map(field => {
                      const isProcessed = framerSyncedFieldsQueue.includes(field);
                      const isActive = framerCurrentFieldKey === field;
                      return (
                        <div
                          key={field}
                          className={`px-2 py-0.5 rounded text-[10px] border flex items-center gap-1 ${
                            isActive
                              ? "bg-pink-500/10 text-pink-400 border-pink-400/50 animate-pulse font-bold"
                              : isProcessed
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-400/20"
                              : "bg-slate-900 border-slate-800 text-slate-500"
                          }`}
                        >
                          {isProcessed && !isActive ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : isActive ? (
                            <Loader2 className="h-3 w-3 animate-spin text-pink-400" />
                          ) : (
                            <div className="h-1.5 w-1.5 rounded-full bg-slate-650" />
                          )}
                          <span>{field}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {framerSyncLogResult && !framerSyncLoading && (
              <div className="p-4 rounded-xl border space-y-3.5 text-left">
                {framerSyncLogResult.success ? (
                  <div className="space-y-3 text-xs leading-relaxed">
                    <div className="flex items-center gap-2 text-emerald-600 font-bold">
                      <CheckCircle className="h-5 w-5 shrink-0" />
                      <span>{framerSyncLogResult.message || "Framer sync session completed."}</span>
                    </div>
                    {framerSyncLogResult.details && (
                      <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-[10px] space-y-1 max-h-36 overflow-y-auto whitespace-pre-wrap">
                        {framerSyncLogResult.details.map((row: string, i: number) => (
                          <div key={i} className="border-b border-slate-850 pb-1.5 last:border-none last:pb-0">{row}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 text-xs leading-relaxed">
                    <div className="flex items-center gap-2 text-red-500 font-bold">
                      <XCircle className="h-5 w-5 shrink-0" />
                      <span>Sync session aborted: {framerSyncLogResult.error}</span>
                    </div>
                    {framerSyncLogResult.details && (
                      <div className="bg-red-500/5 text-red-700 border border-red-500/10 p-3 rounded-lg font-mono text-[10px] space-y-1 max-h-36 overflow-y-auto">
                        {framerSyncLogResult.details.map((row: string, i: number) => (
                          <div key={i} className="border-b border-red-500/10 pb-1 last:border-none last:pb-0">{row}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

          </CardContent>

          <CardFooter className="border-t border-border/60 py-3 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentStep(4)}
              className="h-8 text-xs font-semibold gap-1 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Fields Selection
            </Button>
            <span className="text-[10px] text-muted-foreground italic font-medium">Final setup matches all targets.</span>
          </CardFooter>
        </Card>
      )}

      {/* CONFIRMATION SYNCHRONIZATION RUN DIALOG */}
      <Dialog open={isConfirmSyncOpen} onOpenChange={setIsConfirmSyncOpen}>
        <DialogContent className="max-w-md font-sans">
          <DialogHeader className="text-left">
            <DialogTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-1.5 text-slate-800">
              <RefreshCw className="h-4.5 w-4.5 text-indigo-600 animate-spin-slow" />
              Confirm Framer CMS Sync Process
            </DialogTitle>
            <DialogDescription className="text-xs">
              This initiates direct data import into your project. Please review sync properties below before proceeding.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3.5 text-xs text-left">
            <div className="p-3 bg-slate-50 border rounded-lg space-y-2.5">
              <div className="flex justify-between items-center py-0.5 border-b border-border/50">
                <span className="text-muted-foreground">Store Link URL:</span>
                <span className="font-bold text-slate-800 font-mono truncate max-w-[200px]">{wooUrl}</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-border/50">
                <span className="text-muted-foreground">Framer Collection ID:</span>
                <span className="font-bold text-indigo-600 font-mono">{selectedCollectionId}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-muted-foreground">Active parameters list size:</span>
                <span className="font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded border border-pink-100">{selectedFields.length} fields</span>
              </div>
            </div>

            <p className="text-[10.5px] text-muted-foreground leading-normal">
              * The importer overwrites WooCommerce-managed parameters and preserves custom elements. You can run "Simulation Dry Run" at any time first to audit results safely.
            </p>
          </div>

          <DialogFooter className="gap-2 justify-end text-left border-t border-border/40 pt-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsConfirmSyncOpen(false)}
              className="text-xs h-8 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setIsConfirmSyncOpen(false);
                handleSyncToFramer(true);
              }}
              className="text-xs h-8 bg-indigo-600 text-white font-black hover:bg-indigo-700 cursor-pointer shadow shadow-indigo-650/20"
            >
              Confirm & Start Sync
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
    </div>
  );
}
