import { Clock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Customer } from "@/hooks/useCustomers";

interface OpeningHoursDisplayProps {
    customer: Customer;
    compact?: boolean;
}

const DAYS = [
    { key: 'mon', label: 'Mo' },
    { key: 'tue', label: 'Di' },
    { key: 'wed', label: 'Mi' },
    { key: 'thu', label: 'Do' },
    { key: 'fri', label: 'Fr' },
    { key: 'sat', label: 'Sa' },
    { key: 'sun', label: 'So' },
] as const;

// Format time: "10:00-22:00" -> "10-22", "Ruhetag" -> "—"
const formatTime = (value: string | null): string => {
    if (!value) return "";
    if (value === "Ruhetag") return "—";

    const match = value.match(/(\d{1,2}):\d{2}-(\d{1,2}):\d{2}/);
    if (match) {
        return `${match[1]}-${match[2]}`;
    }
    return value;
};

export function OpeningHoursDisplay({ customer, compact = false }: OpeningHoursDisplayProps) {
    const hasOpeningHours = customer.opening_hours_mon || customer.opening_hours_tue ||
        customer.opening_hours_wed || customer.opening_hours_thu ||
        customer.opening_hours_fri || customer.opening_hours_sat || customer.opening_hours_sun;

    if (!hasOpeningHours) {
        return (
            <div className="flex items-center gap-1 text-orange-500">
                <Clock className="h-3 w-3" />
                <span className="text-xs">Fehlt</span>
            </div>
        );
    }

    // Build day entries
    const dayEntries = DAYS.map(day => ({
        label: day.label,
        value: customer[`opening_hours_${day.key}` as keyof Customer] as string | null,
        formatted: formatTime(customer[`opening_hours_${day.key}` as keyof Customer] as string | null)
    }));

    if (compact) {
        // Mobile: compact 2-column grid
        return (
            <div className="grid grid-cols-4 gap-x-2 gap-y-0.5 text-[10px]">
                {dayEntries.map(({ label, formatted }) => (
                    <div key={label} className="flex gap-0.5">
                        <span className="font-medium text-muted-foreground">{label}</span>
                        <span className={formatted === "—" ? "text-muted-foreground" : "text-green-600"}>
                            {formatted || "—"}
                        </span>
                    </div>
                ))}
            </div>
        );
    }

    // Desktop: vertical list with tooltip for notes
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="grid grid-cols-4 gap-x-2 gap-y-0 text-[10px] cursor-help">
                        {dayEntries.map(({ label, formatted }) => (
                            <div key={label} className="flex gap-0.5 whitespace-nowrap">
                                <span className="font-medium text-muted-foreground w-4">{label}</span>
                                <span className={formatted === "—" ? "text-muted-foreground" : ""}>
                                    {formatted || "—"}
                                </span>
                            </div>
                        ))}
                    </div>
                </TooltipTrigger>
                {customer.opening_hours_notes && (
                    <TooltipContent side="left">
                        <p className="text-xs max-w-[200px]">{customer.opening_hours_notes}</p>
                    </TooltipContent>
                )}
            </Tooltip>
        </TooltipProvider>
    );
}
