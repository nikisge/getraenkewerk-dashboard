import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Users, XCircle, Clock, ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useCampaignRejections } from "@/hooks/useCampaignRejections";

export default function CampaignPerformance() {
    const [selectedCampaign, setSelectedCampaign] = useState<{ code: string; name: string; reason: string | null } | null>(null);

    const { data: campaigns, isLoading, error } = useQuery({
        queryKey: ["campaign_performance"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("campaign_performance_stats")
                .select("*")
                .order("active_from", { ascending: false });

            if (error) throw error;
            return data;
        },
    });

    const { data: rejections, isLoading: rejectionsLoading } = useCampaignRejections(selectedCampaign?.code || null);

    // Filter rejections by selected reason (or show all if no specific reason selected)
    const filteredRejections = selectedCampaign?.reason
        ? rejections?.filter(r => r.failure_reason === selectedCampaign.reason)
        : rejections;

    if (isLoading) {
        return (
            <div className="space-y-6">
                <h1 className="text-3xl font-bold">Kampagnen Performance</h1>
                <div className="grid gap-4">
                    <Skeleton className="h-[200px]" />
                    <Skeleton className="h-[200px]" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Fehler</AlertTitle>
                <AlertDescription>
                    Daten konnten nicht geladen werden: {(error as Error).message}
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Kampagnen Performance</h1>

            {campaigns?.map((campaign) => {
                const completionRate = campaign.total_assigned_customers
                    ? (campaign.processed_tasks / campaign.total_assigned_customers) * 100
                    : 0;

                // Parse rejection breakdown
                const rejectionData = Object.entries(
                    (campaign.rejection_breakdown as Record<string, number>) || {}
                )
                    .map(([reason, count]) => ({ reason, count }))
                    .sort((a, b) => b.count - a.count);

                return (
                    <Card key={campaign.campaign_code} className="overflow-hidden">
                        <CardHeader className="border-b">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <CardTitle className="text-xl">{campaign.campaign_name}</CardTitle>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span>{new Date(campaign.active_from || "").toLocaleDateString("de-DE")}</span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${campaign.is_active ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-red-500/10 text-red-600 dark:text-red-400"}`}>
                                        {campaign.is_active ? "Aktiv" : "Inaktiv"}
                                    </span>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="p-6">
                            {/* Key Metrics */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                                    <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Gesamt Kunden</p>
                                        <p className="text-2xl font-bold">{campaign.total_assigned_customers}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Bearbeitet</p>
                                        <p className="text-2xl font-bold">{campaign.processed_tasks}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                                    <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Noch offen</p>
                                        <p className="text-2xl font-bold">{campaign.remaining_potential}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                                    <XCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
                                        <p className="text-2xl font-bold">{campaign.conversion_rate_percent}%</p>
                                    </div>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="mb-6">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-muted-foreground">Fortschritt</span>
                                    <span className="font-medium">{completionRate.toFixed(1)}% bearbeitet</span>
                                </div>
                                <Progress value={completionRate} className="h-2" />
                                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                    <span>{campaign.processed_tasks} von {campaign.total_assigned_customers}</span>
                                </div>
                            </div>

                            {/* Results Breakdown */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                <div className="p-4 rounded-lg border bg-card">
                                    <p className="text-sm font-medium text-muted-foreground mb-1">Verkauft</p>
                                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">{campaign.total_sales_won}</p>
                                </div>
                                <div className="p-4 rounded-lg border bg-card">
                                    <p className="text-sm font-medium text-muted-foreground mb-1">Abgelehnt</p>
                                    <p className="text-3xl font-bold text-red-600 dark:text-red-400">{campaign.total_rejected}</p>
                                </div>
                            </div>

                            {/* Rejection Reasons Table */}
                            {rejectionData.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-medium mb-3">Häufigste Ablehnungsgründe</h3>
                                    <p className="text-xs text-muted-foreground mb-2">Klicken Sie auf einen Grund, um Details zu sehen</p>
                                    <div className="rounded-lg border overflow-hidden">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Grund</TableHead>
                                                    <TableHead className="text-right">Anzahl</TableHead>
                                                    <TableHead className="w-10"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {rejectionData.map((item, idx) => (
                                                    <TableRow
                                                        key={idx}
                                                        className="cursor-pointer hover:bg-muted/50"
                                                        onClick={() => setSelectedCampaign({
                                                            code: campaign.campaign_code || "",
                                                            name: campaign.campaign_name || "",
                                                            reason: item.reason
                                                        })}
                                                    >
                                                        <TableCell className="font-medium">{item.reason}</TableCell>
                                                        <TableCell className="text-right">{item.count}</TableCell>
                                                        <TableCell>
                                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    {/* Button to see all rejections */}
                                    <button
                                        className="mt-2 text-sm text-blue-600 hover:underline"
                                        onClick={() => setSelectedCampaign({
                                            code: campaign.campaign_code || "",
                                            name: campaign.campaign_name || "",
                                            reason: null
                                        })}
                                    >
                                        Alle {campaign.total_rejected} Ablehnungen anzeigen →
                                    </button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                );
            })}

            {/* Rejection Details Dialog */}
            <Dialog open={!!selectedCampaign} onOpenChange={(open) => !open && setSelectedCampaign(null)}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <XCircle className="h-5 w-5 text-red-600" />
                            Ablehnungen: {selectedCampaign?.name}
                            {selectedCampaign?.reason && (
                                <Badge variant="secondary" className="ml-2">
                                    {selectedCampaign.reason}
                                </Badge>
                            )}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-auto">
                        {rejectionsLoading ? (
                            <div className="space-y-2">
                                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
                            </div>
                        ) : filteredRejections && filteredRejections.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Kunde</TableHead>
                                        <TableHead>Ort</TableHead>
                                        <TableHead>Außendienst</TableHead>
                                        <TableHead>Grund</TableHead>
                                        <TableHead>Notiz</TableHead>
                                        <TableHead>Datum</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredRejections.map((rejection) => (
                                        <TableRow key={rejection.task_id}>
                                            <TableCell>
                                                <div className="font-medium">{rejection.firma}</div>
                                                <div className="text-xs text-muted-foreground">#{rejection.kunden_nummer}</div>
                                            </TableCell>
                                            <TableCell>{rejection.ort || "-"}</TableCell>
                                            <TableCell>{rejection.rep_name}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-red-600 border-red-300">
                                                    {rejection.failure_reason || "-"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="max-w-xs">
                                                {rejection.notitz_rep ? (
                                                    <span className="text-sm italic text-muted-foreground">
                                                        "{rejection.notitz_rep}"
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {rejection.last_change
                                                    ? new Date(rejection.last_change).toLocaleDateString("de-DE", {
                                                        day: "2-digit",
                                                        month: "2-digit",
                                                        year: "numeric",
                                                    })
                                                    : "-"}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                Keine Ablehnungen gefunden
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
