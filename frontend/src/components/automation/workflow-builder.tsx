"use client";

import React, { useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { AutomationNodeType, NodeTypesResponse, InventoryItem } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertTriangle, PackageX, ArrowDownUp, Hand,
  GitBranch, Tag, Globe, Webhook, Bell, Package,
  Plus, Trash2, ChevronDown, ChevronRight, GripVertical,
  Settings, Zap, ArrowDown
} from "lucide-react";

// Types
interface CanvasNode {
  tempId: string;
  type: AutomationNodeType;
  label?: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
  nextNodeIds: string[];
}

interface WorkflowBuilderProps {
  nodes: CanvasNode[];
  onNodesChange: (nodes: CanvasNode[]) => void;
  nodeTypes: NodeTypesResponse | null;
  inventoryItems: InventoryItem[];
}

// Node icons and colors
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

const NODE_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  trigger: { 
    bg: "bg-green-50 dark:bg-green-950/50", 
    border: "border-green-200 dark:border-green-800", 
    text: "text-green-700 dark:text-green-300",
    badge: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
  },
  condition: { 
    bg: "bg-amber-50 dark:bg-amber-950/50", 
    border: "border-amber-200 dark:border-amber-800", 
    text: "text-amber-700 dark:text-amber-300",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
  },
  action: { 
    bg: "bg-blue-50 dark:bg-blue-950/50", 
    border: "border-blue-200 dark:border-blue-800", 
    text: "text-blue-700 dark:text-blue-300",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
  },
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
    condition_stock_level: 'Stock Level Check',
    condition_item_category: 'Category Check',
    action_api_call: 'API Call',
    action_webhook: 'Webhook',
    action_notification: 'Send Notification',
    action_adjust_stock: 'Adjust Stock',
  };
  return labels[type] || type;
}

// Node Type Selector Component
interface NodeTypeSelectorProps {
  nodeTypes: NodeTypesResponse;
  onSelect: (type: AutomationNodeType) => void;
  filter?: 'trigger' | 'condition' | 'action' | 'all';
  existingTrigger?: boolean;
}

function NodeTypeSelector({ nodeTypes, onSelect, filter = 'all', existingTrigger }: NodeTypeSelectorProps) {
  const showTriggers = (filter === 'all' || filter === 'trigger') && !existingTrigger;
  const showConditions = filter === 'all' || filter === 'condition';
  const showActions = filter === 'all' || filter === 'action';

  return (
    <div className="w-72 space-y-3">
      {showTriggers && nodeTypes.triggers.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-green-600 dark:text-green-400 mb-2 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Triggers
          </h4>
          <div className="space-y-1">
            {nodeTypes.triggers.map((nodeType) => {
              const Icon = NODE_ICONS[nodeType.type as AutomationNodeType];
              return (
                <button
                  key={nodeType.type}
                  onClick={() => onSelect(nodeType.type as AutomationNodeType)}
                  className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted text-left transition-colors"
                >
                  <Icon className="h-4 w-4 text-green-600" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{nodeType.label}</div>
                    <div className="text-xs text-muted-foreground truncate">{nodeType.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
      
      {showConditions && nodeTypes.conditions.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Conditions
          </h4>
          <div className="space-y-1">
            {nodeTypes.conditions.map((nodeType) => {
              const Icon = NODE_ICONS[nodeType.type as AutomationNodeType];
              return (
                <button
                  key={nodeType.type}
                  onClick={() => onSelect(nodeType.type as AutomationNodeType)}
                  className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted text-left transition-colors"
                >
                  <Icon className="h-4 w-4 text-amber-600" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{nodeType.label}</div>
                    <div className="text-xs text-muted-foreground truncate">{nodeType.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
      
      {showActions && nodeTypes.actions.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Actions
          </h4>
          <div className="space-y-1">
            {nodeTypes.actions.map((nodeType) => {
              const Icon = NODE_ICONS[nodeType.type as AutomationNodeType];
              return (
                <button
                  key={nodeType.type}
                  onClick={() => onSelect(nodeType.type as AutomationNodeType)}
                  className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted text-left transition-colors"
                >
                  <Icon className="h-4 w-4 text-blue-600" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{nodeType.label}</div>
                    <div className="text-xs text-muted-foreground truncate">{nodeType.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Step Configuration Component
interface StepConfigProps {
  node: CanvasNode;
  nodeTypes: NodeTypesResponse | null;
  inventoryItems: InventoryItem[];
  onUpdate: (node: CanvasNode) => void;
}

function StepConfig({ node, nodeTypes, inventoryItems, onUpdate }: StepConfigProps) {
  const updateConfig = (key: string, value: unknown) => {
    onUpdate({
      ...node,
      config: { ...node.config, [key]: value },
    });
  };

  const updateLabel = (label: string) => {
    onUpdate({ ...node, label });
  };

  switch (node.type) {
    case 'trigger_stock_critical':
    case 'trigger_stock_out':
      return (
        <div className="space-y-4 pt-3">
          <div className="space-y-2">
            <Label className="text-xs">Custom Label (optional)</Label>
            <Input
              value={node.label || ''}
              onChange={(e) => updateLabel(e.target.value)}
              placeholder={getNodeLabel(node.type)}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Filter by Items (optional)</Label>
            <p className="text-xs text-muted-foreground">Leave empty to trigger for all items</p>
            {inventoryItems.length > 0 ? (
              <div className="space-y-1.5 max-h-32 overflow-auto border rounded-md p-2">
                {inventoryItems.map(item => (
                  <div key={item.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`item-${node.tempId}-${item.id}`}
                      checked={((node.config.inventoryItemIds as string[]) || []).includes(item.id)}
                      onCheckedChange={(checked) => {
                        const currentIds = (node.config.inventoryItemIds as string[]) || [];
                        if (checked) {
                          updateConfig('inventoryItemIds', [...currentIds, item.id]);
                        } else {
                          updateConfig('inventoryItemIds', currentIds.filter(id => id !== item.id));
                        }
                      }}
                    />
                    <label htmlFor={`item-${node.tempId}-${item.id}`} className="text-xs">{item.name}</label>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No inventory items available</p>
            )}
          </div>
          {node.type === 'trigger_stock_critical' && (
            <div className="space-y-2">
              <Label htmlFor={`threshold-${node.tempId}`} className="text-xs">Custom Threshold</Label>
              <Input
                id={`threshold-${node.tempId}`}
                type="number"
                value={(node.config.threshold as number) || ''}
                onChange={(e) => updateConfig('threshold', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Use item's min stock alert"
                className="h-8 text-sm"
              />
            </div>
          )}
        </div>
      );

    case 'trigger_stock_adjusted':
      return (
        <div className="space-y-4 pt-3">
          <div className="space-y-2">
            <Label className="text-xs">Custom Label (optional)</Label>
            <Input
              value={node.label || ''}
              onChange={(e) => updateLabel(e.target.value)}
              placeholder={getNodeLabel(node.type)}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Adjustment Types</Label>
            <div className="space-y-1.5">
              {['manual', 'purchase', 'correction', 'service_usage'].map(type => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`adj-type-${node.tempId}-${type}`}
                    checked={((node.config.adjustmentTypes as string[]) || []).includes(type)}
                    onCheckedChange={(checked) => {
                      const currentTypes = (node.config.adjustmentTypes as string[]) || [];
                      if (checked) {
                        updateConfig('adjustmentTypes', [...currentTypes, type]);
                      } else {
                        updateConfig('adjustmentTypes', currentTypes.filter(t => t !== type));
                      }
                    }}
                  />
                  <label htmlFor={`adj-type-${node.tempId}-${type}`} className="text-xs capitalize">{type.replace('_', ' ')}</label>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case 'trigger_manual':
      return (
        <div className="space-y-4 pt-3">
          <div className="space-y-2">
            <Label className="text-xs">Custom Label (optional)</Label>
            <Input
              value={node.label || ''}
              onChange={(e) => updateLabel(e.target.value)}
              placeholder={getNodeLabel(node.type)}
              className="h-8 text-sm"
            />
          </div>
          <p className="text-xs text-muted-foreground">This workflow will be triggered manually from the UI.</p>
        </div>
      );

    case 'condition_stock_level':
      return (
        <div className="space-y-4 pt-3">
          <div className="space-y-2">
            <Label className="text-xs">Inventory Item</Label>
            <Select
              value={(node.config.inventoryItemId as string) || ''}
              onValueChange={(value) => updateConfig('inventoryItemId', value)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select item" />
              </SelectTrigger>
              <SelectContent>
                {inventoryItems.map(item => (
                  <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label className="text-xs">Operator</Label>
              <Select
                value={(node.config.operator as string) || ''}
                onValueChange={(value) => updateConfig('operator', value)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lt">&lt; Less than</SelectItem>
                  <SelectItem value="lte">≤ Less or equal</SelectItem>
                  <SelectItem value="eq">= Equal</SelectItem>
                  <SelectItem value="gte">≥ Greater or equal</SelectItem>
                  <SelectItem value="gt">&gt; Greater than</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Value</Label>
              <Input
                type="number"
                value={(node.config.value as number) || ''}
                onChange={(e) => updateConfig('value', Number(e.target.value))}
                placeholder="0"
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>
      );

    case 'condition_item_category':
      return (
        <div className="space-y-4 pt-3">
          <div className="space-y-2">
            <Label className="text-xs">Category</Label>
            <Select
              value={(node.config.category as string) || ''}
              onValueChange={(value) => updateConfig('category', value)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="consumable">Consumable</SelectItem>
                <SelectItem value="retail">Retail</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case 'action_notification':
      return (
        <div className="space-y-4 pt-3">
          <div className="space-y-2">
            <Label className="text-xs">Channel</Label>
            <Select
              value={(node.config.channel as string) || 'email'}
              onValueChange={(value) => updateConfig('channel', value)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="push">Push Notification</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Recipients</Label>
            <Input
              value={(node.config.recipients as string) || ''}
              onChange={(e) => updateConfig('recipients', e.target.value)}
              placeholder="email@example.com or +1234567890"
              className="h-8 text-sm"
            />
            <p className="text-xs text-muted-foreground">Comma-separated for multiple</p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Message Template</Label>
            <Textarea
              value={(node.config.message as string) || ''}
              onChange={(e) => updateConfig('message', e.target.value)}
              placeholder="Stock alert: {{inventoryItemName}} is low"
              className="text-sm min-h-[60px]"
            />
            <p className="text-xs text-muted-foreground">Use {'{{variable}}'} for dynamic content</p>
          </div>
        </div>
      );

    case 'action_webhook':
      return (
        <div className="space-y-4 pt-3">
          <div className="space-y-2">
            <Label className="text-xs">Webhook URL</Label>
            <Input
              value={(node.config.url as string) || ''}
              onChange={(e) => updateConfig('url', e.target.value)}
              placeholder="https://hooks.example.com/..."
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Method</Label>
            <Select
              value={(node.config.method as string) || 'POST'}
              onValueChange={(value) => updateConfig('method', value)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Headers (JSON)</Label>
            <Textarea
              value={(node.config.headers as string) || ''}
              onChange={(e) => updateConfig('headers', e.target.value)}
              placeholder='{"Authorization": "Bearer token"}'
              className="text-sm min-h-[40px] font-mono text-xs"
            />
          </div>
        </div>
      );

    case 'action_api_call':
      return (
        <div className="space-y-4 pt-3">
          <div className="space-y-2">
            <Label className="text-xs">API URL</Label>
            <Input
              value={(node.config.url as string) || ''}
              onChange={(e) => updateConfig('url', e.target.value)}
              placeholder="https://api.example.com/endpoint"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Method</Label>
            <Select
              value={(node.config.method as string) || 'POST'}
              onValueChange={(value) => updateConfig('method', value)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="PATCH">PATCH</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Body (JSON)</Label>
            <Textarea
              value={(node.config.body as string) || ''}
              onChange={(e) => updateConfig('body', e.target.value)}
              placeholder='{"item": "{{inventoryItemName}}"}'
              className="text-sm min-h-[60px] font-mono text-xs"
            />
          </div>
        </div>
      );

    case 'action_adjust_stock':
      return (
        <div className="space-y-4 pt-3">
          <div className="space-y-2">
            <Label className="text-xs">Inventory Item</Label>
            <Select
              value={(node.config.inventoryItemId as string) || ''}
              onValueChange={(value) => updateConfig('inventoryItemId', value)}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select item" />
              </SelectTrigger>
              <SelectContent>
                {inventoryItems.map(item => (
                  <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label className="text-xs">Adjustment Type</Label>
              <Select
                value={(node.config.adjustmentType as string) || 'add'}
                onValueChange={(value) => updateConfig('adjustmentType', value)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add (+)</SelectItem>
                  <SelectItem value="subtract">Subtract (-)</SelectItem>
                  <SelectItem value="set">Set to</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Amount</Label>
              <Input
                type="number"
                value={(node.config.amount as number) || ''}
                onChange={(e) => updateConfig('amount', Number(e.target.value))}
                placeholder="0"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Reason</Label>
            <Input
              value={(node.config.reason as string) || ''}
              onChange={(e) => updateConfig('reason', e.target.value)}
              placeholder="Automated adjustment"
              className="h-8 text-sm"
            />
          </div>
        </div>
      );

    default:
      return (
        <div className="pt-3">
          <p className="text-xs text-muted-foreground">No configuration needed for this step.</p>
        </div>
      );
  }
}

// Workflow Step Component
interface WorkflowStepProps {
  node: CanvasNode;
  index: number;
  nodeTypes: NodeTypesResponse | null;
  inventoryItems: InventoryItem[];
  onUpdate: (node: CanvasNode) => void;
  onDelete: () => void;
  isFirst: boolean;
  isLast: boolean;
}

function WorkflowStep({
  node,
  index,
  nodeTypes,
  inventoryItems,
  onUpdate,
  onDelete,
  isFirst,
  isLast,
}: WorkflowStepProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const Icon = NODE_ICONS[node.type];
  const category = getNodeCategory(node.type);
  const colors = NODE_COLORS[category];
  const nodeInfo = nodeTypes ? 
    [...nodeTypes.triggers, ...nodeTypes.conditions, ...nodeTypes.actions].find(t => t.type === node.type) 
    : null;

  return (
    <div className="relative">
      {/* Connection line to previous */}
      {!isFirst && (
        <div className="absolute left-6 -top-4 w-0.5 h-4 bg-border" />
      )}
      
      <Card className={cn("border-2", colors.border, colors.bg)}>
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <div className="flex items-center gap-2 px-3 py-2">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            
            <div className={cn("p-1.5 rounded", colors.badge)}>
              <Icon className="h-4 w-4" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Step {index + 1}</span>
                <Badge variant="outline" className={cn("text-xs py-0", colors.badge)}>
                  {category}
                </Badge>
              </div>
              <div className="font-medium text-sm truncate">
                {node.label || nodeInfo?.label || getNodeLabel(node.type)}
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          
          <CollapsibleContent>
            <div className="px-3 pb-3 border-t">
              <StepConfig
                node={node}
                nodeTypes={nodeTypes}
                inventoryItems={inventoryItems}
                onUpdate={onUpdate}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>
      
      {/* Connection line to next */}
      {!isLast && (
        <div className="flex justify-center py-1">
          <ArrowDown className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

// Add Step Button Component
interface AddStepButtonProps {
  nodeTypes: NodeTypesResponse;
  onAdd: (type: AutomationNodeType) => void;
  existingTrigger: boolean;
  position: 'start' | 'middle' | 'end';
}

function AddStepButton({ nodeTypes, onAdd, existingTrigger, position }: AddStepButtonProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (type: AutomationNodeType) => {
    onAdd(type);
    setOpen(false);
  };

  // Determine filter based on position
  const filter = position === 'start' && !existingTrigger ? 'trigger' : 
                 position === 'start' ? 'all' : 'all';

  return (
    <div className="flex justify-center py-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-full gap-1.5 border-dashed"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Step
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-2 w-auto" align="center">
          <ScrollArea className="max-h-80">
            <NodeTypeSelector
              nodeTypes={nodeTypes}
              onSelect={handleSelect}
              filter={filter}
              existingTrigger={existingTrigger}
            />
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Main Workflow Builder Component
export function WorkflowBuilder({
  nodes,
  onNodesChange,
  nodeTypes,
  inventoryItems,
}: WorkflowBuilderProps) {
  const hasTrigger = nodes.some(n => n.type.startsWith('trigger_'));

  const handleAddNode = useCallback((type: AutomationNodeType, insertIndex?: number) => {
    const newNode: CanvasNode = {
      tempId: uuidv4(),
      type,
      label: "",
      config: {},
      position: { x: 0, y: 0 }, // Position not used in linear mode
      nextNodeIds: [],
    };

    const newNodes = [...nodes];
    const idx = insertIndex ?? nodes.length;
    newNodes.splice(idx, 0, newNode);

    // Update connections: linear flow
    const updatedNodes = newNodes.map((n, i) => ({
      ...n,
      nextNodeIds: i < newNodes.length - 1 ? [newNodes[i + 1].tempId] : [],
    }));

    onNodesChange(updatedNodes);
  }, [nodes, onNodesChange]);

  const handleUpdateNode = useCallback((updatedNode: CanvasNode) => {
    onNodesChange(
      nodes.map((n) => (n.tempId === updatedNode.tempId ? updatedNode : n))
    );
  }, [nodes, onNodesChange]);

  const handleDeleteNode = useCallback((tempId: string) => {
    const newNodes = nodes.filter(n => n.tempId !== tempId);
    // Update connections
    const updatedNodes = newNodes.map((n, i) => ({
      ...n,
      nextNodeIds: i < newNodes.length - 1 ? [newNodes[i + 1].tempId] : [],
    }));
    onNodesChange(updatedNodes);
  }, [nodes, onNodesChange]);

  if (!nodeTypes) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <Zap className="h-8 w-8 mx-auto mb-2 opacity-50 animate-pulse" />
          <p className="text-sm">Loading workflow builder...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-xl mx-auto py-6 px-4">
        {/* Empty state - start with trigger */}
        {nodes.length === 0 && (
          <Card className="border-dashed border-2">
            <CardContent className="py-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
                  <Zap className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-1">Start building your workflow</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add a trigger to begin automating your inventory
                </p>
                <AddStepButton
                  nodeTypes={nodeTypes}
                  onAdd={(type) => handleAddNode(type, 0)}
                  existingTrigger={false}
                  position="start"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Workflow steps */}
        {nodes.length > 0 && (
          <div className="space-y-0">
            {nodes.map((node, index) => (
              <React.Fragment key={node.tempId}>
                {/* Add step button between nodes */}
                {index > 0 && (
                  <AddStepButton
                    nodeTypes={nodeTypes}
                    onAdd={(type) => handleAddNode(type, index)}
                    existingTrigger={hasTrigger}
                    position="middle"
                  />
                )}
                
                <WorkflowStep
                  node={node}
                  index={index}
                  nodeTypes={nodeTypes}
                  inventoryItems={inventoryItems}
                  onUpdate={handleUpdateNode}
                  onDelete={() => handleDeleteNode(node.tempId)}
                  isFirst={index === 0}
                  isLast={index === nodes.length - 1}
                />
              </React.Fragment>
            ))}

            {/* Add step at end */}
            <AddStepButton
              nodeTypes={nodeTypes}
              onAdd={(type) => handleAddNode(type)}
              existingTrigger={hasTrigger}
              position="end"
            />
          </div>
        )}
      </div>
    </div>
  );
}
