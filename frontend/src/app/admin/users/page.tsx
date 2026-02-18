"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Users,
  Search,
  MoreVertical,
  Eye,
  Shield,
  ShieldOff,
  ChevronLeft,
  ChevronRight,
  Mail,
} from "lucide-react";
import { adminApi, User, PaginatedResponse } from "@/lib/admin-api";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [userForAdminAction, setUserForAdminAction] = useState<User | null>(null);
  const [adminAction, setAdminAction] = useState<"grant" | "revoke">("grant");
  const [processing, setProcessing] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminApi.getAllUsers({
        page,
        limit: 10,
        search: searchQuery || undefined,
        role: roleFilter !== "all" ? roleFilter : undefined,
        sortBy: "createdAt",
        sortOrder: "DESC",
      });
      setUsers(response.data.data);
      setTotalPages(response.data.totalPages);
      setTotal(response.data.total);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleAdminAction = async () => {
    if (!userForAdminAction) return;

    setProcessing(true);
    try {
      if (adminAction === "grant") {
        await adminApi.setUserAsSystemAdmin(userForAdminAction.clerkId);
        toast({
          title: "Admin Role Granted",
          description: `${userForAdminAction.email} is now a system administrator.`,
        });
      } else {
        await adminApi.removeSystemAdminRole(userForAdminAction.clerkId);
        toast({
          title: "Admin Role Revoked",
          description: `${userForAdminAction.email} is no longer a system administrator.`,
        });
      }
      fetchUsers();
    } catch (error) {
      console.error("Failed to update admin role:", error);
      toast({
        title: "Error",
        description: "Failed to update admin role",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
      setAdminDialogOpen(false);
      setUserForAdminAction(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Users</h2>
          <p className="text-muted-foreground">
            Manage all users in the system ({total} total)
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="org:admin">Admin</SelectItem>
                <SelectItem value="org:member">Member</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit">Search</Button>
          </form>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            Users registered in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "No users found matching your search" : "No users found"}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Active Organization</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {user.businessName ||
                                `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
                                "Unnamed User"}
                            </p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.activeOrganizationId ? (
                          <span className="text-sm font-mono truncate max-w-[200px] block" title={user.activeOrganizationId}>
                            {user.activeOrganizationId.slice(0, 12)}...
                          </span>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? "default" : "secondary"}>
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(user.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/users/${user.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Mail className="mr-2 h-4 w-4" />
                              Send Email
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setUserForAdminAction(user);
                                setAdminAction("grant");
                                setAdminDialogOpen(true);
                              }}
                            >
                              <Shield className="mr-2 h-4 w-4" />
                              Grant Admin Role
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setUserForAdminAction(user);
                                setAdminAction("revoke");
                                setAdminDialogOpen(true);
                              }}
                            >
                              <ShieldOff className="mr-2 h-4 w-4" />
                              Revoke Admin Role
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Admin Role Dialog */}
      <AlertDialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {adminAction === "grant" ? "Grant System Admin Role" : "Revoke System Admin Role"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {adminAction === "grant" ? (
                <>
                  Are you sure you want to grant system admin privileges to{" "}
                  <strong>{userForAdminAction?.email}</strong>? They will have full access to the admin portal.
                </>
              ) : (
                <>
                  Are you sure you want to revoke system admin privileges from{" "}
                  <strong>{userForAdminAction?.email}</strong>? They will no longer have access to the admin portal.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAdminAction}
              disabled={processing}
              className={
                adminAction === "revoke"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              {processing
                ? "Processing..."
                : adminAction === "grant"
                ? "Grant Admin Role"
                : "Revoke Admin Role"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
