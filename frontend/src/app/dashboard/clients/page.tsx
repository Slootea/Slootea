"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { clientsApi, appointmentsApi, clientPenaltiesApi, setAuthToken, setOrganizationContext } from "@/lib/api";
import {
  Client,
  ClientFilters,
  ClientStats,
  Appointment,
  AppointmentStatus,
  PaginatedResult,
  ClientPenalty,
  PenaltyType,
  PenaltyStatus,
} from "@/lib/types";
import { useOrganizationContext } from "@/components/providers/organization-provider";
import { ServiceRecordsTab } from "@/components/clients/service-records-tab";
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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Plus,
  Building2,
  Ban,
  ShieldOff,
  ShieldAlert,
  CalendarOff,
  BookOpen,
  ClipboardList,
} from "lucide-react";
import {
  format,
  parseISO,
  formatDistanceToNow,
} from "date-fns";

export default function ClientsPage() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const { currentOrganization } = useOrganizationContext();
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('clientsPage');
  const common = useTranslations('common');
  const highlightClientId = searchParams.get('highlight');
  const highlightHandledRef = useRef<string | null>(null);

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
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Notebook (notes editor) dialog
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

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

  // Penalty state
  const [clientPenalty, setClientPenalty] = useState<ClientPenalty | null>(null);
  const [penaltyLoading, setPenaltyLoading] = useState(false);
  const [penaltyDialogOpen, setPenaltyDialogOpen] = useState(false);
  const [penaltyFormData, setPenaltyFormData] = useState({
    type: 'ban' as 'ban' | 'suspension',
    reason: '',
    expiresAt: '',
  });
  const [savingPenalty, setSavingPenalty] = useState(false);
  const [removePenaltyDialogOpen, setRemovePenaltyDialogOpen] = useState(false);
  const [removalReason, setRemovalReason] = useState('');
  const [removingPenalty, setRemovingPenalty] = useState(false);

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
      if (!token) return;
      setAuthToken(token);

      // Clients require organization context
      if (!currentOrganization) {
        setClients([]);
        setStats(null);
        setLoading(false);
        return;
      }

      setOrganizationContext(currentOrganization.id);

      if (showRefreshing) {
        setRefreshing(true);
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          title: t('error'),
          description: t('loadError'),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [getToken, filters, debouncedSearch, toast, currentOrganization]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle highlight query parameter - open client profile directly
  useEffect(() => {
    if (!highlightClientId || loading || !clients.length) return;
    // Prevent re-triggering for the same highlight ID
    if (highlightHandledRef.current === highlightClientId) return;
    
    const clientToHighlight = clients.find(c => c.id === highlightClientId);
    if (clientToHighlight) {
      highlightHandledRef.current = highlightClientId;
      handleViewDetails(clientToHighlight);
      // Clear the highlight parameter from URL to prevent re-opening on refresh
      router.replace('/dashboard/clients', { scroll: false });
    } else {
      // Client not in current page - try to fetch directly
      const fetchAndOpenClient = async () => {
        try {
          const token = await getToken();
          if (!token || !currentOrganization) return;
          setAuthToken(token);
          setOrganizationContext(currentOrganization.id);
          const response = await clientsApi.getOne(highlightClientId);
          if (response.data) {
            highlightHandledRef.current = highlightClientId;
            handleViewDetails(response.data);
            router.replace('/dashboard/clients', { scroll: false });
          }
        } catch (error) {
          console.error('Failed to fetch highlighted client:', error);
          toast({
            title: t('clientNotFound'),
            description: t('clientNotFoundDesc'),
            variant: 'destructive',
          });
          router.replace('/dashboard/clients', { scroll: false });
        }
      };
      fetchAndOpenClient();
    }
  }, [highlightClientId, loading, clients, router, getToken, currentOrganization, toast]);

  // Reset page when search or organization changes
  useEffect(() => {
    setFilters((prev) => ({ ...prev, page: 1 }));
  }, [debouncedSearch, currentOrganization]);

  const fetchClientAppointments = async (clientId: string) => {
    if (!currentOrganization) return;
    setAppointmentsLoading(true);
    try {
      const token = await getToken();
      setAuthToken(token);
      setOrganizationContext(currentOrganization.id);
      const response = await clientsApi.getAppointments(clientId, { limit: 20 });
      const paginatedData = response.data as PaginatedResult<Appointment>;
      setClientAppointments(paginatedData.data);
    } catch (error) {
      console.error("Failed to fetch appointments", error);
      toast({
        title: t('error'),
        description: t('loadHistoryError'),
        variant: "destructive",
      });
    } finally {
      setAppointmentsLoading(false);
    }
  };

  // Fetch client penalty
  const fetchClientPenalty = async (clientId: string) => {
    if (!currentOrganization) return;
    
    setPenaltyLoading(true);
    try {
      const token = await getToken();
      setAuthToken(token);
      setOrganizationContext(currentOrganization.id);
      const response = await clientPenaltiesApi.getActiveByClient(clientId);
      setClientPenalty(response.data);
    } catch (error) {
      console.error("Failed to fetch penalty data", error);
      setClientPenalty(null);
    } finally {
      setPenaltyLoading(false);
    }
  };

  // Create penalty
  const handleCreatePenalty = async () => {
    if (!selectedClient || !currentOrganization) return;
    
    if (penaltyFormData.type === 'suspension' && !penaltyFormData.expiresAt) {
      toast({
        title: t('error'),
        description: t('penalty.suspensionRequiresDate'),
        variant: "destructive",
      });
      return;
    }

    setSavingPenalty(true);
    try {
      const token = await getToken();
      setAuthToken(token);
      setOrganizationContext(currentOrganization.id);
      
      await clientPenaltiesApi.create({
        clientId: selectedClient.id,
        type: penaltyFormData.type,
        reason: penaltyFormData.reason || undefined,
        expiresAt: penaltyFormData.type === 'suspension' ? penaltyFormData.expiresAt : undefined,
      });
      
      toast({
        title: t('success'),
        description: penaltyFormData.type === 'ban' ? t('penalty.clientBanned') : t('penalty.clientSuspended'),
      });
      
      setPenaltyDialogOpen(false);
      setPenaltyFormData({ type: 'ban', reason: '', expiresAt: '' });
      await fetchClientPenalty(selectedClient.id);
      // Refresh the clients list to update visual indicators
      await fetchData(true);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({
        title: t('error'),
        description: err.response?.data?.message || t('penalty.createError'),
        variant: "destructive",
      });
    } finally {
      setSavingPenalty(false);
    }
  };

  // Remove penalty
  const handleRemovePenalty = async () => {
    if (!clientPenalty || !currentOrganization) return;

    setRemovingPenalty(true);
    try {
      const token = await getToken();
      setAuthToken(token);
      setOrganizationContext(currentOrganization.id);
      
      await clientPenaltiesApi.remove(clientPenalty.id, { removalReason: removalReason || undefined });
      
      toast({
        title: t('success'),
        description: t('penalty.removed'),
      });
      
      setRemovePenaltyDialogOpen(false);
      setRemovalReason('');
      setClientPenalty(null);
      // Refresh the clients list to update visual indicators
      await fetchData(true);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({
        title: t('error'),
        description: err.response?.data?.message || t('penalty.removeError'),
        variant: "destructive",
      });
    } finally {
      setRemovingPenalty(false);
    }
  };

  const handleViewDetails = async (client: Client) => {
    setSelectedClient(client);
    setDetailModalOpen(true);
    setClientPenalty(null);
    await Promise.all([
      fetchClientAppointments(client.id),
      fetchClientPenalty(client.id),
    ]);
  };

  const handleOpenNotebook = () => {
    if (!selectedClient) return;
    setNotesDraft(selectedClient.notes || "");
    setNotebookOpen(true);
  };

  const handleNotebookOpenChange = (open: boolean) => {
    if (!open && selectedClient && notesDraft !== (selectedClient.notes || "")) {
      const confirmed = window.confirm(t('notebook.unsavedConfirm'));
      if (!confirmed) return;
    }
    setNotebookOpen(open);
  };

  const handleSaveNotes = async () => {
    if (!selectedClient || !currentOrganization) return;
    setSavingNotes(true);
    try {
      const token = await getToken();
      setAuthToken(token);
      setOrganizationContext(currentOrganization.id);
      await clientsApi.update(selectedClient.id, { notes: notesDraft });
      // Update selected client in place so the summary card refreshes
      setSelectedClient({ ...selectedClient, notes: notesDraft });
      toast({ title: t('notebook.savedToast') });
      setNotebookOpen(false);
      fetchData(true);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({
        title: t('error'),
        description: err.response?.data?.message || t('notebook.saveError'),
        variant: "destructive",
      });
    } finally {
      setSavingNotes(false);
    }
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
        title: t('validationError'),
        description: t('form.nameRequired'),
        variant: "destructive",
      });
      return;
    }

    if (!currentOrganization) {
      toast({
        title: t('error'),
        description: t('organizationRequired'),
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const token = await getToken();
      setAuthToken(token);
      setOrganizationContext(currentOrganization.id);

      if (editingClient) {
        await clientsApi.update(editingClient.id, {
          name: formData.name,
          email: formData.email || undefined,
          notes: formData.notes || undefined,
        });
        toast({ title: t('messages.updated') });
      } else {
        await clientsApi.create({
          name: formData.name,
          email: formData.email || undefined,
          phone: formData.phone,
          notes: formData.notes || undefined,
        });
        toast({ title: t('messages.created') });
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
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({
        title: t('error'),
        description:
          err.response?.data?.message || t('loadError'),
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
    if (!clientToDelete || !currentOrganization) return;

    setDeleting(true);
    try {
      const token = await getToken();
      setAuthToken(token);
      setOrganizationContext(currentOrganization.id);
      await clientsApi.delete(clientToDelete.id);
      toast({ title: t('messages.deleted') });
      setDeleteDialogOpen(false);
      setClientToDelete(null);

      // Close detail modal if we deleted the selected client
      if (selectedClient?.id === clientToDelete.id) {
        setDetailModalOpen(false);
        setSelectedClient(null);
      }

      fetchData(true);
    } catch (error) {
      toast({
        title: t('error'),
        description: t('loadError'),
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

  // Show message when no organization is selected
  if (!currentOrganization) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold">{t('title')}</CardTitle>
            <CardDescription>
              {t('description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <Building2 className="h-4 w-4" />
              <AlertDescription>
                {t('noOrganization')}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && <StatsCards stats={stats} t={t} />}

      {/* Main Content */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-semibold">{t('title')}</CardTitle>
              <CardDescription>
                {t('description')}
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
                {t('refresh')}
              </Button>
              <Button size="sm" onClick={handleCreateClient}>
                <UserPlus className="h-4 w-4 mr-2" />
                {t('addClient')}
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
                placeholder={t('filters.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={toggleSortOrder}
              title={filters.sortOrder === "ASC" ? t('sortAscending') : t('sortDescending')}
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>

          {clients.length === 0 ? (
            <EmptyState onCreateClick={handleCreateClient} t={t} />
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
                          {t('table.client')}
                          {filters.sortBy === "name" && (
                            <ArrowUpDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead>{t('table.contact')}</TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSortChange("totalAppointments")}
                      >
                        <div className="flex items-center gap-1">
                          {t('table.appointments')}
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
                          {t('table.lastVisit')}
                          {filters.sortBy === "lastAppointmentAt" && (
                            <ArrowUpDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="text-right">{t('table.actions')}</TableHead>
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
                        t={t}
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
                    t={t}
                  />
                ))}
              </div>

              {/* Pagination */}
              <PaginationComponent pagination={pagination} onPageChange={handlePageChange} t={t} />
            </>
          )}
        </CardContent>
      </Card>

      {/* Client Detail Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-2xl md:max-w-3xl max-h-[90vh] p-0 overflow-hidden flex flex-col gap-0">
          {selectedClient && (
            <>
              <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Users className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-left text-xl">
                      {selectedClient.name}
                    </DialogTitle>
                    <DialogDescription className="text-left">
                      {t('detail.clientSince')}{" "}
                      {format(parseISO(selectedClient.createdAt), "MMM d, yyyy")}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-shrink-0 px-6 pt-3 border-b">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">{t('detail.tabs.overview')}</TabsTrigger>
                    <TabsTrigger value="notes" className="gap-1.5">
                      <StickyNote className="h-3.5 w-3.5" />
                      {t('detail.tabs.notes')}
                    </TabsTrigger>
                    <TabsTrigger value="serviceRecords" className="gap-1.5">
                      <ClipboardList className="h-3.5 w-3.5" />
                      {t('detail.tabs.serviceRecords')}
                    </TabsTrigger>
                    <TabsTrigger value="history" className="gap-1.5">
                      <History className="h-3.5 w-3.5" />
                      {t('detail.tabs.history')}
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Overview Tab */}
                <TabsContent value="overview" className="flex-1 overflow-hidden m-0">
                  <ScrollArea className="h-full px-6">
                    <div className="space-y-6 py-6">
                      {/* Actions */}
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreHorizontal className="h-4 w-4 mr-2" />
                              {t('actions.manage')}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{t('table.actions')}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEditClient(selectedClient)}>
                              <Edit className="h-4 w-4 mr-2" />
                              {t('actions.editInfo')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(selectedClient)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t('actions.removeClient')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Contact Info */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-muted-foreground">
                          {t('detail.contactInfo')}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="flex items-center gap-3 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{selectedClient.phone}</span>
                          </div>
                          {selectedClient.email && (
                            <div className="flex items-center gap-3 text-sm">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span className="truncate">{selectedClient.email}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <Separator />

                      {/* Stats */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-muted-foreground">
                          {t('detail.appointmentStats')}
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="rounded-lg border p-3">
                            <p className="text-2xl font-bold">
                              {selectedClient.totalAppointments}
                            </p>
                            <p className="text-xs text-muted-foreground">{t('detail.total')}</p>
                          </div>
                          <div className="rounded-lg border p-3">
                            <p className="text-2xl font-bold text-green-600">
                              {selectedClient.completedAppointments}
                            </p>
                            <p className="text-xs text-muted-foreground">{t('detail.completed')}</p>
                          </div>
                          <div className="rounded-lg border p-3">
                            <p className="text-2xl font-bold text-red-600">
                              {selectedClient.cancelledAppointments}
                            </p>
                            <p className="text-xs text-muted-foreground">{t('detail.cancelled')}</p>
                          </div>
                          <div className="rounded-lg border p-3">
                            <p className="text-2xl font-bold text-yellow-600">
                              {selectedClient.noShowAppointments}
                            </p>
                            <p className="text-xs text-muted-foreground">{t('detail.noShows')}</p>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Penalty Status Section */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <ShieldAlert className="h-4 w-4" />
                            {t('penalty.title')}
                          </h4>
                          {!clientPenalty && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setPenaltyFormData({ type: 'ban', reason: '', expiresAt: '' });
                                setPenaltyDialogOpen(true);
                              }}
                            >
                              <Ban className="h-3 w-3 mr-1" />
                              {t('penalty.addPenalty')}
                            </Button>
                          )}
                        </div>

                        {penaltyLoading ? (
                          <Skeleton className="h-16 w-full" />
                        ) : clientPenalty ? (
                          <div className={`rounded-lg border p-4 ${
                            clientPenalty.type === PenaltyType.BAN 
                              ? 'border-red-500 bg-red-50 dark:bg-red-950/20' 
                              : 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'
                          }`}>
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                {clientPenalty.type === PenaltyType.BAN ? (
                                  <Ban className="h-5 w-5 text-red-600" />
                                ) : (
                                  <CalendarOff className="h-5 w-5 text-yellow-600" />
                                )}
                                <div>
                                  <p className="font-medium">
                                    {clientPenalty.type === PenaltyType.BAN ? t('penalty.banned') : t('penalty.suspended')}
                                  </p>
                                  {clientPenalty.expiresAt && (
                                    <p className="text-xs text-muted-foreground">
                                      {t('penalty.until')}: {format(parseISO(clientPenalty.expiresAt), "MMM d, yyyy 'at' h:mm a")}
                                    </p>
                                  )}
                                  {clientPenalty.type === PenaltyType.BAN && (
                                    <p className="text-xs text-muted-foreground">{t('penalty.permanent')}</p>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setRemovalReason('');
                                  setRemovePenaltyDialogOpen(true);
                                }}
                              >
                                <ShieldOff className="h-3 w-3 mr-1" />
                                {t('penalty.removePenalty')}
                              </Button>
                            </div>
                            {clientPenalty.reason && (
                              <p className="text-sm mt-2 text-muted-foreground">
                                <span className="font-medium">{t('penalty.reason')}:</span> {clientPenalty.reason}
                              </p>
                            )}
                            <p className="text-xs mt-2 text-muted-foreground">
                              {t('penalty.issued')}: {format(parseISO(clientPenalty.createdAt), "MMM d, yyyy")}
                            </p>
                          </div>
                        ) : (
                          <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 p-3">
                            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="text-sm">{t('penalty.noActivePenalty')}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* Notes Tab */}
                <TabsContent value="notes" className="flex-1 overflow-hidden m-0">
                  <ScrollArea className="h-full px-6">
                    <div className="space-y-4 py-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <StickyNote className="h-4 w-4" />
                          {t('detail.notes')}
                        </h4>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={handleOpenNotebook}
                        >
                          <BookOpen className="h-4 w-4 mr-2" />
                          {t('detail.openNotebook')}
                        </Button>
                      </div>
                      <button
                        type="button"
                        onClick={handleOpenNotebook}
                        className="w-full text-left rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors p-4 group min-h-[200px]"
                      >
                        {selectedClient.notes ? (
                          <p className="text-sm whitespace-pre-wrap text-foreground">
                            {selectedClient.notes}
                          </p>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-center gap-2 text-sm text-muted-foreground italic group-hover:text-foreground py-8">
                            <BookOpen className="h-8 w-8" />
                            <span>{t('detail.notesPreviewEmpty')}</span>
                          </div>
                        )}
                      </button>
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* Service Records Tab */}
                <TabsContent value="serviceRecords" className="flex-1 overflow-hidden m-0">
                  <ServiceRecordsTab clientId={selectedClient.id} active={detailModalOpen} />
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history" className="flex-1 overflow-hidden m-0">
                  <ScrollArea className="h-full px-6">
                    <div className="space-y-3 py-6">
                      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <History className="h-4 w-4" />
                        {t('detail.appointmentHistory')}
                      </h4>
                      {appointmentsLoading ? (
                        <div className="space-y-2">
                          {[...Array(3)].map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full" />
                          ))}
                        </div>
                      ) : clientAppointments.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">
                          {t('detail.noHistory')}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {clientAppointments.map((apt) => (
                            <AppointmentHistoryItem key={apt.id} appointment={apt} tCommon={common} />
                          ))}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Notebook Dialog (dedicated notes editor) */}
      <Dialog open={notebookOpen} onOpenChange={handleNotebookOpenChange}>
        <DialogContent className="w-[95vw] sm:max-w-2xl h-[90vh] sm:h-[85vh] p-0 overflow-hidden flex flex-col gap-0">
          {selectedClient && (
            <>
              <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-left text-lg">
                      {t('notebook.title')}
                    </DialogTitle>
                    <DialogDescription className="text-left">
                      {t('notebook.subtitle', { name: selectedClient.name })}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-hidden p-6">
                <Textarea
                  autoFocus
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  placeholder={t('notebook.placeholder')}
                  className="h-full w-full resize-none text-base leading-relaxed font-normal"
                />
              </div>

              <DialogFooter className="flex-shrink-0 px-6 py-4 border-t flex-row items-center sm:justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  {t('notebook.charCount', { count: notesDraft.length })}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleNotebookOpenChange(false)}
                    disabled={savingNotes}
                  >
                    {t('cancel')}
                  </Button>
                  <Button
                    onClick={handleSaveNotes}
                    disabled={savingNotes || notesDraft === (selectedClient.notes || "")}
                  >
                    {savingNotes ? t('notebook.saving') : t('notebook.save')}
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit/Create Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingClient ? t('form.editTitle') : t('form.addTitle')}
            </DialogTitle>
            <DialogDescription>
              {editingClient
                ? t('form.editDescription')
                : t('form.addDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('form.name')} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder={t('form.namePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t('form.phone')} *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder={t('form.phonePlaceholder')}
                disabled={!!editingClient}
              />
              {editingClient && (
                <p className="text-xs text-muted-foreground">
                  {t('form.phoneCannotChange')}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('form.email')}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder={t('form.emailPlaceholder')}
              />
            </div>

            {!editingClient && (
              <div className="space-y-2">
                <Label htmlFor="notes">{t('form.notes')}</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder={t('form.notesPlaceholder')}
                  rows={4}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSaveClient} disabled={saving}>
              {saving ? t('saving') : editingClient ? t('form.saveChanges') : t('addClient')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('delete.title')}</DialogTitle>
            <DialogDescription>
              {t('delete.description', { name: clientToDelete?.name ?? '' })}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? t('deleting') : t('delete.title')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Penalty Dialog */}
      <Dialog open={penaltyDialogOpen} onOpenChange={setPenaltyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('penalty.dialogTitle')}</DialogTitle>
            <DialogDescription>
              {t('penalty.dialogDescription', { name: selectedClient?.name ?? '' })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('penalty.penaltyType')}</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={penaltyFormData.type === 'ban' ? 'default' : 'outline'}
                  onClick={() => setPenaltyFormData(prev => ({ ...prev, type: 'ban', expiresAt: '' }))}
                  className="justify-start"
                >
                  <Ban className="h-4 w-4 mr-2" />
                  {t('penalty.banPermanent')}
                </Button>
                <Button
                  variant={penaltyFormData.type === 'suspension' ? 'default' : 'outline'}
                  onClick={() => setPenaltyFormData(prev => ({ ...prev, type: 'suspension' }))}
                  className="justify-start"
                >
                  <CalendarOff className="h-4 w-4 mr-2" />
                  {t('penalty.suspendTemporary')}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {penaltyFormData.type === 'ban' 
                  ? t('penalty.banHint')
                  : t('penalty.suspendHint')}
              </p>
            </div>

            {penaltyFormData.type === 'suspension' && (
              <div className="space-y-2">
                <Label htmlFor="expiresAt">{t('penalty.suspendUntil')} *</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={penaltyFormData.expiresAt}
                  onChange={(e) => setPenaltyFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="penaltyReason">{t('penalty.reasonOptional')}</Label>
              <Textarea
                id="penaltyReason"
                value={penaltyFormData.reason}
                onChange={(e) => setPenaltyFormData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder={t('penalty.reasonPlaceholder')}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPenaltyDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button 
              variant="destructive"
              onClick={handleCreatePenalty} 
              disabled={savingPenalty || (penaltyFormData.type === 'suspension' && !penaltyFormData.expiresAt)}
            >
              {savingPenalty ? t('penalty.applying') : penaltyFormData.type === 'ban' ? t('penalty.banClient') : t('penalty.suspendClient')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Penalty Dialog */}
      <Dialog open={removePenaltyDialogOpen} onOpenChange={setRemovePenaltyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('penalty.removeTitle')}</DialogTitle>
            <DialogDescription>
              {t('penalty.removeDescription', { 
                type: clientPenalty?.type === PenaltyType.BAN ? t('penalty.banned').toLowerCase() : t('penalty.suspended').toLowerCase(),
                name: selectedClient?.name ?? ''
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="removalReason">{t('penalty.removalReasonOptional')}</Label>
              <Textarea
                id="removalReason"
                value={removalReason}
                onChange={(e) => setRemovalReason(e.target.value)}
                placeholder={t('penalty.removalReasonPlaceholder')}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRemovePenaltyDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button 
              onClick={handleRemovePenalty} 
              disabled={removingPenalty}
            >
              {removingPenalty ? t('penalty.removing') : t('penalty.removePenalty')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Stats Cards Component
function StatsCards({ stats, t }: { stats: ClientStats; t: (key: string) => string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('stats.totalClients')}
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
                {t('stats.newThisMonth')}
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
                {t('stats.repeatClients')}
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
  t,
}: {
  client: Client;
  onView: (client: Client) => void;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
  t: (key: string) => string;
}) {
  return (
    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => onView(client)}>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full font-medium ${
            client.activePenalty 
              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
              : 'bg-primary/10 text-primary'
          }`}>
            {client.activePenalty ? (
              <Ban className="h-5 w-5" />
            ) : (
              client.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">{client.name}</p>
              {client.activePenalty && (
                <Badge 
                  variant="destructive" 
                  className="text-xs h-5 px-1.5"
                >
                  {client.activePenalty.type === 'ban' ? t('penalty.banned') : t('penalty.suspended')}
                </Badge>
              )}
            </div>
            {client.notes && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <StickyNote className="h-3 w-3" />
                {t('table.hasNotes')}
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
              {client.completedAppointments} {t('table.completed')}
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
          <span className="text-sm text-muted-foreground italic">{t('table.never')}</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">{t('actions.openMenu')}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t('table.actions')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onView(client)}>
              <Eye className="h-4 w-4 mr-2" />
              {t('actions.viewDetails')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(client)}>
              <Edit className="h-4 w-4 mr-2" />
              {t('actions.edit')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(client)}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('actions.delete')}
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
  t,
}: {
  client: Client;
  onView: (client: Client) => void;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
  t: (key: string) => string;
}) {
  return (
    <Card className="cursor-pointer" onClick={() => onView(client)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full font-medium ${
              client.activePenalty 
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                : 'bg-primary/10 text-primary'
            }`}>
              {client.activePenalty ? (
                <Ban className="h-5 w-5" />
              ) : (
                client.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">{client.name}</h4>
                {client.activePenalty && (
                  <Badge 
                    variant="destructive" 
                    className="text-xs h-5 px-1.5"
                  >
                    {client.activePenalty.type === 'ban' ? t('penalty.banned') : t('penalty.suspended')}
                  </Badge>
                )}
              </div>
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
                {t('actions.edit')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(client)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('actions.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              {client.totalAppointments} {t('appointments')}
            </span>
            {client.notes && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <StickyNote className="h-3.5 w-3.5" />
                {t('detail.notes')}
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
function AppointmentHistoryItem({ appointment, tCommon }: { appointment: Appointment; tCommon: (key: string) => string }) {
  const startTime = parseISO(appointment.startTime);

  const statusConfig: Record<
    AppointmentStatus,
    { icon: React.ReactNode; color: string; labelKey: string }
  > = {
    [AppointmentStatus.PENDING_CONFIRMATION]: {
      icon: <AlertCircle className="h-3 w-3" />,
      color: "text-yellow-600",
      labelKey: "pending",
    },
    [AppointmentStatus.CONFIRMED]: {
      icon: <CheckCircle2 className="h-3 w-3" />,
      color: "text-blue-600",
      labelKey: "confirmed",
    },
    [AppointmentStatus.COMPLETED]: {
      icon: <CheckCircle2 className="h-3 w-3" />,
      color: "text-green-600",
      labelKey: "completed",
    },
    [AppointmentStatus.CANCELLED]: {
      icon: <XCircle className="h-3 w-3" />,
      color: "text-red-600",
      labelKey: "cancelled",
    },
    [AppointmentStatus.NO_SHOW]: {
      icon: <AlertCircle className="h-3 w-3" />,
      color: "text-orange-600",
      labelKey: "noShow",
    },
  };

  const { icon, color, labelKey } = statusConfig[appointment.status];

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
      <div className={`${color}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {appointment.serviceOption?.title || tCommon('service')}
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
        {tCommon(`status.${labelKey}`)}
      </Badge>
    </div>
  );
}

// Pagination Component
function PaginationComponent({
  pagination,
  onPageChange,
  t,
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
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const startItem = (pagination.page - 1) * pagination.limit + 1;
  const endItem = Math.min(pagination.page * pagination.limit, pagination.total);

  if (pagination.total === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
      <p className="text-sm text-muted-foreground">
        {t('showingClients', { start: startItem, end: endItem, total: pagination.total })}
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={!pagination.hasPreviousPage}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {t('previous')}
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
          {t('next')}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// Empty State Component
function EmptyState({ onCreateClick, t }: { onCreateClick: () => void; t: (key: string) => string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Users className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{t('empty.title')}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">
        {t('empty.description')}
      </p>
      <Button onClick={onCreateClick}>
        <UserPlus className="h-4 w-4 mr-2" />
        {t('empty.addFirst')}
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
