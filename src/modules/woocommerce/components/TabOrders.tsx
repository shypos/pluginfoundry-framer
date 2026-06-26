import * as React from 'react';
import { ShoppingCart, Trash2, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WCOrder } from '../types';

interface TabOrdersProps {
  orders: WCOrder[];
  selectedStore: any;
  setOrders: React.Dispatch<React.SetStateAction<WCOrder[]>>;
  toggleOrderStatus: (orderId: string) => void;
  deleteOrder: (orderId: string) => void;
}

export default function TabOrders({ orders, selectedStore, setOrders, toggleOrderStatus, deleteOrder }: TabOrdersProps) {
  return (
    <Card className="shadow-sm font-sans">
      <CardHeader className="pb-3 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-foreground uppercase tracking-wider">
            <ShoppingCart className="h-4 w-4 text-orange-500" />
            WooCommerce Synced Orders Ledger
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">
            Review direct Wordpress client purchase transactions and completed order status flags.
          </CardDescription>
        </div>

        {orders.length > 0 && (
          <Button 
            onClick={() => {
              if (confirm('Clear store orders logs?')) {
                setOrders([]);
                localStorage.setItem(`wc_orders_${selectedStore.id}`, JSON.stringify([]));
              }
            }}
            variant="ghost" 
            size="sm" 
            className="text-[11px] h-8 text-destructive hover:bg-destructive/10 cursor-pointer btn-clear-ledger"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Clear Ledger
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {orders.length === 0 ? (
          <div className="text-center py-16 px-4 font-sans">
            <ShoppingCart className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <h4 className="text-xs font-semibold text-foreground">No sync orders found</h4>
            <p className="text-[11px] text-muted-foreground max-w-xs mx-auto mt-1">
              Active online customer checkouts from your storefront will synchronise directly onto this ledger view.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60 font-sans">
            {orders.map((ord) => (
              <div key={ord.id} className="p-4 hover:bg-muted/5 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 order-item">
                <div className="space-y-1.5 flex-1 text-left">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                      {ord.id}
                    </span>
                    <Badge 
                      onClick={() => toggleOrderStatus(ord.id)}
                      variant="secondary" 
                      className={`text-[9px] font-bold uppercase tracking-wide cursor-pointer py-0 px-2 border-none rounded ${
                        ord.status === 'completed' 
                          ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15' 
                          : ord.status === 'processing' 
                          ? 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/15' 
                          : 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/15'
                      }`}
                    >
                      {ord.status}
                    </Badge>

                    <span className="text-[10px] text-muted-foreground font-mono">
                      {new Date(ord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, {new Date(ord.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 text-xs pt-1">
                    <div>
                      <span className="text-muted-foreground font-semibold block text-[9px] uppercase tracking-wider">Customer Information</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{ord.customer.name}</span>
                      <span className="text-muted-foreground block text-[11px] font-mono leading-tight">{ord.customer.email} | {ord.customer.city}</span>
                    </div>

                    <div>
                      <span className="text-muted-foreground font-semibold block text-[9px] uppercase tracking-wider">Line Commodities</span>
                      {ord.line_items.map((line, liIdx) => (
                        <span key={liIdx} className="block text-slate-700 dark:text-slate-300 font-medium truncate max-w-[200px]">
                          {line.quantity}x {line.name} (@${line.price})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 border-t border-dashed border-border pt-3 md:pt-0 md:border-none">
                  <div className="text-left md:text-right">
                    <span className="text-muted-foreground text-[9px] uppercase block font-semibold tracking-wider">Gross Revenue</span>
                    <span className="font-mono text-sm font-black text-slate-900 dark:text-slate-50">${ord.total}</span>
                  </div>

                  <div className="flex gap-1 items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleOrderStatus(ord.id)}
                      title="Change status"
                      className="text-xs h-8 text-slate-600 font-medium cursor-pointer"
                    >
                      Toggle
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteOrder(ord.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
