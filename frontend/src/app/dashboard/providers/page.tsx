"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import {
  externalProvidersApi,
  serviceOptionsApi,
  organizationsApi,
  availabilityApi,
  blockedTimesApi,
  userServiceOptionsApi,
  setAuthToken,
  setOrganizationContext,
} from "@/lib/api";
import {
  ExternalProvider,
  ExternalProviderServiceOption,
  ServiceOption,
  Availability,
  BlockedTime,
  OrganizationMember,
  UserServiceOption,
} from "@/lib/types";
import { useOrganizationContext } from "@/components/providers/organization-provider";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import {
  RefreshCw,
  Building2,
  UserPlus,
} from "lucide-react";

// Import extracted components
import {
  ProviderCard,
  LoadingSkeleton,
  EmptyState,
  ProviderEditDialog,
  AddAvailabilityDialog,
  AddBlockedTimeDialog,
  DeleteConfirmationDialog,
  ExternalProviderFormData,
  AvailabilityFormData,
  BlockedTimeFormData,
} from "@/components/providers";

export default function ProvidersPage() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const { currentOrganization, isAdmin } = useOrganizationContext();
  const t = useTranslations('providersPage');
  const common = useTranslations('common');

  // Data state
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [externalProviders, setExternalProviders] = useState<ExternalProvider[]>([]);
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<'member' | 'external'>('member');
  const [editingMember, setEditingMember] = useState<OrganizationMember | null>(null);
  const [editingProvider, setEditingProvider] = useState<ExternalProvider | null>(null);
  const [activeTab, setActiveTab] = useState("availability");
  const [saving, setSaving] = useState(false);

  // External provider form data
  const [formData, setFormData] = useState<ExternalProviderFormData>({
    name: "",
    imageBase64: "",
    isActive: true,
  });
  const [assignedServiceIds, setAssignedServiceIds] = useState<string[]>([]);
  const [serviceSearch, setServiceSearch] = useState('');

  // Availability state
  const [providerAvailability, setProviderAvailability] = useState<Availability[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [addAvailabilityDialogOpen, setAddAvailabilityDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const [newAvailability, setNewAvailability] = useState<AvailabilityFormData>({
    startTime: "09:00",
    endTime: "17:00",
  });

  // Blocked times state
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [blockedTimesLoading, setBlockedTimesLoading] = useState(false);
  const [addBlockedTimeDialogOpen, setAddBlockedTimeDialogOpen] = useState(false);
  const [newBlockedTime, setNewBlockedTime] = useState<BlockedTimeFormData>({
    date: "",
    startTime: "09:00",
    endTime: "17:00",
    isFullDay: true,
    reason: "",
  });

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState<ExternalProvider | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Image upload ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============ Data Fetching ============
  const fetchData = useCallback(
    async (showRefreshing = false) => {
      const token = await getToken();
      if (!token) return;
      setAuthToken(token);

      if (!currentOrganization) {
        setMembers([]);
        setExternalProviders([]);
        setServiceOptions([]);
        setLoading(false);
        return;
      }

      setOrganizationContext(currentOrganization.id);

      if (showRefreshing) {
        setRefreshing(true);
      }

      try {
        const [membersRes, providersRes, servicesRes] = await Promise.all([
          organizationsApi.getMembers(currentOrganization.id),
          externalProvidersApi.getAll(),
          serviceOptionsApi.getAllForOrganization(),
        ]);
        setMembers(membersRes.data || []);
        setExternalProviders(providersRes.data || []);
        setServiceOptions(servicesRes.data || []);
      } catch (error) {
        console.error("Failed to fetch data", error);
        toast({
          title: t('error.title'),
          description: t('error.loadFailed'),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [getToken, currentOrganization, toast, t]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ============ Member Operations ============
  const fetchMemberDetails = async (userId: string) => {
    const token = await getToken();
    if (!token || !currentOrganization) return;
    setAuthToken(token);
    setOrganizationContext(currentOrganization.id);

    setAvailabilityLoading(true);
    setBlockedTimesLoading(true);

    try {
      const [servicesRes, availabilityRes, blockedTimesRes] = await Promise.all([
        userServiceOptionsApi.getMemberServices(userId),
        availabilityApi.getForMember(userId),
        blockedTimesApi.getForMember(userId),
      ]);
      
      const services = servicesRes.data as UserServiceOption[];
      setAssignedServiceIds(services.map(s => s.serviceOptionId));
      setProviderAvailability(availabilityRes.data || []);
      setBlockedTimes(blockedTimesRes.data || []);
    } catch (error) {
      console.error("Failed to fetch member details", error);
    } finally {
      setAvailabilityLoading(false);
      setBlockedTimesLoading(false);
    }
  };

  const handleEditMember = async (member: OrganizationMember) => {
    setEditingType('member');
    setEditingMember(member);
    setEditingProvider(null);
    setServiceSearch('');
    setActiveTab("services");
    setDialogOpen(true);
    // Use member.userId (Clerk ID) - backend resolves it to database UUID
    await fetchMemberDetails(member.userId);
  };

  // ============ External Provider Operations ============
  const fetchProviderDetails = async (providerId: string) => {
    const token = await getToken();
    if (!token || !currentOrganization) return;
    setAuthToken(token);
    setOrganizationContext(currentOrganization.id);

    setAvailabilityLoading(true);
    setBlockedTimesLoading(true);

    try {
      const [servicesRes, availabilityRes, blockedTimesRes] = await Promise.all([
        externalProvidersApi.getAssignedServices(providerId),
        externalProvidersApi.getAvailability(providerId),
        externalProvidersApi.getBlockedTimes(providerId),
      ]);

      const services = servicesRes.data as ExternalProviderServiceOption[];
      setAssignedServiceIds(services.map(s => s.serviceOptionId));
      setProviderAvailability(availabilityRes.data || []);
      setBlockedTimes(blockedTimesRes.data || []);
    } catch (error) {
      console.error("Failed to fetch provider details", error);
    } finally {
      setAvailabilityLoading(false);
      setBlockedTimesLoading(false);
    }
  };

  const handleCreateProvider = () => {
    setEditingType('external');
    setEditingProvider(null);
    setEditingMember(null);
    setFormData({ name: "", imageBase64: "", isActive: true });
    setAssignedServiceIds([]);
    setProviderAvailability([]);
    setBlockedTimes([]);
    setServiceSearch('');
    setActiveTab("details");
    setDialogOpen(true);
  };

  const handleEditProvider = async (provider: ExternalProvider) => {
    setEditingType('external');
    setEditingProvider(provider);
    setEditingMember(null);
    setFormData({
      name: provider.name,
      imageBase64: provider.imageBase64 || "",
      isActive: provider.isActive,
    });
    setServiceSearch('');
    setActiveTab("details");
    setDialogOpen(true);
    await fetchProviderDetails(provider.id);
  };

  const handleSaveProvider = async () => {
    if (!formData.name.trim()) {
      toast({
        title: t('error.title'),
        description: t('error.nameRequired'),
        variant: "destructive",
      });
      return;
    }

    const token = await getToken();
    if (!token || !currentOrganization) return;
    setAuthToken(token);
    setOrganizationContext(currentOrganization.id);

    setSaving(true);
    try {
      if (editingProvider) {
        await externalProvidersApi.update(editingProvider.id, formData);
        await externalProvidersApi.assignServices(editingProvider.id, assignedServiceIds);
        toast({
          title: t('success.title'),
          description: t('success.updated'),
        });
      } else {
        const response = await externalProvidersApi.create(formData);
        const newProvider = response.data;
        if (assignedServiceIds.length > 0) {
          await externalProvidersApi.assignServices(newProvider.id, assignedServiceIds);
        }
        toast({
          title: t('success.title'),
          description: t('success.created'),
        });
      }

      setDialogOpen(false);
      fetchData(true);
    } catch (error) {
      console.error("Failed to save provider", error);
      toast({
        title: t('error.title'),
        description: t('error.saveFailed'),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (provider: ExternalProvider) => {
    setProviderToDelete(provider);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!providerToDelete) return;

    const token = await getToken();
    if (!token || !currentOrganization) return;
    setAuthToken(token);
    setOrganizationContext(currentOrganization.id);

    setDeleting(true);
    try {
      await externalProvidersApi.delete(providerToDelete.id);
      toast({
        title: t('success.title'),
        description: t('success.deleted'),
      });
      setDeleteDialogOpen(false);
      setProviderToDelete(null);
      fetchData(true);
    } catch (error) {
      console.error("Failed to delete provider", error);
      toast({
        title: t('error.title'),
        description: t('error.deleteFailed'),
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  // ============ Image Upload ============
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t('error.title'),
        description: t('error.imageTooLarge'),
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({ ...prev, imageBase64: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  // ============ Service Assignment ============
  const handleServiceToggle = async (serviceId: string, checked: boolean) => {
    const newServiceIds = checked 
      ? [...assignedServiceIds, serviceId]
      : assignedServiceIds.filter(id => id !== serviceId);
    
    setAssignedServiceIds(newServiceIds);

    // For existing providers, save immediately
    const token = await getToken();
    if (!token || !currentOrganization) return;
    setAuthToken(token);
    setOrganizationContext(currentOrganization.id);

    try {
      if (editingType === 'member' && editingMember) {
        // For members, toggle service assignment using Clerk ID (backend resolves to DB UUID)
        if (checked) {
          await userServiceOptionsApi.assignServiceToMember(editingMember.userId, { serviceOptionId: serviceId });
        } else {
          await userServiceOptionsApi.removeServiceFromMember(editingMember.userId, serviceId);
        }
      } else if (editingType === 'external' && editingProvider) {
        // For existing external providers, update all service assignments
        await externalProvidersApi.assignServices(editingProvider.id, newServiceIds);
      }
      // For new external providers (editingProvider is null), just update state - will save on create
    } catch (error) {
      console.error("Failed to toggle service", error);
      // Revert state on error
      setAssignedServiceIds(assignedServiceIds);
      toast({
        title: t('error.title'),
        description: t('error.serviceFailed'),
        variant: "destructive",
      });
    }
  };

  const handleBulkAssignServices = async () => {
    const allIds = serviceOptions.map(s => s.id);
    const newIds = allIds.filter(id => !assignedServiceIds.includes(id));
    setAssignedServiceIds(allIds);
    
    const token = await getToken();
    if (!token || !currentOrganization) return;
    setAuthToken(token);
    setOrganizationContext(currentOrganization.id);
    
    try {
      if (editingType === 'external' && editingProvider) {
        await externalProvidersApi.assignServices(editingProvider.id, allIds);
      } else if (editingType === 'member' && editingMember) {
        // Assign new services in parallel using Clerk ID
        await Promise.all(
          newIds.map(id => 
            userServiceOptionsApi.assignServiceToMember(editingMember.userId, { serviceOptionId: id })
          )
        );
      }
    } catch (error) {
      console.error("Failed to bulk assign", error);
      toast({
        title: t('error.title'),
        description: t('error.serviceFailed'),
        variant: "destructive",
      });
    }
  };

  const handleBulkClearServices = async () => {
    const currentIds = [...assignedServiceIds];
    setAssignedServiceIds([]);
    
    const token = await getToken();
    if (!token || !currentOrganization) return;
    setAuthToken(token);
    setOrganizationContext(currentOrganization.id);
    
    try {
      if (editingType === 'external' && editingProvider) {
        await externalProvidersApi.assignServices(editingProvider.id, []);
      } else if (editingType === 'member' && editingMember) {
        // Remove all services in parallel using Clerk ID
        await Promise.all(
          currentIds.map(id => 
            userServiceOptionsApi.removeServiceFromMember(editingMember.userId, id)
          )
        );
      }
    } catch (error) {
      console.error("Failed to bulk clear", error);
      toast({
        title: t('error.title'),
        description: t('error.serviceFailed'),
        variant: "destructive",
      });
    }
  };

  // ============ Availability Operations ============
  const handleAddAvailability = async () => {
    const token = await getToken();
    if (!token || !currentOrganization) return;
    setAuthToken(token);
    setOrganizationContext(currentOrganization.id);

    try {
      if (editingType === 'member' && editingMember) {
        await availabilityApi.createForMember(editingMember.userId, {
          dayOfWeek: selectedDay,
          startTime: newAvailability.startTime,
          endTime: newAvailability.endTime,
        });
        const res = await availabilityApi.getForMember(editingMember.userId);
        setProviderAvailability(res.data || []);
      } else if (editingType === 'external' && editingProvider) {
        await externalProvidersApi.createAvailability(editingProvider.id, {
          dayOfWeek: selectedDay,
          startTime: newAvailability.startTime,
          endTime: newAvailability.endTime,
        });
        const res = await externalProvidersApi.getAvailability(editingProvider.id);
        setProviderAvailability(res.data || []);
      }
      
      setAddAvailabilityDialogOpen(false);
      toast({
        title: t('success.title'),
        description: t('availability.added'),
      });
    } catch (error) {
      console.error("Failed to add availability", error);
      toast({
        title: t('error.title'),
        description: t('availability.addFailed'),
        variant: "destructive",
      });
    }
  };

  const handleDeleteAvailability = async (availabilityId: string) => {
    const token = await getToken();
    if (!token || !currentOrganization) return;
    setAuthToken(token);
    setOrganizationContext(currentOrganization.id);

    try {
      if (editingType === 'member') {
        await availabilityApi.deleteAsAdmin(availabilityId);
      } else if (editingProvider) {
        await externalProvidersApi.deleteAvailability(editingProvider.id, availabilityId);
      }
      
      setProviderAvailability(prev => prev.filter(a => a.id !== availabilityId));
      toast({
        title: t('success.title'),
        description: t('availability.deleted'),
      });
    } catch (error) {
      console.error("Failed to delete availability", error);
      toast({
        title: t('error.title'),
        description: t('availability.deleteFailed'),
        variant: "destructive",
      });
    }
  };

  const handleOpenAddAvailability = (day: number) => {
    setSelectedDay(day);
    setNewAvailability({ startTime: "09:00", endTime: "17:00" });
    setAddAvailabilityDialogOpen(true);
  };

  // ============ Blocked Time Operations ============
  const handleAddBlockedTime = async () => {
    if (!newBlockedTime.date) return;

    const token = await getToken();
    if (!token || !currentOrganization) return;
    setAuthToken(token);
    setOrganizationContext(currentOrganization.id);

    try {
      const data = {
        date: newBlockedTime.date,
        startTime: newBlockedTime.isFullDay ? undefined : newBlockedTime.startTime || undefined,
        endTime: newBlockedTime.isFullDay ? undefined : newBlockedTime.endTime || undefined,
        isFullDay: newBlockedTime.isFullDay,
        reason: newBlockedTime.reason || undefined,
      };

      if (editingType === 'member' && editingMember) {
        await blockedTimesApi.createForMember(editingMember.userId, data);
        const res = await blockedTimesApi.getForMember(editingMember.userId);
        setBlockedTimes(res.data || []);
      } else if (editingType === 'external' && editingProvider) {
        await externalProvidersApi.createBlockedTime(editingProvider.id, data);
        const res = await externalProvidersApi.getBlockedTimes(editingProvider.id);
        setBlockedTimes(res.data || []);
      }
      
      setAddBlockedTimeDialogOpen(false);
      setNewBlockedTime({ date: "", startTime: "09:00", endTime: "17:00", isFullDay: true, reason: "" });
      toast({
        title: t('success.title'),
        description: t('blockedTime.added'),
      });
    } catch (error) {
      console.error("Failed to add blocked time", error);
      toast({
        title: t('error.title'),
        description: t('blockedTime.addFailed'),
        variant: "destructive",
      });
    }
  };

  const handleDeleteBlockedTime = async (blockedTimeId: string) => {
    const token = await getToken();
    if (!token || !currentOrganization) return;
    setAuthToken(token);
    setOrganizationContext(currentOrganization.id);

    try {
      if (editingType === 'member') {
        await blockedTimesApi.deleteAsAdmin(blockedTimeId);
      } else if (editingProvider) {
        await externalProvidersApi.deleteBlockedTime(editingProvider.id, blockedTimeId);
      }
      
      setBlockedTimes(prev => prev.filter(bt => bt.id !== blockedTimeId));
      toast({
        title: t('success.title'),
        description: t('blockedTime.deleted'),
      });
    } catch (error) {
      console.error("Failed to delete blocked time", error);
      toast({
        title: t('error.title'),
        description: t('blockedTime.deleteFailed'),
        variant: "destructive",
      });
    }
  };

  // ============ Render ============
  if (loading) {
    return <LoadingSkeleton />;
  }

  // Only admins can access this page
  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold">{t('title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <Building2 className="h-4 w-4" />
              <AlertDescription>
                {t('error.adminOnly')}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show message when no organization is selected
  if (!currentOrganization) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold">{t('title')}</CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <Building2 className="h-4 w-4" />
              <AlertDescription>
                {t('error.noOrganization')}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Content */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-semibold">{t('title')}</CardTitle>
              <CardDescription>{t('description')}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchData(true)}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                {common('refresh')}
              </Button>
              {isAdmin && (
                <Button size="sm" onClick={handleCreateProvider}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t('addProvider')}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Unified provider grid - members + external providers */}
          {members.length === 0 && externalProviders.length === 0 ? (
            <EmptyState 
              message={t('empty.description')}
              onCreateClick={isAdmin ? handleCreateProvider : undefined}
              buttonText={isAdmin ? t('addProvider') : undefined}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Render members as providers */}
              {members.map((member) => (
                <ProviderCard
                  key={`member-${member.userId}`}
                  provider={{
                    id: member.userId,
                    name: `${member.user?.firstName || ''} ${member.user?.lastName || ''}`.trim() || member.user?.email || 'Unknown',
                    imageUrl: member.user?.imageUrl,
                  }}
                  type="member"
                  onEdit={() => handleEditMember(member)}
                />
              ))}
              {/* Render external providers */}
              {externalProviders.map((provider) => (
                <ProviderCard
                  key={`external-${provider.id}`}
                  provider={{
                    id: provider.id,
                    name: provider.name,
                    imageUrl: provider.imageBase64,
                    isActive: provider.isActive,
                  }}
                  type="external"
                  onEdit={() => handleEditProvider(provider)}
                  onDelete={isAdmin ? () => handleDeleteClick(provider) : undefined}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <ProviderEditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingType={editingType}
        editingMember={editingMember}
        editingProvider={editingProvider}
        formData={formData}
        assignedServiceIds={assignedServiceIds}
        providerAvailability={providerAvailability}
        blockedTimes={blockedTimes}
        serviceOptions={serviceOptions}
        availabilityLoading={availabilityLoading}
        blockedTimesLoading={blockedTimesLoading}
        saving={saving}
        serviceSearch={serviceSearch}
        activeTab={activeTab}
        onActiveTabChange={setActiveTab}
        onFormDataChange={(data) => setFormData(prev => ({ ...prev, ...data }))}
        onServiceToggle={handleServiceToggle}
        onBulkAssignServices={handleBulkAssignServices}
        onBulkClearServices={handleBulkClearServices}
        onServiceSearchChange={setServiceSearch}
        onAddAvailability={handleOpenAddAvailability}
        onDeleteAvailability={handleDeleteAvailability}
        onAddBlockedTime={() => setAddBlockedTimeDialogOpen(true)}
        onDeleteBlockedTime={handleDeleteBlockedTime}
        onImageUpload={handleImageUpload}
        onSave={handleSaveProvider}
      />

      {/* Add Availability Dialog */}
      <AddAvailabilityDialog
        open={addAvailabilityDialogOpen}
        onOpenChange={setAddAvailabilityDialogOpen}
        selectedDay={selectedDay}
        availability={newAvailability}
        onAvailabilityChange={setNewAvailability}
        onAdd={handleAddAvailability}
      />

      {/* Add Blocked Time Dialog */}
      <AddBlockedTimeDialog
        open={addBlockedTimeDialogOpen}
        onOpenChange={setAddBlockedTimeDialogOpen}
        blockedTime={newBlockedTime}
        onBlockedTimeChange={(data) => setNewBlockedTime(prev => ({ ...prev, ...data }))}
        onAdd={handleAddBlockedTime}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        providerName={providerToDelete?.name || ''}
        deleting={deleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
