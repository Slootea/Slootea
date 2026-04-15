"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  AutomationWorkflow, 
  AutomationExecution,
  automationApi 
} from "@/lib/api";
import { WorkflowEditor } from "@/components/automation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useSetPageHeader } from "@/components/providers/page-header-provider";
import { useOrganizationContext } from "@/components/providers/organization-provider";
import { useUser } from "@clerk/nextjs";
import { 
  Plus, Loader2, MoreHorizontal, Pencil, Trash2, Play, 
  Zap, Clock, CheckCircle, XCircle, AlertCircle, History
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

type ViewMode = "list" | "editor";

export default function AutomationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentOrganization } = useOrganizationContext();
  const { user } = useUser();
  
  // State
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [workflows, setWorkflows] = useState<AutomationWorkflow[]>([]);
  const [executions, setExecutions] = useState<AutomationExecution[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<AutomationWorkflow | undefined>();
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<AutomationWorkflow | null>(null);
  
  // Set page header
  useSetPageHeader("Inventory Automation", "Create automated workflows for stock management");

  // Check admin permission
  const membership = currentOrganization?.id 
    ? user?.organizationMemberships?.find(m => m.organization.id === currentOrganization.id)
    : null;
  const isAdmin = membership?.role === 'org:admin';

  // Load data
  const loadData = useCallback(async () => {
    if (!currentOrganization) return;
    
    setLoading(true);
    try {
      const [workflowsRes, executionsRes] = await Promise.all([
        automationApi.getWorkflows(),
        automationApi.getExecutionHistory({ limit: 20 }),
      ]);
      setWorkflows(workflowsRes.data);
      setExecutions(executionsRes.data);
    } catch (error) {
      console.error("Failed to load automation data:", error);
      toast({
        title: "Error",
        description: "Failed to load automation workflows",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [currentOrganization, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handlers
  const handleCreateNew = () => {
    setSelectedWorkflow(undefined);
    setViewMode("editor");
  };

  const handleEditWorkflow = (workflow: AutomationWorkflow) => {
    setSelectedWorkflow(workflow);
    setViewMode("editor");
  };

  const handleDeleteWorkflow = async () => {
    if (!workflowToDelete) return;
    
    try {
      await automationApi.deleteWorkflow(workflowToDelete.id);
      toast({
        title: "Success",
        description: "Workflow deleted successfully",
      });
      setWorkflows(prev => prev.filter(w => w.id !== workflowToDelete.id));
    } catch (error) {
      console.error("Failed to delete workflow:", error);
      toast({
        title: "Error",
        description: "Failed to delete workflow",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setWorkflowToDelete(null);
    }
  };

  const handleToggleActive = async (workflow: AutomationWorkflow) => {
    try {
      await automationApi.updateWorkflow(workflow.id, { isActive: !workflow.isActive });
      setWorkflows(prev =>
        prev.map(w => w.id === workflow.id ? { ...w, isActive: !w.isActive } : w)
      );
      toast({
        title: "Success",
        description: `Workflow ${workflow.isActive ? 'deactivated' : 'activated'}`,
      });
    } catch (error) {
      console.error("Failed to toggle workflow:", error);
      toast({
        title: "Error",
        description: "Failed to update workflow",
        variant: "destructive",
      });
    }
  };

  const handleRunWorkflow = async (workflow: AutomationWorkflow) => {
    try {
      const result = await automationApi.triggerWorkflow(workflow.id);
      toast({
        title: "Workflow triggered",
        description: `Execution started (ID: ${result.data.id})`,
      });
      // Refresh executions
      const executionsRes = await automationApi.getExecutionHistory({ limit: 20 });
      setExecutions(executionsRes.data);
    } catch (error) {
      console.error("Failed to run workflow:", error);
      toast({
        title: "Error",
        description: "Failed to trigger workflow",
        variant: "destructive",
      });
    }
  };

  const handleEditorSave = () => {
    setViewMode("list");
    loadData();
  };

  const handleEditorBack = () => {
    setViewMode("list");
  };

  // Status badge helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge variant="outline" className="bg-blue-100 text-blue-700"><Clock className="h-3 w-3 mr-1" />Running</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-100 text-red-700"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'partial':
        return <Badge variant="outline" className="bg-amber-100 text-amber-700"><AlertCircle className="h-3 w-3 mr-1" />Partial</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Permission check
  if (!currentOrganization) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please select an organization</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">You need admin permissions to access automation</p>
      </div>
    );
  }

  // Editor view
  if (viewMode === "editor") {
    return (
      <div className="h-[calc(100vh-120px)]">
        <WorkflowEditor
          workflow={selectedWorkflow}
          onSave={handleEditorSave}
          onBack={handleEditorBack}
        />
      </div>
    );
  }

  // List view
  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground">
            Automate inventory tasks like reorder alerts, API notifications, and stock adjustments.
          </p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Create Workflow
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <Tabs defaultValue="workflows" className="space-y-4">
          <TabsList>
            <TabsTrigger value="workflows" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Workflows
              {workflows.length > 0 && (
                <Badge variant="secondary" className="ml-1">{workflows.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Execution History
              {executions.length > 0 && (
                <Badge variant="secondary" className="ml-1">{executions.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Workflows Tab */}
          <TabsContent value="workflows">
            {workflows.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Zap className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No workflows yet</h3>
                  <p className="text-muted-foreground mb-4 text-center max-w-md">
                    Create your first automation workflow to trigger actions when stock levels change.
                  </p>
                  <Button onClick={handleCreateNew}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Workflow
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {workflows.map((workflow) => (
                  <Card key={workflow.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-base">{workflow.name}</CardTitle>
                          {workflow.description && (
                            <CardDescription className="line-clamp-2">
                              {workflow.description}
                            </CardDescription>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditWorkflow(workflow)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleRunWorkflow(workflow)}
                              disabled={!workflow.isActive}
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Run Now
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                setWorkflowToDelete(workflow);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline">
                            {workflow.nodes?.length || 0} nodes
                          </Badge>
                          <span>
                            Updated {formatDistanceToNow(new Date(workflow.updatedAt), { addSuffix: true })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {workflow.isActive ? 'Active' : 'Inactive'}
                          </span>
                          <Switch
                            checked={workflow.isActive}
                            onCheckedChange={() => handleToggleActive(workflow)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Execution History Tab */}
          <TabsContent value="history">
            {executions.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <History className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No executions yet</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    Workflow executions will appear here when triggered.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Workflow</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Triggered By</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Nodes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {executions.map((execution) => {
                      const duration = execution.completedAt
                        ? new Date(execution.completedAt).getTime() - new Date(execution.createdAt).getTime()
                        : null;
                      const successCount = execution.nodeResults.filter(r => r.status === 'success').length;
                      const errorCount = execution.nodeResults.filter(r => r.status === 'error').length;
                      
                      return (
                        <TableRow key={execution.id}>
                          <TableCell className="font-medium">
                            {execution.workflow?.name || 'Unknown'}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(execution.status)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {execution.context.triggeredBy}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(execution.createdAt), 'MMM d, HH:mm')}
                          </TableCell>
                          <TableCell>
                            {duration !== null ? `${duration}ms` : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <span className="text-green-600">{successCount}</span>
                              {errorCount > 0 && (
                                <>
                                  <span>/</span>
                                  <span className="text-red-600">{errorCount}</span>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{workflowToDelete?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWorkflow}
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
