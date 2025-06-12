'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Clock, Settings, Globe, Calendar, CheckCircle, Zap, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface SchedulerSettings {
  enabled: boolean;
  checkInterval: number; // in minutes
  timezone: string;
  lastCheck?: string;
  nextCheck?: string;
  createdAt: string;
  updatedAt: string;
}

interface TimeOption {
  value: number; // in minutes
  label: string;
  description: string;
}

const TIME_OPTIONS: TimeOption[] = [
  { value: 30, label: '30 minutes', description: 'Very frequent checks' },
  { value: 60, label: '1 hour', description: 'Frequent checks' },
  { value: 120, label: '2 hours', description: 'Regular checks' },
  { value: 180, label: '3 hours', description: 'Regular checks' },
  { value: 240, label: '4 hours', description: 'Standard checks' },
  { value: 360, label: '6 hours', description: 'Recommended for most users' },
  { value: 480, label: '8 hours', description: 'Standard checks' },
  { value: 720, label: '12 hours', description: 'Twice daily' },
  { value: 1440, label: '24 hours', description: 'Daily checks' },
  { value: 2880, label: '48 hours', description: 'Every 2 days' },
];

const TIMEZONE_OPTIONS = [
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  { value: 'Europe/Madrid', label: 'Madrid (CET/CEST)' },
  { value: 'Europe/Rome', label: 'Rome (CET/CEST)' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam (CET/CEST)' },
  { value: 'America/New_York', label: 'New York (EST/EDT)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
  { value: 'America/Chicago', label: 'Chicago (CST/CDT)' },
  { value: 'America/Toronto', label: 'Toronto (EST/EDT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'Mumbai (IST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
];

export function SchedulerSettings() {
  const [settings, setSettings] = useState<SchedulerSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTriggeringCheck, setIsTriggeringCheck] = useState(false);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings/scheduler');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else {
        toast.error('Failed to fetch scheduler settings');
      }
    } catch (error) {
      console.error('Error fetching scheduler settings:', error);
      toast.error('Failed to fetch scheduler settings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (!settings) return;

    try {
      setIsSaving(true);
      const response = await fetch('/api/settings/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: settings.enabled,
          checkInterval: settings.checkInterval,
          timezone: settings.timezone,
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        toast.success(result.message || 'Settings saved successfully');
        await fetchSettings(); // Refresh settings
      } else {
        toast.error(result.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerCheck = async () => {
    try {
      setIsTriggeringCheck(true);
      toast.info('Starting manual balance check...');
      
      const response = await fetch('/api/admin/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'trigger_check'
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        toast.success(result.message || 'Balance check completed successfully');
        
        // Refresh settings to update last check time after a short delay
        setTimeout(async () => {
          await fetchSettings();
          toast.info('Status information refreshed');
        }, 2000);
      } else {
        toast.error(result.error || 'Failed to trigger balance check');
        console.error('Trigger check error:', result);
      }
    } catch (error) {
      console.error('Error triggering balance check:', error);
      toast.error('Failed to trigger balance check - check console for details');
    } finally {
      setIsTriggeringCheck(false);
    }
  };

  const updateSetting = (key: keyof SchedulerSettings, value: boolean | number | string) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  const getSelectedTimeOption = () => {
    return TIME_OPTIONS.find(option => option.value === settings?.checkInterval) || TIME_OPTIONS[5]; // Default to 6 hours
  };

  const getSelectedTimezone = () => {
    return TIMEZONE_OPTIONS.find(tz => tz.value === settings?.timezone) || TIMEZONE_OPTIONS[0]; // Default to London
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2">Loading scheduler settings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Failed to load scheduler settings
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Automatic Balance Checking</span>
          </CardTitle>
          <CardDescription>
            Configure when and how often the system checks user balances for notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Enable Automatic Checks</Label>
              <p className="text-sm text-muted-foreground">
                Turn on to automatically monitor user balances and send notifications
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={settings.enabled}
                onCheckedChange={(checked) => updateSetting('enabled', checked)}
              />
              <Badge variant={settings.enabled ? 'default' : 'secondary'}>
                {settings.enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Check Interval */}
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-base font-medium">Check Frequency</Label>
              <p className="text-sm text-muted-foreground">
                How often should the system check all user balances
              </p>
            </div>
            
            <Select
              value={settings.checkInterval.toString()}
              onValueChange={(value) => updateSetting('checkInterval', parseInt(value))}
              disabled={!settings.enabled}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  <div className="flex items-center justify-between w-full">
                    <span>{getSelectedTimeOption().label}</span>
                    <span className="text-muted-foreground text-sm">{getSelectedTimeOption().description}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    <div className="flex items-center justify-between w-full">
                      <span>{option.label}</span>
                      <span className="text-muted-foreground text-sm ml-4">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Timezone */}
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-base font-medium flex items-center space-x-2">
                <Globe className="h-4 w-4" />
                <span>Timezone</span>
              </Label>
              <p className="text-sm text-muted-foreground">
                The timezone used for scheduling balance checks
              </p>
            </div>
            
            <Select
              value={settings.timezone}
              onValueChange={(value) => updateSetting('timezone', value)}
              disabled={!settings.enabled}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {getSelectedTimezone().label}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {TIMEZONE_OPTIONS.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Status Information */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Status Information</span>
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchSettings}
                disabled={isLoading}
                className="flex items-center space-x-1"
              >
                <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-sm">Last Check</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDateTime(settings.lastCheck)}
                </p>
              </div>
              
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-2 mb-1">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-sm">Next Check</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {settings.enabled ? formatDateTime(settings.nextCheck) : 'Disabled'}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-end">
            <Button 
              onClick={handleTriggerCheck} 
              disabled={isTriggeringCheck || !settings.enabled}
              variant="outline"
              className="flex items-center space-x-2"
            >
              {isTriggeringCheck ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  <span>Check Now</span>
                </>
              )}
            </Button>
            
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="flex items-center space-x-2"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Settings className="h-4 w-4" />
                  <span>Save Settings</span>
                </>
              )}
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <p className="font-medium mb-1">💡 Quick Actions:</p>
            <ul className="space-y-1 text-xs">
              <li><strong>Check Now:</strong> Manually trigger a balance check for all users (only available when scheduler is enabled)</li>
              <li><strong>Save Settings:</strong> Apply new schedule and timezone settings to the automatic scheduler</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 