"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { clientsApi, appointmentsApi, setAuthToken } from "@/lib/api";
import {
  Client,
  ClientFilters,
  ClientStats,
  Appointment,
  AppointmentStatus,
  PaginatedResult,
} from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import {
  Users,
  UserPlus,
  Phone,
  Mail,
  Search,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  StickyNote,
  Trash2,
  Edit,
  Eye,
  TrendingUp,
  UserCheck,
  RefreshCw,
  ArrowUpDown,
  X,
  CheckCircle2,
  XCircle,
  AlertCircle,
  History,
} from "lucide-react";
import {
  format,
  parseISO,
  formatDistanceToNow,
} from "date-fns";

export default function ClientsPage() {
  const { getToken } = useAuth();
  const { toast } = useToast();

  // State
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Selected client for detail view
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientAppointments, setClientAppointments] = useState<Appointment[]>(
    []
  );
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  // Edit/Create dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Pagination & Filters
  const [filters, setFilters] = useState<ClientFilters>({
    page: 1,
    limit: 10,
    sortBy: "createdAt",
    sortOrder: "DESC",
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchData = useCallback(
    async (showRefreshing = false) => {
      const token = await getToken();
      setAuthToken(token);

      if (showRefreshing) {
        setRefreshing(true);
      }

      try {
        const queryParams: Record<string, any> = {
          page: filters.page,
          limit: filters.limit,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
        };

        if (debouncedSearch) {
          queryParams.search = debouncedSearch;
        }

        const [clientsRes, statsRes] = await Promise.all([
          clientsApi.getAll(queryParams),
          clientsApi.getStats(),
        ]);

        const paginatedData = clientsRes.data as PaginatedResult<Client>;
        setClients(paginatedData.data);
        setPagination(paginatedData.meta);
        setStats(statsRes.data);
      } catch (error) {
        console.error("Failed to fetch data", error);
        toast({
          title: "Error",
          description: "Failed to load clients",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [getToken, filters, debouncedSearch, toast]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page when search changes
  useEffect(() => {
    setFilters((prev) => ({ ...prev, page: 1 }));
  }, [debouncedSearch]);

  const fetchClientAppointments = async (clientId: string) => {
    setAppointmentsLoading(true);
    try {
      const token = await getToken();
      setAuthToken(token);
      const response = await clientsApi.getAppointments(clientId, { limit: 20 });
      const paginatedData = response.data as PaginatedResult<Appointment>;
      setClientAppointments(paginatedData.data);
    } catch (error) {
      console.error("Failed to fetch appointments", error);
      toast({
        title: "Error",
        description: "Failed to load appointment history",
        variant: "destructive",
      });
    } finally {
      setAppointmentsLoading(false);
    }
  };

  const handleViewDetails = async (client: Client) => {
    setSelectedClient(client);
    setDetailSheetOpen(true);
    await fetchClientAppointments(client.id);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      email: client.email || "",
      phone: client.phone,
      notes: client.notes || "",
    });
    setEditDialogOpen(true);
  };

  const handleCreateClient = () => {
    setEditingClient(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      notes: "",
    });
    setEditDialogOpen(true);
  };

  const handleSaveClient = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast({
        title: "Validation Error",
        description: "Name and phone number are required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const token = await getToken();
      setAuthToken(token);

      if (editingClient) {
        await clientsApi.update(editingClient.id, {
          name: formData.name,
          email: formData.email || undefined,
          notes: formData.notes || undefined,
        });
        toast({ title: "Client updated successfully" });
      } else {
        await clientsApi.create({
          name: formData.name,
          email: formData.email || undefined,
          phone: formData.phone,
          notes: formData.notes || undefined,
        });
        toast({ title: "Client created successfully" });
      }

      setEditDialogOpen(false);
      fetchData(true);

      // Update selected client if we were editing it
      if (editingClient && selectedClient?.id === editingClient.id) {
        setSelectedClient({
          ...selectedClient,
          name: formData.name,
          email: formData.email || undefined,
          notes: formData.notes || undefined,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.response?.data?.message || "Failed to save client",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (client: Client) => {
    setClientToDelete(client);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!clientToDelete) return;

    setDeleting(true);
    try {
      const token = await getToken();
      setAuthToken(token);
      await clientsApi.delete(clientToDelete.id);
      toast({ title: "Client deleted successfully" });
      setDeleteDialogOpen(false);
      setClientToDelete(null);

      // Close detail sheet if we deleted the selected client
      if (selectedClient?.id === clientToDelete.id) {
        setDetailSheetOpen(false);
        setSelectedClient(null);
      }

      fetchData(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete client",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const toggleSortOrder = () => {
    setFilters((prev) => ({
      ...prev,
      sortOrder: prev.sortOrder === "ASC" ? "DESC" : "ASC",
    }));
  };

  const handleSortChange = (field: string) => {
    setFilters((prev) => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === "DESC" ? "ASC" : "DESC",
    }));
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && <StatsCards stats={stats} />}

      {/* Main Content */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-semibold">Clients</CardTitle>
              <CardDescription>
                Manage your client database and view their appointment history
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchData(true)}
                disabled={refreshing}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button size="sm" onClick={handleCreateClient}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Client
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={toggleSortOrder}
              title={`Sort ${filters.sortOrder === "ASC" ? "Ascending" : "Descending"}`}
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>

          {clients.length === 0 ? (
            <EmptyState onCreateClick={handleCreateClient} />
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSortChange("name")}
                      >
                        <div className="flex items-center gap-1">
                          Client
                          {filters.sortBy === "name" && (
                            <ArrowUpDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSortChange("totalAppointments")}
                      >
                        <div className="flex items-center gap-1">
                          Appointments
                          {filters.sortBy === "totalAppointments" && (
                            <ArrowUpDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSortChange("lastAppointmentAt")}
                      >
                        <div className="flex items-center gap-1">
                          Last Visit
                          {filters.sortBy === "lastAppointmentAt" && (
                            <ArrowUpDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((client) => (
                      <ClientRow
                        key={client.id}
                        client={client}
                        onView={handleViewDetails}
                        onEdit={handleEditClient}
                        onDelete={handleDeleteClick}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {clients.map((client) => (
                  <ClientMobileCard
                    key={client.id}
                    client={client}
                    onView={handleViewDetails}
                    onEdit={handleEditClient}
                    onDelete={handleDeleteClick}
                  />
                ))}
              </div>

              {/* Pagination */}
              <Pagination pagination={pagination} onPageChange={handlePageChange} />
            </>
          )}
        </CardContent>
      </Card>

      {/* Client Detail Sheet */}
      <Sheet open={detailSheetOpen} onOpenChange={setDetailSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-hidden flex flex-col">
          {selectedClient && (
            <>
              <SheetHeader className="flex-shrink-0">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Users className="h-6 w-6" />
                    </div>
                    <div>
                      <SheetTitle className="text-left">
                        {selectedClient.name}
                      </SheetTitle>
                      <SheetDescription className="text-left">
                        Client since{" "}
                        {format(parseISO(selectedClient.createdAt), "MMM d, yyyy")}
                      </SheetDescription>
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="space-y-6 pb-6">
                  {/* Contact Info */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Contact Information
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedClient.phone}</span>
                      </div>
                      {selectedClient.email && (
                        <div className="flex items-center gap-3 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedClient.email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Stats */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Appointment Statistics
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border p-3">
                        <p className="text-2xl font-bold">
                          {selectedClient.totalAppointments}
                        </p>
                        <p className="text-xs text-muted-foreground">Total</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-2xl font-bold text-green-600">
                          {selectedClient.completedAppointments}
                        </p>
                        <p className="text-xs text-muted-foreground">Completed</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-2xl font-bold text-red-600">
                          {selectedClient.cancelledAppointments}
                        </p>
                        <p className="text-xs text-muted-foreground">Cancelled</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-2xl font-bold text-yellow-600">
                          {selectedClient.noShowAppointments}
                        </p>
                        <p className="text-xs text-muted-foreground">No Shows</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Notes */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Notes
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClient(selectedClient)}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                    {selectedClient.notes ? (
                      <div className="rounded-lg bg-muted/50 p-3">
                        <p className="text-sm whitespace-pre-wrap">
                          {selectedClient.notes}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        No notes added yet
                      </p>
                    )}
                  </div>

                  <Separator />

                  {/* Appointment History */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Appointment History
                    </h4>
                    {appointmentsLoading ? (
                      <div className="space-y-2">
                        {[...Array(3)].map((_, i) => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))}
                      </div>
                    ) : clientAppointments.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">
                        No appointment history
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {clientAppointments.map((apt) => (
                          <AppointmentHistoryItem key={apt.id} appointment={apt} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>

              <div className="flex-shrink-0 pt-4 border-t flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleEditClient(selectedClient)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleDeleteClick(selectedClient)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit/Create Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingClient ? "Edit Client" : "Add New Client"}
            </DialogTitle>
            <DialogDescription>
              {editingClient
                ? "Update client information and notes"
                : "Add a new client to your database"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="+1 234 567 8900"
                disabled={!!editingClient}
              />
              {editingClient && (
                <p className="text-xs text-muted-foreground">
                  Phone number cannot be changed as it&apos;s used for client
                  identification
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="john@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Add any notes about this client..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveClient} disabled={saving}>
              {saving ? "Saving..." : editingClient ? "Save Changes" : "Add Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">{clientToDelete?.name}</span>? This
              action cannot be undone and will remove all client data.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Stats Cards Component
function StatsCards({ stats }: { stats: ClientStats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Clients
              </p>
              <p className="text-2xl font-bold">{stats.totalClients}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                New This Month
              </p>
              <p className="text-2xl font-bold">{stats.newClientsThisMonth}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Repeat Clients
              </p>
              <p className="text-2xl font-bold">{stats.repeatClients}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
              <UserCheck className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Client Table Row
function ClientRow({
  client,
  onView,
  onEdit,
  onDelete,
}: {
  client: Client;
  onView: (client: Client) => void;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
}) {
  return (
    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => onView(client)}>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
            {client.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </div>
          <div>
            <p className="font-medium">{client.name}</p>
            {client.notes && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <StickyNote className="h-3 w-3" />
                Has notes
              </p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <span className="text-sm flex items-center gap-1.5">
            <Phone className="h-3 w-3 text-muted-foreground" />
            {client.phone}
          </span>
          {client.email && (
            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Mail className="h-3 w-3" />
              {client.email}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{client.totalAppointments}</Badge>
          {client.completedAppointments > 0 && (
            <span className="text-xs text-green-600">
              {client.completedAppointments} completed
            </span>
          )}
        </div>
      </TableCell>
      <TableCell>
        {client.lastAppointmentAt ? (
          <span className="text-sm text-muted-foreground">
            {formatDistanceToNow(parseISO(client.lastAppointmentAt), {
              addSuffix: true,
            })}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground italic">Never</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onView(client)}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(client)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(client)}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

// Mobile Card Component
function ClientMobileCard({
  client,
  onView,
  onEdit,
  onDelete,
}: {
  client: Client;
  onView: (client: Client) => void;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
}) {
  return (
    <Card className="cursor-pointer" onClick={() => onView(client)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
              {client.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </div>
            <div>
              <h4 className="font-semibold">{client.name}</h4>
              <p className="text-sm text-muted-foreground">{client.phone}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(client)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(client)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              {client.totalAppointments} appointments
            </span>
            {client.notes && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <StickyNote className="h-3.5 w-3.5" />
                Notes
              </span>
            )}
          </div>
          {client.lastAppointmentAt && (
            <span className="text-muted-foreground text-xs">
              {formatDistanceToNow(parseISO(client.lastAppointmentAt), {
                addSuffix: true,
              })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Appointment History Item
function AppointmentHistoryItem({ appointment }: { appointment: Appointment }) {
  const startTime = parseISO(appointment.startTime);

  const statusConfig: Record<
    AppointmentStatus,
    { icon: React.ReactNode; color: string }
  > = {
    [AppointmentStatus.PENDING_CONFIRMATION]: {
      icon: <AlertCircle className="h-3 w-3" />,
      color: "text-yellow-600",
    },
    [AppointmentStatus.CONFIRMED]: {
      icon: <CheckCircle2 className="h-3 w-3" />,
      color: "text-blue-600",
    },
    [AppointmentStatus.COMPLETED]: {
      icon: <CheckCircle2 className="h-3 w-3" />,
      color: "text-green-600",
    },
    [AppointmentStatus.CANCELLED]: {
      icon: <XCircle className="h-3 w-3" />,
      color: "text-red-600",
    },
    [AppointmentStatus.NO_SHOW]: {
      icon: <AlertCircle className="h-3 w-3" />,
      color: "text-orange-600",
    },
  };

  const { icon, color } = statusConfig[appointment.status];

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
      <div className={`${color}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {appointment.serviceOption?.title || "Service"}
        </p>
        <p className="text-xs text-muted-foreground">
          {format(startTime, "MMM d, yyyy 'at' h:mm a")}
        </p>
      </div>
      <Badge
        variant={
          appointment.status === AppointmentStatus.COMPLETED
            ? "default"
            : appointment.status === AppointmentStatus.CANCELLED
            ? "destructive"
            : "secondary"
        }
        className="text-xs"
      >
        {appointment.status.replace("_", " ")}
      </Badge>
    </div>
  );
}

// Pagination Component
function Pagination({
  pagination,
  onPageChange,
}: {
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  onPageChange: (page: number) => void;
}) {
  const startItem = (pagination.page - 1) * pagination.limit + 1;
  const endItem = Math.min(pagination.page * pagination.limit, pagination.total);

  if (pagination.total === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-medium">{startItem}</span> to{" "}
        <span className="font-medium">{endItem}</span> of{" "}
        <span className="font-medium">{pagination.total}</span> clients
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={!pagination.hasPreviousPage}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>

        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
            let pageNum: number;
            if (pagination.totalPages <= 5) {
              pageNum = i + 1;
            } else if (pagination.page <= 3) {
              pageNum = i + 1;
            } else if (pagination.page >= pagination.totalPages - 2) {
              pageNum = pagination.totalPages - 4 + i;
            } else {
              pageNum = pagination.page - 2 + i;
            }

            return (
              <Button
                key={pageNum}
                variant={pagination.page === pageNum ? "default" : "outline"}
                size="sm"
                className="w-8 h-8 p-0"
                onClick={() => onPageChange(pageNum)}
              >
                {pageNum}
              </Button>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={!pagination.hasNextPage}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// Empty State Component
function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Users className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">No clients yet</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">
        Clients will be automatically added when they book their first
        appointment, or you can add them manually.
      </p>
      <Button onClick={onCreateClick}>
        <UserPlus className="h-4 w-4 mr-2" />
        Add Your First Client
      </Button>
    </div>
  );
}

// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="h-12 w-12 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main card skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-28" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-3">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-10" />
            </div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
