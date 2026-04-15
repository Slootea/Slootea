"use client";

import React, { useCallback, useRef, useState, useEffect } from "react";
import { AutomationNode, AutomationNodeType, NodePosition, NodeTypesResponse } from "@/lib/api";
import { cn } from "@/lib/utils";
import { 
  Zap, AlertTriangle, PackageX, ArrowDownUp, Hand, 
  GitBranch, Tag, Globe, Webhook, Bell, Package,
  GripVertical, X, Plus, Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface CanvasNode extends Omit<AutomationNode, 'id' | 'workflowId' | 'createdAt' | 'updatedAt'> {
  tempId: string;
}

interface WorkflowCanvasProps {
  nodes: CanvasNode[];
  onNodesChange: (nodes: CanvasNode[]) => void;
  nodeTypes: NodeTypesResponse | null;
  onNodeSelect: (node: CanvasNode | null) => void;
  selectedNodeId: string | null;
}

const NODE_ICONS: Record<AutomationNodeType, React.ComponentType<{ className?: string }>> = {
  trigger_stock_critical: AlertTriangle,
  trigger_stock_out: PackageX,
  trigger_stock_adjusted: ArrowDownUp,
  trigger_manual: Hand,
  condition_stock_level: GitBranch,
  condition_item_category: Tag,
  action_api_call: Globe,
  action_webhook: Webhook,
  action_notification: Bell,
  action_adjust_stock: Package,
};

const NODE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  trigger: { bg: "bg-green-100 dark:bg-green-950", border: "border-green-400 dark:border-green-700", text: "text-green-700 dark:text-green-300" },
  condition: { bg: "bg-amber-100 dark:bg-amber-950", border: "border-amber-400 dark:border-amber-700", text: "text-amber-700 dark:text-amber-300" },
  action: { bg: "bg-blue-100 dark:bg-blue-950", border: "border-blue-400 dark:border-blue-700", text: "text-blue-700 dark:text-blue-300" },
};

function getNodeCategory(type: AutomationNodeType): string {
  if (type.startsWith('trigger_')) return 'trigger';
  if (type.startsWith('condition_')) return 'condition';
  return 'action';
}

function getNodeLabel(type: AutomationNodeType): string {
  const labels: Record<AutomationNodeType, string> = {
    trigger_stock_critical: 'Stock Critical',
    trigger_stock_out: 'Stock Out',
    trigger_stock_adjusted: 'Stock Adjusted',
    trigger_manual: 'Manual Trigger',
    condition_stock_level: 'Stock Level',
    condition_item_category: 'Item Category',
    action_api_call: 'API Call',
    action_webhook: 'Webhook',
    action_notification: 'Notification',
    action_adjust_stock: 'Adjust Stock',
  };
  return labels[type] || type;
}

interface DraggableNodeProps {
  node: CanvasNode;
  isSelected: boolean;
  onSelect: () => void;
  onPositionChange: (position: NodePosition) => void;
  onDelete: () => void;
  canvasRef: React.RefObject<HTMLDivElement | null>;
}

function DraggableNode({ 
  node, 
  isSelected, 
  onSelect, 
  onPositionChange, 
  onDelete,
  canvasRef 
}: DraggableNodeProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const Icon = NODE_ICONS[node.type];
  const category = getNodeCategory(node.type);
  const colors = NODE_COLORS[category];

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    e.stopPropagation();
    
    onSelect();
    setIsDragging(true);
    
    const rect = nodeRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  }, [onSelect]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const newX = e.clientX - canvasRect.left - dragOffset.x + canvasRef.current.scrollLeft;
      const newY = e.clientY - canvasRect.top - dragOffset.y + canvasRef.current.scrollTop;
      
      onPositionChange({
        x: Math.max(0, newX),
        y: Math.max(0, newY),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, canvasRef, onPositionChange]);

  return (
    <div
      ref={nodeRef}
      className={cn(
        "absolute flex flex-col rounded-lg border-2 shadow-md min-w-[160px] cursor-move select-none",
        colors.bg,
        colors.border,
        isSelected && "ring-2 ring-primary ring-offset-2",
        isDragging && "opacity-80 z-50"
      )}
      style={{
        left: node.position.x,
        top: node.position.y,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div className={cn("flex items-center gap-2 px-3 py-2 border-b", colors.border)}>
        <GripVertical className="h-4 w-4 text-muted-foreground" />
        <Icon className={cn("h-4 w-4", colors.text)} />
        <span className={cn("text-sm font-medium flex-1", colors.text)}>
          {node.label || getNodeLabel(node.type)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 hover:bg-destructive/20"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      
      {/* Body */}
      <div className="px-3 py-2 text-xs text-muted-foreground">
        {category === 'trigger' && <span className="text-green-600 dark:text-green-400">Trigger</span>}
        {category === 'condition' && <span className="text-amber-600 dark:text-amber-400">Condition</span>}
        {category === 'action' && <span className="text-blue-600 dark:text-blue-400">Action</span>}
      </div>

      {/* Connection handle */}
      <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-primary border-2 border-background" />
      <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-muted border-2 border-background" />
    </div>
  );
}

export function WorkflowCanvas({
  nodes,
  onNodesChange,
  nodeTypes,
  onNodeSelect,
  selectedNodeId,
}: WorkflowCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const handleNodePositionChange = useCallback((tempId: string, position: NodePosition) => {
    onNodesChange(
      nodes.map(n => n.tempId === tempId ? { ...n, position } : n)
    );
  }, [nodes, onNodesChange]);

  const handleNodeDelete = useCallback((tempId: string) => {
    // Remove node and clean up connections
    const deletedNode = nodes.find(n => n.tempId === tempId);
    if (!deletedNode) return;

    onNodesChange(
      nodes
        .filter(n => n.tempId !== tempId)
        .map(n => ({
          ...n,
          nextNodeIds: n.nextNodeIds.filter(id => id !== tempId),
        }))
    );
    onNodeSelect(null);
  }, [nodes, onNodesChange, onNodeSelect]);

  // Draw connections
  const renderConnections = () => {
    const connections: React.JSX.Element[] = [];
    
    nodes.forEach(node => {
      node.nextNodeIds.forEach(nextTempId => {
        const targetNode = nodes.find(n => n.tempId === nextTempId);
        if (!targetNode) return;

        const startX = node.position.x + 160; // Right side of node
        const startY = node.position.y + 40;  // Middle of node
        const endX = targetNode.position.x;   // Left side of target
        const endY = targetNode.position.y + 40;

        // Bezier curve control points
        const midX = (startX + endX) / 2;
        const path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;

        connections.push(
          <path
            key={`${node.tempId}-${nextTempId}`}
            d={path}
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            className="text-muted-foreground"
          />
        );
      });
    });

    return connections;
  };

  return (
    <div 
      ref={canvasRef}
      className="relative w-full h-full min-h-[600px] bg-muted/20 overflow-auto border rounded-lg"
      style={{
        backgroundImage: 'radial-gradient(circle, hsl(var(--muted)) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
      onClick={() => onNodeSelect(null)}
    >
      {/* SVG for connections */}
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ minWidth: '2000px', minHeight: '1500px' }}
      >
        {renderConnections()}
      </svg>

      {/* Nodes */}
      {nodes.map(node => (
        <DraggableNode
          key={node.tempId}
          node={node}
          isSelected={selectedNodeId === node.tempId}
          onSelect={() => onNodeSelect(node)}
          onPositionChange={(pos) => handleNodePositionChange(node.tempId, pos)}
          onDelete={() => handleNodeDelete(node.tempId)}
          canvasRef={canvasRef}
        />
      ))}

      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No nodes yet</p>
            <p className="text-sm">Add a trigger node to get started</p>
          </div>
        </div>
      )}
    </div>
  );
}
