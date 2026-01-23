"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { useOrganizationContext } from "@/components/providers/organization-provider";
import { serviceOptionsApi, userServiceOptionsApi, setAuthToken } from "@/lib/api";
import { ServiceOption, UserServiceOption } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, Check, X, ListChecks } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function MyServicesPage() {
  const { getToken } = useAuth();
  const t = useTranslations('myServices');
  const { toast } = useToast();
  const { currentOrganization, isLoading: orgLoading } = useOrganizationContext();
  
  const [orgServices, setOrgServices] = useState<ServiceOption[]>([]);
  const [myServices, setMyServices] = useState<UserServiceOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingService, setTogglingService] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; serviceId: string; action: 'add' | 'remove' } | null>(null);

  useEffect(() => {
    if (currentOrganization) {
      loadData();
    }
  }, [currentOrganization]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const token = await getToken();
      setAuthToken(token);
      const [orgServicesRes, myServicesRes] = await Promise.all([
        serviceOptionsApi.getActiveForOrganization(),
        userServiceOptionsApi.getMyServices(),
      ]);
      setOrgServices(orgServicesRes.data);
      setMyServices(myServicesRes.data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load services",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isServiceAssigned = (serviceId: string) => {
    return myServices.some(ms => ms.serviceOptionId === serviceId);
  };

  const getMyServiceAssignment = (serviceId: string) => {
    return myServices.find(ms => ms.serviceOptionId === serviceId);
  };

  const handleToggleService = async (serviceId: string) => {
    const isAssigned = isServiceAssigned(serviceId);
    
    setConfirmDialog({
      open: true,
      serviceId,
      action: isAssigned ? 'remove' : 'add',
    });
  };

  const confirmToggle = async () => {
    if (!confirmDialog) return;
    
    const { serviceId, action } = confirmDialog;
    setTogglingService(serviceId);
    
    try {
      const token = await getToken();
      setAuthToken(token);
      if (action === 'add') {
        await userServiceOptionsApi.assignService({ serviceOptionId: serviceId });
        toast({
          title: "Success",
          description: "Service added to your profile",
        });
      } else {
        await userServiceOptionsApi.removeService(serviceId);
        toast({
          title: "Success",
          description: "Service removed from your profile",
        });
      }
      await loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${action} service`,
        variant: "destructive",
      });
    } finally {
      setTogglingService(null);
      setConfirmDialog(null);
    }
  };

  const handleToggleActive = async (serviceId: string) => {
    setTogglingService(serviceId);
    
    try {
      const token = await getToken();
      setAuthToken(token);
      await userServiceOptionsApi.toggleService(serviceId);
      await loadData();
      toast({
        title: "Success",
        description: "Service status updated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update service status",
        variant: "destructive",
      });
    } finally {
      setTogglingService(null);
    }
  };

  if (orgLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!currentOrganization) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ListChecks className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No Organization Selected</h3>
            <p className="text-sm text-muted-foreground">
              Please select an organization to manage your services
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const assignedServices = myServices.filter(ms => ms.serviceOption);
  const availableServices = orgServices.filter(os => !isServiceAssigned(os.id));

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ListChecks className="h-8 w-8" />
          {t('title') || 'My Services'}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('description') || 'Select which services you provide to clients'}
        </p>
      </div>

      {/* My Assigned Services */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            {t('assignedServices') || 'My Active Services'}
          </CardTitle>
          <CardDescription>
            {t('assignedServicesDesc') || 'Services you currently offer to clients'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assignedServices.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">
              {t('noAssignedServices') || 'You haven\'t selected any services yet'}
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {assignedServices.map((assignment) => (
                <Card key={assignment.id} className="relative">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{assignment.serviceOption?.title}</h4>
                        {assignment.serviceOption?.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {assignment.serviceOption.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {assignment.customDuration || assignment.serviceOption?.duration} min
                          </Badge>
                          <Badge variant={assignment.isActive ? "default" : "secondary"}>
                            {assignment.isActive ? "Active" : "Paused"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {t('active') || 'Active'}
                        </span>
                        <Switch
                          checked={assignment.isActive}
                          onCheckedChange={() => handleToggleActive(assignment.serviceOptionId)}
                          disabled={togglingService === assignment.serviceOptionId}
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleService(assignment.serviceOptionId)}
                        disabled={togglingService === assignment.serviceOptionId}
                      >
                        {togglingService === assignment.serviceOptionId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <X className="h-4 w-4 mr-1" />
                            {t('remove') || 'Remove'}
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Services */}
      <Card>
        <CardHeader>
          <CardTitle>{t('availableServices') || 'Available Services'}</CardTitle>
          <CardDescription>
            {t('availableServicesDesc') || 'Organization services you can add to your profile'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availableServices.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">
              {t('noAvailableServices') || 'All organization services have been added to your profile'}
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {availableServices.map((service) => (
                <Card key={service.id} className="relative border-dashed">
                  <CardContent className="pt-6">
                    <div className="flex-1">
                      <h4 className="font-medium">{service.title}</h4>
                      {service.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {service.description}
                        </p>
                      )}
                      <Badge variant="outline" className="flex items-center gap-1 mt-2 w-fit">
                        <Clock className="h-3 w-3" />
                        {service.duration} min
                      </Badge>
                    </div>
                    <Button
                      className="w-full mt-4"
                      variant="outline"
                      onClick={() => handleToggleService(service.id)}
                      disabled={togglingService === service.id}
                    >
                      {togglingService === service.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          {t('addService') || 'Add to My Services'}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog?.open || false} onOpenChange={(open: boolean) => !open && setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog?.action === 'add' 
                ? (t('confirmAddTitle') || 'Add Service?')
                : (t('confirmRemoveTitle') || 'Remove Service?')
              }
            </DialogTitle>
            <DialogDescription>
              {confirmDialog?.action === 'add'
                ? (t('confirmAddDesc') || 'This will add the service to your profile. Clients will be able to book appointments with you for this service.')
                : (t('confirmRemoveDesc') || 'This will remove the service from your profile. Existing appointments will not be affected.')
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>
              {t('cancel') || 'Cancel'}
            </Button>
            <Button onClick={confirmToggle}>
              {t('confirm') || 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
