import { Badge } from "@/shared/components/ui/badge";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
  neu: { label: "Neu", variant: "default" },
  kontaktiert: { label: "Kontaktiert", variant: "secondary" },
  kein_interesse: { label: "Kein Interesse", variant: "destructive" },
  kunde: { label: "Kunde", variant: "outline", className: "border-green-500 text-green-600 bg-green-50" },
};

export function LeadStatusBadge({ status }: { status: string | null }) {
  const config = statusConfig[status || "neu"] || statusConfig.neu;

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}
