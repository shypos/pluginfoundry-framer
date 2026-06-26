import { useEffect, useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  FileText, 
  RefreshCw, 
  Download, 
  Plus, 
  ArrowUpRight, 
  TrendingUp, 
  Briefcase, 
  Check, 
  Loader2, 
  Database,
  History,
  Terminal,
  Activity,
  Code,
  ShoppingBag
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';

export default function DashboardOverview() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ forms: 0, stores: 0, exports: 0, portcodes: 0 });
  const [activities, setActivities] = useState<any[]>([]);
  const [purchasedQty, setPurchasedQty] = useState(1);
  
  // Quick Action Dialog states
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isStoreDialogOpen, setIsStoreDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  // Quick Action Form Submission states
  const [actionLoading, setActionLoading] = useState(false);
  const [newFormName, setNewFormName] = useState('');
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreUrl, setNewStoreUrl] = useState('');
  const [exportFormat, setExportFormat] = useState('CSV');

  // Load and refresh dashboard summary metrics
  const fetchDashboardMetrics = async () => {
    try {
      setLoading(true);
      // Fetch Forms count
      const { data: forms } = await supabase.from('forms').select();
      // Fetch Stores count
      const { data: stores } = await supabase.from('stores').select();

      const formsList = forms || [];
      const storesList = stores || [];

      let ownedQty = 1;
      const stored = localStorage.getItem('purchased_templates_v1');
      if (stored) {
        try {
          const arr = JSON.parse(stored);
          ownedQty = arr.length;
        } catch (e) {}
      }
      setPurchasedQty(ownedQty);

      setCounts({
        forms: formsList.length,
        stores: storesList.length,
        exports: ownedQty,
        portcodes: 6
      });

      // Compute elegant human-readable recent logs
      const derivedActivities: any[] = [];
      
      formsList.slice(0, 2).forEach((frm: any) => {
        derivedActivities.push({
          id: `act_${frm.id}`,
          type: 'Form Created',
          description: `Created new form container "${frm.name}"`,
          time: frm.created_at,
          icon: FileText,
          badgeColor: 'bg-indigo-500/10 text-indigo-500'
        });
      });

      storesList.slice(0, 2).forEach((str: any) => {
        derivedActivities.push({
          id: `act_${str.id}`,
          type: 'Woo Store Linked',
          description: `Linked Store "${str.name}" (${str.url})`,
          time: str.created_at,
          icon: RefreshCw,
          badgeColor: 'bg-emerald-500/10 text-emerald-500'
        });
      });

      // Add a simulated log for the templates license owned
      derivedActivities.push({
        id: 'act_tpl_licensed',
        type: 'Template Licensed',
        description: `Active license synced for premium Framer theme`,
        time: new Date(Date.now() - 3600000).toISOString(),
        icon: ShoppingBag,
        badgeColor: 'bg-emerald-500/10 text-emerald-500'
      });

      // Sort activities chronological DESC
      derivedActivities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setActivities(derivedActivities.slice(0, 5));

    } catch (err) {
      console.error('Error fetching dashboard summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardMetrics();
  }, []);

  // Handler: Create custom forms live
  const handleCreateFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newFormName.trim()) return;

    setActionLoading(true);
    try {
      const { error } = await supabase.from('forms').insert({
        name: newFormName,
        submissions: 0,
        status: 'Active'
      });

      if (error) throw error;
      
      setNewFormName('');
      setIsFormDialogOpen(false);
      await fetchDashboardMetrics();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Register WooCommerce shop linkages
  const handleConnectStoreSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newStoreName.trim() || !newStoreUrl.trim()) return;

    setActionLoading(true);
    try {
      const { error } = await supabase.from('stores').insert({
        name: newStoreName,
        url: newStoreUrl,
        status: 'Connected',
        last_sync: new Date().toISOString()
      });

      if (error) throw error;

      setNewStoreName('');
      setNewStoreUrl('');
      setIsStoreDialogOpen(false);
      await fetchDashboardMetrics();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handler: Spawn new dataset export jobs
  const handleExportSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const timestamp = new Date().toLocaleDateString('en-US', { month: 'short' }).toLowerCase();
      const randomId = Math.floor(100 + Math.random() * 900);
      const filename = `pluginfoundry_export_${timestamp}_${randomId}.${exportFormat.toLowerCase()}`;

      const { error } = await supabase.from('exports').insert({
        filename,
        format: exportFormat,
        status: 'Success',
        row_count: Math.floor(250 + Math.random() * 5000)
      });

      if (error) throw error;

      setIsExportDialogOpen(false);
      await fetchDashboardMetrics();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Render relative dynamic timers
  const formatTimeAgo = (dateStr: string) => {
    try {
      const past = new Date(dateStr).getTime();
      const now = new Date().getTime();
      const diffMs = now - past;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return 'Some time ago';
    }
  };

  return (
    <div className="space-y-8" id="overview-dashboard-container">
      {/* Dynamic Header Promo Banner */}
      <div className="bg-gradient-to-r from-neutral-900 to-slate-800 dark:from-muted/40 dark:to-muted/30 border border-border/80 rounded-2xl p-6 md:p-8 relative overflow-hidden text-white shadow-md animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="relative z-10 max-w-xl space-y-2">
          <Badge className="bg-primary hover:bg-primary-dark border-none text-white px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-wider">
            PluginFoundry Core Console
          </Badge>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">
            Consolidated Platform Operations Hub
          </h2>
          <p className="text-xs md:text-sm text-neutral-300 leading-relaxed font-normal">
            Welcome to backoffice engine-room. Configure active Google Forms, examine live Woo Commerce connections, or pull database transaction log CSVs instantly below.
          </p>
        </div>
        <div className="absolute top-0 right-0 h-full w-1/3 opacity-5 hidden sm:flex items-center justify-center">
          <Activity className="h-64 w-64 rotate-12 stroke-[0.5]" />
        </div>
      </div>

      {/* 4 Metric Stat Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Forms */}
        <Card className="hover:border-primary/40 transition-colors shadow-sm relative group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Google Forms Pages
            </CardTitle>
            <div className="bg-indigo-500/10 text-indigo-500 p-2 rounded-lg group-hover:bg-indigo-500 group-hover:text-white transition-colors">
              <FileText className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {loading ? (
              <Skeleton className="h-9 w-20" />
            ) : (
              <div className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                {counts.forms}
              </div>
            )}
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              <span className="font-medium text-emerald-500">Live submission validation</span>
            </div>
          </CardContent>
        </Card>

        {/* Metric 2: WooCommerce */}
        <Card className="hover:border-primary/40 transition-colors shadow-sm relative group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Woo Commerce Syncs
            </CardTitle>
            <div className="bg-emerald-500/10 text-emerald-500 p-2 rounded-lg group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <RefreshCw className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {loading ? (
              <Skeleton className="h-9 w-20" />
            ) : (
              <div className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                {counts.stores}
              </div>
            )}
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              <span className="font-medium text-emerald-500">Automatic background sync</span>
            </div>
          </CardContent>
        </Card>

        {/* Metric 3: Marketplace Themes */}
        <Card className="hover:border-primary/40 transition-colors shadow-sm relative group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Marketplace Templates
            </CardTitle>
            <div className="bg-amber-500/10 text-amber-500 p-2 rounded-lg group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {loading ? (
              <Skeleton className="h-9 w-20" />
            ) : (
              <div className="text-2xl md:text-3xl font-bold tracking-tight text-foreground text-left">
                {counts.portcodes} Available
              </div>
            )}
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              <span className="font-medium text-emerald-500">Framer pre-built screens</span>
            </div>
          </CardContent>
        </Card>

        {/* Metric 4: Purchased Layout Keys */}
        <Card className="hover:border-primary/40 transition-colors shadow-sm relative group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Purchased Theme Licenses
            </CardTitle>
            <div className="bg-emerald-500/10 text-emerald-500 p-2 rounded-lg group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <Check className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {loading ? (
              <Skeleton className="h-9 w-20" />
            ) : (
              <div className="text-2xl md:text-3xl font-bold tracking-tight text-foreground text-left">
                {purchasedQty} Owned
              </div>
            )}
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              <span className="font-medium text-emerald-500">Premium commercial license</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Panel grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Quick Actions Panel */}
        <Card className="md:col-span-1 shadow-sm h-fit">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              Quick Action Utilities
            </CardTitle>
            <CardDescription className="text-xs">
              Direct table insertions, background workflows triggers
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3.5">
            <Button 
              id="action-btn-create-form" 
              onClick={() => setIsFormDialogOpen(true)}
              className="w-full justify-start gap-2 text-xs" 
              variant="default"
            >
              <Plus className="h-4 w-4 shrink-0" />
              Create Webform Container
            </Button>
            
            <Button 
              id="action-btn-connect-woo" 
              onClick={() => setIsStoreDialogOpen(true)}
              className="w-full justify-start gap-2 text-xs text-foreground bg-muted hover:bg-muted/80" 
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 shrink-0 text-muted-foreground" />
              Connect Woo Commerce Node
            </Button>

            <Button 
              id="action-btn-go-marketplace" 
              onClick={() => navigate('/dashboard/marketplace')}
              className="w-full justify-start gap-2 text-xs text-foreground bg-muted hover:bg-muted/80" 
              variant="outline"
            >
              <ShoppingBag className="h-4 w-4 shrink-0 text-emerald-500" />
              Browse Template Marketplace
            </Button>
          </CardContent>
        </Card>

        {/* Dynamic Activity List */}
        <Card className="md:col-span-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                Live Audit Logs
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time user activities logged into system tables
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchDashboardMetrics} className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground">
              <RefreshCw className="h-3 w-3 shrink-0" />
              Refresh Logs
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-border rounded-xl bg-muted/10">
                <Terminal className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <h4 className="text-xs font-semibold">No transactions found</h4>
                <p className="text-[11px] text-muted-foreground mt-1 max-w-sm mx-auto">
                  Activate any of the custom tools or use the quick action panel on the left to spawn state records.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {activities.map((act, index) => {
                  const IconComponent = act.icon;
                  return (
                    <div key={act.id}>
                      {index > 0 && <Separator className="my-1 border-neutral-100 dark:border-neutral-800" />}
                      <div className="flex items-start justify-between py-2 px-2 hover:bg-muted/10 rounded-lg transition-all">
                        <div className="flex gap-3">
                          <div className={`p-2 rounded-lg shrink-0 ${act.badgeColor}`}>
                            <IconComponent className="h-4 w-4" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-semibold text-foreground truncate">
                              {act.description}
                            </span>
                            <span className="text-[10px] text-muted-foreground mt-0.5">
                              {act.type} • Scope Session
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0 self-center">
                          {formatTimeAgo(act.time)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* --- QUICK ACTION DIALOG SHEETS --- */}

      {/* Dialog 1: Create Form */}
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleCreateFormSubmit}>
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" />
                Create Webform Container
              </DialogTitle>
              <DialogDescription className="text-xs">
                Generates a clean HTML action parser designed to hold secure database inputs automatically.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Form Identifier Name</label>
                <Input
                  id="diag-form-input-name"
                  type="text"
                  placeholder="e.g. Lead Form, Newsletter Subscription"
                  required
                  value={newFormName}
                  onChange={(e) => setNewFormName(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="ghost" className="text-xs h-9" onClick={() => setIsFormDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="text-xs h-9" disabled={actionLoading}>
                {actionLoading && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
                Instantiate Container
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog 2: Connect WooCommerce */}
      <Dialog open={isStoreDialogOpen} onOpenChange={setIsStoreDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleConnectStoreSubmit}>
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-emerald-500" />
                Link Woo Commerce API Node
              </DialogTitle>
              <DialogDescription className="text-xs">
                Authorize safe OAuth-level hooks with your external stores. Ensure credentials are valid.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Merchant Shopify/Woo Name</label>
                <Input
                  id="diag-store-input-name"
                  type="text"
                  required
                  placeholder="e.g. Acme Coffee, Artisan Apparel"
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Target SSL URL Link</label>
                <Input
                  id="diag-store-input-url"
                  type="url"
                  required
                  placeholder="https://mystore.domain"
                  value={newStoreUrl}
                  onChange={(e) => setNewStoreUrl(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="ghost" className="text-xs h-9" onClick={() => setIsStoreDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="text-xs h-9" disabled={actionLoading}>
                {actionLoading && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
                Register Store Connection
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Target templates marketplace link fallback */}
    </div>
  );
}
