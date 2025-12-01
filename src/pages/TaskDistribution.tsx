import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DndContext, DragEndEvent, DragOverlay, pointerWithin } from "@dnd-kit/core";
import { useDashboardTasksAdmin } from "@/hooks/useDashboardTasksAdmin";
import { useReps } from "@/hooks/useReps";
import { useUpdateTask } from "@/hooks/useUpdateTask";
import { useUpdateChurnCallback } from "@/hooks/useUpdateChurnCallback";
import { useUpdateCustomerRep } from "@/hooks/useUpdateCustomerRep";
import { supabase } from "@/integrations/supabase/client";
import { DraggableTaskCard } from "@/components/DraggableTaskCard";
import { DroppableRepCard } from "@/components/DroppableRepCard";
import { TaskCard } from "@/components/TaskCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Filter, Calendar as CalendarIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { DashboardTask } from "@/hooks/useDashboardTasksAdmin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TaskDistribution() {
  const [selectedRepId, setSelectedRepId] = useState<string>("all");
  const [removedTaskIds, setRemovedTaskIds] = useState<string[]>([]);
  const [activeTask, setActiveTask] = useState<DashboardTask | null>(null);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [transferTask, setTransferTask] = useState<DashboardTask | null>(null);

  // Reminder dialog state
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
  const [selectedReminderDate, setSelectedReminderDate] = useState<Date | undefined>();
  const [activeReminderTaskId, setActiveReminderTaskId] = useState<string>("");

  const { data: allTasks, isLoading: tasksLoading } = useDashboardTasksAdmin();
  const { data: reps, isLoading: repsLoading } = useReps();
  const updateTaskMutation = useUpdateTask();
  const updateChurnCallbackMutation = useUpdateChurnCallback();
  const updateCustomerRepMutation = useUpdateCustomerRep();

  const filteredTasks = allTasks?.filter(task => {
    if (removedTaskIds.includes(task.task_id || "")) return false;
    if (selectedRepId !== "all" && task.rep_id?.toString() !== selectedRepId) return false;

    // Exclude completed tasks (YES/NO/LATER/DECLINED/CLAIMED)
    // The view already filters these, but we keep this for safety and optimistic updates
    // if (['YES', 'NO', 'LATER', 'DECLINED', 'CLAIMED'].includes(task.status || '')) return false;

    // Exclude verified tasks (Offers)
    if (task.verified_by_sales === true) return false;

    return true;
  });

  // Get tasks with reminder dates for admin overview (Offers)
  // Also filter by selectedRepId if set
  const reminderTasks = allTasks?.filter(task => {
    if (removedTaskIds.includes(task.task_id || "")) return false;

    // Only show tasks with reminder_date
    if (!task.reminder_date) return false;

    if (selectedRepId !== "all" && task.rep_id?.toString() !== selectedRepId) return false;

    return true;
  }).sort((a, b) => {
    // Sort by reminder_date ascending (if exists), otherwise by due_date
    const dateA = taskA_date(a);
    const dateB = taskB_date(b);
    return dateA - dateB;
  });

  function taskA_date(t: DashboardTask) {
    return t.reminder_date ? new Date(t.reminder_date).getTime() : (t.due_date ? new Date(t.due_date).getTime() : 0);
  }
  function taskB_date(t: DashboardTask) {
    return t.reminder_date ? new Date(t.reminder_date).getTime() : (t.due_date ? new Date(t.due_date).getTime() : 0);
  }

  const handleTaskComplete = async (
    taskId: string,
    taskType: string,
    action: string,
    failureReason?: string,
    note?: string,
    reminderDate?: string
  ) => {
    try {
      // Optimistically remove from list (except for OFFER which needs reminder date if not provided yet)
      if (!(taskType === 'promo' && action === 'OFFER' && !reminderDate)) {
        setRemovedTaskIds(prev => [...prev, taskId]);
      }

      if (taskType === "promo") {
        await updateTaskMutation.mutateAsync({
          id: taskId,
          updates: {
            status: action,
            verified_by_sales: true, // Mark as verified by sales rep
            ...(failureReason && { failure_reason: failureReason }),
            ...(note && { notitz_rep: note }),
            ...(reminderDate && { reminder_date: reminderDate }),
            // Clear reminder_date for CLAIMED status
            ...(action === 'CLAIMED' && { reminder_date: null })
          },
        });
      } else if (taskType === "churn") {
        const task = allTasks?.find(t => t.task_id === taskId);

        // If this is a new task (ID starts with 'churn_'), create the callback first
        if (taskId.startsWith('churn_')) {
          if (!task?.kunden_nummer) {
            throw new Error("Customer number not found for churn task");
          }

          // Create the callback entry
          const { data: newCallback, error: createError } = await supabase
            .from('churn_callbacks')
            .insert({
              kunden_nummer: task.kunden_nummer,
              action: action,
              Churn_Grund: failureReason || null,
              note: note || null,
              rep_username: 'admin',
              telegram_chat_id: 0
            })
            .select()
            .single();

          if (createError) throw createError;
        } else {
          // Update existing callback
          await updateChurnCallbackMutation.mutateAsync({
            id: taskId,
            action: action,
            churnReason: failureReason,
            note: note
          });
        }

        // If customer is retained, clear churn_alert_pending
        if (action === 'RETAINED') {
          if (task?.kunden_nummer) {
            await supabase
              .from('dim_customers')
              .update({ churn_alert_pending: false })
              .eq('kunden_nummer', task.kunden_nummer);
          }
        }
      }
      toast.success("Aufgabe erfolgreich aktualisiert!");
    } catch (error) {
      setRemovedTaskIds(prev => prev.filter(id => id !== taskId));
      toast.error("Fehler beim Aktualisieren der Aufgabe");
      console.error(error);
    }
  };

  const confirmReminder = async () => {
    if (!selectedReminderDate || !activeReminderTaskId) return;

    try {
      setRemovedTaskIds(prev => [...prev, activeReminderTaskId]);

      await updateTaskMutation.mutateAsync({
        id: activeReminderTaskId,
        updates: {
          status: 'OFFER',
          verified_by_sales: true,
          reminder_date: selectedReminderDate.toISOString().split('T')[0],
        }
      });

      toast.success("Erinnerung gesetzt!");
      setIsReminderDialogOpen(false);
      setSelectedReminderDate(undefined);
      setActiveReminderTaskId("");
    } catch (error) {
      console.error("Error setting reminder:", error);
      toast.error("Fehler beim Setzen der Erinnerung");
      setRemovedTaskIds(prev => prev.filter(id => id !== activeReminderTaskId));
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const task = active.data.current?.task as DashboardTask;
    const targetRep = over.data.current?.rep;

    if (!task || !targetRep || !task.kunden_nummer) return;

    // If already assigned to this rep, do nothing
    if (task.rep_id === targetRep.rep_id) {
      toast.info("Kunde ist bereits diesem Mitarbeiter zugewiesen");
      return;
    }

    // Optimistic update: If filtering by old rep, remove from view
    if (selectedRepId !== "all" && task.rep_id?.toString() === selectedRepId) {
      setRemovedTaskIds(prev => [...prev, task.task_id || ""]);
    }

    try {
      await updateCustomerRepMutation.mutateAsync({
        kunden_nummer: task.kunden_nummer,
        rep_id: targetRep.rep_id,
      });

      toast.success(`Kunde & Aufgabe an ${targetRep.name} übertragen`);
    } catch (error) {
      // Revert optimistic update on error
      setRemovedTaskIds(prev => prev.filter(id => id !== task.task_id));
      toast.error("Fehler beim Zuweisen der Aufgabe");
      console.error(error);
    }
  };

  const handleMobileTransfer = async (targetRepId: number) => {
    if (!transferTask || !transferTask.kunden_nummer) return;

    setTransferTask(null);

    // If already assigned to this rep, do nothing
    if (transferTask.rep_id === targetRepId) {
      toast.info("Kunde ist bereits diesem Mitarbeiter zugewiesen");
      return;
    }

    // Optimistic update
    if (selectedRepId !== "all" && transferTask.rep_id?.toString() === selectedRepId) {
      setRemovedTaskIds(prev => [...prev, transferTask.task_id || ""]);
    }

    try {
      await updateCustomerRepMutation.mutateAsync({
        kunden_nummer: transferTask.kunden_nummer,
        rep_id: targetRepId,
      });

      const targetRepName = reps?.find(r => r.rep_id === targetRepId)?.name;
      toast.success(`Kunde & Aufgabe an ${targetRepName} übertragen`);
    } catch (error) {
      setRemovedTaskIds(prev => prev.filter(id => id !== transferTask.task_id));
      toast.error("Fehler beim Zuweisen der Aufgabe");
      console.error(error);
    }
  };

  const RepListContent = () => (
    <div className="space-y-3">
      {reps?.map(rep => {
        const taskCount = allTasks?.filter(t => {
          if (t.rep_id !== rep.rep_id) return false;
          if (removedTaskIds.includes(t.task_id || "")) return false;

          // Apply same filters as main view:
          // Exclude completed tasks
          // if (['YES', 'NO', 'LATER', 'DECLINED', 'CLAIMED'].includes(t.status || '')) return false;
          // Exclude verified tasks (Offers)
          if (t.verified_by_sales === true) return false;

          return true;
        }).length || 0;

        return (
          <DroppableRepCard
            key={rep.rep_id}
            rep={rep}
            taskCount={taskCount}
            isSelected={selectedRepId === rep.rep_id.toString()}
            onClick={() => {
              setSelectedRepId(rep.rep_id.toString());
              setIsMobileFilterOpen(false);
            }}
          />
        );
      })}
    </div>
  );

  const FilterControls = () => (
    <div className="mb-4 sm:mb-6 flex items-center justify-between">
      {/* Desktop Filter Dropdown */}
      <div className="hidden lg:block">
        <Select value={selectedRepId} onValueChange={setSelectedRepId}>
          <SelectTrigger className="w-full max-w-64">
            <SelectValue placeholder="Mitarbeiter anzeigen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            {reps?.map(rep => (
              <SelectItem key={rep.rep_id} value={rep.rep_id.toString()}>
                {rep.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Mobile Filter Button */}
      <Sheet open={isMobileFilterOpen} onOpenChange={setIsMobileFilterOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="lg:hidden w-full sm:w-auto">
            <Filter className="mr-2 h-4 w-4" />
            {selectedRepId === "all"
              ? "Alle Mitarbeiter"
              : reps?.find(r => r.rep_id.toString() === selectedRepId)?.name || "Filter"}
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[300px] sm:w-[400px]">
          <SheetHeader>
            <SheetTitle>Mitarbeiter filtern</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <Button
              variant={selectedRepId === "all" ? "default" : "ghost"}
              className="w-full justify-start mb-2"
              onClick={() => {
                setSelectedRepId("all");
                setIsMobileFilterOpen(false);
              }}
            >
              Alle Mitarbeiter
            </Button>
            <RepListContent />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );

  if (tasksLoading || repsLoading) {
    return (
      <div className="w-full max-w-[100vw] overflow-x-hidden">
        <div className="p-4 sm:p-6">
          <Skeleton className="h-10 w-full max-w-64 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <DndContext onDragEnd={handleDragEnd} collisionDetection={pointerWithin}>
      {/* Reminder Dialog */}
      <Dialog open={isReminderDialogOpen} onOpenChange={setIsReminderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Erinnerung setzen</DialogTitle>
            <DialogDescription>
              Wann möchten Sie an diese Aufgabe erinnert werden?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Calendar
              mode="single"
              selected={selectedReminderDate}
              onSelect={setSelectedReminderDate}
              disabled={(date) => date < new Date()}
              className="rounded-md border"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReminderDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={confirmReminder} disabled={!selectedReminderDate}>
              Erinnerung setzen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex h-full w-full max-w-[100vw] overflow-x-hidden flex-col p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold">Aufgaben Verteilung</h1>
        </div>

        <Tabs defaultValue="tasks" className="w-full flex-1 flex flex-col">
          <TabsList className="mb-4 w-full md:w-auto self-start">
            <TabsTrigger value="tasks">Aufgabenverteilung</TabsTrigger>
            <TabsTrigger value="offers">Angebote Übersicht</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="flex-1 flex flex-col overflow-hidden">
            <div className="flex flex-1 w-full overflow-hidden">
              <div className="flex-1 overflow-auto pr-0 lg:pr-4">
                <FilterControls />
                <motion.div
                  layout
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 pb-20"
                >
                  <AnimatePresence mode="popLayout">
                    {filteredTasks && filteredTasks.length > 0 ? (
                      filteredTasks.map(task => (
                        <motion.div
                          key={task.task_id}
                          layout
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8, x: 100 }}
                          transition={{ duration: 0.3 }}
                        >
                          {/* Desktop: Draggable task card */}
                          <div className="hidden md:block">
                            <DraggableTaskCard
                              task={task}
                              onComplete={handleTaskComplete}
                            />
                          </div>
                          {/* Mobile: Regular task card with transfer button */}
                          <div className="md:hidden">
                            <TaskCard
                              task={task}
                              onComplete={handleTaskComplete}
                              onTransfer={() => setTransferTask(task)}
                              showMobileTransfer={true}
                            />
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="col-span-full"
                      >
                        <Card className="p-12 text-center">
                          <p className="text-muted-foreground text-lg">
                            Keine Aufgaben gefunden
                          </p>
                        </Card>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>

              {/* Desktop Sticky Sidebar */}
              <div className="hidden lg:block w-80 border-l bg-card/50 overflow-auto h-full">
                <div className="sticky top-0 p-6">
                  <h2 className="text-xl font-semibold mb-4">Außendienstler</h2>
                  <RepListContent />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="offers" className="flex-1 overflow-auto">
            <div className="mb-4">
              <FilterControls />
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-orange-600" />
                  <CardTitle className="text-xl text-orange-600">Erinnerungen Übersicht</CardTitle>
                  <Badge variant="secondary">{reminderTasks?.length || 0}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {reminderTasks && reminderTasks.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mitarbeiter</TableHead>
                        <TableHead>Kunde</TableHead>
                        <TableHead>Kampagne</TableHead>
                        <TableHead>Erinnerungs-Datum</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reminderTasks.map(task => {
                        const reminderDate = new Date(task.reminder_date!);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const isDue = reminderDate <= today;

                        return (
                          <TableRow key={task.task_id}>
                            <TableCell className="font-medium">{task.rep_name}</TableCell>
                            <TableCell>{task.firma}</TableCell>
                            <TableCell>{task.title}</TableCell>
                            <TableCell>{reminderDate.toLocaleDateString("de-DE")}</TableCell>
                            <TableCell>
                              <Badge variant={isDue ? "destructive" : "secondary"}>
                                {isDue ? "Fällig" : "Ausstehend"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    Keine Angebote mit Erinnerungen gefunden
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Mobile Transfer Drawer */}
      <Sheet open={!!transferTask} onOpenChange={(open) => !open && setTransferTask(null)}>
        <SheetContent side="bottom" className="h-[50vh]">
          <SheetHeader>
            <SheetTitle>Mitarbeiter auswählen</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-2 overflow-auto max-h-[calc(50vh-120px)]">
            {reps?.map(rep => {
              const isCurrentRep = transferTask?.rep_id === rep.rep_id;
              return (
                <Button
                  key={rep.rep_id}
                  variant={isCurrentRep ? "secondary" : "ghost"}
                  className="w-full justify-start h-auto py-3"
                  onClick={() => handleMobileTransfer(rep.rep_id)}
                  disabled={isCurrentRep}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold">
                        {rep.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                      </span>
                    </div>
                    <div className="text-left">
                      <p className="font-medium">{rep.name}</p>
                      {isCurrentRep && (
                        <p className="text-xs text-muted-foreground">Aktuell zugewiesen</p>
                      )}
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      <DragOverlay>
        {activeTask ? (
          <div className="opacity-80 rotate-3">
            <TaskCard task={activeTask} onComplete={() => { }} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
