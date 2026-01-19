import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Building2, MapPin, Mail, Euro, User, Calendar, Power, UserCircle } from "lucide-react";
import { PurchaseIntervalSettings } from "@/features/customers/components/PurchaseIntervalSettings";
import { Customer } from "@/features/customers/hooks/useCustomers";
import { Rep } from "@/features/reps/hooks/useReps";

interface CustomerCardProps {
    customer: Customer;
    reps: Rep[] | undefined;
    onRepChange: (kundenNummer: number, repId: string) => void;
    onStatusChange: (kundenNummer: number, value: string) => void;
    onIntervalUpdate: (updates: any) => void;
}

export function CustomerCard({
    customer,
    reps,
    onRepChange,
    onStatusChange,
    onIntervalUpdate
}: CustomerCardProps) {
    return (
        <Card className="mb-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-primary" />
                            {customer.firma}
                        </CardTitle>
                        <div className="text-sm text-muted-foreground mt-1">
                            Kd.-Nr: {customer.kunden_nummer}
                        </div>
                    </div>
                    <Badge variant={customer.status_active ? "default" : "destructive"}>
                        {customer.status_active ? "Aktiv" : "Inaktiv"}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Contact Info */}
                <div className="space-y-2 text-sm">
                    {customer.contact && (
                        <div className="flex items-center gap-2 font-medium">
                            <UserCircle className="h-4 w-4 text-muted-foreground" />
                            <span>{customer.contact}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{customer.email || "-"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{customer.ort || "-"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Euro className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono">
                            {customer.revenue_365d ? parseFloat(customer.revenue_365d.toString()).toFixed(2) : "0.00"} € (365d)
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div className="space-y-3 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
                    {/* Sales Rep Selection */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" /> Außendienstler
                        </label>
                        <Select
                            value={customer.rep_id?.toString() || ""}
                            onValueChange={(value) => onRepChange(customer.kunden_nummer, value)}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Auswählen..." />
                            </SelectTrigger>
                            <SelectContent>
                                {reps?.map((rep) => (
                                    <SelectItem key={rep.rep_id} value={rep.rep_id.toString()}>
                                        {rep.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Purchase Interval */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Kaufintervall
                        </label>
                        <PurchaseIntervalSettings
                            kundenNummer={customer.kunden_nummer}
                            currentInterval={customer.purchase_interval}
                            seasonStart={customer.season_start}
                            seasonEnd={customer.season_end}
                            onUpdate={(updates) => onIntervalUpdate(updates)}
                            trigger={
                                <Button variant="outline" className="w-full justify-between">
                                    {customer.season_start && customer.season_end
                                        ? "Saisonal"
                                        : `${customer.purchase_interval || 7} Tage`}
                                </Button>
                            }
                        />
                    </div>

                    {/* Status Toggle */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <Power className="h-3 w-3" /> Status
                        </label>
                        <Select
                            value={customer.status_active ? "active" : "inactive"}
                            onValueChange={(value) => onStatusChange(customer.kunden_nummer, value)}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="active">Aktiv</SelectItem>
                                <SelectItem value="inactive">Inaktiv</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
