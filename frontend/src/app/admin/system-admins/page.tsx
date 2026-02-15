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
  Shield,
  Search,
  UserPlus,
  ShieldOff,
  Mail,
} from "lucide-react";
import { adminApi, User } from "@/lib/admin-api";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

export default function SystemAdminsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [userToRevoke, setUserToRevoke] = useState<User | null>(null);
  const [processing, setProcessing] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [userToAdd, setUserToAdd] = useState<User | null>(null);

  // In a real implementation, we'd have an endpoint to get all system admins
  // For now, we'll just show a message that this feature needs backend support
  useEffect(() => {
    setLoading(false);
    // This would be: adminApi.getSystemAdmins()
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await adminApi.getAllUsers({
        search: searchQuery,
        limit: 10,
      });
      setSearchResults(response.data.data);
    } catch (error) {
      console.error("Failed to search users:", error);
      toast({
        title: "Error",
        description: "Failed to search users",
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  };

  const handleGrantAdmin = async () => {
    if (!userToAdd) return;

    setProcessing(true);
    try {
      await adminApi.setUserAsSystemAdmin(userToAdd.clerkId);
      toast({
        title: "Admin Role Granted",
        description: `${userToAdd.email} is now a system administrator.`,
      });
      setSearchQuery("");
      setSearchResults([]);
    } catch (error) {
      console.error("Failed to grant admin role:", error);
      toast({
        title: "Error",
        description: "Failed to grant admin role",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
      setAddDialogOpen(false);
      setUserToAdd(null);
    }
  };

  const handleRevokeAdmin = async () => {
    if (!userToRevoke) return;

    setProcessing(true);
    try {
      await adminApi.removeSystemAdminRole(userToRevoke.clerkId);
      toast({
        title: "Admin Role Revoked",
        description: `${userToRevoke.email} is no longer a system administrator.`,
      });
    } catch (error) {
      console.error("Failed to revoke admin role:", error);
      toast({
        title: "Error",
        description: "Failed to revoke admin role",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
      setRevokeDialogOpen(false);
      setUserToRevoke(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">System Administrators</h2>
          <p className="text-muted-foreground">
            Manage users with full system access
          </p>
        </div>
      </div>

      {/* Add New Admin */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add System Administrator
          </CardTitle>
          <CardDescription>
            Search for a user and grant them system admin privileges
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <Button type="submit" disabled={searching}>
              {searching ? "Searching..." : "Search"}
            </Button>
          </form>

          {searchResults.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchResults.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.businessName ||
                        `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
                        "Unnamed User"}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => {
                          setUserToAdd(user);
                          setAddDialogOpen(true);
                        }}
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        Grant Admin
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            About System Administrators
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            System administrators have full access to the admin portal and can:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li>View and manage all organizations</li>
            <li>Access and modify organization settings</li>
            <li>View all users and their data</li>
            <li>Manage services and booking links across all organizations</li>
            <li>View and modify appointment statuses</li>
            <li>Grant or revoke admin privileges to other users</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-4">
            <strong>Note:</strong> System admin privileges are stored in the user&apos;s Clerk public metadata 
            with <code className="bg-muted px-1 rounded">role: &quot;admin&quot;</code>.
          </p>
        </CardContent>
      </Card>

      {/* Grant Admin Confirmation Dialog */}
      <AlertDialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Grant System Admin Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to grant system admin privileges to{" "}
              <strong>{userToAdd?.email}</strong>? They will have full access to the admin portal
              and all organizational data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleGrantAdmin} disabled={processing}>
              {processing ? "Processing..." : "Grant Admin Role"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke Admin Confirmation Dialog */}
      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke System Admin Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke system admin privileges from{" "}
              <strong>{userToRevoke?.email}</strong>? They will no longer have access to the admin portal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeAdmin}
              disabled={processing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processing ? "Processing..." : "Revoke Admin Role"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
