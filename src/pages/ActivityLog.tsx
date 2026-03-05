import { useState, useMemo } from "react";
import { Button } from "@/shared/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useActivityLog, ActivityLogFilters } from "@/features/activity/hooks/useActivityLog";
import { ActivityLogFiltersBar } from "@/features/activity/components/ActivityLogFilters";
import { ActivityLogTable } from "@/features/activity/components/ActivityLogTable";
import { useReps } from "@/features/reps/hooks/useReps";

const PAGE_SIZE = 50;

export default function ActivityLog() {
  const [filters, setFilters] = useState<ActivityLogFilters>({});
  const [page, setPage] = useState(0);

  const { data, isLoading } = useActivityLog(filters, page, PAGE_SIZE);
  const { data: reps } = useReps();

  const repMap = useMemo(() => {
    const m = new Map<number, string>();
    reps?.forEach((r) => m.set(r.rep_id, r.name));
    return m;
  }, [reps]);

  const totalPages = data ? Math.ceil(data.totalCount / PAGE_SIZE) : 0;

  const handleFilterChange = (newFilters: ActivityLogFilters) => {
    setFilters(newFilters);
    setPage(0);
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-bold">Aktivitätsprotokoll</h1>

      <ActivityLogFiltersBar filters={filters} onChange={handleFilterChange} />

      <ActivityLogTable
        entries={data?.entries ?? []}
        repMap={repMap}
        isLoading={isLoading}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Seite {page + 1} von {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
