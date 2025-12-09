import { useDashboardTasks } from "@/hooks/useDashboardTasks";
import { useActions } from "@/hooks/useActions";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateTask } from "@/hooks/useUpdateTask";
import { useUpdateChurnCallback } from "@/hooks/useUpdateChurnCallback";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskListView } from "@/components/TaskListView";
import { Calendar as CalendarIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { useCampaigns } from "@/hooks/useCampaigns";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { OfferCard } from "@/components/OfferCard";
import { CampaignCard } from "@/components/CampaignCard";
import { OfferDialog } from "@/components/OfferDialog";
import { DashboardTask } from "@/hooks/useDashboardTasks";

export function RepDashboard() {
  const { rep } = useAuth();
  const { data: tasks, isLoading: tasksLoading } = useDashboardTasks(rep?.auth_token);
  const { data: actions, isLoading: actionsLoading } = useActions();
  const { data: campaigns, isLoading: campaignsLoading } = useCampaigns();
  const updateTask = useUpdateTask();
  const updateChurnCallback = useUpdateChurnCallback();
  const [removedTaskIds, setRemovedTaskIds] = useState<string[]>([]);

  // Reminder dialog state
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
  const [selectedReminderDate, setSelectedReminderDate] = useState<Date | undefined>();
  const [activeTaskId, setActiveTaskId] = useState<string>("");
  const [editingOfferTask, setEditingOfferTask] = useState<DashboardTask | null>(null);

  const handleTaskComplete = async (taskId: string, taskType: string, action: string, failureReason?: string, note?: string, reminderDate?: string) => {
    try {
      // Optimistically remove from list (except for OFFER which needs reminder date if not provided yet)
      if (!(taskType === 'promo' && action === 'OFFER' && !reminderDate)) {
        setRemovedTaskIds(prev => [...prev, taskId]);
      }

      if (taskType === 'promo') {
        await updateTask.mutateAsync({
          id: taskId,
          updates: {
            status: action,
            verified_by_sales: true, // Mark as verified by sales rep
            ...(failureReason && { failure_reason: failureReason }),
            ...(note && { notitz_rep: note }),
            ...(reminderDate && { reminder_date: reminderDate }),
            // Clear reminder_date for CLAIMED and DECLINED status
            ...((action === 'CLAIMED' || action === 'DECLINED') && { reminder_date: null })
          }
        });
      } else if (taskType === 'churn') {
        console.log("🔄 Processing churn task:", { taskId, action, failureReason, note });

        const task = tasks?.find(t => t.task_id === taskId);

        // If this is a new task (ID starts with 'churn_'), create the callback first
        if (taskId.startsWith('churn_')) {
          console.log("📝 Creating new churn_callback for kunden_nummer:", task?.kunden_nummer);

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
              rep_username: rep?.auth_token || 'unknown',
              telegram_chat_id: 0 // Placeholder
            })
            .select()
            .single();

          if (createError) {
            console.error("❌ Failed to create churn_callback:", createError);
            throw createError;
          }

          console.log("✅ Created new churn_callback:", newCallback);
        } else {
          // Update existing callback
          try {
            await updateChurnCallback.mutateAsync({
              id: taskId,
              action: action,
              churnReason: failureReason,
              note: note
            });
            console.log("✅ Churn callback updated");
          } catch (err) {
            console.error("❌ Churn callback update failed:", err);
            throw err;
          }
        }

        // If customer is retained, clear churn_alert_pending
        if (action === 'RETAINED') {
          console.log("🔍 Found task for RETAINED:", task);
          if (task?.kunden_nummer) {
            try {
              await supabase
                .from('dim_customers')
                .update({ churn_alert_pending: false })
                .eq('kunden_nummer', task.kunden_nummer);
              console.log("✅ Cleared churn_alert_pending for customer:", task.kunden_nummer);
            } catch (err) {
              console.error("❌ Failed to clear churn_alert_pending:", err);
              throw err;
            }
          }
        }
      }

      toast.success("Aufgabe aktualisiert");
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Fehler beim Aktualisieren der Aufgabe");
      // Remove from removed list on error
      setRemovedTaskIds(prev => prev.filter(id => id !== taskId));
    }
  };

  const confirmReminder = async () => {
    if (!selectedReminderDate || !activeTaskId) return;

    try {
      setRemovedTaskIds(prev => [...prev, activeTaskId]);

      await updateTask.mutateAsync({
        id: activeTaskId,
        updates: {
          status: 'OFFER',
          verified_by_sales: true,
          reminder_date: selectedReminderDate.toISOString().split('T')[0], // YYYY-MM-DD format
        }
      });

      toast.success("Erinnerung gesetzt!");
      setIsReminderDialogOpen(false);
      setSelectedReminderDate(undefined);
      setActiveTaskId("");
    } catch (error) {
      console.error("Error setting reminder:", error);
      toast.error("Fehler beim Setzen der Erinnerung");
      setRemovedTaskIds(prev => prev.filter(id => id !== activeTaskId));
    }
  };

  const handleOfferEdit = async (action: string, reminderDate?: string, reason?: string, note?: string) => {
    if (!editingOfferTask) return;

    try {
      if (action === "OFFER" && reminderDate) {
        await updateTask.mutateAsync({
          id: editingOfferTask.task_id || "",
          updates: { reminder_date: reminderDate },
        });
        toast.success("Erinnerungsdatum aktualisiert");
      } else if (action === "CLAIMED") {
        await updateTask.mutateAsync({
          id: editingOfferTask.task_id || "",
          updates: { status: "CLAIMED", verified_by_sales: true, reminder_date: null },
        });
        toast.success("Angebot als gekauft markiert");
      } else if (action === "DECLINED") {
        await updateTask.mutateAsync({
          id: editingOfferTask.task_id || "",
          updates: { status: "DECLINED", verified_by_sales: true, failure_reason: reason, notitz_rep: note, reminder_date: null },
        });
        toast.success("Angebot als abgelehnt markiert");
      }
      setEditingOfferTask(null);
    } catch (error) {
      toast.error("Konnte nicht aktualisiert werden");
    }
  };

  // Filter out removed tasks
  const availableTasks = tasks?.filter(task => !removedTaskIds.includes(task.task_id || ""));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Reminder Tasks: Due today or in past
  const reminderTasks = availableTasks?.filter(task =>
    task.reminder_date && new Date(task.reminder_date) <= today
  );

  // 2. Regular Tasks: Open tasks (no status) or Churn tasks
  // Exclude: Completed (YES/NO/LATER), Pending (Offers), and Future Reminders
  const regularTasks = availableTasks?.filter(task => {
    // Exclude tasks that are displayed as reminders
    if (task.reminder_date && new Date(task.reminder_date) <= today) return false;

    // Exclude completed tasks
    // if (['YES', 'NO', 'LATER', 'DECLINED', 'CLAIMED'].includes(task.status || '')) return false;

    // Exclude verified tasks (Offers)
    // Churn tasks have verified_by_sales = null, so they are kept.
    if (task.verified_by_sales === true) return false;

    return true;
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "tasks";

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="space-y-8">
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

      {/* Offer Edit Dialog */}
      {editingOfferTask && (
        <OfferDialog
          isOpen={!!editingOfferTask}
          onClose={() => setEditingOfferTask(null)}
          onSubmit={handleOfferEdit}
          customerName={editingOfferTask.firma || "Kunde"}
          initialDate={editingOfferTask.reminder_date ? new Date(editingOfferTask.reminder_date) : undefined}
        />
      )}

      <h2 className="text-2xl font-bold">Dashboard</h2>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="hidden md:flex">
          <TabsTrigger value="tasks">Meine Aufgaben</TabsTrigger>
          <TabsTrigger value="offers">Meine Angebote</TabsTrigger>
          <TabsTrigger value="actions">Aktionen</TabsTrigger>
          <TabsTrigger value="campaigns">Kampagnen</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-6">
          {/* Reminder Tasks Section */}
          {reminderTasks && reminderTasks.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <CalendarIcon className="h-5 w-5 text-orange-600" />
                <h3 className="text-xl font-semibold text-orange-600">Fällige Erinnerungen</h3>
                <Badge variant="destructive">{reminderTasks.length}</Badge>
              </div>
              {tasksLoading ? (
                <Skeleton className="h-64" />
              ) : (
                <TaskListView tasks={reminderTasks} isLoading={tasksLoading} onTaskComplete={handleTaskComplete} />
              )}
            </div>
          )}

          {/* Regular Tasks Section */}
          <h2 className="text-2xl font-bold mb-4">Meine Aufgaben</h2>
          <TaskListView
            tasks={regularTasks}
            isLoading={tasksLoading}
            onTaskComplete={handleTaskComplete}
          />
        </TabsContent>

        <TabsContent value="offers" className="mt-6">
          <h2 className="text-2xl font-bold mb-4">Meine Angebote</h2>
          <p className="text-muted-foreground mb-4">
            Hier sehen Sie alle Aufgaben, bei denen Sie "Angebot abgegeben" ausgewählt haben.
          </p>
          {tasksLoading ? (
            <Skeleton className="h-64" />
          ) : (
            <div className="space-y-4">
              {tasks && tasks.filter(task => task.reminder_date).length > 0 ? (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Kunde</TableHead>
                          <TableHead>Kampagne</TableHead>
                          <TableHead>Angebot am</TableHead>
                          <TableHead>Erinnerung am</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Aktionen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tasks.filter(task => task.reminder_date).map(task => {
                          const reminderDate = new Date(task.reminder_date!);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const isDue = reminderDate <= today;

                          return (
                            <TableRow
                              key={task.task_id}
                              className={isDue ? 'bg-red-50 cursor-pointer hover:bg-red-100' : 'cursor-pointer hover:bg-muted/50'}
                              onClick={() => setEditingOfferTask(task)}
                            >
                              <TableCell className="font-medium">{task.firma}</TableCell>
                              <TableCell>{task.title}</TableCell>
                              <TableCell>{task.last_change ? new Date(task.last_change).toLocaleDateString('de-DE') : '-'}</TableCell>
                              <TableCell>{reminderDate.toLocaleDateString('de-DE')}</TableCell>
                              <TableCell>
                                {isDue ? (
                                  <Badge variant="destructive">Fällig!</Badge>
                                ) : (
                                  <Badge variant="secondary">Ausstehend</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => handleTaskComplete(task.task_id || '', 'promo', 'CLAIMED')}
                                  >
                                    Gekauft
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-red-500 text-red-600 hover:bg-red-50"
                                    onClick={() => handleTaskComplete(task.task_id || '', 'promo', 'DECLINED')}
                                  >
                                    Abgelehnt
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden">
                    {tasks.filter(task => task.reminder_date).map(task => (
                      <OfferCard
                        key={task.task_id}
                        task={task}
                        onStatusChange={(taskId, action, failureReason, note) =>
                          handleTaskComplete(taskId, 'promo', action, failureReason, note)
                        }
                      />
                    ))}
                  </div>
                </>
              ) : (
                <Card className="p-6 text-center text-muted-foreground">
                  Keine Angebote mit Erinnerungen vorhanden
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="actions" className="mt-6">
          <h2 className="text-2xl font-bold mb-4">Aktuelle Aktionen</h2>
          {actionsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-64" />
              ))}
            </div>
          ) : actions && actions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {actions.map((action) => (
                <Card key={action.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{action.product_name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {action.image && (
                      <a
                        href={action.image}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors w-full justify-center"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Dokument öffnen
                      </a>
                    )}
                    {(action.promo_from || action.promo_to) && (
                      <div>
                        <span className="text-muted-foreground">Aktionszeitraum: </span>
                        <span className="font-semibold">
                          {action.promo_from && new Date(action.promo_from).toLocaleDateString("de-DE")}
                          {action.promo_from && action.promo_to && " - "}
                          {action.promo_to && new Date(action.promo_to).toLocaleDateString("de-DE")}
                        </span>
                      </div>
                    )}
                    {action.price && (
                      <p className="text-muted-foreground">
                        <span className="font-semibold">Preis:</span>{" "}
                        <span className="font-bold text-lg text-primary">
                          {action.price.toFixed(2)} €
                        </span>
                      </p>
                    )}
                    {action.customers && (
                      <div className="text-xs text-muted-foreground pt-2 border-t">
                        {action.customers} Kunden informiert
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-6 text-center text-muted-foreground">
              Keine Aktionen verfügbar
            </Card>
          )}
        </TabsContent>

        <TabsContent value="campaigns" className="mt-6">
          <h2 className="text-2xl font-bold mb-4">Aktuelle Kampagnen</h2>
          {campaignsLoading ? (
            <Skeleton className="h-64" />
          ) : campaigns && campaigns.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Artikelnummer</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Niedrigster VK</TableHead>
                      <TableHead>Aktiv von</TableHead>
                      <TableHead>Absagegründe</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell className="font-mono">{campaign.campaign_code}</TableCell>
                        <TableCell>{campaign.name}</TableCell>
                        <TableCell>{campaign.Niedrigster_VK || "-"}</TableCell>
                        <TableCell>{new Date(campaign.active_from).toLocaleDateString("de-DE")}</TableCell>
                        <TableCell>
                          {campaign.rejection_reasons && (campaign.rejection_reasons as string[]).length > 0
                            ? (campaign.rejection_reasons as string[]).join(", ")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={campaign.is_active ? "default" : "secondary"}>
                            {campaign.is_active ? "Aktiv" : "Inaktiv"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden">
                {campaigns.map((campaign) => (
                  <CampaignCard key={campaign.id} campaign={campaign} />
                ))}
              </div>
            </>
          ) : (
            <Card className="p-6 text-center text-muted-foreground">
              Keine Artikel verfügbar
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
