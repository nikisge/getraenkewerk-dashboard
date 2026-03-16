import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { LeadStatus } from "../hooks/useLeads";

const statusOptions: { value: LeadStatus; label: string }[] = [
  { value: "neu", label: "Neu" },
  { value: "kontaktiert", label: "Kontaktiert" },
  { value: "kein_interesse", label: "Kein Interesse" },
  { value: "kunde", label: "Kunde" },
];

interface LeadStatusSelectProps {
  value: string | null;
  onChange: (status: LeadStatus) => void;
}

export function LeadStatusSelect({ value, onChange }: LeadStatusSelectProps) {
  return (
    <Select value={value || "neu"} onValueChange={(v) => onChange(v as LeadStatus)}>
      <SelectTrigger className="w-[150px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-popover">
        {statusOptions.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
