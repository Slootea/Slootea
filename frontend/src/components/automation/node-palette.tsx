"use client";

import React from "react";
import { AutomationNodeType, NodeTypesResponse } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  AlertTriangle, PackageX, ArrowDownUp, Hand, 
  GitBranch, Tag, Globe, Webhook, Bell, Package,
  Plus
} from "lucide-react";

interface NodePaletteProps {
  nodeTypes: NodeTypesResponse | null;
  onAddNode: (type: AutomationNodeType) => void;
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

interface NodeTypeButtonProps {
  type: AutomationNodeType;
  label: string;
  description: string;
  onClick: () => void;
}

function NodeTypeButton({ type, label, description, onClick }: NodeTypeButtonProps) {
  const Icon = NODE_ICONS[type];
  
  return (
    <Button
      variant="outline"
      className="w-full justify-start h-auto py-3 px-3"
      onClick={onClick}
    >
      <div className="flex items-start gap-3 w-full">
        <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
        <div className="text-left min-w-0">
          <div className="font-medium">{label}</div>
          <div className="text-xs text-muted-foreground line-clamp-2">{description}</div>
        </div>
        <Plus className="h-4 w-4 ml-auto flex-shrink-0 opacity-50" />
      </div>
    </Button>
  );
}

export function NodePalette({ nodeTypes, onAddNode }: NodePaletteProps) {
  if (!nodeTypes) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg">Add Nodes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading node types...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 pb-2">
        <CardTitle className="text-lg">Add Nodes</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4 pb-4">
          {/* Triggers */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Triggers
            </h3>
            <div className="space-y-2">
              {nodeTypes.triggers.map((nodeType) => (
                <NodeTypeButton
                  key={nodeType.type}
                  type={nodeType.type as AutomationNodeType}
                  label={nodeType.label}
                  description={nodeType.description}
                  onClick={() => onAddNode(nodeType.type as AutomationNodeType)}
                />
              ))}
            </div>
          </div>

          {/* Conditions */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              Conditions
            </h3>
            <div className="space-y-2">
              {nodeTypes.conditions.map((nodeType) => (
                <NodeTypeButton
                  key={nodeType.type}
                  type={nodeType.type as AutomationNodeType}
                  label={nodeType.label}
                  description={nodeType.description}
                  onClick={() => onAddNode(nodeType.type as AutomationNodeType)}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div>
            <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              Actions
            </h3>
            <div className="space-y-2">
              {nodeTypes.actions.map((nodeType) => (
                <NodeTypeButton
                  key={nodeType.type}
                  type={nodeType.type as AutomationNodeType}
                  label={nodeType.label}
                  description={nodeType.description}
                  onClick={() => onAddNode(nodeType.type as AutomationNodeType)}
                />
              ))}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
