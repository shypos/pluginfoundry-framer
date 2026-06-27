import * as React from 'react';
import { Package, Trash2, Info, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { WCProduct } from '../types';

interface TabProductsProps {
  products: WCProduct[];
  handleDeleteProduct: (prodId: string) => void;
}

export default function TabProducts({ products, handleDeleteProduct }: TabProductsProps) {
  return (
    <Card className="shadow-sm font-sans">
      <CardHeader className="pb-3 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-foreground uppercase tracking-wider">
            <Package className="h-4 w-4 text-primary" />
            WooCommerce Live Cached Products
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">
            Retrieve, view and review current stock items synced from `/wp-json/wc/v3/products`.
          </CardDescription>
        </div>

        <div className="text-[11px] font-mono text-muted-foreground bg-muted p-1 px-2.5 rounded-md self-start sm:self-auto shrink-0">
          CATALOG INDEXING: {products.length} ITEMS
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {products.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Plus className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <h4 className="text-xs font-semibold text-foreground">No catalog items indexed</h4>
            <p className="text-[11px] text-muted-foreground max-w-xs mx-auto mt-1">
              We did not find any synced inventory. Run "Manual Sync" to connect WordPress indices.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-[10px] font-bold uppercase py-2.5 px-4 w-12">ID</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase py-2.5">Name / SKU</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase py-2.5">Price</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase py-2.5 text-center">In Stock</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase py-2.5">Category</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase py-2.5 text-right px-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id} className="hover:bg-muted/10 transition-colors">
                    <TableCell className="font-mono text-[10px] py-3 text-slate-500 pl-4 col-id">
                      {p.id}
                    </TableCell>
                    <TableCell className="py-3 col-name">
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{p.name}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">{p.sku || 'NO-SKU'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 col-price text-xs text-left">
                      {p.sale_price ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 line-through font-medium">${p.regular_price}</span>
                          <span className="text-emerald-600 font-bold font-mono">${p.sale_price}</span>
                        </div>
                      ) : (
                        <span className="font-mono font-semibold">${p.regular_price}</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 col-stock text-center">
                      <Badge 
                        variant="secondary" 
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.1 border-none rounded ${
                          p.stock_quantity > 10 
                            ? 'bg-emerald-500/10 text-emerald-600' 
                            : p.stock_quantity > 0 
                            ? 'bg-amber-500/10 text-amber-600' 
                            : 'bg-red-500/10 text-red-500'
                        }`}
                      >
                        {p.stock_quantity} qty
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 col-cat text-xs text-muted-foreground font-medium max-w-[120px] truncate text-left">
                      {p.categories}
                    </TableCell>
                    <TableCell className="py-3 col-actions text-right pr-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteProduct(p.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md cursor-pointerbtn-delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <CardFooter className="py-3 px-4 border-t border-border/80 bg-neutral-50 dark:bg-neutral-900/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-[11px] text-muted-foreground font-medium text-center sm:text-left">
        <span className="flex items-center gap-1">
          <Info className="h-3.5 w-3.5 text-primary shrink-0" /> Supported by the latest WooCommerce REST v3 protocol payloads
        </span>
        <span className="shrink-0 font-mono text-[10px]">VERIFIED CACHE BOUNDS</span>
      </CardFooter>
    </Card>
  );
}
