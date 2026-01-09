import { useDashboardTasks } from "@/features/dashboard/hooks/useDashboardTasks";
import { useActions } from "@/features/actions/hooks/useActions";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useUpdateTask } from "@/features/tasks/hooks/useUpdateTask";
import { useUpdateChurnCallback } from "@/features/tasks/hooks/useUpdateChurnCallback";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { TaskListView } from "@/features/tasks/components/TaskListView";
import { Calendar as CalendarIcon, X, Megaphone, Phone, Mail, MapPin, Search, Clock, Pencil, ArrowUp, ArrowDown, ArrowUpDown, ChevronRight, Eye, CheckCircle, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Calendar } from "@/shared/components/ui/calendar";
import { Button } from "@/shared/components/ui/button";
import { useCampaigns } from "@/features/campaigns/hooks/useCampaigns";
import { Badge } from "@/shared/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Input } from "@/shared/components/ui/input";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { OfferCard } from "@/features/tasks/components/OfferCard";
import { CampaignCard } from "@/features/campaigns/components/CampaignCard";
import { OfferDialog } from "@/features/tasks/components/OfferDialog";
import { DashboardTask } from "@/features/dashboard/hooks/useDashboardTasks";
import { useSeenActions } from "@/features/actions/hooks/useSeenActions";
import { useCustomers, Customer, SortField, SortDirection } from "@/features/customers/hooks/useCustomers";
import { EditCustomerModal } from "@/features/customers/components/EditCustomerModal";
import { OpeningHoursDisplay } from "@/features/customers/components/OpeningHoursDisplay";
import { useCampaignResults, CampaignResult } from "@/features/campaigns/hooks/useCampaignRejections";

export function RepDashboard() {
  const { rep } = useAuth();
  const { data: tasks, isLoading: tasksLoading } = useDashboardTasks(rep?.auth_token);
  const { data: actions, isLoading: actionsLoading } = useActions();
  const { data: campaigns, isLoading: campaignsLoading } = useCampaigns();
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerPlzFilter, setCustomerPlzFilter] = useState("");
  const [customerSortBy, setCustomerSortBy] = useState<SortField>("firma");
  const [customerSortDir, setCustomerSortDir] = useState<SortDirection>("asc");

  const { data: customersData, isLoading: customersLoading } = useCustomers(
    {
      repId: rep?.rep_id,
      searchTerm: customerSearch,
      plzPrefix: customerPlzFilter || undefined,
      sortBy: customerSortBy,
      sortDir: customerSortDir,
    },
    { page: 0, pageSize: 100 }
  );

  // Handle column header click for sorting (customers)
  const handleCustomerSort = (field: SortField) => {
    if (customerSortBy === field) {
      setCustomerSortDir(customerSortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setCustomerSortBy(field);
      setCustomerSortDir(field === 'revenue_365d' ? 'desc' : 'asc');
    }
  };

  // Render sort indicator for customers
  const CustomerSortIndicator = ({ field }: { field: SortField }) => {
    if (customerSortBy !== field) {
      return <ArrowUpDown className="ml-1 h-4 w-4 text-muted-foreground/50" />;
    }
    return customerSortDir === 'asc'
      ? <ArrowUp className="ml-1 h-4 w-4" />
      : <ArrowDown className="ml-1 h-4 w-4" />;
  };
  const updateTask = useUpdateTask();
  const updateChurnCallback = useUpdateChurnCallback();
  const [removedTaskIds, setRemovedTaskIds] = useState<string[]>([]);
  const { markAllAsSeen, isUnseen } = useSeenActions();

  // Reminder dialog state
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
  const [selectedReminderDate, setSelectedReminderDate] = useState<Date | undefined>();
  const [activeTaskId, setActiveTaskId] = useState<string>("");
  const [editingOfferTask, setEditingOfferTask] = useState<DashboardTask | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCampaignForResults, setSelectedCampaignForResults] = useState<{ code: string; name: string } | null>(null);

  // Fetch campaign results for the selected campaign
  const { data: campaignResults, isLoading: campaignResultsLoading } = useCampaignResults(
    selectedCampaignForResults?.code || null,
    rep?.rep_id
  );

  // New actions notification
  const unseenActions = actions?.filter(a => isUnseen(a.id)) || [];
  const [showNewActionsBanner, setShowNewActionsBanner] = useState(true);

  const dismissNewActionsBanner = () => {
    if (actions) {
      markAllAsSeen(actions.map(a => a.id));
    }
    setShowNewActionsBanner(false);
  };

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
            // Clear reminder_date for CLAIMED and DECLINED status, set claimed_at for CLAIMED
            ...((action === 'CLAIMED' || action === 'DECLINED') && { reminder_date: null }),
            ...(action === 'CLAIMED' && { claimed_at: new Date().toISOString() })
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
          updates: { status: "CLAIMED", verified_by_sales: true, reminder_date: null, claimed_at: new Date().toISOString() },
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

      {/* Customer Edit Modal */}
      <EditCustomerModal
        customer={editingCustomer}
        isOpen={!!editingCustomer}
        onClose={() => setEditingCustomer(null)}
        isRepView={true}
      />

      {/* Campaign Results Dialog */}
      <Dialog open={!!selectedCampaignForResults} onOpenChange={(open) => !open && setSelectedCampaignForResults(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Meine Ergebnisse: {selectedCampaignForResults?.name}
            </DialogTitle>
            <DialogDescription>
              Hier sehen Sie alle Ihre Kundenantworten für diese Kampagne.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            {campaignResultsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : campaignResults && campaignResults.length > 0 ? (
              <>
                {/* Summary */}
                <div className="flex gap-4 mb-4 p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">
                      Gekauft: {campaignResults.filter(r => r.status === 'CLAIMED').length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium">
                      Abgelehnt: {campaignResults.filter(r => r.status === 'DECLINED').length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">
                      Angebote: {campaignResults.filter(r => r.status === 'OFFER').length}
                    </span>
                  </div>
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kunde</TableHead>
                        <TableHead>Ort</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Grund</TableHead>
                        <TableHead>Notiz</TableHead>
                        <TableHead>Datum</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaignResults.map((result) => (
                        <TableRow key={result.task_id}>
                          <TableCell>
                            <div className="font-medium">{result.firma}</div>
                            <div className="text-xs text-muted-foreground">#{result.kunden_nummer}</div>
                          </TableCell>
                          <TableCell>{result.ort || "-"}</TableCell>
                          <TableCell>
                            {result.status === 'CLAIMED' && (
                              <Badge className="bg-green-600">Gekauft</Badge>
                            )}
                            {result.status === 'DECLINED' && (
                              <Badge variant="destructive">Abgelehnt</Badge>
                            )}
                            {result.status === 'OFFER' && (
                              <Badge variant="secondary">Angebot</Badge>
                            )}
                            {!['CLAIMED', 'DECLINED', 'OFFER'].includes(result.status || '') && (
                              <Badge variant="outline">{result.status || "-"}</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {result.failure_reason ? (
                              <span className="text-sm text-red-600">{result.failure_reason}</span>
                            ) : "-"}
                          </TableCell>
                          <TableCell className="max-w-xs">
                            {result.notitz_rep ? (
                              <span className="text-sm italic text-muted-foreground">
                                "{result.notitz_rep}"
                              </span>
                            ) : "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {result.last_change
                              ? new Date(result.last_change).toLocaleDateString("de-DE")
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {campaignResults.map((result) => (
                    <Card key={result.task_id} className="p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-sm">{result.firma}</p>
                          <p className="text-xs text-muted-foreground">{result.ort || "-"}</p>
                        </div>
                        {result.status === 'CLAIMED' && (
                          <Badge className="bg-green-600">Gekauft</Badge>
                        )}
                        {result.status === 'DECLINED' && (
                          <Badge variant="destructive">Abgelehnt</Badge>
                        )}
                        {result.status === 'OFFER' && (
                          <Badge variant="secondary">Angebot</Badge>
                        )}
                      </div>
                      {result.failure_reason && (
                        <p className="text-sm text-red-600">Grund: {result.failure_reason}</p>
                      )}
                      {result.notitz_rep && (
                        <p className="text-sm italic text-muted-foreground mt-1">
                          "{result.notitz_rep}"
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {result.last_change
                          ? new Date(result.last_change).toLocaleDateString("de-DE")
                          : "-"}
                      </p>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Noch keine Ergebnisse für diese Kampagne
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <h2 className="text-2xl font-bold">Dashboard</h2>

      {/* New Actions Banner */}
      {showNewActionsBanner && unseenActions.length > 0 && (
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-4 shadow-lg animate-in slide-in-from-top duration-300">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="bg-white/20 rounded-full p-2 mt-0.5">
                <Megaphone className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  {unseenActions.length === 1 ? "Neue Aktion verfügbar!" : `${unseenActions.length} neue Aktionen verfügbar!`}
                </h3>
                <p className="text-blue-100 text-sm mt-1">
                  {unseenActions.slice(0, 3).map(a => a.product_name).join(", ")}
                  {unseenActions.length > 3 && ` und ${unseenActions.length - 3} weitere...`}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3 bg-white text-blue-600 hover:bg-blue-50"
                  onClick={() => {
                    handleTabChange("actions");
                    dismissNewActionsBanner();
                  }}
                >
                  Aktionen ansehen
                </Button>
              </div>
            </div>
            <button
              onClick={dismissNewActionsBanner}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="flex w-full overflow-x-auto no-scrollbar">
          <TabsTrigger value="tasks" className="flex-shrink-0">Meine Aufgaben</TabsTrigger>
          <TabsTrigger value="offers" className="flex-shrink-0">Meine Angebote</TabsTrigger>
          <TabsTrigger value="actions" className="flex-shrink-0">Aktionen</TabsTrigger>
          <TabsTrigger value="campaigns" className="flex-shrink-0">Kampagnen</TabsTrigger>
          <TabsTrigger value="customers" className="flex-shrink-0">Meine Kunden</TabsTrigger>
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
                      <TableHead>Status</TableHead>
                      <TableHead>Ergebnisse</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map((campaign) => (
                      <TableRow key={campaign.id} className="hover:bg-muted/50">
                        <TableCell className="font-mono">{campaign.campaign_code}</TableCell>
                        <TableCell>{campaign.name}</TableCell>
                        <TableCell>{campaign.Niedrigster_VK || "-"}</TableCell>
                        <TableCell>{new Date(campaign.active_from).toLocaleDateString("de-DE")}</TableCell>
                        <TableCell>
                          <Badge variant={campaign.is_active ? "default" : "secondary"}>
                            {campaign.is_active ? "Aktiv" : "Inaktiv"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedCampaignForResults({
                              code: campaign.campaign_code,
                              name: campaign.name
                            })}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ergebnisse
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {campaigns.map((campaign) => (
                  <Card key={campaign.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base">{campaign.name}</CardTitle>
                          <p className="text-sm text-muted-foreground font-mono">{campaign.campaign_code}</p>
                        </div>
                        <Badge variant={campaign.is_active ? "default" : "secondary"}>
                          {campaign.is_active ? "Aktiv" : "Inaktiv"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {campaign.Niedrigster_VK && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Niedrigster VK:</span> {campaign.Niedrigster_VK}
                        </p>
                      )}
                      <p className="text-sm">
                        <span className="text-muted-foreground">Aktiv seit:</span> {new Date(campaign.active_from).toLocaleDateString("de-DE")}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => setSelectedCampaignForResults({
                          code: campaign.campaign_code,
                          name: campaign.name
                        })}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ergebnisse anzeigen
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <Card className="p-6 text-center text-muted-foreground">
              Keine Artikel verfügbar
            </Card>
          )}
        </TabsContent>

        <TabsContent value="customers" className="mt-6">
          <h2 className="text-2xl font-bold mb-4">Meine Kunden</h2>
          <p className="text-muted-foreground mb-4">
            Hier sehen Sie alle Kunden, die Ihnen zugeteilt sind.
          </p>

          {/* Search and Filter */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Kunde suchen..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Input
              placeholder="PLZ (z.B. 20)"
              value={customerPlzFilter}
              onChange={(e) => setCustomerPlzFilter(e.target.value)}
              className="w-[100px]"
            />
          </div>

          {customersLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : customersData?.customers && customersData.customers.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleCustomerSort('firma')}
                      >
                        <span className="flex items-center">
                          Kunde
                          <CustomerSortIndicator field="firma" />
                        </span>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleCustomerSort('plz')}
                      >
                        <span className="flex items-center">
                          PLZ
                          <CustomerSortIndicator field="plz" />
                        </span>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleCustomerSort('ort')}
                      >
                        <span className="flex items-center">
                          Ort
                          <CustomerSortIndicator field="ort" />
                        </span>
                      </TableHead>
                      <TableHead>Kontakt</TableHead>
                      <TableHead>Öffnungszeiten</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customersData.customers.map((customer) => {
                      const hasOpeningHours = customer.opening_hours_mon || customer.opening_hours_tue || customer.opening_hours_wed || customer.opening_hours_thu || customer.opening_hours_fri || customer.opening_hours_sat || customer.opening_hours_sun;
                      return (
                        <TableRow
                          key={customer.kunden_nummer}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setEditingCustomer(customer)}
                        >
                          <TableCell>
                            <div className="font-medium">{customer.firma || "-"}</div>
                            <div className="text-sm text-muted-foreground">#{customer.kunden_nummer}</div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {customer.plz || "-"}
                          </TableCell>
                          <TableCell>
                            {customer.ort || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {customer.telefon && (
                                <div className="flex items-center gap-1 text-sm">
                                  <Phone className="h-3 w-3" />
                                  <span>{customer.telefon}</span>
                                </div>
                              )}
                              {customer.mobil && (
                                <div className="flex items-center gap-1 text-sm">
                                  <Phone className="h-3 w-3" />
                                  <span>{customer.mobil}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <OpeningHoursDisplay customer={customer} />
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setEditingCustomer(customer); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <div className="text-sm text-muted-foreground mt-4">
                  {customersData.totalCount} Kunden insgesamt
                </div>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {customersData.customers.map((customer) => {
                  const hasOpeningHours = customer.opening_hours_mon || customer.opening_hours_tue || customer.opening_hours_wed || customer.opening_hours_thu || customer.opening_hours_fri || customer.opening_hours_sat || customer.opening_hours_sun;
                  return (
                    <Card
                      key={customer.kunden_nummer}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setEditingCustomer(customer)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-base">{customer.firma || "-"}</CardTitle>
                            <p className="text-sm text-muted-foreground">#{customer.kunden_nummer}</p>
                          </div>
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{customer.plz} {customer.ort || "-"}</span>
                        </div>
                        {customer.telefon && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{customer.telefon}</span>
                          </div>
                        )}
                        {customer.mobil && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{customer.mobil}</span>
                          </div>
                        )}
                        <div className="pt-2 border-t">
                          <OpeningHoursDisplay customer={customer} compact />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                <div className="text-sm text-muted-foreground text-center">
                  {customersData.totalCount} Kunden insgesamt
                </div>
              </div>
            </>
          ) : (
            <Card className="p-6 text-center text-muted-foreground">
              {customerSearch ? "Keine Kunden gefunden" : "Keine Kunden zugeteilt"}
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
