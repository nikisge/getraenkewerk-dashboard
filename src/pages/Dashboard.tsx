import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useReps } from "@/hooks/useReps";
import { useRepTasks } from "@/hooks/useTasks";
import { useRepPerformance, useRepPerformanceById } from "@/hooks/useRepPerformance";
import { useUpdateTask } from "@/hooks/useUpdateTask";
import { NewRepModal } from "@/components/NewRepModal";
import { RepDashboard } from "@/components/RepDashboard";
import { useRepCompletedActivities } from "@/hooks/useRepCompletedActivities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Users, TrendingUp, CheckCircle2, Clock } from "lucide-react";

export default function Dashboard() {
  const { rep } = useAuth();

  // If user is a sales rep (not admin), show RepDashboard
  if (rep?.role === 'rep') {
    return <RepDashboard />;
  }

  // Otherwise show the full admin dashboard
  const [selectedRepId, setSelectedRepId] = useState<number | null>(null);
  const { data: reps, isLoading: repsLoading } = useReps();
  const { data: tasks, isLoading: tasksLoading } = useRepTasks(selectedRepId);
  const { data: performance, isLoading: perfLoading } = useRepPerformanceById(selectedRepId);
  const { data: allPerformance, isLoading: allPerfLoading } = useRepPerformance();
  const { data: completedActivities, isLoading: activitiesLoading } = useRepCompletedActivities(selectedRepId);
  const updateTask = useUpdateTask();
  const { toast } = useToast();

  const selectedRep = reps?.find((r) => r.rep_id === selectedRepId);

  const stats = tasks?.reduce((acc, task) => {
    acc.total++;
    if (task.status === "YES") acc.completed++;
    return acc;
  }, { total: 0, completed: 0 }) || { total: 0, completed: 0 };

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await updateTask.mutateAsync({
        id: taskId,
        updates: { status: newStatus, last_change: new Date().toISOString() },
      });
      toast({
        title: "Erfolg",
        description: "Task-Status wurde aktualisiert",
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Task konnte nicht aktualisiert werden",
        variant: "destructive",
      });
    }
  };

  const handleNoteChange = async (taskId: string, newNote: string) => {
    try {
      await updateTask.mutateAsync({
        id: taskId,
        updates: { note: newNote },
      });
    } catch (error) {
      toast({
        title: "Fehler",
        description: "Notiz konnte nicht gespeichert werden",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Außendienstler-Übersicht</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="flex justify-start">
            <NewRepModal />
          </div>

          <Card>
            <CardContent className="p-0">
              {repsLoading ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="divide-y">
                  {reps?.map((rep) => (
                    <button
                      key={rep.rep_id}
                      onClick={() => setSelectedRepId(rep.rep_id)}
                      className={cn(
                        "w-full p-4 text-left transition-colors hover:bg-muted",
                        selectedRepId === rep.rep_id && "bg-muted"
                      )}
                    >
                      <div className="font-medium">{rep.name}</div>
                      <div className="text-sm text-muted-foreground">ID: {rep.rep_id}</div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-9 space-y-6">
          {!selectedRep ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Team-Übersicht</h2>
                <p className="text-muted-foreground">Wählen Sie einen Außendienstler aus, um Details zu sehen</p>
              </div>

              {allPerfLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-48" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {allPerformance?.map((perf) => (
                    <Card
                      key={perf.rep_id}
                      className="cursor-pointer transition-all hover:shadow-lg hover:scale-105"
                      onClick={() => setSelectedRepId(perf.rep_id)}
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base sm:text-lg truncate">{perf.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                          <div className="space-y-1 sm:space-y-2">
                            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground h-4 sm:h-5">
                              <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                              <span className="truncate">Abschlussrate</span>
                            </div>
                            <div className="text-xl sm:text-2xl font-bold">
                              {perf.completion_rate?.toFixed(0) || 0}%
                            </div>
                          </div>

                          <div className="space-y-1 sm:space-y-2">
                            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground h-4 sm:h-5">
                              <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                              <span className="truncate">Offene Tasks</span>
                            </div>
                            <div className="text-xl sm:text-2xl font-bold">
                              {perf.open_tasks || 0}
                            </div>
                          </div>

                          <div className="space-y-1 sm:space-y-2">
                            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground h-4 sm:h-5">
                              <Users className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                              <span className="truncate">Kunden</span>
                            </div>
                            <div className="text-xl sm:text-2xl font-bold">
                              {perf.assigned_customers || 0}
                            </div>
                          </div>

                          <div className="space-y-1 sm:space-y-2">
                            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground h-4 sm:h-5">
                              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                              <span className="truncate">Tasks/Tag</span>
                            </div>
                            <div className="text-xl sm:text-2xl font-bold">
                              {perf.tasks_per_day_7d?.toFixed(1) || 0}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-2xl font-bold mb-4">{selectedRep.name}</h2>

                {perfLoading ? (
                  <Skeleton className="h-64" />
                ) : performance ? (
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Erfüllungsgrad</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4">
                          <div className="relative h-24 w-24">
                            <svg className="transform -rotate-90" viewBox="0 0 36 36">
                              <circle
                                cx="18"
                                cy="18"
                                r="16"
                                fill="none"
                                stroke="hsl(var(--muted))"
                                strokeWidth="3"
                              />
                              <circle
                                cx="18"
                                cy="18"
                                r="16"
                                fill="none"
                                stroke="hsl(var(--primary))"
                                strokeWidth="3"
                                strokeDasharray={`${performance.completion_rate || 0} ${100 - (performance.completion_rate || 0)}`}
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-xl font-bold">{performance.completion_rate?.toFixed(0) || 0}%</span>
                            </div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold">{performance.completed_tasks} / {performance.total_tasks}</div>
                            <div className="text-sm text-muted-foreground">erledigt</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Tasks pro Tag</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div>
                            <div className="text-2xl font-bold">{performance.tasks_per_day_7d}</div>
                            <div className="text-sm text-muted-foreground">Letzte 7 Tage</div>
                          </div>
                          <div>
                            <div className="text-lg font-semibold text-muted-foreground">{performance.tasks_per_day_30d}</div>
                            <div className="text-xs text-muted-foreground">Letzte 30 Tage</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Kunden</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Gesamt:</span>
                            <span className="font-bold">{performance.assigned_customers}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Aktiv:</span>
                            <span className="font-semibold text-green-600">{performance.active_customers}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">At Risk:</span>
                            <span className="font-semibold text-red-600">{performance.at_risk_customers}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : null}

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Offene & Pending Tasks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {performance && (
                      <div className="flex gap-6 text-sm">
                        <div>
                          <span className="text-muted-foreground">Offen: </span>
                          <span className="font-bold text-lg">{performance.open_tasks}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Pending: </span>
                          <span className="font-bold text-lg">{performance.pending_tasks}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Bearbeitete Aufgaben (letzte 7 Tage)</CardTitle>
                </CardHeader>
                <CardContent>
                  {activitiesLoading ? (
                    <Skeleton className="h-64" />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Zeitpunkt</TableHead>
                          <TableHead>Kunde</TableHead>
                          <TableHead>Typ</TableHead>
                          <TableHead>Aktion</TableHead>
                          <TableHead>Notiz</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {completedActivities?.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                              Keine bearbeiteten Aufgaben in den letzten 7 Tagen
                            </TableCell>
                          </TableRow>
                        ) : (
                          completedActivities?.map((activity) => (
                            <TableRow key={activity.id}>
                              <TableCell className="text-sm">
                                {new Date(activity.timestamp).toLocaleString("de-DE", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{activity.customer_name}</div>
                                <div className="text-sm text-muted-foreground">
                                  #{activity.kunden_nummer}
                                </div>
                              </TableCell>
                              <TableCell>{activity.campaign_or_type}</TableCell>
                              <TableCell>
                                <span className={cn(
                                  "px-2 py-1 rounded text-xs font-medium",
                                  activity.action.includes("gekauft") && "bg-green-100 text-green-800",
                                  activity.action.includes("Angebot") && "bg-blue-100 text-blue-800",
                                  activity.action.includes("abgelehnt") && "bg-red-100 text-red-800",
                                  activity.action.includes("wieder") && "bg-green-100 text-green-800",
                                  activity.action.includes("verloren") && "bg-red-100 text-red-800"
                                )}>
                                  {activity.action}
                                </span>
                              </TableCell>
                              <TableCell className="max-w-xs truncate">
                                {activity.note || "-"}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
