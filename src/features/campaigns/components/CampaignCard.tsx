import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Tables } from "@/integrations/supabase/types";
import { Calendar, Euro, FileWarning, Hash } from "lucide-react";

interface CampaignCardProps {
    campaign: Tables<"campaigns">;
}

export function CampaignCard({ campaign }: CampaignCardProps) {
    return (
        <Card className="mb-4">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-lg font-bold">
                            {campaign.name}
                        </CardTitle>
                        <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            {campaign.campaign_code}
                        </div>
                    </div>
                    <Badge variant={campaign.is_active ? "default" : "secondary"}>
                        {campaign.is_active ? "Aktiv" : "Inaktiv"}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground flex items-center gap-2">
                        <Euro className="h-4 w-4" /> Niedrigster VK:
                    </span>
                    <span className="font-mono">{campaign.Niedrigster_VK || "-"}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4" /> Aktiv von:
                    </span>
                    <span>{new Date(campaign.active_from).toLocaleDateString("de-DE")}</span>
                </div>
                <div className="py-1">
                    <span className="text-muted-foreground flex items-center gap-2 mb-1">
                        <FileWarning className="h-4 w-4" /> Absagegründe:
                    </span>
                    <p className="text-xs text-muted-foreground pl-6">
                        {campaign.rejection_reasons && (campaign.rejection_reasons as string[]).length > 0
                            ? (campaign.rejection_reasons as string[]).join(", ")
                            : "-"}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
