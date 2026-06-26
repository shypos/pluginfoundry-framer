import { useEffect, useState, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/SupabaseAuthContext';
import { 
  User, 
  Key, 
  Settings, 
  Copy, 
  Plus, 
  Trash2, 
  BadgeCheck, 
  Globe, 
  Slack,
  MessageSquare,
  CreditCard,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function DashboardSettings() {
  const { user } = useAuth();
  
  // States of lists
  const [apikeys, setApikeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile forms edit state
  const [userEmail, setUserEmail] = useState(user?.email || '');
  const [userCompany, setUserCompany] = useState('PluginFoundry Corp');
  const [userTaxId, setUserTaxId] = useState('TX-109283-A');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState('');

  // API Key creation fields
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [apiSaving, setApiSaving] = useState(false);
  const [generatedKeyValue, setGeneratedKeyValue] = useState('');

  // Integration toggles state
  const [integrations, setIntegrations] = useState({
    slack: true,
    stripe: false,
    hubspot: true,
    discord: false
  });

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      const { data } = await supabase.from('apikeys').select();
      setApikeys(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  // Handler: Update personal detail state fields
  const handleSaveProfile = (e: FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileFeedback('');
    
    setTimeout(() => {
      setProfileSaving(false);
      setProfileFeedback('Profile changes cached successfully.');
    }, 1200);
  };

  // Handler: Generate fresh API Keys
  const handleGenerateKey = async (e: FormEvent) => {
    e.preventDefault();
    if (!newKeyLabel.trim()) return;

    setApiSaving(true);
    try {
      const entropy = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
      const tokenString = `pf_live_${entropy}`;

      const { data, error } = await supabase.from('apikeys').insert({
        name: newKeyLabel,
        value: tokenString.replace(/(.{8}).+(.{8})/, '$1...' + '$2') // Masked string
      });

      if (error) throw error;

      setGeneratedKeyValue(tokenString); // Expose the raw value once for security!
      setNewKeyLabel('');
      await fetchApiKeys();
    } catch (err) {
      console.error(err);
    } finally {
      setApiSaving(false);
    }
  };

  // Handler: Evict Keys
  const handleDeleteKey = async (id: string) => {
    try {
      const { error } = await supabase.from('apikeys').delete().eq('id', id);
      if (error) throw error;
      
      // If the currently shown key matches, clear it from screen
      setGeneratedKeyValue('');
      await fetchApiKeys();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleIntegration = (key: keyof typeof integrations) => {
    setIntegrations(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleCopyClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6" id="settings-component-container">
      {/* Settings Navigation Structure */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-muted p-1 rounded-lg border border-border/80 w-fit grid grid-cols-3 max-w-md">
          <TabsTrigger value="profile" className="text-xs font-semibold py-2">
            Profile Account
          </TabsTrigger>
          <TabsTrigger value="apikeys" className="text-xs font-semibold py-2">
            API Keys
          </TabsTrigger>
          <TabsTrigger value="integrations" className="text-xs font-semibold py-2">
            Integrations
          </TabsTrigger>
        </TabsList>

        {/* --- TAB 1: Profile forms edit cards --- */}
        <TabsContent value="profile" className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4.5 w-4.5 text-muted-foreground" />
                Developer Security Profile
              </CardTitle>
              <CardDescription className="text-xs">
                Manage contact addresses, profile labels, tax invoices IDs.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSaveProfile}>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Authorized Email Contacts</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="email"
                        disabled
                        value={userEmail}
                        className="pl-10 h-10 text-xs bg-muted/40 cursor-not-allowed"
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground leading-tight">
                      Scopes matches active credentials. Update via Security.
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Corporate Enterprise Label</label>
                    <Input
                      id="input-settings-company"
                      type="text"
                      required
                      value={userCompany}
                      className="text-xs h-10"
                      onChange={(e) => setUserCompany(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 max-w-sm">
                  <label className="text-xs font-semibold">VAT Tax Invoicing ID</label>
                  <Input
                    id="input-settings-tax"
                    type="text"
                    required
                    value={userTaxId}
                    className="text-xs h-10"
                    onChange={(e) => setUserTaxId(e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex items-center justify-between border-t border-muted/30 pt-4 gap-4">
                <div className="text-[11px] font-semibold text-emerald-600">
                  {profileFeedback}
                </div>
                <Button type="submit" disabled={profileSaving} className="text-xs h-9">
                  {profileSaving && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
                  Synchronize Contract Profiles
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        {/* --- TAB 2: API Keys manager forms/lists --- */}
        <TabsContent value="apikeys" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Form to generate new Keys */}
            <Card className="col-span-1 shadow-sm h-fit">
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Key className="h-4.5 w-4.5 text-muted-foreground" />
                  Request Access Token
                </CardTitle>
                <CardDescription className="text-xs">
                  Construct authorization credentials to route local queries.
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleGenerateKey}>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold block">Token Descriptive Tag</label>
                    <Input
                      id="input-api-key-label"
                      type="text"
                      required
                      placeholder="e.g. CLI Sync, Telemetry Hook"
                      value={newKeyLabel}
                      onChange={(e) => setNewKeyLabel(e.target.value)}
                      className="text-xs h-10"
                    />
                  </div>
                </CardContent>
                <CardFooter className="pt-2">
                  <Button type="submit" disabled={apiSaving} className="w-full text-xs h-9">
                    {apiSaving && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
                    Generate System Key
                  </Button>
                </CardFooter>
              </form>
            </Card>

            {/* List Table of active keys */}
            <Card className="col-span-2 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Active Access Credentials</CardTitle>
                <CardDescription className="text-xs">
                  Access Tokens active across your cloud runtime scope context. Keep secrets hidden.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* One-time expose banner */}
                {generatedKeyValue && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 space-y-2 animate-in fade-in slide-in-from-top-2">
                    <span className="text-xs font-bold text-emerald-600 block">System Key Generated Successfully:</span>
                    <p className="text-[10px] text-muted-foreground">
                      Copy credentials. For security, active secrets are completely masked and hidden upon refreshing the tab page:
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        type="text"
                        readOnly
                        value={generatedKeyValue}
                        className="font-mono h-9 text-[11px] bg-background border-emerald-500/20"
                      />
                      <Button variant="outline" size="icon" onClick={() => handleCopyClipboard(generatedKeyValue)} className="h-9 w-9 shrink-0">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {loading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : apikeys.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-border rounded-xl bg-muted/10">
                    <Lock className="h-8 w-8 text-muted-foreground/60 mx-auto mb-3" />
                    <h4 className="text-xs font-semibold">No credentials instantiated yet</h4>
                    <p className="text-[10px] text-muted-foreground mt-1 max-w-sm mx-auto">
                      Use the "Request Access Token" forms panel on the left side to generate masked API secrets instantly.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {apikeys.map((keyObj) => (
                      <div key={keyObj.id} className="flex items-center justify-between p-3.5 border border-border/80 hover:bg-muted/15 rounded-xl transition-colors">
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-foreground block">
                            {keyObj.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono font-medium">
                            {keyObj.value}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          id={`btn-revoke-key-${keyObj.id}`}
                          onClick={() => handleDeleteKey(keyObj.id)}
                          title="Revoke Token Access"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* --- TAB 3: Integration configuration cards --- */}
        <TabsContent value="integrations" className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Enterprise Communications Integrations</CardTitle>
              <CardDescription className="text-xs">
                Bind event pipelines directly and channel status hooks out to secondary slack rooms or notification chains.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              {/* Card 1: Slack */}
              <div className="flex items-start justify-between p-4 border border-border/80 rounded-xl bg-background/50">
                <div className="flex gap-3.5">
                  <div className="p-2.5 bg-[#4A154B]/10 text-[#4A154B] rounded-lg">
                    <Slack className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold block text-foreground">Slack Workspaces API</span>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Route active submissions receipts as formatted Slack embeds directly.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  id="toggle-integration-slack"
                  onClick={() => toggleIntegration('slack')}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    integrations.slack ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                      integrations.slack ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Card 2: Stripe */}
              <div className="flex items-start justify-between p-4 border border-border/80 rounded-xl bg-background/50">
                <div className="flex gap-3.5">
                  <div className="p-2.5 bg-[#635BFF]/10 text-[#635BFF] rounded-lg">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold block text-foreground">Stripe Payment Gateway</span>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Hook transactional purchase receipts directly to custom analytics meters.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  id="toggle-integration-stripe"
                  onClick={() => toggleIntegration('stripe')}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    integrations.stripe ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                      integrations.stripe ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Card 3: HubSpot */}
              <div className="flex items-start justify-between p-4 border border-border/80 rounded-xl bg-background/50">
                <div className="flex gap-3.5">
                  <div className="p-2.5 bg-[#FF7A59]/10 text-[#FF7A59] rounded-lg">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold block text-foreground">HubSpot CRM Connector</span>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Automatically ingest form lead captures directly into deal tracking lanes.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  id="toggle-integration-hubspot"
                  onClick={() => toggleIntegration('hubspot')}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    integrations.hubspot ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                      integrations.hubspot ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Card 4: Discord */}
              <div className="flex items-start justify-between p-4 border border-border/80 rounded-xl bg-background/50">
                <div className="flex gap-3.5">
                  <div className="p-2.5 bg-[#5865F2]/10 text-[#5865F2] rounded-lg">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold block text-foreground">Discord Bot Webhooks</span>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Post automated alerts directly into active developer coordination logs.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  id="toggle-integration-discord"
                  onClick={() => toggleIntegration('discord')}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    integrations.discord ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                      integrations.discord ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
