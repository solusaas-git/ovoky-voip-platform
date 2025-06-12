'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Info, Palette, Grid3X3, Timer, LockIcon, Eye } from 'lucide-react';

interface WidgetSettingsModalProps {
  id: string;
  title: string;
  enabled?: boolean;
  collapsible?: boolean;
  locked?: boolean;
  alwaysVisible?: boolean;
  gridCols?: number;
  gridRows?: number;
  category?: string;
  aspectRatio?: 'auto' | 'square' | 'wide' | 'tall';
  refreshInterval?: number;
  priority?: number;
  showTitle?: boolean;
  totalGridColumns?: number;
  onToggleEnabled?: (enabled: boolean) => void;
  onToggleLock?: (locked: boolean) => void;
  onGridColsChange?: (gridCols: number) => void;
  onGridRowsChange?: (gridRows: number) => void;
  onToggleCollapsible?: (collapsible: boolean) => void;
  onUpdateCategory?: (category: string) => void;
  onUpdateAspectRatio?: (aspectRatio: 'auto' | 'square' | 'wide' | 'tall') => void;
  onUpdateRefreshInterval?: (interval: number) => void;
  onUpdatePriority?: (priority: number) => void;
  onToggleShowTitle?: (showTitle: boolean) => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function WidgetSettingsModal({
  id,
  title,
  enabled = true,
  collapsible = true,
  locked = false,
  alwaysVisible = false,
  gridCols = 3,
  gridRows = 1,
  category = 'general',
  aspectRatio = 'auto',
  refreshInterval = 0,
  priority = 5,
  showTitle = true,
  totalGridColumns = 12,
  onToggleEnabled,
  onToggleLock,
  onGridColsChange,
  onGridRowsChange,
  onToggleCollapsible,
  onUpdateCategory,
  onUpdateAspectRatio,
  onUpdateRefreshInterval,
  onUpdatePriority,
  onToggleShowTitle,
  trigger,
  open,
  onOpenChange,
}: WidgetSettingsModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen);
    } else {
      setIsOpen(newOpen);
    }
  };

  const formatRefreshTime = (seconds: number) => {
    if (seconds === 0) return 'Disabled';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 8) return 'Critical';
    if (priority >= 6) return 'High';
    if (priority >= 4) return 'Medium';
    if (priority >= 2) return 'Low';
    return 'Minimal';
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return 'text-red-500';
    if (priority >= 6) return 'text-orange-500';
    if (priority >= 4) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <Dialog open={open !== undefined ? open : isOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Widget Settings</span>
            <Badge variant="outline" className="text-xs">{title}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Status Overview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center space-x-2">
                <Info className="h-4 w-4" />
                <span>Current Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center justify-between">
                  <span>Visibility:</span>
                  <Badge variant={enabled ? 'default' : 'secondary'}>
                    {enabled ? 'Visible' : 'Hidden'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Size:</span>
                  <Badge variant="outline">{gridCols}×{gridRows}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Category:</span>
                  <Badge variant="outline" className="capitalize">{category}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Priority:</span>
                  <Badge variant="outline" className={getPriorityColor(priority)}>
                    {getPriorityLabel(priority)} ({priority})
                  </Badge>
                </div>
              </div>
              
              {/* Status Indicators */}
              <div className="flex flex-wrap gap-2 mt-3">
                {alwaysVisible && (
                  <Badge variant="destructive" className="text-xs">
                    <LockIcon className="h-3 w-3 mr-1" />
                    Critical Widget
                  </Badge>
                )}
                {locked && (
                  <Badge variant="outline" className="text-xs text-yellow-600">
                    <LockIcon className="h-3 w-3 mr-1" />
                    Locked
                  </Badge>
                )}
                {!collapsible && (
                  <Badge variant="outline" className="text-xs text-orange-600">
                    No Collapse
                  </Badge>
                )}
                {refreshInterval > 0 && (
                  <Badge variant="outline" className="text-xs text-green-600">
                    <Timer className="h-3 w-3 mr-1" />
                    Auto-refresh
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Visibility & Behavior */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center space-x-2">
                <Eye className="h-4 w-4" />
                <span>Visibility & Behavior</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Widget Enabled</Label>
                    <p className="text-xs text-muted-foreground">Show or hide this widget on the dashboard</p>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={onToggleEnabled}
                    disabled={alwaysVisible}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Show Title</Label>
                    <p className="text-xs text-muted-foreground">Display the widget title header</p>
                  </div>
                  <Switch
                    checked={showTitle}
                    onCheckedChange={onToggleShowTitle}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Allow Collapsing</Label>
                    <p className="text-xs text-muted-foreground">Users can collapse this widget</p>
                  </div>
                  <Switch
                    checked={collapsible}
                    onCheckedChange={onToggleCollapsible}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Lock Widget</Label>
                    <p className="text-xs text-muted-foreground">Prevent moving or resizing</p>
                  </div>
                  <Switch
                    checked={locked}
                    onCheckedChange={onToggleLock}
                  />
                </div>

                {alwaysVisible && (
                  <div className="col-span-1 md:col-span-2">
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center space-x-2 text-sm text-blue-800 dark:text-blue-200">
                        <Info className="h-4 w-4" />
                        <span>This is a critical widget that cannot be hidden.</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Layout & Sizing */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center space-x-2">
                <Grid3X3 className="h-4 w-4" />
                <span>Layout & Sizing</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Width Control */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Width (Columns)</Label>
                    <Badge variant="outline" className="text-xs">
                      {gridCols} of {totalGridColumns}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <Slider
                      value={[gridCols]}
                      onValueChange={(value: number[]) => onGridColsChange?.(value[0])}
                      min={1}
                      max={totalGridColumns}
                      step={1}
                      className="w-full"
                      disabled={locked}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>1 col</span>
                      <span>{totalGridColumns} cols</span>
                    </div>
                  </div>
                </div>

                {/* Height Control */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Height (Rows)</Label>
                    <Badge variant="outline" className="text-xs">
                      {gridRows} row{gridRows !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <Slider
                      value={[gridRows]}
                      onValueChange={(value: number[]) => onGridRowsChange?.(value[0])}
                      min={1}
                      max={6}
                      step={1}
                      className="w-full"
                      disabled={locked}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>1 row</span>
                      <span>6 rows</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Aspect Ratio */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Aspect Ratio</Label>
                <Select value={aspectRatio} onValueChange={onUpdateAspectRatio}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (Content-based)</SelectItem>
                    <SelectItem value="square">Square (1:1)</SelectItem>
                    <SelectItem value="wide">Wide (2:1)</SelectItem>
                    <SelectItem value="tall">Tall (1:2)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Category & Priority */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center space-x-2">
                <Palette className="h-4 w-4" />
                <span>Category & Priority</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Category</Label>
                  <Select value={category} onValueChange={onUpdateCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="overview">Overview</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="metrics">Metrics</SelectItem>
                      <SelectItem value="analytics">Analytics</SelectItem>
                      <SelectItem value="reports">Reports</SelectItem>
                      <SelectItem value="settings">Settings</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Priority</Label>
                    <Badge variant="outline" className={`text-xs ${getPriorityColor(priority)}`}>
                      {getPriorityLabel(priority)} ({priority})
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <Slider
                      value={[priority]}
                      onValueChange={(value: number[]) => onUpdatePriority?.(value[0])}
                      min={0}
                      max={10}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Low (0)</span>
                      <span>High (10)</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Auto-Refresh */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center space-x-2">
                <Timer className="h-4 w-4" />
                <span>Auto-Refresh Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Refresh Interval</Label>
                  <Badge variant="outline" className="text-xs">
                    {formatRefreshTime(refreshInterval)}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Slider
                    value={[refreshInterval]}
                    onValueChange={(value: number[]) => onUpdateRefreshInterval?.(value[0])}
                    min={0}
                    max={3600}
                    step={60}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Disabled</span>
                    <span>1 hour</span>
                  </div>
                </div>
                {refreshInterval > 0 && (
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center space-x-2 text-sm text-green-800 dark:text-green-200">
                      <Timer className="h-4 w-4" />
                      <span>Widget will auto-refresh every {formatRefreshTime(refreshInterval)}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Live Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 border rounded-lg bg-muted/50">
                <div className="text-sm space-y-2">
                  <div className="font-medium">Widget: {title}</div>
                  <div className="text-muted-foreground">
                    Size: {gridCols}×{gridRows} • Category: {category} • Priority: {priority}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {enabled && <Badge variant="default" className="text-xs">Visible</Badge>}
                    {!enabled && <Badge variant="secondary" className="text-xs">Hidden</Badge>}
                    {showTitle && <Badge variant="outline" className="text-xs">Title Shown</Badge>}
                    {!showTitle && <Badge variant="outline" className="text-xs text-orange-600">Title Hidden</Badge>}
                    {collapsible && <Badge variant="outline" className="text-xs">Collapsible</Badge>}
                    {locked && <Badge variant="outline" className="text-xs text-yellow-600">Locked</Badge>}
                    {refreshInterval > 0 && <Badge variant="outline" className="text-xs text-green-600">Auto-refresh</Badge>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
} 