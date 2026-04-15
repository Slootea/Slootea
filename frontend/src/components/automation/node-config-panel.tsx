"use client";

import React from "react";
import { AutomationNodeType, NodeTypesResponse, InventoryItem } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  AlertTriangle, PackageX, ArrowDownUp, Hand, 
  GitBranch, Tag, Globe, Webhook, Bell, Package,
  X, Plus, Trash2
} from "lucide-react";

interface CanvasNode {
  tempId: string;
  type: AutomationNodeType;
  label?: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
  nextNodeIds: string[];
}

interface NodeConfigPanelProps {
  node: CanvasNode;
  nodeTypes: NodeTypesResponse | null;
  inventoryItems: InventoryItem[];
  allNodes: CanvasNode[];
  onNodeUpdate: (node: CanvasNode) => void;
  onClose: () => void;
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

function getNodeInfo(type: AutomationNodeType, nodeTypes: NodeTypesResponse | null) {
  if (!nodeTypes) return null;
  const allTypes = [...nodeTypes.triggers, ...nodeTypes.conditions, ...nodeTypes.actions];
  return allTypes.find(t => t.type === type);
}

export function NodeConfigPanel({
  node,
  nodeTypes,
  inventoryItems,
  allNodes,
  onNodeUpdate,
  onClose,
}: NodeConfigPanelProps) {
  const nodeInfo = getNodeInfo(node.type, nodeTypes);
  const Icon = NODE_ICONS[node.type];
  
  const updateConfig = (key: string, value: unknown) => {
    onNodeUpdate({
      ...node,
      config: { ...node.config, [key]: value },
    });
  };

  const updateLabel = (label: string) => {
    onNodeUpdate({ ...node, label });
  };

  const updateNextNodes = (nextNodeIds: string[]) => {
    onNodeUpdate({ ...node, nextNodeIds });
  };

  // Get nodes that can be connected to (excluding self and nodes that would create cycles)
  const connectableNodes = allNodes.filter(n => n.tempId !== node.tempId);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            <CardTitle className="text-lg">{nodeInfo?.label || node.type}</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        {nodeInfo && (
          <CardDescription>{nodeInfo.description}</CardDescription>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 overflow-auto space-y-6">
        {/* Label */}
        <div className="space-y-2">
          <Label htmlFor="node-label">Node Label</Label>
          <Input
            id="node-label"
            value={node.label || ''}
            onChange={(e) => updateLabel(e.target.value)}
            placeholder={nodeInfo?.label || 'Enter label'}
          />
        </div>

        {/* Type-specific configuration */}
        {renderConfigFields()}

        {/* Connections */}
        <div className="space-y-2">
          <Label>Connect to</Label>
          <div className="space-y-2">
            {connectableNodes.length > 0 ? (
              connectableNodes.map(targetNode => (
                <div key={targetNode.tempId} className="flex items-center space-x-2">
                  <Checkbox
                    id={`connect-${targetNode.tempId}`}
                    checked={node.nextNodeIds.includes(targetNode.tempId)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        updateNextNodes([...node.nextNodeIds, targetNode.tempId]);
                      } else {
                        updateNextNodes(node.nextNodeIds.filter(id => id !== targetNode.tempId));
                      }
                    }}
                  />
                  <label
                    htmlFor={`connect-${targetNode.tempId}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {targetNode.label || nodeInfo?.label || targetNode.type}
                  </label>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No other nodes to connect to</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  function renderConfigFields() {
    switch (node.type) {
      case 'trigger_stock_critical':
      case 'trigger_stock_out':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Filter by Items (optional)</Label>
              <p className="text-xs text-muted-foreground">Leave empty to trigger for all items</p>
              <div className="space-y-2 max-h-40 overflow-auto border rounded-md p-2">
                {inventoryItems.map(item => (
                  <div key={item.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`item-${item.id}`}
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
                    <label htmlFor={`item-${item.id}`} className="text-sm">{item.name}</label>
                  </div>
                ))}
              </div>
            </div>
            {node.type === 'trigger_stock_critical' && (
              <div className="space-y-2">
                <Label htmlFor="threshold">Custom Threshold (optional)</Label>
                <Input
                  id="threshold"
                  type="number"
                  value={(node.config.threshold as number) || ''}
                  onChange={(e) => updateConfig('threshold', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="Use item's min stock alert"
                />
              </div>
            )}
          </div>
        );

      case 'trigger_stock_adjusted':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Filter by Items (optional)</Label>
              <div className="space-y-2 max-h-40 overflow-auto border rounded-md p-2">
                {inventoryItems.map(item => (
                  <div key={item.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`item-${item.id}`}
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
                    <label htmlFor={`item-${item.id}`} className="text-sm">{item.name}</label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Adjustment Types</Label>
              <div className="space-y-2">
                {['manual', 'purchase', 'correction', 'service_usage'].map(type => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={`adj-type-${type}`}
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
                    <label htmlFor={`adj-type-${type}`} className="text-sm capitalize">{type.replace('_', ' ')}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'condition_stock_level':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cond-item">Inventory Item</Label>
              <Select
                value={(node.config.inventoryItemId as string) || ''}
                onValueChange={(value) => updateConfig('inventoryItemId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent>
                  {inventoryItems.map(item => (
                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="operator">Operator</Label>
              <Select
                value={(node.config.operator as string) || ''}
                onValueChange={(value) => updateConfig('operator', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select operator" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lt">Less than (&lt;)</SelectItem>
                  <SelectItem value="lte">Less than or equal (≤)</SelectItem>
                  <SelectItem value="eq">Equal (=)</SelectItem>
                  <SelectItem value="gte">Greater than or equal (≥)</SelectItem>
                  <SelectItem value="gt">Greater than (&gt;)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cond-value">Value</Label>
              <Input
                id="cond-value"
                type="number"
                value={(node.config.value as number) || ''}
                onChange={(e) => updateConfig('value', Number(e.target.value))}
                placeholder="Enter value"
              />
            </div>
          </div>
        );

      case 'condition_item_category':
        return (
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={(node.config.category as string) || ''}
              onValueChange={(value) => updateConfig('category', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="consumable">Consumable</SelectItem>
                <SelectItem value="retail">Retail</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      case 'action_api_call':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-url">URL</Label>
              <Input
                id="api-url"
                value={(node.config.url as string) || ''}
                onChange={(e) => updateConfig('url', e.target.value)}
                placeholder="https://api.example.com/endpoint"
              />
              <p className="text-xs text-muted-foreground">
                Use {'{{variable}}'} for interpolation (e.g., {'{{inventoryItemName}}'})
              </p>
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Select
                value={(node.config.method as string) || 'POST'}
                onValueChange={(value) => updateConfig('method', value)}
              >
                <SelectTrigger>
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
              <Label htmlFor="api-body">Body (JSON)</Label>
              <Textarea
                id="api-body"
                value={(node.config.body as string) || ''}
                onChange={(e) => updateConfig('body', e.target.value)}
                placeholder='{"item": "{{inventoryItemName}}", "stock": {{currentStock}}}'
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="api-timeout">Timeout (ms)</Label>
              <Input
                id="api-timeout"
                type="number"
                value={(node.config.timeout as number) || ''}
                onChange={(e) => updateConfig('timeout', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="30000"
              />
            </div>
          </div>
        );

      case 'action_webhook':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <Input
                id="webhook-url"
                value={(node.config.url as string) || ''}
                onChange={(e) => updateConfig('url', e.target.value)}
                placeholder="https://webhook.example.com/receive"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhook-secret">Secret (optional)</Label>
              <Input
                id="webhook-secret"
                type="password"
                value={(node.config.secret as string) || ''}
                onChange={(e) => updateConfig('secret', e.target.value)}
                placeholder="HMAC signing secret"
              />
              <p className="text-xs text-muted-foreground">
                If provided, webhook will include X-Webhook-Signature header
              </p>
            </div>
          </div>
        );

      case 'action_notification':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select
                value={(node.config.channel as string) || ''}
                onValueChange={(value) => updateConfig('channel', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipients">Recipients</Label>
              <Textarea
                id="recipients"
                value={((node.config.recipients as string[]) || []).join('\n')}
                onChange={(e) => updateConfig('recipients', e.target.value.split('\n').filter(Boolean))}
                placeholder="Enter one recipient per line"
                rows={3}
              />
            </div>
            {(node.config.channel as string) === 'email' && (
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={(node.config.subject as string) || ''}
                  onChange={(e) => updateConfig('subject', e.target.value)}
                  placeholder="Low Stock Alert: {{inventoryItemName}}"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={(node.config.message as string) || ''}
                onChange={(e) => updateConfig('message', e.target.value)}
                placeholder="Stock for {{inventoryItemName}} is low ({{currentStock}} remaining)"
                rows={4}
              />
            </div>
          </div>
        );

      case 'action_adjust_stock':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Inventory Item</Label>
              <Select
                value={(node.config.inventoryItemId as string) || ''}
                onValueChange={(value) => updateConfig('inventoryItemId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent>
                  {inventoryItems.map(item => (
                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adj-quantity">Quantity</Label>
              <Input
                id="adj-quantity"
                type="number"
                value={(node.config.quantity as number) || ''}
                onChange={(e) => updateConfig('quantity', Number(e.target.value))}
                placeholder="Enter quantity (positive or negative)"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={(node.config.type as string) || ''}
                onValueChange={(value) => updateConfig('type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="purchase">Purchase</SelectItem>
                  <SelectItem value="correction">Correction</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adj-reason">Reason (optional)</Label>
              <Input
                id="adj-reason"
                value={(node.config.reason as string) || ''}
                onChange={(e) => updateConfig('reason', e.target.value)}
                placeholder="Automated adjustment"
              />
            </div>
          </div>
        );

      case 'trigger_manual':
      default:
        return (
          <p className="text-sm text-muted-foreground">
            No additional configuration required.
          </p>
        );
    }
  }
}
