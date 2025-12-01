import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useCreateCampaign } from "@/hooks/useCampaigns";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface NewCampaignModalProps {
  children?: React.ReactNode;
}

export function NewCampaignModal({ children }: NewCampaignModalProps) {
  const [open, setOpen] = useState(false);
  const [rejectionReasons, setRejectionReasons] = useState<string[]>([]);
  const [currentReason, setCurrentReason] = useState("");
  const createCampaign = useCreateCampaign();

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
    const formData = new FormData(e.currentTarget);

    const niedrigsterVK = formData.get("niedrigster_vk") as string;

    createCampaign.mutate({
      campaign_code: formData.get("campaign_code") as string,
      name: formData.get("name") as string,
      active_from: formData.get("active_from") as string,
      Niedrigster_VK: niedrigsterVK || null,
      rejection_reasons: rejectionReasons.length > 0 ? rejectionReasons : null,
    }, {
      onSuccess: () => {
        toast.success("Kampagne erfolgreich erstellt");
        setOpen(false);
        setRejectionReasons([]);
        setCurrentReason("");
      },
      onError: (error) => {
        toast.error("Fehler beim Erstellen: " + error.message);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Neuer Artikel
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neuer Artikel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="campaign_code">Artikelnummer</Label>
            <Input id="campaign_code" name="campaign_code" required />
          </div>
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required />
          </div>
          <div>
            <Label htmlFor="active_from">Aktiv ab</Label>
            <Input id="active_from" name="active_from" type="date" required />
          </div>
          <div>
            <Label htmlFor="niedrigster_vk">Niedrigster VK (optional)</Label>
            <Input id="niedrigster_vk" name="niedrigster_vk" />
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={createCampaign.isPending}>
              {createCampaign.isPending ? "Wird erstellt..." : "Erstellen"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
