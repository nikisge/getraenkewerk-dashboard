import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { useUpdateCampaign } from "@/features/campaigns/hooks/useCampaigns";
import { Campaign } from "@/features/campaigns/hooks/useCampaigns";
import { toast } from "sonner";

interface EditCampaignModalProps {
    campaign: Campaign | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditCampaignModal({ campaign, open, onOpenChange }: EditCampaignModalProps) {
    const [rejectionReasons, setRejectionReasons] = useState<string[]>([]);
    const [currentReason, setCurrentReason] = useState("");
    const [isGroupCampaign, setIsGroupCampaign] = useState(false);
    const updateCampaign = useUpdateCampaign();

    useEffect(() => {
        if (campaign && open) {
            setRejectionReasons((campaign.rejection_reasons as string[]) || []);
            setIsGroupCampaign(campaign.is_group_campaign || false);
        }
    }, [campaign, open]);

    const addRejectionReason = () => {
        if (currentReason.trim() && !rejectionReasons.includes(currentReason.trim())) {
            setRejectionReasons([...rejectionReasons, currentReason.trim()]);
            setCurrentReason("");
        }
    };

    const removeRejectionReason = (reason: string) => {
        setRejectionReasons(rejectionReasons.filter(r => r !== reason));
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!campaign) return;

        const formData = new FormData(e.currentTarget);
        const niedrigsterVK = formData.get("niedrigster_vk") as string;

        updateCampaign.mutate({
            id: campaign.id,
            updates: {
                campaign_code: formData.get("campaign_code") as string,
                name: formData.get("name") as string,
                active_from: formData.get("active_from") as string,
                Niedrigster_VK: niedrigsterVK || null,
                rejection_reasons: rejectionReasons.length > 0 ? rejectionReasons : null,
                is_group_campaign: isGroupCampaign,
            }
        }, {
            onSuccess: () => {
                toast.success("Kampagne erfolgreich aktualisiert");
                onOpenChange(false);
            },
            onError: (error) => {
                toast.error("Fehler beim Aktualisieren: " + error.message);
            },
        });
    };

    if (!campaign) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Artikel bearbeiten</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="is_group_campaign"
                            checked={isGroupCampaign}
                            onCheckedChange={(checked) => setIsGroupCampaign(checked === true)}
                        />
                        <Label htmlFor="is_group_campaign" className="text-sm font-normal cursor-pointer">
                            Gruppenkampagne (mehrere Artikel)
                        </Label>
                    </div>
                    {isGroupCampaign && (
                        <p className="text-xs text-muted-foreground -mt-2">
                            Bei Gruppenkampagnen wird geprüft, ob der Kunde irgendeinen Artikel dieser Gruppe gekauft hat.
                        </p>
                    )}
                    <div>
                        <Label htmlFor="campaign_code">{isGroupCampaign ? "Gruppennummer" : "Artikelnummer"}</Label>
                        <Input id="campaign_code" name="campaign_code" defaultValue={campaign.campaign_code} required />
                    </div>
                    <div>
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" name="name" defaultValue={campaign.name} required />
                    </div>
                    <div>
                        <Label htmlFor="active_from">Aktiv ab</Label>
                        <Input id="active_from" name="active_from" type="date" defaultValue={campaign.active_from} required />
                    </div>
                    <div>
                        <Label htmlFor="niedrigster_vk">Niedrigster VK (optional)</Label>
                        <Input id="niedrigster_vk" name="niedrigster_vk" defaultValue={campaign.Niedrigster_VK || ""} />
                    </div>
                    <div>
                        <Label>Absagegründe (optional)</Label>
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <Input
                                    value={currentReason}
                                    onChange={(e) => setCurrentReason(e.target.value)}
                                    placeholder="Grund hinzufügen..."
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            addRejectionReason();
                                        }
                                    }}
                                />
                                <Button type="button" onClick={addRejectionReason} variant="outline">
                                    +
                                </Button>
                            </div>
                            {rejectionReasons.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {rejectionReasons.map((reason) => (
                                        <div key={reason} className="flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm">
                                            <span>{reason}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeRejectionReason(reason)}
                                                className="hover:text-destructive"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Abbrechen
                        </Button>
                        <Button type="submit" disabled={updateCampaign.isPending}>
                            {updateCampaign.isPending ? "Wird aktualisiert..." : "Speichern"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
