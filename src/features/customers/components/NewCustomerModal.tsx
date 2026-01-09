import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useCreateCustomer } from "@/features/customers/hooks/useCustomers";
import { useReps } from "@/features/reps/hooks/useReps";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export function NewCustomerModal() {
  const [open, setOpen] = useState(false);
  const [selectedRepId, setSelectedRepId] = useState<string>("");
  const createCustomer = useCreateCustomer();
  const { data: reps } = useReps();
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createCustomer.mutate({
      kunden_nummer: parseInt(formData.get("kunden_nummer") as string),
      firma: formData.get("firma") as string,
      email: formData.get("email") as string || null,
      strasse: formData.get("strasse") as string || null,
      plz: formData.get("plz") as string || null,
      ort: formData.get("ort") as string || null,
      telefon: formData.get("telefon") as string || null,
      rep_id: selectedRepId ? parseInt(selectedRepId) : null,
      u_key: `MANUAL_${Date.now()}_${formData.get("kunden_nummer")}`,
      source_file_id: "MANUAL_ENTRY",
    }, {
      onSuccess: () => {
        toast.success("Kunde erfolgreich erstellt");
        setOpen(false);
        setSelectedRepId("");
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
          Neuer Kunde
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neuer Kunde</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="kunden_nummer">Kunden Nummer</Label>
            <Input id="kunden_nummer" name="kunden_nummer" type="number" required />
          </div>
          <div>
            <Label htmlFor="firma">Firma</Label>
            <Input id="firma" name="firma" required />
          </div>
          <div>
            <Label htmlFor="email">E-Mail</Label>
            <Input id="email" name="email" type="email" />
          </div>
          <div>
            <Label htmlFor="strasse">Straße</Label>
            <Input id="strasse" name="strasse" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="plz">PLZ</Label>
              <Input id="plz" name="plz" />
            </div>
            <div>
              <Label htmlFor="ort">Ort</Label>
              <Input id="ort" name="ort" />
            </div>
          </div>
          <div>
            <Label htmlFor="telefon">Telefon</Label>
            <Input id="telefon" name="telefon" type="tel" />
          </div>
          <div>
            <Label htmlFor="rep_id">Außendienstler</Label>
            <Select value={selectedRepId} onValueChange={setSelectedRepId}>
              <SelectTrigger>
                <SelectValue placeholder="Außendienstler auswählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Kein Außendienstler</SelectItem>
                {reps?.map((rep) => (
                  <SelectItem key={rep.rep_id} value={rep.rep_id.toString()}>
                    {rep.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={createCustomer.isPending}>
              {createCustomer.isPending ? "Wird erstellt..." : "Erstellen"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
