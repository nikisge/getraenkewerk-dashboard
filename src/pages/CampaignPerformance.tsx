import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { AlertCircle, CheckCircle, Users, XCircle, Clock, ChevronRight } from "lucide-react";
import { Progress } from "@/shared/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Badge } from "@/shared/components/ui/badge";
import { useCampaignRejections, useCampaignResults } from "@/features/campaigns/hooks/useCampaignRejections";

type ViewMode = 'rejections' | 'sales';

export default function CampaignPerformance() {
    const [selectedCampaign, setSelectedCampaign] = useState<{ code: string; name: string; reason: string | null } | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('rejections');

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

    const { data: rejections, isLoading: rejectionsLoading } = useCampaignRejections({
        campaignCode: selectedCampaign?.code || null
    });

    // Get all campaign results (including sales) for the selected campaign
    const { data: allResults, isLoading: resultsLoading } = useCampaignResults(
        selectedCampaign?.code || null
    );

    // Filter rejections by selected reason (or show all if no specific reason selected)
    const filteredRejections = selectedCampaign?.reason
        ? rejections?.filter(r => r.failure_reason === selectedCampaign.reason)
        : rejections;

    // Filter for sales only (CLAIMED status)
    const salesResults = allResults?.filter(r => r.status === 'CLAIMED') || [];

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

                            {/* Results Breakdown - Clickable */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                <div
                                    className="p-4 rounded-lg border bg-card cursor-pointer hover:bg-green-50 dark:hover:bg-green-950/20 transition-colors"
                                    onClick={() => {
                                        setSelectedCampaign({
                                            code: campaign.campaign_code || "",
                                            name: campaign.campaign_name || "",
                                            reason: null
                                        });
                                        setViewMode('sales');
                                    }}
                                >
                                    <p className="text-sm font-medium text-muted-foreground mb-1">Verkauft</p>
                                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">{campaign.total_sales_won}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Klicken für Details →</p>
                                </div>
                                <div
                                    className="p-4 rounded-lg border bg-card cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                                    onClick={() => {
                                        setSelectedCampaign({
                                            code: campaign.campaign_code || "",
                                            name: campaign.campaign_name || "",
                                            reason: null
                                        });
                                        setViewMode('rejections');
                                    }}
                                >
                                    <p className="text-sm font-medium text-muted-foreground mb-1">Abgelehnt</p>
                                    <p className="text-3xl font-bold text-red-600 dark:text-red-400">{campaign.total_rejected}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Klicken für Details →</p>
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
                                        onClick={() => {
                                            setSelectedCampaign({
                                                code: campaign.campaign_code || "",
                                                name: campaign.campaign_name || "",
                                                reason: null
                                            });
                                            setViewMode('rejections');
                                        }}
                                    >
                                        Alle {campaign.total_rejected} Ablehnungen anzeigen →
                                    </button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                );
            })}

            {/* Results Details Dialog - Shows Sales or Rejections */}
            <Dialog open={!!selectedCampaign} onOpenChange={(open) => !open && setSelectedCampaign(null)}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {viewMode === 'sales' ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                                <XCircle className="h-5 w-5 text-red-600" />
                            )}
                            {viewMode === 'sales' ? 'Verkäufe' : 'Ablehnungen'}: {selectedCampaign?.name}
                            {selectedCampaign?.reason && (
                                <Badge variant="secondary" className="ml-2">
                                    {selectedCampaign.reason}
                                </Badge>
                            )}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-auto">
                        {viewMode === 'sales' ? (
                            // Sales View
                            resultsLoading ? (
                                <div className="space-y-2">
                                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
                                </div>
                            ) : salesResults.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Kunde</TableHead>
                                            <TableHead>Ort</TableHead>
                                            <TableHead>Außendienst</TableHead>
                                            <TableHead>Notiz</TableHead>
                                            <TableHead>Datum</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {salesResults.map((sale) => (
                                            <TableRow key={sale.task_id}>
                                                <TableCell>
                                                    <div className="font-medium">{sale.firma}</div>
                                                    <div className="text-xs text-muted-foreground">#{sale.kunden_nummer}</div>
                                                </TableCell>
                                                <TableCell>{sale.ort || "-"}</TableCell>
                                                <TableCell>{sale.rep_name || "-"}</TableCell>
                                                <TableCell className="max-w-xs">
                                                    {sale.notitz_rep ? (
                                                        <span className="text-sm italic text-muted-foreground">
                                                            "{sale.notitz_rep}"
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {sale.last_change
                                                        ? new Date(sale.last_change).toLocaleDateString("de-DE", {
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
                                    Keine Verkäufe gefunden
                                </div>
                            )
                        ) : (
                            // Rejections View
                            rejectionsLoading ? (
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
                            )
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
