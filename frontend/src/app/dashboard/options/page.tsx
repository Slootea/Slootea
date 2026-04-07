"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { serviceOptionsApi, userServiceOptionsApi, organizationsApi, organizationSettingsApi, externalProvidersApi, setAuthToken, setOrganizationContext } from "@/lib/api";
import { ServiceOption, OrganizationMember, UserServiceOption, ExternalProvider, UnifiedProvider } from "@/lib/types";
import { useOrganizationContext } from "@/components/providers/organization-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ImageCropUpload } from "@/components/ui/image-crop-upload";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Pencil, Trash2, Clock, Image, Users, Loader2, CheckSquare, Square, MoreHorizontal, Search, LayoutGrid, List } from "lucide-react";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ServiceOptionsPage() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const { currentOrganization, userRole } = useOrganizationContext();
  const t = useTranslations("optionsPage");
  const tCommon = useTranslations("common");
  const [options, setOptions] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<ServiceOption | null>(null);
  const [activeTab, setActiveTab] = useState<string>("details");
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    imageBase64: "" as string | undefined,
    duration: 30,
    showPrice: false,
    price: 0,
  });

  // Provider assignment state (unified: members + external providers)
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [externalProviders, setExternalProviders] = useState<ExternalProvider[]>([]);
  const [assignedMemberIds, setAssignedMemberIds] = useState<string[]>([]); // Clerk IDs
  const [assignedExternalProviderIds, setAssignedExternalProviderIds] = useState<string[]>([]); // UUIDs
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [savingProviderId, setSavingProviderId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [currency, setCurrency] = useState<string>("TL");

  // Computed: total selected providers count
  const totalSelectedProviders = assignedMemberIds.length + assignedExternalProviderIds.length;

  const isAdmin = userRole === 'owner' || userRole === 'admin';

  const fetchOptions = async () => {
    const token = await getToken();
    setAuthToken(token);

    try {
      let res;
      if (currentOrganization) {
        setOrganizationContext(currentOrganization.id);
        res = await serviceOptionsApi.getAllForOrganization();
        // Fetch organization settings to get currency
        try {
          const settingsRes = await organizationSettingsApi.get();
          if (settingsRes.data?.currency) {
            setCurrency(settingsRes.data.currency);
          }
        } catch (e) {
          // Ignore settings fetch error, use default currency
        }
      } else {
        res = await serviceOptionsApi.getAll();
      }
      setOptions(res.data);
    } catch (error) {
      console.error("Failed to fetch service options", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, [getToken, currentOrganization]);

  const loadProviders = async () => {
    if (!currentOrganization || !isAdmin) return;
    
    setLoadingProviders(true);
    try {
      const token = await getToken();
      setAuthToken(token);
      setOrganizationContext(currentOrganization.id);

      const [membersRes, externalRes] = await Promise.all([
        organizationsApi.getMembers(currentOrganization.id),
        externalProvidersApi.getAll(),
      ]);
      setMembers(membersRes.data);
      setExternalProviders(externalRes.data.filter((ep: ExternalProvider) => ep.isActive));
    } catch (error) {
      console.error("Failed to load providers", error);
      toast({
        title: tCommon("error"),
        description: t("messages.loadProvidersFailed"),
        variant: "destructive",
      });
    } finally {
      setLoadingProviders(false);
    }
  };

  const loadProvidersAndAssignments = async (serviceId: string) => {
    if (!currentOrganization || !isAdmin) return;
    
    setLoadingProviders(true);
    try {
      const token = await getToken();
      setAuthToken(token);
      setOrganizationContext(currentOrganization.id);

      const [membersRes, externalRes, assignedProvidersRes] = await Promise.all([
        organizationsApi.getMembers(currentOrganization.id),
        externalProvidersApi.getAll(),
        userServiceOptionsApi.getProvidersForService(serviceId),
      ]);

      setMembers(membersRes.data);
      setExternalProviders(externalRes.data.filter((ep: ExternalProvider) => ep.isActive));
      
      // Parse unified providers response - separate member and external assignments
      const assignedProviders = assignedProvidersRes.data as UnifiedProvider[];
      const memberClerkIds = assignedProviders
        .filter((p) => p.type === 'member' && p.clerkId)
        .map((p) => p.clerkId as string);
      const externalIds = assignedProviders
        .filter((p) => p.type === 'external')
        .map((p) => p.id);
      
      setAssignedMemberIds(memberClerkIds);
      setAssignedExternalProviderIds(externalIds);
    } catch (error) {
      console.error("Failed to load providers", error);
      toast({
        title: tCommon("error"),
        description: t("messages.loadProvidersFailed"),
        variant: "destructive",
      });
    } finally {
      setLoadingProviders(false);
    }
  };

  const openCreateDialog = async () => {
    setEditingOption(null);
    setFormData({ title: "", description: "", imageBase64: undefined, duration: 30, showPrice: false, price: 0 });
    setAssignedMemberIds([]);
    setAssignedExternalProviderIds([]);
    setActiveTab("details");
    setDialogOpen(true);

    // Load providers for assignment if in organization context
    if (currentOrganization && isAdmin) {
      await loadProviders();
    }
  };

  const openEditDialog = async (option: ServiceOption) => {
    setEditingOption(option);
    setFormData({
      title: option.title,
      description: option.description || "",
      imageBase64: option.imageBase64 || undefined,
      duration: option.duration,
      showPrice: option.showPrice || false,
      price: option.price || 0,
    });
    setActiveTab("details");
    setDialogOpen(true);

    // Load providers and assignments if in organization context
    if (currentOrganization && isAdmin) {
      await loadProvidersAndAssignments(option.id);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const token = await getToken();
      setAuthToken(token);

      let createdServiceId: string | null = null;

      if (editingOption) {
        // Update service
        if (currentOrganization) {
          setOrganizationContext(currentOrganization.id);
          await serviceOptionsApi.updateInOrganization(editingOption.id, formData);
        } else {
          await serviceOptionsApi.update(editingOption.id, formData);
        }
        toast({ title: t("messages.updated") });
      } else {
        // Create service
        if (currentOrganization) {
          setOrganizationContext(currentOrganization.id);
          const res = await serviceOptionsApi.createForOrganization(formData);
          createdServiceId = res.data.id;
        } else {
          await serviceOptionsApi.create(formData);
        }

        // If we created a service in an organization and have selected providers, assign them
        if (createdServiceId && currentOrganization && isAdmin && (assignedMemberIds.length > 0 || assignedExternalProviderIds.length > 0)) {
          try {
            await userServiceOptionsApi.bulkAssignProvidersToService(createdServiceId, {
              memberIds: assignedMemberIds,
              externalProviderIds: assignedExternalProviderIds,
            });
            toast({ title: t("messages.createdWithAssignments") });
          } catch (assignError) {
            console.error("Failed to assign providers", assignError);
            toast({ 
              title: t("messages.created"),
              description: t("messages.assignmentsFailed"),
            });
          }
        } else {
          toast({ title: t("messages.created") });
        }
      }
      setDialogOpen(false);
      fetchOptions();
    } catch (error) {
      toast({
        title: tCommon("error"),
        description: t("messages.saveFailed"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirmDelete"))) return;

    try {
      if (currentOrganization) {
        setOrganizationContext(currentOrganization.id);
        await serviceOptionsApi.deleteFromOrganization(id);
      } else {
        await serviceOptionsApi.delete(id);
      }
      toast({ title: t("messages.deleted") });
      fetchOptions();
    } catch (error) {
      toast({
        title: tCommon("error"),
        description: t("messages.deleteFailed"),
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (option: ServiceOption) => {
    try {
      if (currentOrganization) {
        setOrganizationContext(currentOrganization.id);
        await serviceOptionsApi.updateInOrganization(option.id, { isActive: !option.isActive });
      } else {
        await serviceOptionsApi.update(option.id, { isActive: !option.isActive });
      }
      fetchOptions();
    } catch (error) {
      toast({
        title: tCommon("error"),
        description: t("messages.updateFailed"),
        variant: "destructive",
      });
    }
  };

  // Provider assignment functions (unified: members + external)
  const saveProviderAssignments = async (newMemberIds: string[], newExternalIds: string[]) => {
    if (!editingOption || !currentOrganization) return;
    
    try {
      const token = await getToken();
      setAuthToken(token);
      setOrganizationContext(currentOrganization.id);
      await userServiceOptionsApi.bulkAssignProvidersToService(editingOption.id, {
        memberIds: newMemberIds,
        externalProviderIds: newExternalIds,
      });
    } catch (error) {
      throw error;
    }
  };

  const handleToggleMemberAssignment = async (memberId: string) => {
    const newMemberIds = assignedMemberIds.includes(memberId)
      ? assignedMemberIds.filter((id) => id !== memberId)
      : [...assignedMemberIds, memberId];
    
    setAssignedMemberIds(newMemberIds);

    // Auto-save when editing an existing service
    if (editingOption && currentOrganization) {
      setSavingProviderId(memberId);
      try {
        await saveProviderAssignments(newMemberIds, assignedExternalProviderIds);
      } catch (error) {
        // Revert on error
        setAssignedMemberIds(assignedMemberIds);
        toast({
          title: tCommon("error"),
          description: t("messages.assignmentsFailed"),
          variant: "destructive",
        });
      } finally {
        setSavingProviderId(null);
      }
    }
  };

  const handleToggleExternalProviderAssignment = async (providerId: string) => {
    const newExternalIds = assignedExternalProviderIds.includes(providerId)
      ? assignedExternalProviderIds.filter((id) => id !== providerId)
      : [...assignedExternalProviderIds, providerId];
    
    setAssignedExternalProviderIds(newExternalIds);

    // Auto-save when editing an existing service
    if (editingOption && currentOrganization) {
      setSavingProviderId(providerId);
      try {
        await saveProviderAssignments(assignedMemberIds, newExternalIds);
      } catch (error) {
        // Revert on error
        setAssignedExternalProviderIds(assignedExternalProviderIds);
        toast({
          title: tCommon("error"),
          description: t("messages.assignmentsFailed"),
          variant: "destructive",
        });
      } finally {
        setSavingProviderId(null);
      }
    }
  };

  const handleSelectAllProviders = async () => {
    const allMemberIds = members.map((m) => m.userId);
    const allExternalIds = externalProviders.map((ep) => ep.id);
    setAssignedMemberIds(allMemberIds);
    setAssignedExternalProviderIds(allExternalIds);

    // Auto-save when editing an existing service
    if (editingOption && currentOrganization) {
      setSavingProviderId('all');
      try {
        await saveProviderAssignments(allMemberIds, allExternalIds);
      } catch (error) {
        setAssignedMemberIds(assignedMemberIds);
        setAssignedExternalProviderIds(assignedExternalProviderIds);
        toast({
          title: tCommon("error"),
          description: t("messages.assignmentsFailed"),
          variant: "destructive",
        });
      } finally {
        setSavingProviderId(null);
      }
    }
  };

  const handleDeselectAllProviders = async () => {
    const previousMemberIds = [...assignedMemberIds];
    const previousExternalIds = [...assignedExternalProviderIds];
    setAssignedMemberIds([]);
    setAssignedExternalProviderIds([]);

    // Auto-save when editing an existing service
    if (editingOption && currentOrganization) {
      setSavingProviderId('none');
      try {
        await saveProviderAssignments([], []);
      } catch (error) {
        setAssignedMemberIds(previousMemberIds);
        setAssignedExternalProviderIds(previousExternalIds);
        toast({
          title: tCommon("error"),
          description: t("messages.assignmentsFailed"),
          variant: "destructive",
        });
      } finally {
        setSavingProviderId(null);
      }
    }
  };

  const getMemberInitials = (member: OrganizationMember) => {
    const firstName = member.user?.firstName || "";
    const lastName = member.user?.lastName || "";
    if (firstName || lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    return member.user?.email?.charAt(0).toUpperCase() || "?";
  };

  const getMemberDisplayName = (member: OrganizationMember) => {
    if (member.user?.firstName || member.user?.lastName) {
      return `${member.user.firstName || ""} ${member.user.lastName || ""}`.trim();
    }
    return member.user?.email || "Unknown";
  };

  const getProviderInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    return name.charAt(0).toUpperCase() || "?";
  };

  // Render unified provider list (members + external providers)
  const renderProvidersList = () => {
    if (loadingProviders) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    const totalProviders = members.length + externalProviders.length;
    
    if (totalProviders === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          {t("assignDialog.noProviders")}
        </div>
      );
    }

    return (
      <>
        {/* Select All / Deselect All buttons */}
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm text-muted-foreground">
            {t("assignDialog.providersSelected", { count: totalSelectedProviders })}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectAllProviders}
              disabled={totalSelectedProviders === totalProviders || savingProviderId !== null}
            >
              {savingProviderId === 'all' ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <CheckSquare className="h-4 w-4 mr-1" />
              )}
              {t("assignDialog.selectAll")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDeselectAllProviders}
              disabled={totalSelectedProviders === 0 || savingProviderId !== null}
            >
              {savingProviderId === 'none' ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Square className="h-4 w-4 mr-1" />
              )}
              {t("assignDialog.deselectAll")}
            </Button>
          </div>
        </div>

        <div className="space-y-2 max-h-[250px] overflow-y-auto">
          {/* Render members */}
          {members.map((member) => (
            <div
              key={`member-${member.userId}`}
              className={`flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer ${savingProviderId !== null ? 'pointer-events-none' : ''}`}
              onClick={() => handleToggleMemberAssignment(member.userId)}
            >
              {savingProviderId === member.userId ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <Checkbox
                  checked={assignedMemberIds.includes(member.userId)}
                  onCheckedChange={() => handleToggleMemberAssignment(member.userId)}
                  disabled={savingProviderId !== null}
                />
              )}
              <Avatar className="h-8 w-8">
                {member.user?.imageUrl && (
                  <AvatarImage src={member.user.imageUrl} alt={getMemberDisplayName(member)} />
                )}
                <AvatarFallback className="text-xs">
                  {getMemberInitials(member)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {getMemberDisplayName(member)}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {member.user?.email}
                </p>
              </div>
            </div>
          ))}

          {/* Render external providers */}
          {externalProviders.map((provider) => (
            <div
              key={`external-${provider.id}`}
              className={`flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer ${savingProviderId !== null ? 'pointer-events-none' : ''}`}
              onClick={() => handleToggleExternalProviderAssignment(provider.id)}
            >
              {savingProviderId === provider.id ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <Checkbox
                  checked={assignedExternalProviderIds.includes(provider.id)}
                  onCheckedChange={() => handleToggleExternalProviderAssignment(provider.id)}
                  disabled={savingProviderId !== null}
                />
              )}
              <Avatar className="h-8 w-8">
                {provider.imageBase64 && (
                  <AvatarImage src={provider.imageBase64} alt={provider.name} />
                )}
                <AvatarFallback className="text-xs">
                  {getProviderInitials(provider.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {provider.name}
                </p>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Filter options based on search query
  const filteredOptions = options.filter((option) =>
    option.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (option.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header with search and controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-2"
              onClick={() => setViewMode('table')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-8 px-2"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            {t("addService")}
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      {options.length > 0 && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{t("totalServices", { count: options.length })}</span>
          <span>•</span>
          <span>{t("activeServices", { count: options.filter(o => o.isActive).length })}</span>
          {searchQuery && (
            <>
              <span>•</span>
              <span>{t("searchResults", { count: filteredOptions.length })}</span>
            </>
          )}
        </div>
      )}

      {options.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Image className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">{t("empty.title")}</h3>
            <p className="text-muted-foreground mb-4">
              {t("empty.description")}
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              {t("empty.createFirst")}
            </Button>
          </CardContent>
        </Card>
      ) : filteredOptions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">{t("noResults.title")}</h3>
            <p className="text-muted-foreground">
              {t("noResults.description")}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
        /* Table View */
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>{t("table.service")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("table.duration")}</TableHead>
                <TableHead className="hidden md:table-cell">{tCommon("price")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("table.description")}</TableHead>
                <TableHead className="w-[100px] text-center">{t("table.status")}</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOptions.map((option) => (
                <TableRow 
                  key={option.id} 
                  className={`cursor-pointer ${!option.isActive ? "opacity-60" : ""}`}
                  onClick={() => openEditDialog(option)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                      {option.imageBase64 ? (
                        <img
                          src={option.imageBase64}
                          alt={option.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Image className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{option.title}</div>
                    <div className="text-sm text-muted-foreground md:hidden">
                      {option.duration} {tCommon("minutes")}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center text-muted-foreground">
                      <Clock className="h-4 w-4 mr-1" />
                      {option.duration} {tCommon("minutes")}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-muted-foreground">
                      {option.showPrice ? (option.price > 0 ? `${option.price} ${currency}` : tCommon("free")) : "-"}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <p className="text-sm text-muted-foreground line-clamp-1 max-w-[300px]">
                      {option.description || t("noDescription")}
                    </p>
                  </TableCell>
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={option.isActive}
                      onCheckedChange={() => handleToggleActive(option)}
                    />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(option)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          {tCommon("edit")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDelete(option.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {tCommon("delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        /* Grid View */
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredOptions.map((option) => (
            <Card 
              key={option.id} 
              className={`group cursor-pointer hover:shadow-md transition-shadow ${!option.isActive ? "opacity-60" : ""}`}
              onClick={() => openEditDialog(option)}
            >
              <div className="aspect-video bg-muted rounded-t-lg overflow-hidden">
                {option.imageBase64 ? (
                  <img
                    src={option.imageBase64}
                    alt={option.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="h-10 w-10 text-muted-foreground/50" />
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold line-clamp-1">{option.title}</h3>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={option.isActive}
                      onCheckedChange={() => handleToggleActive(option)}
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3 min-h-[40px]">
                  {option.description || t("noDescription")}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {option.duration} {tCommon("minutes")}
                    </div>
                    {option.showPrice && (
                      <span className="font-medium text-foreground">
                        {option.price > 0 ? `${option.price} ${currency}` : tCommon("free")}
                      </span>
                    )}
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(option)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          {tCommon("edit")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDelete(option.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {tCommon("delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingOption ? t("dialog.editTitle") : t("dialog.createTitle")}
            </DialogTitle>
          </DialogHeader>

          {currentOrganization && isAdmin ? (
            // Organization admin: show tabs for both create and edit
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">{t("dialog.detailsTab")}</TabsTrigger>
                <TabsTrigger value="providers" className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {t("dialog.providersTab")}
                  {totalSelectedProviders > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
                      {totalSelectedProviders}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">{t("dialog.title")}</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder={t("dialog.titlePlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">{t("dialog.description")}</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder={t("dialog.descriptionPlaceholder")}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("dialog.image")}</Label>
                  <ImageCropUpload
                    value={formData.imageBase64}
                    onChange={(base64) =>
                      setFormData({ ...formData, imageBase64: base64 })
                    }
                    aspectRatio={16 / 9}
                    placeholder={t("dialog.imagePlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">{t("dialog.duration")}</Label>
                  <NumberInput
                    id="duration"
                    min={5}
                    max={480}
                    value={formData.duration}
                    defaultValue={30}
                    onChange={(value) =>
                      setFormData({ ...formData, duration: value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="showPrice">{t("dialog.showPrice")}</Label>
                      <p className="text-xs text-muted-foreground">{t("dialog.showPriceHint")}</p>
                    </div>
                    <Switch
                      id="showPrice"
                      checked={formData.showPrice}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, showPrice: checked })
                      }
                    />
                  </div>
                </div>
                {formData.showPrice && (
                  <div className="space-y-2">
                    <Label htmlFor="price">{t("dialog.price")} ({currency})</Label>
                    <NumberInput
                      id="price"
                      min={0}
                      value={formData.price}
                      defaultValue={0}
                      onChange={(value) =>
                        setFormData({ ...formData, price: value })
                      }
                    />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="providers" className="mt-4">
                <p className="text-sm text-muted-foreground mb-4">
                  {t("assignDialog.providersDescription")}
                </p>
                {renderProvidersList()}
              </TabsContent>
            </Tabs>
          ) : (
            // Personal service or non-admin: just show details form
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">{t("dialog.title")}</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder={t("dialog.titlePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">{t("dialog.description")}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder={t("dialog.descriptionPlaceholder")}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("dialog.image")}</Label>
                <ImageCropUpload
                  value={formData.imageBase64}
                  onChange={(base64) =>
                    setFormData({ ...formData, imageBase64: base64 })
                  }
                  aspectRatio={16 / 9}
                  placeholder={t("dialog.imagePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">{t("dialog.duration")}</Label>
                <NumberInput
                  id="duration"
                  min={5}
                  max={480}
                  value={formData.duration}
                  defaultValue={30}
                  onChange={(value) =>
                    setFormData({ ...formData, duration: value })
                  }
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="showPrice2">{t("dialog.showPrice")}</Label>
                    <p className="text-xs text-muted-foreground">{t("dialog.showPriceHint")}</p>
                  </div>
                  <Switch
                    id="showPrice2"
                    checked={formData.showPrice}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, showPrice: checked })
                    }
                  />
                </div>
              </div>
              {formData.showPrice && (
                <div className="space-y-2">
                  <Label htmlFor="price2">{t("dialog.price")} ({currency})</Label>
                  <NumberInput
                    id="price2"
                    min={0}
                    value={formData.price}
                    defaultValue={0}
                    onChange={(value) =>
                      setFormData({ ...formData, price: value })
                    }
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.title || submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {tCommon("saving")}
                </>
              ) : (
                editingOption ? tCommon("update") : tCommon("create")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
