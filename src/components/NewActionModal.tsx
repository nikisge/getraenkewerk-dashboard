import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateAction } from "@/hooks/useActions";
import { toast } from "sonner";
import { Plus, Link as LinkIcon } from "lucide-react";

export function NewActionModal() {
  const [open, setOpen] = useState(false);
  const createAction = useCreateAction();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const imageUrl = (formData.get("image_url") as string)?.trim();

    const actionData = {
      product_name: formData.get("product_name") as string,
      promo_from: (formData.get("promo_from") as string) || null,
      promo_to: (formData.get("promo_to") as string) || null,
      price: formData.get("price") ? parseFloat(formData.get("price") as string) : null,
      image: imageUrl || null,
    };

    console.log("Creating action with data:", actionData);

    try {
      const result = await createAction.mutateAsync(actionData);
      console.log("Action created:", result);

      toast.success("Aktion erfolgreich erstellt");
      setOpen(false);
      (e.target as HTMLFormElement).reset();
    } catch (error: any) {
      console.error("Detailed creation error:", error);
      toast.error(`Fehler beim Erstellen der Aktion: ${error.message || "Unbekannter Fehler"}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Neue Aktion
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Neue Aktion erstellen</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product_name">Produktname</Label>
            <Input id="product_name" name="product_name" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="promo_from">Promo von</Label>
              <Input id="promo_from" name="promo_from" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promo_to">Promo bis</Label>
              <Input id="promo_to" name="promo_to" type="date" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Verkaufspreis</Label>
            <Input id="price" name="price" type="number" step="0.01" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image_url">Dokument URL (Bild oder PDF)</Label>
            <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Input
                id="image_url"
                name="image_url"
                type="url"
                placeholder="https://beispiel.de/flyer.pdf"
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Link zu einem Bild (.jpg, .png) oder PDF-Dokument
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={createAction.isPending}>
            {createAction.isPending ? "Erstellen..." : "Aktion erstellen"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
