import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateRep } from "@/hooks/useReps";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export function NewRepModal() {
  const [open, setOpen] = useState(false);
  const createRep = useCreateRep();
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createRep.mutate({
      rep_id: parseInt(formData.get("rep_id") as string),
      name: formData.get("name") as string,
      telegram_username: formData.get("telegram_username") as string,
      telegram_chat_id: formData.get("telegram_chat_id") as string,
      auth_token: formData.get("auth_token") as string || null,
    }, {
      onSuccess: () => {
        toast.success("Rep erfolgreich erstellt");
        setOpen(false);
      },
      onError: (error) => {
        toast.error("Fehler beim Erstellen: " + error.message);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Neuer Außendienstler
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neuer Außendienstler</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="rep_id">Rep ID</Label>
            <Input id="rep_id" name="rep_id" type="number" required />
          </div>
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required />
          </div>
          <div>
            <Label htmlFor="telegram_username">Telegram Username</Label>
            <Input id="telegram_username" name="telegram_username" required />
          </div>
          <div>
            <Label htmlFor="telegram_chat_id">Telegram Chat ID</Label>
            <Input id="telegram_chat_id" name="telegram_chat_id" required />
          </div>
          <div>
            <Label htmlFor="auth_token">Auth Token (optional)</Label>
            <Input id="auth_token" name="auth_token" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={createRep.isPending}>
              {createRep.isPending ? "Wird erstellt..." : "Erstellen"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
