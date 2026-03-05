import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ActivityLogEntry } from "../hooks/useActivityLog";
import { parseUserAgent } from "../services/parseUserAgent";

interface Props {
  entries: ActivityLogEntry[];
  repMap: Map<number, string>;
  isLoading: boolean;
}

const ACTION_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
  login:  { label: "Login", variant: "default", className: "bg-green-600 hover:bg-green-700" },
  logout: { label: "Logout", variant: "secondary" },
  create: { label: "Erstellt", variant: "default", className: "bg-blue-600 hover:bg-blue-700" },
  update: { label: "Bearbeitet", variant: "default", className: "bg-yellow-600 hover:bg-yellow-700" },
  delete: { label: "Gelöscht", variant: "destructive" },
};

const ENTITY_LABELS: Record<string, string> = {
  task: "Aufgabe",
  customer: "Kunde",
  campaign: "Kampagne",
  churn_callback: "Rückruf",
  route: "Route",
  route_stop: "Haltestelle",
  action: "Aktion",
  rep: "Mitarbeiter",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DeviceCell({ userAgent, details }: { userAgent: string | null; details: Record<string, unknown> | null }) {
  // For login events, device info is stored in details
  if (details && details.browser) {
    return (
      <span className="text-xs text-muted-foreground">
        {String(details.browser)}/{String(details.os)} &middot; {String(details.deviceType)}
      </span>
    );
  }
  if (!userAgent) return <span className="text-xs text-muted-foreground">—</span>;
  const info = parseUserAgent(userAgent);
  return (
    <span className="text-xs text-muted-foreground">
      {info.browser}/{info.os} &middot; {info.deviceType}
    </span>
  );
}

export function ActivityLogTable({ entries, repMap, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return <p className="text-muted-foreground text-center py-8">Keine Einträge gefunden.</p>;
  }

  return (
    <div className="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">Zeitpunkt</TableHead>
            <TableHead>Mitarbeiter</TableHead>
            <TableHead>Aktion</TableHead>
            <TableHead>Bereich</TableHead>
            <TableHead>Details</TableHead>
            <TableHead>Gerät</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => {
            const config = ACTION_CONFIG[entry.action_type] || { label: entry.action_type, variant: "outline" as const };
            return (
              <TableRow key={entry.id}>
                <TableCell className="text-sm whitespace-nowrap">{formatDate(entry.created_at)}</TableCell>
                <TableCell className="text-sm">{repMap.get(entry.rep_id) || `Rep #${entry.rep_id}`}</TableCell>
                <TableCell>
                  <Badge variant={config.variant} className={config.className}>
                    {config.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {entry.entity_type ? (ENTITY_LABELS[entry.entity_type] || entry.entity_type) : "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                  {entry.entity_id ? `#${entry.entity_id}` : "—"}
                </TableCell>
                <TableCell>
                  <DeviceCell userAgent={entry.user_agent} details={entry.details} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
