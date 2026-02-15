"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Building2,
  Users,
  Calendar,
  Edit,
  Trash2,
  Save,
  BarChart3,
  Globe,
  MapPin,
  Mail,
  Phone,
  Clock,
  Plus,
  MoreHorizontal,
  Pencil,
  Image,
  Loader2,
  CheckSquare,
  Square,
} from "lucide-react";
import { adminApi, OrganizationDetails, ServiceOption, BookingLink, OrganizationMember } from "@/lib/admin-api";
import { ImageCropUpload } from "@/components/ui/image-crop-upload";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const organizationId = params.id as string;

  const [details, setDetails] = useState<OrganizationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    industry: "",
    website: "",
    location: "",
  });
  
  // Service management state
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceOption | null>(null);
  const [serviceFormData, setServiceFormData] = useState({
    title: "",
    description: "",
    imageBase64: "" as string | undefined,
    duration: 30,
  });
  const [submittingService, setSubmittingService] = useState(false);
  const [serviceDialogTab, setServiceDialogTab] = useState<string>("details");
  
  // Provider assignment state
  const [serviceProviders, setServiceProviders] = useState<string[]>([]);
  const [savingProviderId, setSavingProviderId] = useState<string | null>(null);
  
  const [deleteServiceDialogOpen, setDeleteServiceDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<ServiceOption | null>(null);
  const [deleteBookingLinkDialogOpen, setDeleteBookingLinkDialogOpen] = useState(false);
  const [bookingLinkToDelete, setBookingLinkToDelete] = useState<BookingLink | null>(null);

  const fetchDetails = useCallback(async () => {
    try {
      const response = await adminApi.getOrganizationDetails(organizationId);
      setDetails(response.data);
      setEditForm({
        name: response.data.organization.name || "",
        description: response.data.organization.description || "",
        industry: response.data.organization.industry || "",
        website: response.data.organization.website || "",
        location: response.data.organization.location || "",
      });
    } catch (error) {
      console.error("Failed to fetch organization details:", error);
      toast({
        title: "Error",
        description: "Failed to load organization details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminApi.updateOrganization(organizationId, editForm);
      await fetchDetails();
      setEditing(false);
      toast({
        title: "Success",
        description: "Organization updated successfully",
      });
    } catch (error) {
      console.error("Failed to update organization:", error);
      toast({
        title: "Error",
        description: "Failed to update organization",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Service management functions
  const openCreateServiceDialog = () => {
    setEditingService(null);
    setServiceFormData({ title: "", description: "", imageBase64: undefined, duration: 30 });
    setServiceProviders([]);
    setServiceDialogTab("details");
    setServiceDialogOpen(true);
  };

  const openEditServiceDialog = async (service: ServiceOption) => {
    setEditingService(service);
    setServiceFormData({
      title: service.title,
      description: service.description || "",
      imageBase64: service.imageUrl || undefined,
      duration: service.duration,
    });
    setServiceDialogTab("details");
    setServiceDialogOpen(true);
    
    // Load providers for this service
    try {
      const response = await adminApi.getServiceProviders(service.id);
      const providerClerkIds = response.data.map(p => p.clerkId);
      setServiceProviders(providerClerkIds);
    } catch (error) {
      console.error("Failed to load service providers:", error);
      setServiceProviders([]);
    }
  };

  const handleServiceSubmit = async () => {
    setSubmittingService(true);
    try {
      if (editingService) {
        await adminApi.updateService(editingService.id, serviceFormData);
        toast({ title: "Service updated successfully" });
      } else {
        const response = await adminApi.createService(organizationId, serviceFormData);
        // Assign providers to the new service
        if (serviceProviders.length > 0) {
          const newServiceId = response.data.id;
          await adminApi.bulkAssignProviders(newServiceId, serviceProviders);
        }
        toast({ title: "Service created successfully" });
      }
      setServiceDialogOpen(false);
      await fetchDetails();
    } catch (error) {
      console.error("Failed to save service:", error);
      toast({
        title: "Error",
        description: "Failed to save service",
        variant: "destructive",
      });
    } finally {
      setSubmittingService(false);
    }
  };

  // Provider assignment functions
  const handleToggleProviderAssignment = async (memberId: string) => {
    const newProviders = serviceProviders.includes(memberId)
      ? serviceProviders.filter((id) => id !== memberId)
      : [...serviceProviders, memberId];
    
    setServiceProviders(newProviders);

    // Auto-save when editing an existing service
    if (editingService) {
      setSavingProviderId(memberId);
      try {
        await adminApi.bulkAssignProviders(editingService.id, newProviders);
      } catch (error) {
        // Revert on error
        setServiceProviders(serviceProviders);
        toast({
          title: "Error",
          description: "Failed to update provider assignment",
          variant: "destructive",
        });
      } finally {
        setSavingProviderId(null);
      }
    }
  };

  const handleSelectAllProviders = async () => {
    const allMemberIds = members.map((m) => m.clerkMember?.userId || m.userId).filter(Boolean) as string[];
    setServiceProviders(allMemberIds);

    if (editingService) {
      setSavingProviderId('all');
      try {
        await adminApi.bulkAssignProviders(editingService.id, allMemberIds);
      } catch (error) {
        setServiceProviders(serviceProviders);
        toast({
          title: "Error",
          description: "Failed to update provider assignments",
          variant: "destructive",
        });
      } finally {
        setSavingProviderId(null);
      }
    }
  };

  const handleDeselectAllProviders = async () => {
    const previousProviders = [...serviceProviders];
    setServiceProviders([]);

    if (editingService) {
      setSavingProviderId('none');
      try {
        await adminApi.bulkAssignProviders(editingService.id, []);
      } catch (error) {
        setServiceProviders(previousProviders);
        toast({
          title: "Error",
          description: "Failed to update provider assignments",
          variant: "destructive",
        });
      } finally {
        setSavingProviderId(null);
      }
    }
  };

  const getMemberDisplayName = (member: OrganizationMember) => {
    const firstName = member.clerkMember?.firstName || member.user?.firstName || "";
    const lastName = member.clerkMember?.lastName || member.user?.lastName || "";
    if (firstName || lastName) {
      return `${firstName} ${lastName}`.trim();
    }
    return member.clerkMember?.email || member.user?.email || "Unknown";
  };

  const getMemberInitials = (member: OrganizationMember) => {
    const firstName = member.clerkMember?.firstName || member.user?.firstName || "";
    const lastName = member.clerkMember?.lastName || member.user?.lastName || "";
    if (firstName || lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    const email = member.clerkMember?.email || member.user?.email || "";
    return email.charAt(0).toUpperCase() || "?";
  };

  const getMemberId = (member: OrganizationMember) => {
    return member.clerkMember?.userId || member.userId;
  };

  const handleToggleServiceActive = async (service: ServiceOption) => {
    try {
      await adminApi.updateService(service.id, { isActive: !service.isActive });
      await fetchDetails();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update service status",
        variant: "destructive",
      });
    }
  };

  const handleDeleteService = async () => {
    if (!serviceToDelete) return;
    try {
      await adminApi.deleteService(serviceToDelete.id);
      toast({ title: "Service deleted successfully" });
      await fetchDetails();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete service",
        variant: "destructive",
      });
    } finally {
      setDeleteServiceDialogOpen(false);
      setServiceToDelete(null);
    }
  };

  const handleDeleteBookingLink = async () => {
    if (!bookingLinkToDelete) return;
    try {
      await adminApi.deleteBookingLink(bookingLinkToDelete.id);
      toast({ title: "Booking link deleted successfully" });
      await fetchDetails();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete booking link",
        variant: "destructive",
      });
    } finally {
      setDeleteBookingLinkDialogOpen(false);
      setBookingLinkToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!details) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Organization not found</h2>
        <Button onClick={() => router.back()} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  const { organization, settings, services, members, bookingLinks, stats } = details;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight">{organization.name}</h2>
          <p className="text-muted-foreground">Organization ID: {organization.id}</p>
        </div>
        <Button
          variant={editing ? "default" : "outline"}
          onClick={() => (editing ? handleSave() : setEditing(true))}
          disabled={saving}
        >
          {editing ? (
            <>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </>
          ) : (
            <>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </>
          )}
        </Button>
        {editing && (
          <Button variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Services</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalServices}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAppointments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClients}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="services">Services ({services.length})</TabsTrigger>
          <TabsTrigger value="members">Members ({members.length})</TabsTrigger>
          <TabsTrigger value="booking-links">Booking Links ({bookingLinks.length})</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Organization Information</CardTitle>
              <CardDescription>Basic information about this organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="industry">Industry</Label>
                      <Input
                        id="industry"
                        value={editForm.industry}
                        onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        value={editForm.website}
                        onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={editForm.location}
                        onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={4}
                    />
                  </div>
                </>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Name:</span>
                    <span className="text-sm">{organization.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Industry:</span>
                    <span className="text-sm">{organization.industry || "-"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Website:</span>
                    {organization.website ? (
                      <a
                        href={organization.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        {organization.website}
                      </a>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Location:</span>
                    <span className="text-sm">{organization.location || "-"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Email:</span>
                    <span className="text-sm">{organization.email || "-"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Phone:</span>
                    <span className="text-sm">{organization.phone || "-"}</span>
                  </div>
                  <div className="flex items-center gap-2 md:col-span-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Created:</span>
                    <span className="text-sm">
                      {format(new Date(organization.created_at), "PPP")}
                    </span>
                  </div>
                  {organization.description && (
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium mb-1">Description:</p>
                      <p className="text-sm text-muted-foreground">{organization.description}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Services</CardTitle>
                <CardDescription>Manage services offered by this organization</CardDescription>
              </div>
              <Button onClick={openCreateServiceDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Service
              </Button>
            </CardHeader>
            <CardContent>
              {services.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Image className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold mb-2">No services yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first service to get started
                  </p>
                  <Button onClick={openCreateServiceDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Service
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[70px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {services.map((service) => (
                      <TableRow
                        key={service.id}
                        className={`cursor-pointer ${!service.isActive ? "opacity-60" : ""}`}
                        onClick={() => openEditServiceDialog(service)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                            {service.imageUrl ? (
                              <img
                                src={service.imageUrl}
                                alt={service.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Image className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{service.title}</p>
                            {service.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {service.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-muted-foreground">
                            <Clock className="h-4 w-4 mr-1" />
                            {service.duration} min
                          </div>
                        </TableCell>
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <Switch
                            checked={service.isActive}
                            onCheckedChange={() => handleToggleServiceActive(service)}
                          />
                        </TableCell>
                        <TableCell>
                          {format(new Date(service.createdAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditServiceDialog(service)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setServiceToDelete(service);
                                  setDeleteServiceDialogOpen(true);
                                }}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
              <CardDescription>Organization members and their roles</CardDescription>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">No members found</p>
              ) : (
                <div className="space-y-3">
                  {members.map((member, index) => {
                    const memberId = getMemberId(member);
                    return (
                      <div
                        key={memberId || index}
                        className="flex items-center gap-3 p-3 rounded-lg border"
                      >
                        <Avatar className="h-10 w-10">
                          {member.clerkMember?.imageUrl && (
                            <AvatarImage src={member.clerkMember.imageUrl} alt={getMemberDisplayName(member)} />
                          )}
                          <AvatarFallback className="text-sm">
                            {getMemberInitials(member)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {getMemberDisplayName(member)}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {member.clerkMember?.email || member.user?.email || "-"}
                          </p>
                        </div>
                        <Badge variant={member.clerkMember?.role === "org:admin" ? "default" : "secondary"}>
                          {member.clerkMember?.isAdmin ? "Admin" : "Member"}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Booking Links Tab */}
        <TabsContent value="booking-links">
          <Card>
            <CardHeader>
              <CardTitle>Booking Links</CardTitle>
              <CardDescription>Public booking links for this organization</CardDescription>
            </CardHeader>
            <CardContent>
              {bookingLinks.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">No booking links found</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookingLinks.map((link) => (
                      <TableRow key={link.id}>
                        <TableCell className="font-medium">{link.name || "-"}</TableCell>
                        <TableCell>
                          <code className="text-sm bg-muted px-1 py-0.5 rounded">{link.slug}</code>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{link.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={link.isActive ? "default" : "secondary"}>
                            {link.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => {
                              setBookingLinkToDelete(link);
                              setDeleteBookingLinkDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Organization Settings</CardTitle>
              <CardDescription>
                <Link
                  href={`/admin/organizations/${organizationId}/settings`}
                  className="text-primary hover:underline"
                >
                  Edit full settings →
                </Link>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {settings ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Timezone</p>
                    <p className="text-sm text-muted-foreground">{settings.timezone}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Buffer Time</p>
                    <p className="text-sm text-muted-foreground">{settings.bufferTimeMinutes} minutes</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Max Appointments/Day</p>
                    <p className="text-sm text-muted-foreground">{settings.maxAppointmentsPerDay}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Min Advance Booking</p>
                    <p className="text-sm text-muted-foreground">{settings.minAdvanceBookingHours} hours</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Max Advance Booking</p>
                    <p className="text-sm text-muted-foreground">{settings.maxAdvanceBookingDays} days</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">AI Assistant</p>
                    <Badge variant={settings.aiAssistantEnabled ? "default" : "secondary"}>
                      {settings.aiAssistantEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Provider Selection</p>
                    <Badge variant={settings.allowProviderSelection ? "default" : "secondary"}>
                      {settings.allowProviderSelection ? "Allowed" : "Not Allowed"}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Auto Confirm</p>
                    <Badge variant={settings.autoConfirmAppointments ? "default" : "secondary"}>
                      {settings.autoConfirmAppointments ? "Yes" : "No"}
                    </Badge>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No settings configured</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Service Dialog */}
      <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingService ? "Edit Service" : "Create Service"}
            </DialogTitle>
          </DialogHeader>
          
          <Tabs value={serviceDialogTab} onValueChange={setServiceDialogTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="members" className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                Members
                {serviceProviders.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
                    {serviceProviders.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="service-title">Title</Label>
                <Input
                  id="service-title"
                  value={serviceFormData.title}
                  onChange={(e) =>
                    setServiceFormData({ ...serviceFormData, title: e.target.value })
                  }
                  placeholder="e.g., Consultation, Haircut, Massage"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="service-description">Description</Label>
                <Textarea
                  id="service-description"
                  value={serviceFormData.description}
                  onChange={(e) =>
                    setServiceFormData({ ...serviceFormData, description: e.target.value })
                  }
                  placeholder="Describe the service..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Image</Label>
                <ImageCropUpload
                  value={serviceFormData.imageBase64}
                  onChange={(base64) =>
                    setServiceFormData({ ...serviceFormData, imageBase64: base64 })
                  }
                  aspectRatio={16 / 9}
                  placeholder="Upload service image (optional)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="service-duration">Duration (minutes)</Label>
                <Input
                  id="service-duration"
                  type="number"
                  min={5}
                  max={480}
                  value={serviceFormData.duration}
                  onChange={(e) =>
                    setServiceFormData({ ...serviceFormData, duration: parseInt(e.target.value) || 30 })
                  }
                />
              </div>
            </TabsContent>

            <TabsContent value="members" className="mt-4">
              <p className="text-sm text-muted-foreground mb-4">
                Select which members can provide this service
              </p>
              
              {members.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No members in this organization
                </div>
              ) : (
                <>
                  {/* Select All / Deselect All buttons */}
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-muted-foreground">
                      {serviceProviders.length} of {members.length} selected
                    </span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAllProviders}
                        disabled={serviceProviders.length === members.length || savingProviderId !== null}
                      >
                        {savingProviderId === 'all' ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <CheckSquare className="h-4 w-4 mr-1" />
                        )}
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDeselectAllProviders}
                        disabled={serviceProviders.length === 0 || savingProviderId !== null}
                      >
                        {savingProviderId === 'none' ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Square className="h-4 w-4 mr-1" />
                        )}
                        Deselect All
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[250px] overflow-y-auto">
                    {members.map((member) => {
                      const memberId = getMemberId(member);
                      if (!memberId) return null;
                      
                      return (
                        <div
                          key={memberId}
                          className={`flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer ${savingProviderId !== null ? 'pointer-events-none' : ''}`}
                          onClick={() => handleToggleProviderAssignment(memberId)}
                        >
                          {savingProviderId === memberId ? (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          ) : (
                            <Checkbox
                              checked={serviceProviders.includes(memberId)}
                              onCheckedChange={() => handleToggleProviderAssignment(memberId)}
                              disabled={savingProviderId !== null}
                            />
                          )}
                          <Avatar className="h-8 w-8">
                            {member.clerkMember?.imageUrl && (
                              <AvatarImage src={member.clerkMember.imageUrl} alt={getMemberDisplayName(member)} />
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
                              {member.clerkMember?.email || member.user?.email}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs capitalize">
                            {member.clerkMember?.isAdmin ? "Admin" : "Member"}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setServiceDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleServiceSubmit} disabled={!serviceFormData.title || submittingService}>
              {submittingService ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                editingService ? "Update" : "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Service Dialog */}
      <AlertDialog open={deleteServiceDialogOpen} onOpenChange={setDeleteServiceDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{serviceToDelete?.title}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteService}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Booking Link Dialog */}
      <AlertDialog open={deleteBookingLinkDialogOpen} onOpenChange={setDeleteBookingLinkDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Booking Link</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this booking link? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBookingLink}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
