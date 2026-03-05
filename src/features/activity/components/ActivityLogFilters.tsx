import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Input } from "@/shared/components/ui/input";
import { useReps } from "@/features/reps/hooks/useReps";
import { ActivityLogFilters as Filters } from "../hooks/useActivityLog";

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

const ACTION_TYPES = [
  { value: "login", label: "Login" },
  { value: "logout", label: "Logout" },
  { value: "create", label: "Erstellt" },
  { value: "update", label: "Bearbeitet" },
  { value: "delete", label: "Gelöscht" },
];

const ENTITY_TYPES = [
  { value: "task", label: "Aufgabe" },
  { value: "customer", label: "Kunde" },
  { value: "campaign", label: "Kampagne" },
  { value: "churn_callback", label: "Rückruf" },
  { value: "route", label: "Route" },
  { value: "route_stop", label: "Haltestelle" },
  { value: "action", label: "Aktion" },
  { value: "rep", label: "Mitarbeiter" },
];

export function ActivityLogFiltersBar({ filters, onChange }: Props) {
  const { data: reps } = useReps();

  return (
    <div className="flex flex-wrap gap-3">
      <Select
        value={filters.repId ? String(filters.repId) : "all"}
        onValueChange={(v) => onChange({ ...filters, repId: v === "all" ? null : Number(v) })}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Mitarbeiter" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle Mitarbeiter</SelectItem>
          {reps?.map((rep) => (
            <SelectItem key={rep.rep_id} value={String(rep.rep_id)}>
              {rep.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.actionType || "all"}
        onValueChange={(v) => onChange({ ...filters, actionType: v === "all" ? null : v })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Aktion" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle Aktionen</SelectItem>
          {ACTION_TYPES.map((t) => (
            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.entityType || "all"}
        onValueChange={(v) => onChange({ ...filters, entityType: v === "all" ? null : v })}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Bereich" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle Bereiche</SelectItem>
          {ENTITY_TYPES.map((t) => (
            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        type="date"
        className="w-[160px]"
        value={filters.dateFrom || ""}
        onChange={(e) => onChange({ ...filters, dateFrom: e.target.value || null })}
        placeholder="Von"
      />
      <Input
        type="date"
        className="w-[160px]"
        value={filters.dateTo || ""}
        onChange={(e) => onChange({ ...filters, dateTo: e.target.value || null })}
        placeholder="Bis"
      />
    </div>
  );
}
