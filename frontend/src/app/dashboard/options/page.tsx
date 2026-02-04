"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { serviceOptionsApi, userServiceOptionsApi, organizationsApi, setAuthToken, setOrganizationContext } from "@/lib/api";
import { ServiceOption, OrganizationMember, UserServiceOption } from "@/lib/types";
import { useOrganizationContext } from "@/components/providers/organization-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  });

  // Member assignment state
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [serviceProviders, setServiceProviders] = useState<string[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = userRole === 'owner' || userRole === 'admin';

  const fetchOptions = async () => {
    const token = await getToken();
    setAuthToken(token);

    try {
      let res;
      if (currentOrganization) {
        setOrganizationContext(currentOrganization.id);
        res = await serviceOptionsApi.getAllForOrganization();
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

  const loadMembers = async () => {
    if (!currentOrganization || !isAdmin) return;
    
    setLoadingMembers(true);
    try {
      const token = await getToken();
      setAuthToken(token);
      setOrganizationContext(currentOrganization.id);

      const membersRes = await organizationsApi.getMembers(currentOrganization.id);
      setMembers(membersRes.data);
    } catch (error) {
      console.error("Failed to load members", error);
      toast({
        title: tCommon("error"),
        description: t("messages.loadMembersFailed"),
        variant: "destructive",
      });
    } finally {
      setLoadingMembers(false);
    }
  };

  const loadMembersAndAssignments = async (serviceId: string) => {
    if (!currentOrganization || !isAdmin) return;
    
    setLoadingMembers(true);
    try {
      const token = await getToken();
      setAuthToken(token);
      setOrganizationContext(currentOrganization.id);

      const [membersRes, providersRes] = await Promise.all([
        organizationsApi.getMembers(currentOrganization.id),
        userServiceOptionsApi.getProvidersForService(serviceId),
      ]);

      setMembers(membersRes.data);
      // Map provider's clerkId to match with member's userId (which is Clerk ID)
      // The API returns a flat array with clerkId directly on each provider object
      const assignedClerkIds = providersRes.data
        .filter((p: { clerkId?: string }) => p.clerkId)
        .map((p: { clerkId: string }) => p.clerkId);
      setServiceProviders(assignedClerkIds);
    } catch (error) {
      console.error("Failed to load members", error);
      toast({
        title: tCommon("error"),
        description: t("messages.loadMembersFailed"),
        variant: "destructive",
      });
    } finally {
      setLoadingMembers(false);
    }
  };

  const openCreateDialog = async () => {
    setEditingOption(null);
    setFormData({ title: "", description: "", imageBase64: undefined, duration: 30 });
    setServiceProviders([]);
    setActiveTab("details");
    setDialogOpen(true);

    // Load members for assignment if in organization context
    if (currentOrganization && isAdmin) {
      await loadMembers();
    }
  };

  const openEditDialog = async (option: ServiceOption) => {
    setEditingOption(option);
    setFormData({
      title: option.title,
      description: option.description || "",
      imageBase64: option.imageBase64 || undefined,
      duration: option.duration,
    });
    setActiveTab("details");
    setDialogOpen(true);

    // Load members and assignments if in organization context
    if (currentOrganization && isAdmin) {
      await loadMembersAndAssignments(option.id);
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

        // If we created a service in an organization and have selected members, assign them
        if (createdServiceId && currentOrganization && isAdmin && serviceProviders.length > 0) {
          try {
            await userServiceOptionsApi.bulkAssignMembersToService(createdServiceId, serviceProviders);
            toast({ title: t("messages.createdWithAssignments") });
          } catch (assignError) {
            console.error("Failed to assign members", assignError);
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

  // Member assignment functions
  const handleToggleMemberAssignment = async (memberId: string) => {
    const newProviders = serviceProviders.includes(memberId)
      ? serviceProviders.filter((id) => id !== memberId)
      : [...serviceProviders, memberId];
    
    setServiceProviders(newProviders);

    // Auto-save when editing an existing service
    if (editingOption && currentOrganization) {
      setSavingMemberId(memberId);
      try {
        const token = await getToken();
        setAuthToken(token);
        setOrganizationContext(currentOrganization.id);
        await userServiceOptionsApi.bulkAssignMembersToService(editingOption.id, newProviders);
      } catch (error) {
        // Revert on error
        setServiceProviders(serviceProviders);
        toast({
          title: tCommon("error"),
          description: t("messages.assignmentsFailed"),
          variant: "destructive",
        });
      } finally {
        setSavingMemberId(null);
      }
    }
  };

  const handleSelectAllMembers = async () => {
    const allMemberIds = members.map((m) => m.userId);
    setServiceProviders(allMemberIds);

    // Auto-save when editing an existing service
    if (editingOption && currentOrganization) {
      setSavingMemberId('all');
      try {
        const token = await getToken();
        setAuthToken(token);
        setOrganizationContext(currentOrganization.id);
        await userServiceOptionsApi.bulkAssignMembersToService(editingOption.id, allMemberIds);
      } catch (error) {
        setServiceProviders(serviceProviders);
        toast({
          title: tCommon("error"),
          description: t("messages.assignmentsFailed"),
          variant: "destructive",
        });
      } finally {
        setSavingMemberId(null);
      }
    }
  };

  const handleDeselectAllMembers = async () => {
    const previousProviders = [...serviceProviders];
    setServiceProviders([]);

    // Auto-save when editing an existing service
    if (editingOption && currentOrganization) {
      setSavingMemberId('none');
      try {
        const token = await getToken();
        setAuthToken(token);
        setOrganizationContext(currentOrganization.id);
        await userServiceOptionsApi.bulkAssignMembersToService(editingOption.id, []);
      } catch (error) {
        setServiceProviders(previousProviders);
        toast({
          title: tCommon("error"),
          description: t("messages.assignmentsFailed"),
          variant: "destructive",
        });
      } finally {
        setSavingMemberId(null);
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

  // Render member list component (reusable for both create and edit)
  const renderMembersList = () => {
    if (loadingMembers) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (members.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          {t("assignDialog.noMembers")}
        </div>
      );
    }

    return (
      <>
        {/* Select All / Deselect All buttons */}
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm text-muted-foreground">
            {t("assignDialog.membersSelected", { count: serviceProviders.length })}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectAllMembers}
              disabled={serviceProviders.length === members.length || savingMemberId !== null}
            >
              {savingMemberId === 'all' ? (
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
              onClick={handleDeselectAllMembers}
              disabled={serviceProviders.length === 0 || savingMemberId !== null}
            >
              {savingMemberId === 'none' ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Square className="h-4 w-4 mr-1" />
              )}
              {t("assignDialog.deselectAll")}
            </Button>
          </div>
        </div>

        <div className="space-y-2 max-h-[250px] overflow-y-auto">
          {members.map((member) => (
            <div
              key={member.userId}
              className={`flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer ${savingMemberId !== null ? 'pointer-events-none' : ''}`}
              onClick={() => handleToggleMemberAssignment(member.userId)}
            >
              {savingMemberId === member.userId ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <Checkbox
                  checked={serviceProviders.includes(member.userId)}
                  onCheckedChange={() => handleToggleMemberAssignment(member.userId)}
                  disabled={savingMemberId !== null}
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
              <Badge variant="outline" className="text-xs capitalize">
                {member.role}
              </Badge>
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
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 mr-1" />
                    {option.duration} {tCommon("minutes")}
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
                <TabsTrigger value="members" className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {t("dialog.membersTab")}
                  {serviceProviders.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
                      {serviceProviders.length}
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
                  <Input
                    id="duration"
                    type="number"
                    min={5}
                    max={480}
                    value={formData.duration}
                    onChange={(e) =>
                      setFormData({ ...formData, duration: parseInt(e.target.value) || 30 })
                    }
                  />
                </div>
              </TabsContent>

              <TabsContent value="members" className="mt-4">
                <p className="text-sm text-muted-foreground mb-4">
                  {t("assignDialog.description")}
                </p>
                {renderMembersList()}
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
                <Input
                  id="duration"
                  type="number"
                  min={5}
                  max={480}
                  value={formData.duration}
                  onChange={(e) =>
                    setFormData({ ...formData, duration: parseInt(e.target.value) || 30 })
                  }
                />
              </div>
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
