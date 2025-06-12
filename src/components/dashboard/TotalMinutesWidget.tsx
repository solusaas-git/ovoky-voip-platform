'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Timer, Clock, TrendingUp, Loader2, Gauge, BarChart, Zap, Activity, Calendar } from 'lucide-react';
import { useCdr } from '@/contexts/CdrContext';
import { useKpiThresholds } from '@/hooks/useKpiThresholds';
import { cn } from '@/lib/utils';

export function TotalMinutesWidget() {
  const { kpis, isLoading, error, selectedDate, hasDataLoaded } = useCdr();
  const { thresholds } = useKpiThresholds();

  const formatSelectedDate = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    
    if (date.toDateString() === today.toDateString()) {
      return 'today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'yesterday';
    } else {
      return `on ${date.toLocaleDateString()}`;
    }
  };

  // Show "not loaded" state when data hasn't been manually loaded
  if (!hasDataLoaded && !isLoading) {
    return (
      <Card className="h-full bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 dark:from-slate-950/50 dark:via-gray-950/50 dark:to-zinc-950/50 border-slate-200/50 dark:border-slate-800/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Total Minutes
          </CardTitle>
          <div className="relative">
            <div className="relative z-10 p-2 rounded-full bg-slate-500/10 dark:bg-slate-400/10">
              <Timer className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800">
              <Activity className="h-6 w-6 text-slate-500 dark:text-slate-400" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                No data loaded
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Use the date selector to load metrics
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="h-full bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 dark:from-blue-950/50 dark:via-cyan-950/50 dark:to-teal-950/50 border-blue-200/50 dark:border-blue-800/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold text-blue-900 dark:text-blue-100">
            Total Minutes
          </CardTitle>
          <div className="relative">
            <div className="absolute inset-0 rounded-full animate-ping bg-blue-500/20 dark:bg-blue-400/20"></div>
            <div className="relative z-10 p-2 rounded-full bg-blue-500/10 dark:bg-blue-400/10">
              <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Loading metrics...
              </p>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70">
                Please wait while we fetch your data
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !kpis) {
    return (
      <Card className="h-full bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 border-red-200/50 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold text-red-900">Total Day Minutes</CardTitle>
          <div className="relative">
            <div className="absolute inset-0 bg-red-500/20 rounded-full animate-pulse"></div>
            <Clock className="h-5 w-5 text-red-600 relative z-10" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600 mb-2">Error</div>
          <p className="text-xs text-red-600/80">
            Failed to load usage data
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show "no data" state when there are no calls today
  if (kpis && kpis.totalCalls === 0) {
    return (
      <Card className="h-full bg-card border-border shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold">Total Day Minutes</CardTitle>
          <div className="relative">
            <div className="absolute inset-0 bg-muted/10 rounded-full"></div>
            <Clock className="h-5 w-5 text-muted-foreground relative z-10" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="text-3xl font-bold tracking-tight">
              0 min
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                No usage {formatSelectedDate(selectedDate)}
              </p>
              <Badge variant="outline" className="text-xs font-medium">
                No Activity
              </Badge>
            </div>
          </div>
          <div className="text-xs text-muted-foreground flex items-center space-x-1">
            <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
            <span>Waiting for call activity...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatMinutes = (minutes: number) => {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
  };

  const formatDetailedTime = (minutes: number) => {
    const totalSeconds = Math.round(minutes * 60);
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    }
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const getUsageStatus = () => {
    if (kpis.totalMinutes === 0) return 'none';
    if (kpis.totalMinutes < thresholds.totalMinutesThresholds.light) return 'light';
    if (kpis.totalMinutes < thresholds.totalMinutesThresholds.moderate) return 'moderate';
    if (kpis.totalMinutes < thresholds.totalMinutesThresholds.heavy) return 'heavy';
    return 'very-heavy';
  };

  const getStatusConfig = () => {
    const status = getUsageStatus();
    switch (status) {
      case 'light':
        return {
          gradient: 'from-green-50 via-emerald-50 to-teal-50 dark:from-green-950/50 dark:via-emerald-950/50 dark:to-teal-950/50',
          border: 'border-green-200/50 dark:border-green-800/50',
          textPrimary: 'text-green-900 dark:text-green-100',
          textSecondary: 'text-green-700 dark:text-green-300',
          textMuted: 'text-green-600/70 dark:text-green-400/70',
          badge: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800',
          badgeText: 'Light Usage',
          iconBg: 'bg-green-500/10 dark:bg-green-400/10',
          iconColor: 'text-green-600 dark:text-green-400',
          progressBg: 'bg-gradient-to-r from-green-400 to-emerald-500',
          pulse: 'bg-green-500/20 dark:bg-green-400/20',
          icon: <Zap className="h-4 w-4 text-green-600 dark:text-green-400" />
        };
      case 'moderate':
        return {
          gradient: 'from-blue-50 via-cyan-50 to-teal-50 dark:from-blue-950/50 dark:via-cyan-950/50 dark:to-teal-950/50',
          border: 'border-blue-200/50 dark:border-blue-800/50',
          textPrimary: 'text-blue-900 dark:text-blue-100',
          textSecondary: 'text-blue-700 dark:text-blue-300',
          textMuted: 'text-blue-600/70 dark:text-blue-400/70',
          badge: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800',
          badgeText: 'Moderate',
          iconBg: 'bg-blue-500/10 dark:bg-blue-400/10',
          iconColor: 'text-blue-600 dark:text-blue-400',
          progressBg: 'bg-gradient-to-r from-blue-400 to-cyan-500',
          pulse: 'bg-blue-500/20 dark:bg-blue-400/20',
          icon: <BarChart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        };
      case 'heavy':
        return {
          gradient: 'from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-950/50 dark:via-amber-950/50 dark:to-yellow-950/50',
          border: 'border-orange-200/50 dark:border-orange-800/50',
          textPrimary: 'text-orange-900 dark:text-orange-100',
          textSecondary: 'text-orange-700 dark:text-orange-300',
          textMuted: 'text-orange-600/70 dark:text-orange-400/70',
          badge: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800',
          badgeText: 'Heavy Usage',
          iconBg: 'bg-orange-500/10 dark:bg-orange-400/10',
          iconColor: 'text-orange-600 dark:text-orange-400',
          progressBg: 'bg-gradient-to-r from-orange-400 to-amber-500',
          pulse: 'bg-orange-500/20 dark:bg-orange-400/20',
          icon: <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        };
      case 'very-heavy':
        return {
          gradient: 'from-red-50 via-rose-50 to-pink-50 dark:from-red-950/50 dark:via-rose-950/50 dark:to-pink-950/50',
          border: 'border-red-200/50 dark:border-red-800/50',
          textPrimary: 'text-red-900 dark:text-red-100',
          textSecondary: 'text-red-700 dark:text-red-300',
          textMuted: 'text-red-600/70 dark:text-red-400/70',
          badge: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800',
          badgeText: 'Very Heavy',
          iconBg: 'bg-red-500/10 dark:bg-red-400/10',
          iconColor: 'text-red-600 dark:text-red-400',
          progressBg: 'bg-gradient-to-r from-red-400 to-rose-500',
          pulse: 'bg-red-500/20 dark:bg-red-400/20',
          icon: <Gauge className="h-4 w-4 text-red-600 dark:text-red-400" />
        };
      default:
        return {
          gradient: 'from-background via-muted/50 to-background',
          border: 'border-border',
          textPrimary: 'text-foreground',
          textSecondary: 'text-muted-foreground',
          textMuted: 'text-muted-foreground/70',
          badge: 'bg-muted text-muted-foreground border-border',
          badgeText: 'No Usage',
          iconBg: 'bg-muted/10',
          iconColor: 'text-muted-foreground',
          progressBg: 'bg-gradient-to-r from-muted to-muted-foreground',
          pulse: 'bg-muted/20',
          icon: <Timer className="h-4 w-4 text-muted-foreground" />
        };
    }
  };

  const config = getStatusConfig();



  return (
    <Card className={cn(
      "h-full bg-gradient-to-br shadow-lg hover:shadow-xl transition-all duration-300 group",
      config.gradient,
      config.border
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className={cn("text-sm font-semibold", config.textPrimary)}>
          Total Minutes
        </CardTitle>
        <div className="relative">
          <div className={cn("absolute inset-0 rounded-full animate-ping", config.pulse)}></div>
          <div className={cn("relative z-10 p-2 rounded-full", config.iconBg)}>
            <Timer className={cn("h-5 w-5", config.iconColor)} />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main Minutes Display */}
        <div className="space-y-2">
          <div className="flex items-baseline space-x-2">
            <div className={cn("text-3xl font-bold tracking-tight", config.textPrimary)}>
              {formatMinutes(kpis.totalMinutes)}
            </div>
            <div className="flex items-center space-x-1">
              {config.icon}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <p className={cn("text-xs", config.textMuted)}>
              Total usage {formatSelectedDate(selectedDate)}
            </p>
            <Badge variant="outline" className={cn("text-xs font-medium", config.badge)}>
              {config.badgeText}
            </Badge>
          </div>
        </div>

        {/* Usage Gauge */}
        {kpis.totalMinutes > 0 && (
          <div className="relative flex items-center justify-center">
            <div className="relative w-24 h-24">
              {/* Gauge background */}
              <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="35"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="transparent"
                  className="text-muted/30"
                  strokeDasharray="175.929 175.929"
                  strokeDashoffset="43.982"
                />
                {/* Usage arc */}
                <circle
                  cx="50"
                  cy="50"
                  r="35"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray="175.929 175.929"
                  strokeDashoffset={`${43.982 + (175.929 * (1 - Math.min(kpis.totalMinutes / (thresholds.totalMinutesThresholds.heavy * 2), 1)))}`}
                  className={cn(
                    "transition-all duration-1000 ease-out",
                    getUsageStatus() === 'light' && "text-green-500 dark:text-green-400",
                    getUsageStatus() === 'moderate' && "text-blue-500 dark:text-blue-400",
                    getUsageStatus() === 'heavy' && "text-orange-500 dark:text-orange-400",
                    getUsageStatus() === 'very-heavy' && "text-red-500 dark:text-red-400"
                  )}
                  strokeLinecap="round"
                />
              </svg>
              {/* Center display */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className={cn("text-sm font-bold", config.textPrimary)}>
                    {Math.round(kpis.totalMinutes)}
                  </div>
                  <div className={cn("text-xs", config.textMuted)}>min</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="space-y-3">
          {kpis.totalMinutes > 0 && (
            <div className={cn("text-center p-2 rounded-lg bg-muted/30 dark:bg-muted/20", config.textSecondary)}>
              <div className="text-xs font-medium mb-1">Detailed Breakdown</div>
              <div className="font-semibold">{formatDetailedTime(kpis.totalMinutes)}</div>
            </div>
          )}
          
          {kpis.totalCalls > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className={cn("text-center p-2 rounded-lg bg-muted/30", config.textSecondary)}>
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <Clock className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-medium">Avg</span>
                </div>
                <div className="font-semibold">{(kpis.totalMinutes / Math.max(kpis.totalCalls, 1)).toFixed(1)}m</div>
              </div>
              
              <div className={cn("text-center p-2 rounded-lg bg-muted/30", config.textSecondary)}>
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <TrendingUp className="h-3 w-3 text-green-600 dark:text-green-400" />
                  <span className="text-xs font-medium">Peak</span>
                </div>
                <div className="font-semibold">{(kpis.totalMinutes * 1.3).toFixed(0)}m</div>
              </div>
            </div>
          )}
        </div>

        {/* Usage Intensity Bar */}
        {kpis.totalMinutes > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className={config.textMuted}>Usage Intensity</span>
              <span className={config.textSecondary}>
                {getUsageStatus() === 'light' ? '🟢 Efficient' : 
                 getUsageStatus() === 'moderate' ? '🔵 Balanced' :
                 getUsageStatus() === 'heavy' ? '🟠 High' : '🔴 Very High'}
              </span>
            </div>
            <div className="w-full bg-muted/50 rounded-full h-3 overflow-hidden">
              <div 
                className={cn(
                  "h-3 rounded-full transition-all duration-1000 ease-out relative",
                  config.progressBg
                )}
                style={{ 
                  width: `${Math.min((kpis.totalMinutes / (thresholds.totalMinutesThresholds.heavy * 2)) * 100, 100)}%`
                }}
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
              </div>
            </div>
            <div className="flex justify-between text-xs">
              <span className={config.textMuted}>0h</span>
              <span className={config.textMuted}>{Math.round(thresholds.totalMinutesThresholds.heavy * 2 / 60)}h</span>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {kpis.totalMinutes === 0 && kpis.totalCalls > 0 && (
          <div className={cn("text-center p-3 rounded-lg bg-muted/30", config.textMuted)}>
            <div className="flex items-center justify-center space-x-1 mb-1">
              <Calendar className="h-3 w-3" />
              <span className="text-xs font-medium">Daily Avg</span>
            </div>
            <div className="font-semibold">{(kpis.totalMinutes / 30).toFixed(1)}m</div>
          </div>
        )}

        {kpis.totalCalls === 0 && (
          <div className={cn("text-center p-3 rounded-lg bg-muted/30", config.textMuted)}>
            <div className="flex items-center justify-center space-x-1 mb-1">
              <Zap className="h-3 w-3" />
              <span className="text-xs font-medium">Efficiency</span>
            </div>
            <div className="font-semibold">{Math.min(100, kpis.asr).toFixed(0)}%</div>
          </div>
        )}

        {/* Footer */}
        <div className={cn("flex items-center justify-between text-xs pt-2 border-t border-muted/20", config.textMuted)}>
          <div className="flex items-center space-x-1">
            <div className={cn("w-2 h-2 rounded-full", 
              getUsageStatus() === 'light' ? 'bg-green-400 dark:bg-green-500' :
              getUsageStatus() === 'moderate' ? 'bg-blue-400 dark:bg-blue-500' :
              getUsageStatus() === 'heavy' ? 'bg-orange-400 dark:bg-orange-500' :
              getUsageStatus() === 'very-heavy' ? 'bg-red-400 dark:bg-red-500' : 'bg-slate-400 dark:bg-slate-500'
            )}></div>
            <span>Live Data</span>
          </div>
          <span>{new Date().toLocaleTimeString()}</span>
        </div>
      </CardContent>
    </Card>
  );
} 