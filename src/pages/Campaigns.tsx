import { useCampaigns, useDeleteCampaign, useUpdateCampaign } from "@/features/campaigns/hooks/useCampaigns";
import { useActions, useDeleteAction, useUpdateAction } from "@/features/actions/hooks/useActions";
import { NewCampaignModal } from "@/features/campaigns/components/NewCampaignModal";
import { NewActionModal } from "@/features/actions/components/NewActionModal";
import { EditCampaignModal } from "@/features/campaigns/components/EditCampaignModal";
import { EditActionModal } from "@/features/actions/components/EditActionModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Badge } from "@/shared/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Button } from "@/shared/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/shared/components/ui/alert-dialog";
import { toast } from "sonner";

import { useAuth } from "@/features/auth/context/AuthContext";
import { useState } from "react";

export default function Campaigns() {
  const { rep } = useAuth();
  const [editingCampaign, setEditingCampaign] = useState<any>(null);
  const [editingAction, setEditingAction] = useState<any>(null);
  const { data: campaigns, isLoading: campaignsLoading } = useCampaigns();
  const { data: actions, isLoading: actionsLoading } = useActions();
  const deleteCampaign = useDeleteCampaign();
  const deleteAction = useDeleteAction();

  const handleDeleteCampaign = async (id: number, name: string) => {
    try {
      await deleteCampaign.mutateAsync(id);
      toast.success(`Kampagne "${name}" wurde gelöscht`);
    } catch (error) {
      toast.error("Fehler beim Löschen der Kampagne");
      console.error(error);
    }
  };

  const handleDeleteAction = async (id: number, name: string) => {
    try {
      await deleteAction.mutateAsync(id);
      toast.success(`Aktion "${name}" wurde gelöscht`);
    } catch (error) {
      toast.error("Fehler beim Löschen der Aktion");
      console.error(error);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-0">
      <h1 className="text-2xl md:text-3xl font-bold">Kampagnen</h1>

      <EditCampaignModal
        campaign={editingCampaign}
        open={!!editingCampaign}
        onOpenChange={(open) => !open && setEditingCampaign(null)}
      />

      <EditActionModal
        action={editingAction}
        open={!!editingAction}
        onOpenChange={(open) => !open && setEditingAction(null)}
      />

      <Tabs defaultValue="articles" className="w-full">
        <TabsList>
          <TabsTrigger value="articles">Neue Artikel</TabsTrigger>
          <TabsTrigger value="actions">Aktionen</TabsTrigger>
        </TabsList>

        <TabsContent value="articles" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Neue Artikel im Sortiment</h2>
            {rep?.role === 'admin' && (
              <NewCampaignModal>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Neuer Artikel
                </Button>
              </NewCampaignModal>
            )}
          </div>

          <Card>
            <CardContent className="p-0 md:p-6">
              {campaignsLoading ? (
                <Skeleton className="h-96 mx-4 md:mx-0 mb-4 md:mb-0" />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap px-2 md:px-4">Artikelnummer</TableHead>
                        <TableHead className="whitespace-nowrap px-2 md:px-4 min-w-[150px]">Name</TableHead>
                        <TableHead className="whitespace-nowrap px-2 md:px-4">Niedrigster VK</TableHead>
                        <TableHead className="whitespace-nowrap px-2 md:px-4">Aktiv von</TableHead>
                        <TableHead className="whitespace-nowrap px-2 md:px-4">Absagegründe</TableHead>
                        <TableHead className="whitespace-nowrap px-2 md:px-4">Status</TableHead>
                        {rep?.role === 'admin' && <TableHead className="whitespace-nowrap px-2 md:px-4">Aktionen</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaigns?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            Keine Artikel vorhanden
                          </TableCell>
                        </TableRow>
                      ) : (
                        campaigns?.map((campaign) => (
                          <TableRow
                            key={campaign.id}
                            className={`hover:bg-muted/50 transition-colors ${rep?.role === 'admin' ? 'cursor-pointer' : ''}`}
                            onClick={() => rep?.role === 'admin' && setEditingCampaign(campaign)}
                          >
                            <TableCell className="font-mono text-xs md:text-sm px-2 md:px-4 whitespace-nowrap">
                              {campaign.campaign_code}
                            </TableCell>
                            <TableCell className="font-medium text-sm md:text-base px-2 md:px-4">
                              <div className="max-w-[200px] truncate" title={campaign.name}>
                                {campaign.name}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs md:text-sm px-2 md:px-4 whitespace-nowrap">
                              {campaign.Niedrigster_VK || "-"}
                            </TableCell>
                            <TableCell className="text-xs md:text-sm px-2 md:px-4 whitespace-nowrap">
                              {new Date(campaign.active_from).toLocaleDateString("de-DE")}
                            </TableCell>
                            <TableCell className="text-xs md:text-sm px-2 md:px-4">
                              {(campaign.rejection_reasons as string[] | null)?.join(", ") || "-"}
                            </TableCell>
                            <TableCell className="px-2 md:px-4">
                              <Badge
                                variant={campaign.is_active ? "default" : "secondary"}
                                className="text-xs whitespace-nowrap"
                              >
                                {campaign.is_active ? "Aktiv" : "Inaktiv"}
                              </Badge>
                            </TableCell>
                            {rep?.role === 'admin' && (
                              <TableCell className="px-2 md:px-4" onClick={(e) => e.stopPropagation()}>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Kampagne löschen?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Möchten Sie "{campaign.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteCampaign(campaign.id, campaign.name)}>
                                        Löschen
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Aktionen</h2>
            {rep?.role === 'admin' && <NewActionModal />}
          </div>

          {actionsLoading ? (
            <Skeleton className="h-96" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {actions?.length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="py-8">
                    <p className="text-center text-muted-foreground">Keine Aktionen vorhanden</p>
                  </CardContent>
                </Card>
              ) : (
                actions?.map((action) => (
                  <Card
                    key={action.id}
                    className={rep?.role === 'admin' ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}
                    onClick={() => rep?.role === 'admin' && setEditingAction(action)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{action.product_name}</CardTitle>
                        {rep?.role === 'admin' && (
                          <div onClick={(e) => e.stopPropagation()}>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Aktion löschen?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Möchten Sie "{action.product_name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteAction(action.id, action.product_name || "diese Aktion")}>
                                    Löschen
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {action.image && (
                        <a
                          href={action.image}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Dokument öffnen
                        </a>
                      )}
                      <div className="space-y-1 text-sm">
                        {action.promo_from && action.promo_to && (
                          <p className="text-muted-foreground">
                            {new Date(action.promo_from).toLocaleDateString("de-DE")} - {new Date(action.promo_to).toLocaleDateString("de-DE")}
                          </p>
                        )}
                        {action.acceptance && (
                          <p>
                            <span className="font-semibold">Akzeptanz:</span> {action.acceptance}
                          </p>
                        )}
                        {action.customers && (
                          <p>
                            <span className="font-semibold">Kunden:</span> {action.customers}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
