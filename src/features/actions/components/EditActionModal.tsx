import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { useUpdateAction } from "@/features/actions/hooks/useActions";
import { Action } from "@/features/actions/hooks/useActions";
import { toast } from "sonner";
import { Link as LinkIcon, ExternalLink } from "lucide-react";

interface EditActionModalProps {
    action: Action | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditActionModal({ action, open, onOpenChange }: EditActionModalProps) {
    const updateAction = useUpdateAction();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!action) return;

        const formData = new FormData(e.currentTarget);
        const imageUrl = (formData.get("image_url") as string)?.trim();

        try {
            updateAction.mutate({
                id: action.id,
                updates: {
                    product_name: formData.get("product_name") as string,
                    promo_from: (formData.get("promo_from") as string) || null,
                    promo_to: (formData.get("promo_to") as string) || null,
                    price: formData.get("price") ? parseFloat(formData.get("price") as string) : null,
                    image: imageUrl || null,
                }
            }, {
                onSuccess: () => {
                    toast.success("Aktion erfolgreich aktualisiert");
                    onOpenChange(false);
                },
                onError: (error: any) => {
                    toast.error(`Fehler beim Aktualisieren der Aktion: ${error.message || "Unbekannter Fehler"}`);
                },
            });
        } catch (error: any) {
            console.error("Detailed error:", error);
            toast.error(`Fehler beim Aktualisieren der Aktion: ${error.message || "Unbekannter Fehler"}`);
        }
    };

    if (!action) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Aktion bearbeiten</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="product_name">Produktname *</Label>
                        <Input id="product_name" name="product_name" defaultValue={action.product_name || ""} required />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="promo_from">Promotion von</Label>
                            <Input id="promo_from" name="promo_from" type="date" defaultValue={action.promo_from || ""} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="promo_to">Promotion bis</Label>
                            <Input id="promo_to" name="promo_to" type="date" defaultValue={action.promo_to || ""} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="price">Verkaufspreis</Label>
                        <Input id="price" name="price" type="number" step="0.01" defaultValue={action.price || ""} />
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
                                defaultValue={action.image || ""}
                                className="flex-1"
                            />
                        </div>
                        {action.image && (
                            <a
                                href={action.image}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                            >
                                Aktuelles Dokument ansehen <ExternalLink className="h-3 w-3" />
                            </a>
                        )}
                        <p className="text-xs text-muted-foreground">
                            Link zu einem Bild (.jpg, .png) oder PDF-Dokument
                        </p>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Abbrechen
                        </Button>
                        <Button type="submit" disabled={updateAction.isPending}>
                            {updateAction.isPending ? "Wird aktualisiert..." : "Speichern"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
