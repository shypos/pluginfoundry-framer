import * as React from 'react';
import { FormEvent } from 'react';
import { Key, Database, Zap, Loader2, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface TabConfigProps {
  selectedStore: any;
  apiVersion: string;
  setApiVersion: (val: string) => void;
  sslBypass: boolean;
  setSslBypass: (val: boolean) => void;
  consumerKey: string;
  setConsumerKey: (val: string) => void;
  consumerSecret: string;
  setConsumerSecret: (val: string) => void;
  handleSaveWooCommerce: (e: FormEvent) => void;
  
  framerProjectId: string;
  setFramerProjectId: (val: string) => void;
  framerApiKey: string;
  setFramerApiKey: (val: string) => void;
  handleSaveFramer: (e: FormEvent) => void;
  
  testingConnection: boolean;
  handleTestFramerConnection: () => void;
  testResults: any;
}

export default function TabConfig({
  selectedStore,
  apiVersion,
  setApiVersion,
  sslBypass,
  setSslBypass,
  consumerKey,
  setConsumerKey,
  consumerSecret,
  setConsumerSecret,
  handleSaveWooCommerce,
  framerProjectId,
  setFramerProjectId,
  framerApiKey,
  setFramerApiKey,
  handleSaveFramer,
  testingConnection,
  handleTestFramerConnection,
  testResults
}: TabConfigProps) {
  return (
    <div className="space-y-6 text-left">
      {/* PART 1: WOOCOMMERCE SYSTEM */}
      <Card className="shadow-sm font-sans">
        <CardHeader className="pb-3 border-b border-border/60 text-left">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-foreground uppercase tracking-wider">
            <Key className="h-4 w-4 text-primary" />
            WooCommerce REST API Signatures ({apiVersion.toUpperCase()})
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">
            Configure official WP consumer credentials used to authenticate against WordPress core.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSaveWooCommerce}>
          <CardContent className="space-y-4 pt-4 pb-4 text-left">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold block text-slate-700 dark:text-slate-300">Consumer Key (ck_...)</label>
                <Input
                  type="text"
                  value={consumerKey}
                  onChange={(e) => setConsumerKey(e.target.value)}
                  placeholder="ck_abc123..."
                  className="font-mono text-xs h-9 input-ck"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold block text-slate-700 dark:text-slate-300">Consumer Secret (cs_...)</label>
                <Input
                  type="password"
                  value={consumerSecret}
                  onChange={(e) => setConsumerSecret(e.target.value)}
                  placeholder="cs_xyz456..."
                  className="font-mono text-xs h-9 input-cs"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 items-center pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold block text-slate-700 dark:text-slate-300">REST API Namespace Version</label>
                <select
                  value={apiVersion}
                  onChange={(e: any) => setApiVersion(e.target.value)}
                  className="w-full text-xs h-9 bg-background px-3 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary font-medium select-api-ver"
                >
                  <option value="wc/v3">wc/v3 (Recommended - Latest Release)</option>
                  <option value="wc/v2">wc/v2 (Legacy version)</option>
                  <option value="wc/v1">wc/v1 (Legacy version)</option>
                </select>
              </div>

              <div className="flex items-center justify-between bg-muted/20 border border-border rounded-lg h-9 px-3 mt-4">
                <label htmlFor="ssl_check" className="text-xs font-semibold text-foreground cursor-pointer select-none">
                  Bypass local SSL verification
                </label>
                <input
                  type="checkbox"
                  id="ssl_check"
                  checked={sslBypass}
                  onChange={(e) => setSslBypass(e.target.checked)}
                  className="h-4 w-4 rounded text-primary focus:ring-primary border-gray-300 cursor-pointer checkbox-ssl"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-2 pb-3 border-t border-border/60 flex justify-between">
            <p className="text-[10px] text-muted-foreground italic">WooCommerce credentials require write privileges for full functionality.</p>
            <Button type="submit" className="text-xs h-9 font-bold shadow-sm cursor-pointer btn-save-woo">
              Save WooCommerce Keys
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* PART 2: FRAMER LINK SYSTEM */}
      <Card className="shadow-sm font-sans border-emerald-500/10 dark:border-emerald-500/20">
        <CardHeader className="pb-3 border-b border-emerald-500/10 dark:border-emerald-500/20 text-left bg-emerald-500/[0.01]">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-foreground uppercase tracking-wider">
            <Database className="h-4 w-4 text-emerald-500" />
            Framer CMS API Link (Approach B)
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">
            Enable live bidirectional synchronization between WooCommerce products and your Framer site collection databases.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSaveFramer}>
          <CardContent className="space-y-4 pt-4 text-left">
            <p className="text-[11px] text-muted-foreground">
              Your Framer Project ID and Framer API key are encrypted on-backend using AES-256 and will synchronize local cache events directly.
            </p>
            
            <div className="grid gap-4 sm:grid-cols-2 pb-4 pl-0">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold block text-slate-700 dark:text-slate-300">Framer Project ID</label>
                <Input
                  type="text"
                  value={framerProjectId}
                  onChange={(e) => setFramerProjectId(e.target.value)}
                  placeholder="e.g. ce5c14dd-71be-4b95-..."
                  className="font-mono text-xs h-9 input-framer-pid"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold block text-slate-700 dark:text-slate-300">Framer API Key (CMS Token)</label>
                <Input
                  type="password"
                  value={framerApiKey}
                  onChange={(e) => setFramerApiKey(e.target.value)}
                  placeholder="framer_cms_..."
                  className="font-mono text-xs h-9 input-framer-key"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-border/40 mt-4 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-lg border border-border/80">
                <div>
                  <span className="text-xs font-semibold block text-foreground">Framer Connection Diagnoser</span>
                  <span className="text-[10px] text-muted-foreground block mt-0.5">Test real-time routing to verify if your tokens bypass secure Framer firewalls.</span>
                </div>

                <Button
                  type="button"
                  onClick={handleTestFramerConnection}
                  disabled={testingConnection || !framerProjectId || !framerApiKey}
                  variant="outline"
                  size="sm"
                  className="text-xs font-semibold shrink-0 cursor-pointer border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 btn-test-connection"
                >
                  {testingConnection ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Zap className="h-3 w-3 text-emerald-500 mr-1.5" />
                      Run Connection Test
                    </>
                  )}
                </Button>
              </div>

              {/* Connection Test outputs */}
              {testResults && (
                <div className={`p-3.5 rounded-lg border text-xs space-y-2.5 shadow-xs text-left ${testResults.success ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                  <div className="flex items-center gap-1.5 font-bold">
                    {testResults.success ? (
                      <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
                    )}
                    <span className={testResults.success ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-800 dark:text-red-300'}>
                      {testResults.success ? "Framer Connection Certified!" : "Framer Connection Failed"}
                    </span>
                  </div>

                  <div className="space-y-1.5 font-sans pl-1.5 text-left">
                    {testResults.stepDetails.map((step: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 text-[11px] leading-relaxed">
                        {step.status === 'success' && <div className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">✓</div>}
                        {step.status === 'failed' && <div className="text-red-600 dark:text-red-400 font-bold shrink-0">✗</div>}
                        {step.status === 'pending' && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground mr-0.5 shrink-0 mt-0.5" />}
                        <div>
                          <span className="font-semibold text-foreground">{step.step}:</span>{' '}
                          <span className="text-muted-foreground">{step.details}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {!testResults.success && (
                    <div className="text-[10px] text-red-700/90 dark:text-red-400/90 bg-red-500/[0.04] p-2.5 rounded-md border border-red-500/10 mt-1 pb-1.5 font-sans leading-normal text-left">
                      <strong className="font-bold underline uppercase tracking-wide">Detailed Framer API Debug Checklist:</strong>
                      <ul className="list-decimal list-inside space-y-1 mt-1 pl-0.5">
                        <li>Ensure the project is <strong>Published inside Framer</strong> (click Publish button on upper-right in Framer).</li>
                        <li>The API key must be a <strong>CMS Token</strong> generated in the target project, not a user system Token.</li>
                        <li>Check if the <strong>Project ID matches exactly</strong>: <code className="bg-red-500/5 px-1 rounded">{framerProjectId || "Empty"}</code></li>
                        <li>Make sure the token has both <strong className="underline">Read & Write permissions</strong> in the Framer dashboard settings.</li>
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* FAQ and visual documentation about Framer CMS */}
              <div className="bg-muted/35 rounded-lg p-3.5 border border-border/50 text-xs text-left">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-primary" />
                  How to find your Framer API target coordinates?
                </span>
                <ol className="list-decimal list-inside mt-2 text-[11px] text-muted-foreground space-y-1 leading-relaxed text-left">
                  <li>Open your Framer editor project.</li>
                  <li>Click the **Project Settings (gear icon)** in top bar navigation.</li>
                  <li>Navigate down to **Utility → CMS API**.</li>
                  <li>Toggle the switch to **Enabled** if not already enabled.</li>
                  <li>Click the **Create Token** button and select **Read and Write** capabilities.</li>
                  <li>Copy BOTH **Project ID** & **Access Token** and enter them above!</li>
                </ol>
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-2 pb-3 border-t border-border/60 flex justify-between">
            <p className="text-[10px] text-muted-foreground italic">Verify Project CMS collection setup is completed prior to synchronization.</p>
            <Button type="submit" className="text-xs h-9 bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-sm cursor-pointer btn-save-framer">
              Save Framer Link
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
