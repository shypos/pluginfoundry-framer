import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  CreditCard, 
  CheckCircle, 
  AlertTriangle, 
  ArrowUpRight, 
  Activity, 
  BadgeCheck, 
  History, 
  Loader2, 
  DollarSign,
  FileText,
  TrendingUp,
  Inbox
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

export default function DashboardBilling() {
  const [loading, setLoading] = useState(true);
  const [billingInfo, setBillingInfo] = useState<any>(null);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  const loadBilling = () => {
    setLoading(true);
    try {
      const data = supabase.getBilling();
      setBillingInfo(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBilling();
  }, []);

  const handleUpgradeConfirm = () => {
    setUpgradeLoading(true);
    setTimeout(() => {
      try {
        const activeBilling = supabase.getBilling();
        const upgraded = {
          ...activeBilling,
          plan: 'Enterprise Scale Cluster',
          price: '149',
          limit_forms: 100,
          limit_syncs: 50000,
          usage_percent: Number(((activeBilling.used_syncs / 50000) * 100).toFixed(1)),
          history: [
            { id: `inv_${Math.floor(103 + Math.random() * 900)}`, amount: '149.00', status: 'Paid', date: new Date().toISOString().split('T')[0] },
            ...activeBilling.history
          ]
        };
        supabase.setBilling(upgraded);
        setBillingInfo(upgraded);
        setIsUpgradeOpen(false);
      } catch (err) {
        console.error(err);
      } finally {
        setUpgradeLoading(false);
      }
    }, 1500);
  };

  const handleDowngradePlan = () => {
    const data = supabase.getBilling();
    const downgraded = {
      ...data,
      plan: 'Professional Developer Plan',
      price: '49',
      limit_forms: 10,
      limit_syncs: 5000,
      usage_percent: Number(((data.used_syncs / 5000) * 100).toFixed(1))
    };
    supabase.setBilling(downgraded);
    setBillingInfo(downgraded);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const isUpgraded = billingInfo?.plan?.includes('Enterprise');
  const formsPercent = Number(((billingInfo?.used_forms / billingInfo?.limit_forms) * 100).toFixed(0));
  const syncsPercent = Number(((billingInfo?.used_syncs / billingInfo?.limit_syncs) * 100).toFixed(0));

  return (
    <div className="space-y-8" id="billing-subsystem-container">
      {/* Stripe-style Layout */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Card 1: Subscription Tier Profile */}
        <Card className="md:col-span-2 shadow-sm border-primary/20 bg-gradient-to-br from-background via-background to-primary/5">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 hover:bg-emerald-500/20 text-[10px] tracking-wide px-2 py-0.5 font-bold uppercase mb-1">
                  Active Subscription
                </Badge>
                <CardTitle className="text-lg font-bold tracking-tight text-foreground">
                  {billingInfo?.plan}
                </CardTitle>
                <CardDescription className="text-xs">
                  Your platform plan is active. Next contract renewal scheduled on July 01, 2026.
                </CardDescription>
              </div>

              <div className="flex flex-col items-end">
                <span className="text-2xl font-bold font-mono tracking-tight text-foreground">
                  ${billingInfo?.price}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mt-0.5">
                  USD / month
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-3 bg-muted/40 p-4 rounded-xl border border-border/80">
              <BadgeCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-foreground block">Corporate Wallet Linkage Verified</span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Automatic invoicing matches standard legal tax provisions. To routing custom billing records to secondary finance teams, adjust integration channels inside Settings.
                </p>
              </div>
            </div>

            {/* Quick tier control toggles */}
            <div className="flex items-center gap-3">
              {isUpgraded ? (
                <Button variant="outline" size="sm" onClick={handleDowngradePlan} className="text-xs h-9 px-3">
                  Downgrade to Developer Plan
                </Button>
              ) : (
                <Button id="btn-trigger-upgrade-form" onClick={() => setIsUpgradeOpen(true)} size="sm" className="text-xs h-9 px-4 font-semibold shadow-sm">
                  Upgrade to Enterprise Scale
                </Button>
              )}
              <Button variant="ghost" size="sm" className="text-xs h-9 px-3 text-muted-foreground hover:text-foreground">
                Update Payment Card
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Platform Status Summary */}
        <Card className="md:col-span-1 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4.5 w-4.5 text-muted-foreground" />
              Contract Parameters
            </CardTitle>
            <CardDescription className="text-xs">
              Review parameters allocated by corporate billing tiers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Overage Tunnels</span>
              <BadgeCheck className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Multi-account users</span>
              <span className="font-semibold text-foreground">Unlimited</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Custom SSL Domains</span>
              <span className="font-semibold text-foreground">{isUpgraded ? 'Unlimited' : 'Up to 3'}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">API Call Restricts</span>
              <span className="font-semibold text-foreground">unthrottled</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Meter Section */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4.5 w-4.5 text-muted-foreground" />
            Active Utilization Meters
          </CardTitle>
          <CardDescription className="text-xs">
            Reflecting actual server data synchronized during local Developer runs. Limits enforce throttling.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-8 md:grid-cols-2">
          {/* Meter 1: Forms allocated */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold">Webform Endpoints Allocations</span>
              <span className="font-mono text-muted-foreground">
                <strong className="text-foreground">{billingInfo?.used_forms}</strong> / {billingInfo?.limit_forms} slots ({formsPercent}%)
              </span>
            </div>
            <div className="h-3 w-full bg-muted rounded-full overflow-hidden border border-border/40">
              <div 
                className="h-full bg-indigo-500 transition-all duration-500 rounded-full" 
                style={{ width: `${Math.min(100, formsPercent)}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Allocated slot counts increment when creating forms, and decrement when deleting.
            </p>
          </div>

          {/* Meter 2: WooCommerce background hooks synced */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold">Woo Commerce Hook Synchronizations</span>
              <span className="font-mono text-muted-foreground">
                <strong className="text-foreground">{billingInfo?.used_syncs?.toLocaleString()}</strong> / {billingInfo?.limit_syncs?.toLocaleString()} actions ({syncsPercent}%)
              </span>
            </div>
            <div className="h-3 w-full bg-muted rounded-full overflow-hidden border border-border/40">
              <div 
                className="h-full bg-emerald-500 transition-all duration-500 rounded-full" 
                style={{ width: `${Math.min(100, syncsPercent)}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Synchronizing products logs counts. Resets automatically on contract renewal dates.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Invoice History billing tables */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <History className="h-4.5 w-4.5 text-muted-foreground" />
            Billing & Invoices History
          </CardTitle>
          <CardDescription className="text-xs">
            Review detailed, legal receipts generated from direct corporate payments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border border-border/80 rounded-lg overflow-hidden bg-background">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-xs font-semibold">Invoice ID</TableHead>
                  <TableHead className="text-xs font-semibold">Payment Date</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Invoiced Value</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Verification Status</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Receipt File</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billingInfo?.history?.map((inv: any) => (
                  <TableRow key={inv.id} className="hover:bg-muted/10 transition-colors">
                    <TableCell className="font-mono font-semibold text-xs text-foreground">
                      {inv.id}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs font-medium">
                      {new Date(inv.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </TableCell>
                    <TableCell className="text-center text-xs font-semibold font-mono text-foreground">
                      ${inv.amount} USD
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-600 border-none text-[10px] py-0.2 px-2 uppercase tracking-wide">
                        {inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 hover:bg-muted/80">
                        View Receipt
                        <ArrowUpRight className="h-3 w-3 shrink-0" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog: Upgrade Profile Plan */}
      <Dialog open={isUpgradeOpen} onOpenChange={setIsUpgradeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-indigo-500 shrink-0" />
              Confirm Plan Overrides
            </DialogTitle>
            <DialogDescription className="text-xs">
              Confirming scale updates replaces contract parameter thresholds on your platform clusters.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-1.5 bg-muted/40 p-4 border border-border/80 rounded-xl">
              <span className="text-xs font-semibold text-foreground block">Enterprise Level allocation shifts:</span>
              <ul className="text-xs text-muted-foreground space-y-2 list-disc pl-4 mt-2">
                <li>Webform slots extends from <strong>10</strong> to <strong>100 active components</strong>.</li>
                <li>Woo Commerce rest limits expands from <strong>5,000</strong> to <strong>50,000 calls monthly</strong>.</li>
                <li>Invoiced price adjusts to <strong>$149.00 USD monthly</strong>.</li>
              </ul>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="text-xs h-9" onClick={() => setIsUpgradeOpen(false)}>
              Discard
            </Button>
            <Button onClick={handleUpgradeConfirm} className="text-xs h-9 bg-primary" disabled={upgradeLoading}>
              {upgradeLoading && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
              Authorize Upgrades Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
