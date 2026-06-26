import * as React from 'react';
import { Clock, RefreshCw, Loader2, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { SyncLog } from '../types';

interface TabSyncLogsProps {
  syncLogs: SyncLog[];
  loadingLogs: boolean;
  fetchSyncLogs: (storeId?: string) => void;
  selectedStore: any;
}

export default function TabSyncLogs({ syncLogs, loadingLogs, fetchSyncLogs, selectedStore }: TabSyncLogsProps) {
  return (
    <Card className="shadow-sm border-border font-sans">
      <CardHeader className="pb-3 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
        <div>
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-foreground uppercase tracking-wider">
            <Clock className="h-4 w-4 text-primary" />
            Synchronization Log Ledger History
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">
            Audit background cron loops, manual updates and error output telemetry.
          </CardDescription>
        </div>
        <Button
          size="sm"
          variant="outline"
          type="button"
          onClick={() => fetchSyncLogs(selectedStore.id)}
          className="text-xs gap-1 h-8 cursor-pointer btn-refresh-logs"
        >
          <RefreshCw className={`h-3 w-3 ${loadingLogs ? 'animate-spin' : ''}`} />
          Refresh Logs
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {loadingLogs && syncLogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
            Loading activity logs...
          </div>
        ) : syncLogs.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Info className="h-10 w-10 text-muted-foreground/45 mx-auto mb-3" />
            <h4 className="text-xs font-semibold text-foreground">No recent log entries logged</h4>
            <p className="text-[11px] text-muted-foreground mt-1 mx-auto max-w-xs">
              Manual syncer triggers or automated cron tasks populate this operational tracking board.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-[10px] font-bold uppercase py-2.5 px-4 w-32">Time</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase py-2.5">Sync Scope</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase py-2.5">Status</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase py-2.5">Details</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase py-2.5 text-right px-4">Errors</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncLogs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/10 transition-colors log-row">
                    <TableCell className="font-mono text-[10px] py-3.5 pl-4 text-slate-500 text-left">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, {new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </TableCell>
                    <TableCell className="py-3.5 text-xs text-left font-semibold text-slate-700 dark:text-slate-300">
                      {log.eventType}
                    </TableCell>
                    <TableCell className="py-3.5 text-left">
                      <Badge 
                        variant="secondary" 
                        className={`text-[8px] font-bold uppercase tracking-wider py-[1px] px-1.5 border-none rounded ${
                          log.status === 'success' 
                            ? 'bg-emerald-500/10 text-emerald-600' 
                            : 'bg-red-500/10 text-red-500'
                        }`}
                      >
                        {log.status === 'success' ? 'SUCCESS' : 'FAILED'}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3.5 text-xs text-muted-foreground font-medium text-left max-w-xs truncate" title={log.details}>
                      {log.details}
                    </TableCell>
                    <TableCell className="py-3.5 text-[11px] font-mono text-red-500 font-semibold text-right pr-4 truncate max-w-[124px]">
                      {log.errorLog && log.errorLog !== "None" ? log.errorLog : <span className="text-slate-400 font-normal">None</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
