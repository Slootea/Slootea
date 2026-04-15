"use client";

import React, { useState, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { 
  AutomationNodeType, 
  NodeTypesResponse, 
  AutomationWorkflow,
  InventoryItem,
  automationApi,
  inventoryApi
} from "@/lib/api";
import { WorkflowCanvas } from "./workflow-canvas";
import { NodePalette } from "./node-palette";
import { NodeConfigPanel } from "./node-config-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { useToast } from "@/hooks/use-toast";
import { Save, Play, ArrowLeft, Loader2 } from "lucide-react";

interface CanvasNode {
  tempId: string;
  type: AutomationNodeType;
  label?: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
  nextNodeIds: string[];
}

interface WorkflowEditorProps {
  workflow?: AutomationWorkflow;
  onSave: () => void;
  onBack: () => void;
}

export function WorkflowEditor({ workflow, onSave, onBack }: WorkflowEditorProps) {
  const { toast } = useToast();
  
  // Workflow state
  const [name, setName] = useState(workflow?.name || "New Automation");
  const [description, setDescription] = useState(workflow?.description || "");
  const [isActive, setIsActive] = useState(workflow?.isActive ?? true);
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  
  // UI state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodeTypes, setNodeTypes] = useState<NodeTypesResponse | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [showRunDialog, setShowRunDialog] = useState(false);

  // Load node types and inventory items
  useEffect(() => {
    const loadData = async () => {
      try {
        const [typesRes, itemsRes] = await Promise.all([
          automationApi.getNodeTypes(),
          inventoryApi.getAll({ limit: 100 }),
        ]);
        setNodeTypes(typesRes.data);
        setInventoryItems(itemsRes.data.items);
      } catch (error) {
        console.error("Failed to load data:", error);
        toast({
          title: "Error",
          description: "Failed to load node types or inventory items",
          variant: "destructive",
        });
      }
    };
    loadData();
  }, [toast]);

  // Initialize nodes from workflow
  useEffect(() => {
    if (workflow?.nodes) {
      setNodes(
        workflow.nodes.map((n) => ({
          tempId: n.id, // Use actual ID as tempId for existing nodes
          type: n.type,
          label: n.label,
          config: n.config,
          position: n.position,
          nextNodeIds: n.nextNodeIds || [],
        }))
      );
    }
  }, [workflow]);

  const selectedNode = nodes.find((n) => n.tempId === selectedNodeId) || null;

  const handleAddNode = useCallback((type: AutomationNodeType) => {
    const newNode: CanvasNode = {
      tempId: uuidv4(),
      type,
      label: "",
      config: {},
      position: {
        x: 100 + Math.random() * 200,
        y: 100 + Math.random() * 200,
      },
      nextNodeIds: [],
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newNode.tempId);
  }, []);

  const handleNodeUpdate = useCallback((updatedNode: CanvasNode) => {
    setNodes((prev) =>
      prev.map((n) => (n.tempId === updatedNode.tempId ? updatedNode : n))
    );
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Workflow name is required",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      if (workflow) {
        // Update existing workflow
        await automationApi.updateWorkflow(workflow.id, {
          name,
          description,
          isActive,
        });
        await automationApi.saveWorkflowCanvas(workflow.id, {
          name,
          description,
          nodes: nodes.map((n) => ({
            type: n.type,
            label: n.label,
            config: n.config,
            position: n.position,
            nextNodeIds: n.nextNodeIds,
          })),
        });
      } else {
        // Create new workflow
        await automationApi.createWorkflow({
          name,
          description,
          isActive,
          nodes: nodes.map((n) => ({
            type: n.type,
            label: n.label,
            config: n.config,
            position: n.position,
            nextNodeIds: n.nextNodeIds,
          })),
        });
      }

      toast({
        title: "Success",
        description: "Workflow saved successfully",
      });
      onSave();
    } catch (error) {
      console.error("Failed to save workflow:", error);
      toast({
        title: "Error",
        description: "Failed to save workflow",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRun = async () => {
    if (!workflow) {
      toast({
        title: "Error",
        description: "Please save the workflow first",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    try {
      const result = await automationApi.triggerWorkflow(workflow.id);
      toast({
        title: "Workflow triggered",
        description: `Execution started (ID: ${result.data.id})`,
      });
      setShowRunDialog(false);
    } catch (error) {
      console.error("Failed to run workflow:", error);
      toast({
        title: "Error",
        description: "Failed to trigger workflow",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-64 font-medium"
              placeholder="Workflow name"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="is-active" className="text-sm">Active</Label>
            <Switch
              id="is-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
          {workflow && (
            <Button
              variant="outline"
              onClick={() => setShowRunDialog(true)}
              disabled={!workflow.isActive}
            >
              <Play className="h-4 w-4 mr-2" />
              Run
            </Button>
          )}
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Node palette - left */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <div className="h-full p-4 bg-muted/30">
              <NodePalette nodeTypes={nodeTypes} onAddNode={handleAddNode} />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Canvas - center */}
          <ResizablePanel defaultSize={selectedNode ? 50 : 80}>
            <div className="h-full p-4">
              <WorkflowCanvas
                nodes={nodes}
                onNodesChange={setNodes}
                nodeTypes={nodeTypes}
                onNodeSelect={(node) => setSelectedNodeId(node?.tempId || null)}
                selectedNodeId={selectedNodeId}
              />
            </div>
          </ResizablePanel>

          {/* Config panel - right (conditional) */}
          {selectedNode && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
                <div className="h-full p-4 bg-muted/30">
                  <NodeConfigPanel
                    node={selectedNode}
                    nodeTypes={nodeTypes}
                    inventoryItems={inventoryItems}
                    allNodes={nodes}
                    onNodeUpdate={handleNodeUpdate}
                    onClose={() => setSelectedNodeId(null)}
                  />
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      {/* Run confirmation dialog */}
      <Dialog open={showRunDialog} onOpenChange={setShowRunDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run Workflow</DialogTitle>
            <DialogDescription>
              This will manually trigger the workflow. Make sure you have saved any changes first.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Workflow: <span className="font-medium text-foreground">{name}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Nodes: <span className="font-medium text-foreground">{nodes.length}</span>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRunDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRun} disabled={isRunning}>
              {isRunning ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Run Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
