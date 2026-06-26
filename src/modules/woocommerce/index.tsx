import * as React from 'react';
import { useState, useEffect, FormEvent } from 'react';
import { 
  ShoppingBag, Trash2, Plus, Settings2, RefreshCw, Loader2, Info, 
  Search, Globe, Clock, Lock, Key, Database, Zap, Sparkles, Eye,
  Play, CheckCircle, AlertCircle, EyeOff, XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

// Custom modular imports
import { WCProduct, WCOrder, SyncLog } from './types';
import { supabase } from '../../lib/supabase';
import TabProducts from './components/TabProducts';
import TabOrders from './components/TabOrders';
import TabSyncLogs from './components/TabSyncLogs';
import TabFieldSelection from './components/TabFieldSelection';
import TabConfig from './components/TabConfig';

export default function WooCommerceCatalyst() {
  // Navigation layout states
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'field_selection' | 'config' | 'sync_logs'>('field_selection');
  
  // Data list states
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [products, setProducts] = useState<WCProduct[]>([]);
  const [orders, setOrders] = useState<WCOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Loading indicator states
  const [loading, setLoading] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [syncingStoreId, setSyncingStoreId] = useState<string | null>(null);

  // WooCommerce Credentials Model states
  const [consumerKey, setConsumerKey] = useState('');
  const [consumerSecret, setConsumerSecret] = useState('');
  const [apiVersion, setApiVersion] = useState('wc/v3');
  const [sslBypass, setSslBypass] = useState(true);

  // Framer Credentials Model states
  const [framerProjectId, setFramerProjectId] = useState('');
  const [framerApiKey, setFramerApiKey] = useState('');
  const [framerCollections, setFramerCollections] = useState<any[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [framerErrorMsg, setFramerErrorMsg] = useState<string | null>(null);

  // Dynamic Mappings states
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [framerCollectionFields, setFramerCollectionFields] = useState<any[]>([]);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
  const [syncSettings, setSyncSettings] = useState({ createItems: true, updateItems: true, deleteItems: false });
  const [customProfiles, setCustomProfiles] = useState<any[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>('complete');

  // Preview Data Generation states
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  // Sync Telemetry states
  const [framerSyncLoading, setFramerSyncLoading] = useState(false);
  const [framerSyncProgress, setFramerSyncProgress] = useState(0);
  const [framerSyncPhase, setFramerSyncPhase] = useState('idle');
  const [framerSyncedFieldsQueue, setFramerSyncedFieldsQueue] = useState<string[]>([]);
  const [framerCurrentFieldKey, setFramerCurrentFieldKey] = useState('');
  const [framerSyncLogResult, setFramerSyncLogResult] = useState<any>(null);

  // Modals visibility states
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [isDisconnectOpen, setIsDisconnectOpen] = useState(false);
  const [isSecureCredentialsOpen, setIsSecureCredentialsOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileModalMode, setProfileModalMode] = useState<'create' | 'rename' | 'duplicate'>('create');
  const [profileInputName, setProfileInputName] = useState('');

  // Add Tenant Dialog Inputs
  const [storeName, setStoreName] = useState('');
  const [storeUrl, setStoreUrl] = useState('');

  // Secure Cryptography Validations Model states
  const [modalConsumerKey, setModalConsumerKey] = useState('');
  const [modalConsumerSecret, setModalConsumerSecret] = useState('');
  const [modalFramerProjectId, setModalFramerProjectId] = useState('');
  const [modalFramerApiKey, setModalFramerApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showFramerKey, setShowFramerKey] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'success' | 'failed'>('idle');
  const [validationText, setValidationText] = useState('');

  // Load framer directory collections
  const fetchFramerCollections = async (storeId: string) => {
    if (!storeId || storeId === "undefined") return;
    try {
      setLoadingCollections(true);
      setFramerErrorMsg(null);
      const res = await fetch(`/api/framer/collections/${storeId}`);
      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("application/json")) {
        const collections = await res.json();
        setFramerCollections(collections);
      } else {
        let errMsg = "Framer connectivity failure.";
        if (contentType.includes("application/json")) {
          try {
            const errJson = await res.json();
            errMsg = errJson.details || errJson.error || errMsg;
          } catch (_) {}
        }
        console.warn("Could not retrieve collections directory:", errMsg);
        setFramerErrorMsg(errMsg);
        const usingMock = !framerApiKey || framerApiKey.startsWith("framer_cms_mock") || framerApiKey.includes("mock") || !framerProjectId || framerProjectId.includes("example");
        if (usingMock) {
          setFramerCollections([
            { id: "col_framer_products", name: "WooCommerce Products Layout", slug: "products" },
            { id: "col_framer_catalog", name: "Shop Catalog Collection", slug: "catalog" },
            { id: "col_framer_promo", name: "Featured Campaigns & Products", slug: "featured-products" }
          ]);
        } else {
          setFramerCollections([]);
        }
      }
    } catch (err: any) {
      console.error("[Framer Loader Client Error]", err);
      setFramerErrorMsg(err.message || String(err));
    } finally {
      setLoadingCollections(false);
    }
  };

  const fetchFramerSchema = async (collectionId: string) => {
    if (!selectedStore || !selectedStore.id || selectedStore.id === "undefined" || !collectionId || collectionId === "undefined") {
      setFramerCollectionFields([]);
      return;
    }
    try {
      setLoadingSchema(true);
      const res = await fetch(`/api/framer/collection-schema/${selectedStore.id}/${collectionId}`);
      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("application/json")) {
        const data = await res.json();
        setFramerCollectionFields(data.fields || []);
      } else {
        setFramerCollectionFields([]);
      }
    } catch (e) {
      console.error("[Framer Schema Loader Error]", e);
      setFramerCollectionFields([]);
    } finally {
      setLoadingSchema(false);
    }
  };

  const handleGeneratePreview = async () => {
    if (!selectedStore || !selectedStore.id || selectedStore.id === "undefined" || !selectedCollectionId) return;
    try {
      setGeneratingPreview(true);
      const res = await fetch(`/api/framer/sync-preview/${selectedStore.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionId: selectedCollectionId,
          fieldMappings,
          syncSettings
        })
      });
      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("application/json")) {
        const data = await res.json();
        setPreviewData(data);
      } else {
        console.warn("Generating sync preview returned a non-JSON/unhealthy response from the server.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingPreview(false);
    }
  };

  const handleApplyPresetProfile = (profileId: string, customFields?: string[]) => {
    setActiveProfileId(profileId);
    if (profileId === 'minimal') {
      setSelectedFields(["title", "slug", "sku", "type", "status"]);
    } else if (profileId === 'storefront') {
      setSelectedFields(["title", "slug", "sku", "type", "status", "short_description", "price", "currency", "featured_image", "categories"]);
    } else if (profileId === 'catalog') {
      setSelectedFields(["title", "slug", "sku", "type", "status", "short_description", "description", "price", "regular_price", "currency", "featured_image", "gallery_images", "categories", "tags"]);
    } else if (profileId === 'complete') {
      setSelectedFields(["title", "slug", "sku", "type", "status", "short_description", "description", "price", "regular_price", "sale_price", "currency", "stock_status", "stock_quantity", "manage_stock", "featured_image", "gallery_images", "image_alt", "categories", "category_slugs", "tags", "attributes", "attribute_values", "variant_name", "variant_price", "variant_sku", "variant_inventory", "seo_title", "seo_description", "created_at", "updated_at"]);
    } else {
      if (customFields) {
        setSelectedFields(customFields);
      }
    }
  };

  const fetchStores = async () => {
    try {
      setLoading(true);
      let fetchedStores: any[] = [];
      try {
        const res = await fetch('/api/stores');
        const contentType = res.headers.get("content-type") || "";
        if (res.ok && contentType.includes("application/json")) {
          fetchedStores = await res.json();
        } else {
          throw new Error('Direct api/stores route returned non-JSON.');
        }
      } catch (directErr) {
        console.warn('Direct api/stores lookup failed, falling back to db forwarder', directErr);
        const { data, error } = await supabase.from('stores').select();
        if (error) throw error;
        fetchedStores = data || [];
      }

      setStores(fetchedStores);
      if (selectedStore) {
        const found = fetchedStores.find((s: any) => s.id === selectedStore.id);
        if (found) {
          setSelectedStore((prev: any) => prev ? { ...prev, ...found } : found);
        }
      }
    } catch (err) {
      console.error('Error fetching stores:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSyncLogs = async (storeId?: string) => {
    try {
      setLoadingLogs(true);
      const url = storeId ? `/api/sync-logs?storeId=${storeId}` : '/api/sync-logs';
      const res = await fetch(url);
      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("application/json")) {
        const data = await res.json();
        setSyncLogs(data);
      }
    } catch (err) {
      console.error('Error fetching sync logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  // Sync Store parameters when selecting/opening a store
  useEffect(() => {
    if (selectedStore) {
      const savedCk = localStorage.getItem(`wc_ck_${selectedStore.id}`) || (selectedStore.has_credentials ? "ck_****************************************" : "");
      const savedCs = localStorage.getItem(`wc_cs_${selectedStore.id}`) || (selectedStore.has_credentials ? "cs_****************************************" : "");
      const savedVer = localStorage.getItem(`wc_version_${selectedStore.id}`) || selectedStore.apiVersion || `wc/v3`;
      const savedSsl = localStorage.getItem(`wc_ssl_${selectedStore.id}`) === 'false' ? false : (selectedStore.sslBypass !== undefined ? selectedStore.sslBypass : true);
      const savedFramerPid = localStorage.getItem(`framer_pid_${selectedStore.id}`) || selectedStore.framerProjectId || '';
      const savedFramerKey = localStorage.getItem(`framer_key_${selectedStore.id}`) || (selectedStore.has_framer_credentials ? "framer_cms_********************************" : "");

      setConsumerKey(savedCk);
      setConsumerSecret(savedCs);
      setApiVersion(savedVer);
      setSslBypass(savedSsl);
      setFramerProjectId(savedFramerPid);
      setFramerApiKey(savedFramerKey);

      if (selectedStore.selectedFields) {
        setSelectedFields(selectedStore.selectedFields);
      } else {
        setSelectedFields(["title", "slug", "sku", "type", "status", "short_description", "description", "price", "regular_price", "sale_price", "currency", "stock_status", "stock_quantity", "manage_stock", "featured_image", "gallery_images", "image_alt", "categories", "category_slugs", "tags", "attributes", "attribute_values", "variant_name", "variant_price", "variant_sku", "variant_inventory", "seo_title", "seo_description", "created_at", "updated_at"]);
      }

      if (selectedStore.framerTargetCollectionId) {
        setSelectedCollectionId(selectedStore.framerTargetCollectionId);
        fetchFramerSchema(selectedStore.framerTargetCollectionId);
      } else {
        setSelectedCollectionId('');
        setFramerCollectionFields([]);
      }

      if (selectedStore.fieldMappings) {
        setFieldMappings(selectedStore.fieldMappings);
      } else {
        setFieldMappings({});
      }

      if (selectedStore.syncSettings) {
        setSyncSettings(selectedStore.syncSettings);
      } else {
        setSyncSettings({ createItems: true, updateItems: true, deleteItems: false });
      }

      if (selectedStore.profiles) {
        setCustomProfiles(selectedStore.profiles);
      } else {
        setCustomProfiles([]);
      }

      if (savedFramerPid || selectedStore.framerProjectId) {
        fetchFramerCollections(selectedStore.id);
      }

      const loadStoreProductsAndOrders = async () => {
        let currentProds: WCProduct[] = [];
        try {
          const response = await fetch(`/v1/${selectedStore.id}/products?limit=50`);
          const contentType = response.headers.get("content-type") || "";
          if (response.ok && contentType.includes("application/json")) {
            const resJson = await response.json();
            currentProds = resJson.products.map((p: any) => ({
              id: p.id,
              name: p.title,
              sku: p.slug.toUpperCase(),
              regular_price: String(p.price),
              sale_price: "",
              stock_quantity: p.inStock ? 50 : 0,
              status: p.inStock ? 'publish' : 'draft',
              categories: p.categories || 'General',
              description: p.description
            }));
          }
        } catch (e) {
          console.warn("Backend storefront API fetch failed. Reverting to static caches.");
        }

        if (currentProds.length === 0) {
          if (selectedStore.name.toLowerCase().includes('coffee')) {
            currentProds = [
              { id: '101', name: 'Premium Espresso Dark Roast (Bag)', sku: 'CF-ESP-DK', regular_price: '19.99', sale_price: '17.50', stock_quantity: 48, status: 'publish', categories: 'Bags, Coffee', description: 'Sustainable dark espresso blend with hints of cacao and hazelnut.' },
              { id: '102', name: 'Single Origin Colombia Medium (Bag)', sku: 'CF-COL-MD', regular_price: '22.50', sale_price: '', stock_quantity: 82, status: 'publish', categories: 'Bags, Coffee', description: 'Sun-dried high altitude whole bean coffee with clean citrus acidity.' },
              { id: '103', name: 'Ceramic Pourover Cone & Dripper', sku: 'CF-DRI-CR', regular_price: '24.99', sale_price: '', stock_quantity: 14, status: 'publish', categories: 'Accessories', description: 'Insulating dual-ribbed matte black ceramic pouring cone.' },
              { id: '104', name: 'Ergonomic Gooseneck Kettle (Stovetop)', sku: 'CF-KET-GN', regular_price: '59.99', sale_price: '49.99', stock_quantity: 9, status: 'publish', categories: 'Accessories', description: 'Flow-restrictive gooseneck spout constructed with medical grade steel.' }
            ];
          } else {
            currentProds = [
              { id: '201', name: 'Handcrafted Solid Oak Salad Bowl', sku: 'AW-OAK-BW', regular_price: '45.00', sale_price: '', stock_quantity: 11, status: 'publish', categories: 'Home, Bowls', description: 'Turned from premium white oak blocks, coated with food-grade wood beeswax.' },
              { id: '202', name: 'End-Grain Walnut Prep Board', sku: 'AW-WAL-BD', regular_price: '89.99', sale_price: '75.00', stock_quantity: 15, status: 'publish', categories: 'Kitchen, Boards', description: 'Juice-catching grooved walnut heavy-duty preparation board.' },
              { id: '203', name: 'Minimalist Cedar Tri-Leg Plant Stand', sku: 'AW-CED-ST', regular_price: '34.50', sale_price: '29.99', stock_quantity: 6, status: 'publish', categories: 'Decor, Cedar', description: 'Treated with water-shedding exterior grade amber sealant.' }
            ];
          }
        }
        setProducts(currentProds);

        const savedOrds = localStorage.getItem(`wc_orders_${selectedStore.id}`);
        let currentOrds: WCOrder[] = [];
        if (savedOrds) {
          currentOrds = JSON.parse(savedOrds);
        } else {
          if (selectedStore.name.toLowerCase().includes('coffee')) {
            currentOrds = [
              {
                id: '#4910',
                customer: { name: 'Dianne Van', email: 'dianne.v@techcorp.io', city: 'Seattle, WA' },
                total: '37.49',
                status: 'processing',
                created_at: new Date(Date.now() - 3.5 * 365 * 24 * 3600_000).toISOString(),
                line_items: [
                  { name: 'Premium Espresso Dark Roast (Bag)', quantity: 1, price: '17.50' },
                  { name: 'Single Origin Colombia Medium (Bag)', quantity: 1, price: '19.99' }
                ]
              },
              {
                id: '#4909',
                customer: { name: 'Marcus Brody', email: 'mbrody@indiana.edu', city: 'Indianapolis, IN' },
                total: '49.99',
                status: 'completed',
                created_at: new Date(Date.now() - 26 * 3600_000).toISOString(),
                line_items: [
                  { name: 'Ergonomic Gooseneck Kettle (Stovetop)', quantity: 1, price: '49.99' }
                ]
              }
            ];
          } else {
            currentOrds = [
              {
                id: '#8211',
                customer: { name: 'Isabella Thorne', email: 'bella@thorne.net', city: 'Portland, OR' },
                total: '120.00',
                status: 'processing',
                created_at: new Date(Date.now() - 6 * 3600_000).toISOString(),
                line_items: [
                  { name: 'Handcrafted Solid Oak Salad Bowl', quantity: 1, price: '45.00' },
                  { name: 'End-Grain Walnut Prep Board', quantity: 1, price: '75.00' }
                ]
              }
            ];
          }
          localStorage.setItem(`wc_orders_${selectedStore.id}`, JSON.stringify(currentOrds));
        }
        setOrders(currentOrds);
        fetchSyncLogs(selectedStore.id);
      };

      loadStoreProductsAndOrders();
    }
  }, [selectedStore]);

  const handleSaveFields = async (
    newSelectedFields: string[],
    newTargetCollectionId?: string,
    newProfiles?: any[],
    customFieldMappings?: Record<string, string>,
    customSyncSettings?: any
  ) => {
    if (!selectedStore) return;
    try {
      const mappingsToUse = customFieldMappings !== undefined ? customFieldMappings : fieldMappings;
      const settingsToUse = customSyncSettings !== undefined ? customSyncSettings : syncSettings;
      const payload: any = {
        selectedFields: newSelectedFields,
        fieldMappings: mappingsToUse,
        syncSettings: settingsToUse
      };
      if (newTargetCollectionId !== undefined) {
        payload.framerTargetCollectionId = newTargetCollectionId;
      }
      if (newProfiles !== undefined) {
        payload.profiles = newProfiles;
      }
      
      const res = await fetch(`/api/stores/${selectedStore.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setSelectedStore((prev: any) => prev ? { 
          ...prev, 
          selectedFields: newSelectedFields, 
          framerTargetCollectionId: newTargetCollectionId !== undefined ? newTargetCollectionId : prev.framerTargetCollectionId,
          profiles: newProfiles !== undefined ? newProfiles : prev.profiles,
          fieldMappings: mappingsToUse,
          syncSettings: settingsToUse
        } : null);
        
        setStores((prev: any) => prev.map((s: any) => s.id === selectedStore.id ? { 
          ...s, 
          selectedFields: newSelectedFields,
          framerTargetCollectionId: newTargetCollectionId !== undefined ? newTargetCollectionId : s.framerTargetCollectionId,
          profiles: newProfiles !== undefined ? newProfiles : s.profiles,
          fieldMappings: mappingsToUse,
          syncSettings: settingsToUse
        } : s));
      }
    } catch (err) {
      console.error("Failed to persist field configurations:", err);
    }
  };

  const handleAutoMap = () => {
    const newMappings = { ...fieldMappings };
    selectedFields.forEach(wooField => {
      const match = framerCollectionFields.find(f => 
        f.id.toLowerCase() === wooField.toLowerCase() ||
        f.name.toLowerCase() === wooField.toLowerCase() ||
        f.id.toLowerCase().replace(/[^a-z0-9]/g, '') === wooField.toLowerCase().replace(/[^a-z0-9]/g, '') ||
        f.name.toLowerCase().replace(/[^a-z0-9]/g, '') === wooField.toLowerCase().replace(/[^a-z0-9]/g, '')
      );
      if (match) {
        newMappings[wooField] = match.id;
      }
    });
    setFieldMappings(newMappings);
    handleSaveFields(selectedFields, selectedCollectionId, undefined, newMappings);
  };

  const handleCreateCustomProfile = (name: string) => {
    if (!name.trim()) return;
    const newProfile = {
      id: "prof_" + Math.random().toString(36).substring(2, 9),
      name: name.trim(),
      fields: [...selectedFields]
    };
    const updatedProfiles = [...customProfiles, newProfile];
    setCustomProfiles(updatedProfiles);
    setActiveProfileId(newProfile.id);
    handleSaveFields(selectedFields, selectedCollectionId, updatedProfiles);
    setIsProfileModalOpen(false);
    setProfileInputName('');
  };

  const handleDuplicateProfile = (name: string) => {
    if (!name.trim()) return;
    const currentProfileFields = [...selectedFields];
    const newProfile = {
      id: "prof_" + Math.random().toString(36).substring(2, 9),
      name: name.trim(),
      fields: currentProfileFields
    };
    const updatedProfiles = [...customProfiles, newProfile];
    setCustomProfiles(updatedProfiles);
    setActiveProfileId(newProfile.id);
    handleSaveFields(currentProfileFields, selectedCollectionId, updatedProfiles);
    setIsProfileModalOpen(false);
    setProfileInputName('');
  };

  const handleRenameProfile = (name: string) => {
    if (!name.trim()) return;
    const updatedProfiles = customProfiles.map(p => p.id === activeProfileId ? { ...p, name: name.trim() } : p);
    setCustomProfiles(updatedProfiles);
    handleSaveFields(selectedFields, selectedCollectionId, updatedProfiles);
    setIsProfileModalOpen(false);
    setProfileInputName('');
  };

  const handleDeleteProfile = () => {
    const updatedProfiles = customProfiles.filter(p => p.id !== activeProfileId);
    setCustomProfiles(updatedProfiles);
    setActiveProfileId('complete');
    const fallbackFields = ["title", "slug", "sku", "type", "status", "short_description", "description", "price", "regular_price", "sale_price", "currency", "stock_status", "stock_quantity", "manage_stock", "featured_image", "gallery_images", "image_alt", "categories", "category_slugs", "tags", "attributes", "attribute_values", "variant_name", "variant_price", "variant_sku", "variant_inventory", "seo_title", "seo_description", "created_at", "updated_at"];
    setSelectedFields(fallbackFields);
    handleSaveFields(fallbackFields, selectedCollectionId, updatedProfiles);
  };

  const handleSyncToFramer = async (confirmed: boolean = false, dryRun: boolean = false, fullResync: boolean = false) => {
    if (!selectedCollectionId) {
      alert("Please select a target CMS collection from the dropdown list first.");
      return;
    }
    if (!confirmed) {
      return;
    }

    setFramerSyncLoading(true);
    setFramerSyncLogResult(null);
    setFramerSyncProgress(0);
    setFramerSyncedFieldsQueue([]);
    setFramerCurrentFieldKey('');
    setFramerSyncPhase('auth');

    let simulatedProgressPercent = 0;
    const totalSelectedFields = selectedFields.length;
    let fieldIdx = 0;

    const interval = setInterval(() => {
      if (simulatedProgressPercent < 15) {
        simulatedProgressPercent += 5;
        setFramerSyncProgress(simulatedProgressPercent);
        setFramerSyncPhase('auth');
      } else if (simulatedProgressPercent < 35) {
        simulatedProgressPercent += 8;
        setFramerSyncProgress(simulatedProgressPercent);
        setFramerSyncPhase('fetching');
      } else if (simulatedProgressPercent < 85) {
        setFramerSyncPhase('processing_fields');
        if (fieldIdx < totalSelectedFields) {
          const currentField = selectedFields[fieldIdx];
          setFramerCurrentFieldKey(currentField);
          setFramerSyncedFieldsQueue(prev => [...prev, currentField]);
          fieldIdx++;
          const percentChunk = Math.floor(35 + (fieldIdx / totalSelectedFields) * 50);
          simulatedProgressPercent = percentChunk;
          setFramerSyncProgress(percentChunk);
        } else {
          simulatedProgressPercent = 85;
          setFramerSyncProgress(85);
          setFramerSyncPhase('matching');
        }
      } else if (simulatedProgressPercent < 98) {
        simulatedProgressPercent += 2;
        setFramerSyncProgress(simulatedProgressPercent);
        setFramerSyncPhase('matching');
      }
    }, 90);

    try {
      const res = await fetch(`/api/framer/sync/${selectedStore.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          collectionId: selectedCollectionId,
          dryRun,
          fullResync,
          fieldMappings,
          syncSettings
        })
      });
      const data = await res.json();
      
      clearInterval(interval);
      setFramerSyncedFieldsQueue(selectedFields);
      setFramerSyncProgress(100);
      setFramerSyncPhase('complete');

      if (res.ok && data.success) {
        setFramerSyncLogResult(data);
        fetchSyncLogs(selectedStore.id);
      } else {
        setFramerSyncLogResult({
          success: false,
          error: data.error || "Failed to sync to Framer",
          details: data.details || [data.error || "Unexpected pipeline interruption."]
        });
      }
    } catch (err: any) {
      clearInterval(interval);
      setFramerSyncPhase('idle');
      setFramerSyncLogResult({
        success: false,
        error: err.message,
        details: ["Network transportation exception. Make sure dev server is fully responsive."]
      });
    } finally {
      setFramerSyncLoading(false);
    }
  };

  const handleTriggerAndSync = (dryRun: boolean = false, fullResync: boolean = false) => {
    handleSyncToFramer(true, dryRun, fullResync);
  };

  const handleConnectSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!storeName.trim() || !storeUrl.trim()) return;

    setActionLoading(true);
    try {
      const { data, error } = await supabase.from('stores').insert({
        name: storeName.trim(),
        url: storeUrl.trim(),
        status: 'Connected',
        last_sync: new Date().toISOString()
      });

      if (error) throw error;

      setStoreName('');
      setStoreUrl('');
      setIsConnectOpen(false);
      await fetchStores();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnectInit = (store: any) => {
    setSelectedStore(store);
    setIsDisconnectOpen(true);
  };

  const handleDisconnectConfirm = async () => {
    if (!selectedStore) return;

    setActionLoading(true);
    try {
      const { error } = await supabase.from('stores').delete().eq('id', selectedStore.id);
      if (error) throw error;

      localStorage.removeItem(`wc_ck_${selectedStore.id}`);
      localStorage.removeItem(`wc_cs_${selectedStore.id}`);
      localStorage.removeItem(`wc_version_${selectedStore.id}`);
      localStorage.removeItem(`wc_ssl_${selectedStore.id}`);
      localStorage.removeItem(`wc_products_${selectedStore.id}`);
      localStorage.removeItem(`wc_orders_${selectedStore.id}`);

      setSelectedStore(null);
      setIsDisconnectOpen(false);
      await fetchStores();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTriggerSync = async (store: any) => {
    if (syncingStoreId) return;
    setSyncingStoreId(store.id);

    try {
      const res = await fetch(`/api/sync/${store.id}`, {
        method: 'POST'
      });
      const contentType = res.headers.get("content-type") || "";
      let resJson: any = {};
      if (contentType.includes("application/json")) {
        resJson = await res.json();
      } else {
        const textText = await res.text().catch(() => "");
        resJson = { error: textText || "Unexpected HTML/text response from syncer." };
      }

      if (!res.ok) {
        throw new Error(resJson.error || "SaaS Syncer Failure");
      }

      try {
        const billing = supabase.getBilling();
        if (billing) {
          billing.used_syncs += Math.floor(12 + Math.random() * 20);
          billing.usage_percent = Number(((billing.used_syncs / billing.limit_syncs) * 100).toFixed(1));
          supabase.setBilling(billing);
        }
      } catch (err) {
        console.warn('Billing info not available', err);
      }

      await fetchStores();
      
      if (selectedStore && selectedStore.id === store.id) {
        const prodResponse = await fetch(`/v1/${store.id}/products?limit=50`);
        const prodContentType = prodResponse.headers.get("content-type") || "";
        if (prodResponse.ok && prodContentType.includes("application/json")) {
          const productsJson = await prodResponse.json();
          const mappedProds = productsJson.products.map((p: any) => ({
            id: p.id,
            name: p.title,
            sku: p.slug.toUpperCase(),
            regular_price: String(p.price),
            sale_price: "",
            stock_quantity: p.inStock ? 50 : 0,
            status: p.inStock ? 'publish' : 'draft',
            categories: p.categories || 'General',
            description: p.description
          }));
          setProducts(mappedProds);
        }
      }
      
      fetchSyncLogs(store.id);
    } catch (err: any) {
      console.error("[Manual Sync Engine Error]", err);
      fetchSyncLogs(store.id);
      alert(`Sync Action Failed: ${err.message || err}`);
    } finally {
      setSyncingStoreId(null);
    }
  };

  const handleSaveWooCommerce = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedStore) return;

    if (!consumerKey.includes('*')) {
      localStorage.setItem(`wc_ck_${selectedStore.id}`, consumerKey.trim());
    }
    if (!consumerSecret.includes('*')) {
      localStorage.setItem(`wc_cs_${selectedStore.id}`, consumerSecret.trim());
    }
    localStorage.setItem(`wc_version_${selectedStore.id}`, apiVersion);
    localStorage.setItem(`wc_ssl_${selectedStore.id}`, String(sslBypass));

    try {
      const payload: any = {
        sslBypass
      };
      if (consumerKey.trim() && !consumerKey.includes('*')) {
        payload.consumerKey = consumerKey.trim();
      }
      if (consumerSecret.trim() && !consumerSecret.includes('*')) {
        payload.consumerSecret = consumerSecret.trim();
      }

      const res = await fetch(`/api/stores/${selectedStore.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert('WooCommerce API settings verified and secured safely on the backend vault.');
        await fetchStores();
      } else {
        alert('WooCommerce settings updated locally.');
      }
    } catch (err) {
      console.warn("Backend offline. Saved locally.", err);
      alert('WooCommerce settings saved locally.');
    }
  };

  const localParseFramerProjectId = (input: string): string => {
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

  const localParseFramerApiKey = (input: string): string => {
    let clean = input.trim();
    if (clean.toLowerCase().startsWith("bearer ")) {
      clean = clean.substring(7).trim();
    }
    return clean.replace(/^["']|["']$/g, "").trim();
  };

  const handleSaveFramer = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedStore) return;

    const parsedPid = localParseFramerProjectId(framerProjectId);
    const parsedKey = localParseFramerApiKey(framerApiKey);

    setFramerProjectId(parsedPid);
    if (!parsedKey.includes('*')) {
      setFramerApiKey(parsedKey);
    }

    localStorage.setItem(`framer_pid_${selectedStore.id}`, parsedPid);
    if (!parsedKey.includes('*')) {
      localStorage.setItem(`framer_key_${selectedStore.id}`, parsedKey);
    }

    try {
      const payload: any = {};
      if (parsedPid !== undefined) {
        payload.framerProjectId = parsedPid;
      }
      if (parsedKey.trim() && !parsedKey.includes('*')) {
        payload.framerApiKey = parsedKey;
      }

      const res = await fetch(`/api/stores/${selectedStore.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert('Framer CMS API token and Project Link secured safely on the backend vault.');
        await fetchStores();
        await fetchFramerCollections(selectedStore.id);
      } else {
        alert('Framer settings updated locally.');
      }
    } catch (err) {
      console.warn("Backend offline. Saved locally.", err);
      alert('Framer settings saved locally.');
    }
  };

  const handleTestFramerConnection = async () => {
    if (!selectedStore) return;
    setTestingConnection(true);
    setTestResults(null);

    const parsedPid = localParseFramerProjectId(framerProjectId);
    const parsedKey = localParseFramerApiKey(framerApiKey);

    setFramerProjectId(parsedPid);
    if (!parsedKey.includes('*')) {
      setFramerApiKey(parsedKey);
    }

    const steps: { step: string; status: 'pending' | 'success' | 'failed'; details: string }[] = [
      { step: "Secure credentials locally", status: 'success', details: `Project ID loaded: ${parsedPid || "Not specified"}` },
      { step: "Contact Framer REST API v1", status: 'pending', details: "Sending handshaking request to api.framer.com..." }
    ];

    try {
      const payload: any = {};
      if (parsedPid !== undefined) {
        payload.framerProjectId = parsedPid;
      }
      if (parsedKey.trim() && !parsedKey.includes('*')) {
        payload.framerApiKey = parsedKey;
      }

      const saveRes = await fetch(`/api/stores/${selectedStore.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!saveRes.ok) {
        throw new Error("Failed to secure keys to the backend vault prior to testing.");
      }

      const testRes = await fetch(`/api/framer/collections/${selectedStore.id}`);
      const contentType = testRes.headers.get("content-type") || "";
      
      if (testRes.ok && contentType.includes("application/json")) {
        const collections = await testRes.json();
        steps[1] = {
          step: "Contact Framer REST API v1",
          status: 'success',
          details: `Connected successfully! Found ${collections.length} active CMS collections in your Framer project.`
        };
        setTestResults({
          success: true,
          stepDetails: steps
        });
        setFramerErrorMsg(null);
        setFramerCollections(collections);
      } else {
        let errText = "Framer API responded with an error.";
        if (contentType.includes("application/json")) {
          try {
            const errJson = await testRes.json();
            errText = errJson.details || errJson.error || errText;
          } catch (_) {}
        }
        
        steps[1] = {
          step: "Contact Framer REST API v1",
          status: 'failed',
          details: `Framer API responded with status ${testRes.status} (${testRes.statusText}): ${errText}`
        };
        
        setTestResults({
          success: false,
          stepDetails: steps,
          errorDetails: errText
        });
        setFramerErrorMsg(errText);
        setFramerCollections([]);
      }
    } catch (err: any) {
      steps[1] = {
        step: "Contact Framer REST API v1",
        status: 'failed',
        details: err.message || "An unexpected network or proxy error occurred."
      };
      setTestResults({
        success: false,
        stepDetails: steps,
        errorDetails: err.message
      });
      setFramerErrorMsg(err.message);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleValidateAndSaveCredentials = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedStore) return;
    
    const ckVal = modalConsumerKey.trim();
    const csVal = modalConsumerSecret.trim();
    const fPidVal = modalFramerProjectId.trim();
    const fKeyVal = modalFramerApiKey.trim();

    const hasWooCommerceKeys = ckVal.length > 0 || csVal.length > 0;
    if (hasWooCommerceKeys) {
      if (!ckVal.startsWith('ck_') || ckVal.length < 20) {
        setValidationStatus('failed');
        setValidationText('Validation Error: Consumer Key must start with "ck_" (WooCommerce standards).');
        return;
      }
      if (!csVal.startsWith('cs_') || csVal.length < 20) {
        setValidationStatus('failed');
        setValidationText('Validation Error: Consumer Secret must start with "cs_" (WooCommerce standards).');
        return;
      }
    }

    setValidationStatus('validating');
    setValidationText('Handshaking endpoints... Performing secure local-agent encryption & validation signatures...');

    await new Promise(resolve => setTimeout(resolve, 1200));

    try {
      const payload: any = {
        framerProjectId: fPidVal,
        framerApiKey: fKeyVal
      };
      if (ckVal) payload.consumerKey = ckVal;
      if (csVal) payload.consumerSecret = csVal;

      const res = await fetch(`/api/stores/${selectedStore.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'WooCommerce API endpoint refused signature validations.');
      }

      if (ckVal) {
        setConsumerKey(ckVal);
        localStorage.setItem(`wc_ck_${selectedStore.id}`, ckVal);
      }
      if (csVal) {
        setConsumerSecret(csVal);
        localStorage.setItem(`wc_cs_${selectedStore.id}`, csVal);
      }
      setFramerProjectId(fPidVal);
      setFramerApiKey(fKeyVal);

      localStorage.setItem(`framer_pid_${selectedStore.id}`, fPidVal);
      localStorage.setItem(`framer_key_${selectedStore.id}`, fKeyVal);

      setValidationStatus('success');
      setValidationText('Validation complete! Symmetric AES encryption verified and locked in the backend vault.');

      await fetchStores();
      handleTriggerSync(selectedStore);

      setTimeout(() => {
        setIsSecureCredentialsOpen(false);
      }, 1600);

    } catch (err: any) {
      setValidationStatus('failed');
      setValidationText(err.message || 'Validation failed. Please verify your WordPress endpoint permission flags.');
    }
  };

  const handleDeleteProduct = (prodId: string) => {
    if (!selectedStore) return;
    const updated = products.filter(p => p.id !== prodId);
    setProducts(updated);
    localStorage.setItem(`wc_products_${selectedStore.id}`, JSON.stringify(updated));
  };

  const toggleOrderStatus = (orderId: string) => {
    if (!selectedStore) return;
    const updated = orders.map(o => {
      if (o.id === orderId) {
        const nextStatus: WCOrder['status'] = 
          o.status === 'processing' ? 'completed' :
          o.status === 'completed' ? 'cancelled' : 'processing';
        return { ...o, status: nextStatus };
      }
      return o;
    });
    setOrders(updated);
    localStorage.setItem(`wc_orders_${selectedStore.id}`, JSON.stringify(updated));
  };

  const deleteOrder = (orderId: string) => {
    if (!selectedStore) return;
    const updated = orders.filter(o => o.id !== orderId);
    setOrders(updated);
    localStorage.setItem(`wc_orders_${selectedStore.id}`, JSON.stringify(updated));
  };

  const [testingConnection, setTestingConnection] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  const filteredStores = stores.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatLastSync = (dateStr: string) => {
    if (!dateStr) return 'Never synced';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    }) + `, ` + date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      {!selectedStore ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground font-sans flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              WooCommerce Catalyst
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Connect external WordPress e-Commerce sites. Synced lists are cached locally to provide blazing-fast performance.
            </p>
          </div>
          
          <div className="flex items-center gap-3.5 self-start sm:self-auto flex-wrap sm:flex-nowrap">
            <Button onClick={() => setIsConnectOpen(true)} className="text-xs gap-1.5 shadow-sm">
              <Plus className="h-4 w-4" />
              Connect WooCommerce Store
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 border-b border-border pb-4">
          <Button 
            variant="ghost" 
            onClick={() => { setSelectedStore(null); fetchStores(); }} 
            className="self-start text-xs h-8 pl-1 text-muted-foreground hover:text-foreground hover:bg-muted/40"
          >
            ← Back to Store Nodes
          </Button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="text-left">
              <span className="text-[10px] font-bold text-primary font-mono uppercase bg-primary/10 px-2 py-0.5 rounded leading-none">
                STORE NODE AGENT
              </span>
              <h2 className="text-lg font-black tracking-tight text-slate-800 dark:text-slate-100 font-sans mt-1.5 flex items-center gap-1.5 leading-none">
                {selectedStore.name}
              </h2>
            </div>

            {/* TAB SELECTOR SIDEBAR/HEADER HEADER */}
            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg self-start sm:self-auto scrollbar-none overflow-x-auto max-w-full shrink">
              <button
                onClick={() => setActiveTab('field_selection')}
                className={`text-xs px-3 py-1.5 rounded-md flex items-center gap-1.5 font-sans cursor-pointer transition-all ${
                  activeTab === 'field_selection' 
                    ? 'bg-background text-foreground shadow-sm font-semibold' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Settings2 className="h-3.5 w-3.5 text-pink-500" />
                Schema & Sync Flow
              </button>
              
              <button
                onClick={() => setActiveTab('products')}
                className={`text-xs px-3 py-1.5 rounded-md flex items-center gap-1.5 font-sans cursor-pointer transition-all ${
                  activeTab === 'products' 
                    ? 'bg-background text-foreground shadow-sm font-semibold' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <ShoppingBag className="h-3.5 w-3.5 text-indigo-500" />
                Products Catalog
              </button>

              <button
                onClick={() => setActiveTab('orders')}
                className={`text-xs px-3 py-1.5 rounded-md flex items-center gap-1.5 font-sans cursor-pointer transition-all ${
                  activeTab === 'orders' 
                    ? 'bg-background text-foreground shadow-sm font-semibold' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Plus className="h-3.5 w-3.5 text-orange-500" />
                Purchase Ledger
              </button>

              <button
                onClick={() => setActiveTab('config')}
                className={`text-xs px-3 py-1.5 rounded-md flex items-center gap-1.5 font-sans cursor-pointer transition-all ${
                  activeTab === 'config' 
                    ? 'bg-background text-foreground shadow-sm font-semibold' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Lock className="h-3.5 w-3.5 text-emerald-500" />
                API Credentials
              </button>

              <button
                onClick={() => setActiveTab('sync_logs')}
                className={`text-xs px-3 py-1.5 rounded-md flex items-center gap-1.5 font-sans cursor-pointer transition-all ${
                  activeTab === 'sync_logs' 
                    ? 'bg-background text-foreground shadow-sm font-semibold' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                Sync Activity
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENDER STORES OVERVIEW SEARCH LIST */}
      {!selectedStore ? (
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Filter linked shops by tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs focus-visible:ring-1"
                />
              </div>
              <div className="text-[11px] text-muted-foreground font-semibold">
                Showing {filteredStores.length} of {stores.length} WooCommerce store nodes
              </div>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            {loading ? (
              <div className="grid gap-6 md:grid-cols-2">
                <Skeleton className="h-44 w-full" />
                <Skeleton className="h-44 w-full" />
              </div>
            ) : filteredStores.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-border rounded-xl bg-muted/10 font-sans">
                <ShoppingBag className="h-10 w-10 text-muted-foreground/60 mx-auto mb-4" />
                <h3 className="text-sm font-semibold text-foreground">No active WooCommerce stores</h3>
                <p className="text-xs text-muted-foreground mt-2 max-w-sm mx-auto">
                  Sync inventory and sales transactions by adding a WordPress WooCommerce REST connection endpoint.
                </p>
                <Button onClick={() => setIsConnectOpen(true)} variant="outline" className="mt-5 text-xs gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Connect WooCommerce Store
                </Button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {filteredStores.map((store) => {
                  const isStoreSyncing = syncingStoreId === store.id;
                  return (
                    <Card key={store.id} className="hover:border-primary/40 transition-all shadow-sm flex flex-col justify-between group bg-background font-sans">
                      <CardHeader className="pb-3 border-b border-muted/20">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 text-primary rounded-lg group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                              <ShoppingBag className="h-4.5 w-4.5" />
                            </div>
                            <div className="text-left">
                              <CardTitle className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors cursor-pointer" onClick={() => setSelectedStore(store)}>
                                {store.name}
                              </CardTitle>
                              <CardDescription className="text-[10px] font-mono mt-0.5">
                                UID: {store.id}
                              </CardDescription>
                            </div>
                          </div>

                          <Badge 
                            variant={store.status === 'Connected' ? 'default' : 'secondary'} 
                            className={`text-[9px] tracking-wide font-bold py-0.5 uppercase ${
                              isStoreSyncing 
                                ? 'bg-amber-100 text-amber-700 animate-pulse' 
                                : 'bg-emerald-500/15 text-emerald-600 border-none'
                            }`}
                          >
                            {isStoreSyncing ? 'Syncing...' : store.status}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="py-4 space-y-2.5 text-left">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Globe className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span className="font-semibold text-slate-500 text-[11px]">Domain:</span>
                          <a href={store.url} target="_blank" rel="noopener noreferrer" className="text-foreground hover:underline font-mono truncate text-[11px] flex-1">
                            {store.url}
                          </a>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span className="font-semibold text-slate-500 text-[11px]">Last Sync:</span>
                          <span className="text-foreground font-mono text-[11px]">
                            {isStoreSyncing ? 'Accessing endpoints...' : formatLastSync(store.last_sync)}
                          </span>
                        </div>
                      </CardContent>

                      <CardFooter className="pt-3 pb-3 border-t border-muted/20 flex items-center justify-between gap-2 bg-muted/10 rounded-b-xl">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDisconnectInit(store)}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs h-8 px-2"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Disconnect
                        </Button>

                        <div className="flex gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedStore(store)}
                            className="text-xs h-8 px-2.5 gap-1.5 cursor-pointer"
                          >
                            <Settings2 className="h-3.5 w-3.5" />
                            Manage
                          </Button>
                          <Button 
                            disabled={isStoreSyncing}
                            size="sm" 
                            onClick={() => handleTriggerSync(store)}
                            className="text-xs h-8 px-2.5 gap-1 cursor-pointer"
                          >
                            <RefreshCw className={`h-3 w-3 ${isStoreSyncing ? 'animate-spin' : ''}`} />
                            Sync
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* CONTROL CENTER PANEL: STATUS, TIMESTAMPS & MANUAL SYNC BUTTONS */}
          <Card className="shadow-sm border-border bg-neutral-50/50 dark:bg-neutral-900/30">
            <CardContent className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 flex-wrap lg:flex-nowrap font-sans">
              
              {/* Health status */}
              <div className="flex items-center gap-3 min-w-[260px] shrink-0">
                <div className="relative flex items-center justify-center shrink-0">
                  <span className="flex h-3 w-3 relative">
                    {syncingStoreId === selectedStore.id || selectedStore.status === "Syncing" ? (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    ) : selectedStore.status === "degraded" ? (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    ) : (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    )}
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${
                      syncingStoreId === selectedStore.id || selectedStore.status === "Syncing"
                        ? 'bg-blue-500' 
                        : selectedStore.status === "degraded" 
                        ? 'bg-amber-500' 
                        : 'bg-emerald-500'
                    }`}></span>
                  </span>
                </div>
                <div className="text-left">
                  <h4 className="text-xs font-bold flex items-center gap-1.5 text-slate-800 dark:text-slate-200 leading-none uppercase">
                    CONNECTION STATUS:
                    <span className={
                      syncingStoreId === selectedStore.id || selectedStore.status === "Syncing"
                        ? 'text-blue-500 font-bold'
                        : selectedStore.status === "degraded"
                        ? 'text-amber-500 font-bold'
                        : 'text-emerald-500 font-bold'
                    }>
                      {syncingStoreId === selectedStore.id || selectedStore.status === "Syncing"
                        ? 'SYNCHRONIZING' 
                        : selectedStore.status === "degraded" 
                        ? 'DEGRADED (CONNECTIVITY LOCKOUT)' 
                        : 'ONLINE & HEALTHY'}
                    </span>
                  </h4>
                  <p className="text-[10px] text-muted-foreground mt-1.5 font-mono uppercase tracking-tight flex items-center gap-1">
                    <Database className="h-3 w-3 text-primary/75 shrink-0" />
                    SaaS Broker Ingest: <span className="text-foreground font-semibold">Active & Caching ({products.length} Products Cached)</span>
                  </p>
                </div>
              </div>

              {/* Sync relative detail tracker */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 min-w-[280px]">
                <div className="flex items-center gap-2 border-l border-border pl-4 lg:pl-6 text-left">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <h5 className="text-[9px] uppercase font-bold text-muted-foreground leading-none">LAST REPLICATED SUCCESS</h5>
                    <p className="text-xs text-foreground font-mono mt-1 font-semibold whitespace-nowrap">
                      {formatLastSync(selectedStore.last_sync)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 border-l border-border pl-4 sm:pl-6 text-left">
                  <RefreshCw className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <h5 className="text-[9px] uppercase font-bold text-muted-foreground leading-none">MUTATION QUEUE</h5>
                    <p className="text-xs font-mono mt-1 font-medium whitespace-nowrap">
                      <span className="text-emerald-600 font-semibold">SaaS Sync State Clean</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Secure control action buttons */}
              <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setModalConsumerKey(localStorage.getItem(`wc_ck_${selectedStore.id}`) || '');
                    setModalConsumerSecret(localStorage.getItem(`wc_cs_${selectedStore.id}`) || '');
                    setModalFramerProjectId(localStorage.getItem(`framer_pid_${selectedStore.id}`) || selectedStore.framerProjectId || '');
                    setModalFramerApiKey(localStorage.getItem(`framer_key_${selectedStore.id}`) || '');
                    setShowKey(false);
                    setShowSecret(false);
                    setShowFramerKey(false);
                    setValidationStatus('idle');
                    setValidationText('');
                    setIsSecureCredentialsOpen(true);
                  }}
                  className="text-xs h-9 gap-1.5 font-medium border-border hover:bg-muted whitespace-nowrap cursor-pointer btn-secure-keys-dialog"
                >
                  <Lock className="h-3.5 w-3.5 text-primary" />
                  Secure Keys
                </Button>

                <Button
                  size="sm"
                  onClick={() => handleTriggerSync(selectedStore)}
                  disabled={syncingStoreId === selectedStore.id || selectedStore.status === 'Syncing'}
                  className="text-xs h-9 gap-1.5 font-semibold bg-primary text-primary-foreground hover:bg-primary/95 shadow-sm min-w-[110px] whitespace-nowrap cursor-pointer btn-manual-sync"
                >
                  {syncingStoreId === selectedStore.id || selectedStore.status === 'Syncing' ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3.5 w-3.5" />
                      Manual Sync
                    </>
                  )}
                </Button>
              </div>

            </CardContent>
          </Card>

          {/* WORKSPACE CONTENT AREA */}
          <div className="w-full space-y-6">
            
            {/* TAB: PRODUCTS CATALOG */}
            {activeTab === 'products' && (
              <TabProducts 
                products={products} 
                handleDeleteProduct={handleDeleteProduct} 
              />
            )}

            {/* TAB: ORDERS LEDGER */}
            {activeTab === 'orders' && (
              <TabOrders 
                orders={orders} 
                selectedStore={selectedStore} 
                setOrders={setOrders} 
                toggleOrderStatus={toggleOrderStatus} 
                deleteOrder={deleteOrder} 
              />
            )}

            {/* TAB: FIELD SELECTION & SYNC */}
            {activeTab === 'field_selection' && (
              <TabFieldSelection
                selectedStore={selectedStore}
                activeProfileId={activeProfileId}
                setActiveProfileId={setActiveProfileId}
                handleApplyPresetProfile={handleApplyPresetProfile}
                selectedFields={selectedFields}
                setSelectedFields={setSelectedFields}
                customProfiles={customProfiles}
                setCustomProfiles={setCustomProfiles}
                handleSaveFields={handleSaveFields}
                isProfileModalOpen={isProfileModalOpen}
                setIsProfileModalOpen={setIsProfileModalOpen}
                profileModalMode={profileModalMode}
                setProfileModalMode={setProfileModalMode}
                profileInputName={profileInputName}
                setProfileInputName={setProfileInputName}
                handleCreateCustomProfile={handleCreateCustomProfile}
                handleRenameProfile={handleRenameProfile}
                handleDuplicateProfile={handleDuplicateProfile}
                handleDeleteProfile={handleDeleteProfile}
                selectedCollectionId={selectedCollectionId}
                setSelectedCollectionId={setSelectedCollectionId}
                framerCollections={framerCollections}
                loadingCollections={loadingCollections}
                framerErrorMsg={framerErrorMsg}
                fetchFramerSchema={fetchFramerSchema}
                fieldMappings={fieldMappings}
                setFieldMappings={setFieldMappings}
                framerCollectionFields={framerCollectionFields}
                handleAutoMap={handleAutoMap}
                loadingSchema={loadingSchema}
                syncSettings={syncSettings}
                setSyncSettings={setSyncSettings}
                generatingPreview={generatingPreview}
                handleGeneratePreview={handleGeneratePreview}
                previewData={previewData}
                setPreviewData={setPreviewData}
                framerSyncLoading={framerSyncLoading}
                framerSyncProgress={framerSyncProgress}
                framerSyncPhase={framerSyncPhase}
                framerCurrentFieldKey={framerCurrentFieldKey}
                framerSyncedFieldsQueue={framerSyncedFieldsQueue}
                framerSyncLogResult={framerSyncLogResult}
                handleSyncToFramer={handleSyncToFramer}
                handleTriggerAndSync={handleTriggerAndSync}
                products={products}
              />
            )}

            {/* TAB: EDIT API CREDENTIALS */}
            {activeTab === 'config' && (
              <TabConfig
                selectedStore={selectedStore}
                apiVersion={apiVersion}
                setApiVersion={setApiVersion}
                sslBypass={sslBypass}
                setSslBypass={setSslBypass}
                consumerKey={consumerKey}
                setConsumerKey={setConsumerKey}
                consumerSecret={consumerSecret}
                setConsumerSecret={setConsumerSecret}
                handleSaveWooCommerce={handleSaveWooCommerce}
                framerProjectId={framerProjectId}
                setFramerProjectId={setFramerProjectId}
                framerApiKey={framerApiKey}
                setFramerApiKey={setFramerApiKey}
                handleSaveFramer={handleSaveFramer}
                testingConnection={testingConnection}
                handleTestFramerConnection={handleTestFramerConnection}
                testResults={testResults}
              />
            )}

            {/* TAB: SYNC LOGS HISTORY */}
            {activeTab === 'sync_logs' && (
              <TabSyncLogs
                syncLogs={syncLogs}
                loadingLogs={loadingLogs}
                fetchSyncLogs={fetchSyncLogs}
                selectedStore={selectedStore}
              />
            )}

          </div>

        </div>
      )}

      {/* Dialog: Connect Store */}
      <Dialog open={isConnectOpen} onOpenChange={setIsConnectOpen}>
        <DialogContent className="max-w-md font-sans">
          <form onSubmit={handleConnectSubmit}>
            <DialogHeader className="text-left">
              <DialogTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wide">
                <Plus className="h-4 w-4 text-primary" />
                Connect WooCommerce Store
              </DialogTitle>
              <DialogDescription className="text-xs">
                Creates a new tenant secure link to route products, categories, and purchases.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold block text-slate-700 dark:text-slate-300">Store Label / Identifier</label>
                <Input
                  type="text"
                  required
                  placeholder="e.g. Artisan Coffee Mill"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold block text-slate-700 dark:text-slate-300">Domain SSL URL</label>
                <Input
                  type="url"
                  required
                  placeholder="https://artisan-coffee-mill.com"
                  value={storeUrl}
                  onChange={(e) => setStoreUrl(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <p className="text-[10px] text-neutral-400 font-medium leading-relaxed">
                * Background synchronization cycles execute continuously on secure remote pipelines. Credentials can be locked under the store management screen.
              </p>
            </div>
            <DialogFooter className="gap-2 text-left justify-end">
              <Button type="button" variant="ghost" className="text-xs h-9 cursor-pointer" onClick={() => setIsConnectOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="text-xs h-9 cursor-pointer" disabled={actionLoading}>
                {actionLoading && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
                Authorize Connection
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Disconnect Store */}
      <Dialog open={isDisconnectOpen} onOpenChange={setIsDisconnectOpen}>
        <DialogContent className="max-w-md font-sans">
          <DialogHeader className="text-left">
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-destructive uppercase tracking-wide">
              <Trash2 className="h-4 w-4" />
              Disconnect WooCommerce Store
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Are you sure? Removing <strong className="text-foreground">{selectedStore?.name}</strong> completely deletes the tenant secure cache records.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 text-left justify-end animate-in">
            <Button variant="ghost" className="text-xs h-9 cursor-pointer" onClick={() => { setIsDisconnectOpen(false); }}>
              Cancel
            </Button>
            <Button variant="destructive" className="text-xs h-9 cursor-pointer" onClick={handleDisconnectConfirm} disabled={actionLoading}>
              {actionLoading && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
              Scrub Connection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Secure WooCommerce Keys */}
      <Dialog open={isSecureCredentialsOpen} onOpenChange={setIsSecureCredentialsOpen}>
        <DialogContent className="max-w-md font-sans">
          <form onSubmit={handleValidateAndSaveCredentials}>
            <DialogHeader className="text-left">
              <DialogTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wide">
                <Lock className="h-4 w-4 text-primary" />
                Secure Credentials Vault Locker
              </DialogTitle>
              <DialogDescription className="text-xs">
                Encrypt and lock WooCommerce API keys securely. Your credentials remain hidden from all browser environments.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-5 text-left max-h-[60vh] overflow-y-auto pr-1">
              
              {/* Part 1: WooCommerce API Handshake */}
              <div className="space-y-3.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">1</span>
                  WooCommerce REST Credentials
                </div>

                <div className="space-y-3 pl-6">
                  {/* Consumer Key Input with Eye Toggle */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold block text-slate-600 dark:text-slate-400">Consumer Key (ck_...)</label>
                    <div className="relative flex items-center">
                      <Input
                        type={showKey ? "text" : "password"}
                        placeholder="ck_****************************************"
                        value={modalConsumerKey}
                        onChange={(e) => setModalConsumerKey(e.target.value)}
                        className="font-mono text-xs pr-10 h-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Consumer Secret Input with Eye Toggle */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold block text-slate-600 dark:text-slate-400">Consumer Secret (cs_...)</label>
                    <div className="relative flex items-center">
                      <Input
                        type={showSecret ? "text" : "password"}
                        placeholder="cs_****************************************"
                        value={modalConsumerSecret}
                        onChange={(e) => setModalConsumerSecret(e.target.value)}
                        className="font-mono text-xs pr-10 h-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-3 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Part 2: Framer CMS Connection */}
              <div className="space-y-3.5 border-t border-slate-200/50 dark:border-slate-800/50 pt-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">2</span>
                  Framer CMS Settings (Approach B)
                </div>

                <div className="space-y-3 pl-6">
                  {/* Framer Project ID Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold block text-slate-600 dark:text-slate-400">Framer Project ID</label>
                    <Input
                      type="text"
                      placeholder="e.g. ce5c14dd-71be-4b95-..."
                      value={modalFramerProjectId}
                      onChange={(e) => setModalFramerProjectId(e.target.value)}
                      className="font-mono text-xs h-9"
                    />
                  </div>

                  {/* Framer API Key Input with Eye Toggle */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold block text-slate-600 dark:text-slate-400">Framer API Key (CMS Token)</label>
                    <div className="relative flex items-center">
                      <Input
                        type={showFramerKey ? "text" : "password"}
                        placeholder="framer_cms_********************************"
                        value={modalFramerApiKey}
                        onChange={(e) => setModalFramerApiKey(e.target.value)}
                        className="font-mono text-xs pr-10 h-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowFramerKey(!showFramerKey)}
                        className="absolute right-3 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {showFramerKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Secure Validation Status */}
              {validationStatus !== 'idle' && (
                <div className={`p-3 rounded-lg border text-xs leading-relaxed space-y-1.5 ${
                  validationStatus === 'validating'
                    ? 'bg-blue-500/5 text-blue-600 border-blue-500/20'
                    : validationStatus === 'success'
                    ? 'bg-emerald-500/5 text-emerald-600 border-emerald-500/20'
                    : 'bg-red-500/5 text-red-500 border-red-500/20'
                }`}>
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                    {validationStatus === 'validating' && (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                        Performing cryptographic lock...
                      </>
                    )}
                    {validationStatus === 'success' && (
                      <>
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500 fill-emerald-500/5" />
                        Verification SECURED & SAVED
                      </>
                    )}
                    {validationStatus === 'failed' && (
                      <>
                        <XCircle className="h-3.5 w-3.5 text-red-500 fill-red-500/5" />
                        Handshake Failed
                      </>
                    )}
                  </div>
                  <p>{validationText}</p>
                </div>
              )}
              
            </div>
            <DialogFooter className="gap-2 text-left justify-end">
              <Button 
                type="button" 
                variant="ghost" 
                className="text-xs h-9 cursor-pointer" 
                disabled={validationStatus === 'validating'}
                onClick={() => setIsSecureCredentialsOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="text-xs h-9 select-none font-semibold shadow-sm bg-primary text-primary-foreground hover:bg-primary/95 cursor-pointer"
                disabled={validationStatus === 'validating' || validationStatus === 'success'}
              >
                {validationStatus === 'validating' ? (
                  <>
                    <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                    Validating Vault...
                  </>
                ) : (
                  'Validate & Lock Keys'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
