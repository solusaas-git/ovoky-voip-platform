'use client';

/*
 * ActiveCalls Component - Color Usage Philosophy:
 * 
 * - Brand colors (colors.primary, colors.secondary, colors.accent): Used for icons, backgrounds, and accents
 * - Theme-aware text colors (.text-brand, .text-foreground): Used for main content text for readability
 * - Tailwind semantic colors (.text-muted-foreground): Used for secondary text
 * 
 * This ensures brand identity is maintained while text remains readable in both light and dark modes.
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  RefreshCw, 
  PhoneOff, 
  Phone, 
  PhoneCall,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity,
  Timer,
  Globe,
  MapPin,
  Zap,
  TrendingUp,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/lib/AuthContext';
import { useBranding } from '@/hooks/useBranding';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Helper function to parse Sippy's SETUP_TIME date format
// Format: "20210822T10:11:52.000"
function parseSippyDate(sippyDateString: string): Date | null {
  if (!sippyDateString) return null;
  
  try {
    // Sippy SETUP_TIME format: "YYYYMMDDTHH:MM:SS.000"
    // Example: "20210822T10:11:52.000"
    
    // Check if it's the SETUP_TIME format
    if (sippyDateString.includes('T') && sippyDateString.length >= 18) {
      // Remove milliseconds and parse as ISO-like format
      const withoutMs = sippyDateString.split('.')[0]; // "20210822T10:11:52"
      
      // Insert dashes and colons to make it a proper ISO string
      // "20210822T10:11:52" -> "2021-08-22T10:11:52"
      const year = withoutMs.substring(0, 4);
      const month = withoutMs.substring(4, 6);
      const day = withoutMs.substring(6, 8);
      const time = withoutMs.substring(9); // "10:11:52"
      
      const isoString = `${year}-${month}-${day}T${time}Z`;
      console.log('Parsing SETUP_TIME:', sippyDateString, '->', isoString);
      
      return new Date(isoString);
    }
    
    // Fallback: try GMT format for other date fields
    // Format: "HH:MM:SS.000 GMT Day Mon DD YYYY"
    const parts = sippyDateString.split(' ');
    if (parts.length >= 6) {
      const time = parts[0]; // "22:43:01.000"
      const monthName = parts[3]; // "May"
      const day = parts[4]; // "22"
      const year = parts[5]; // "2025"
      
      // Convert month name to number
      const months: Record<string, string> = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
        'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
        'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
      };
      
      const month = months[monthName];
      if (!month) {
        console.error('Unknown month:', monthName);
        return null;
      }
      
      // Remove milliseconds from time and create ISO string
      const timeWithoutMs = time.split('.')[0]; // "22:43:01"
      const isoString = `${year}-${month}-${day.padStart(2, '0')}T${timeWithoutMs}Z`;
      
      return new Date(isoString);
    }
    
    console.error('Unrecognized date format:', sippyDateString);
    return null;
  } catch (e) {
    console.error('Error parsing Sippy date:', sippyDateString, e);
    return null;
  }
}

interface ActiveCall {
  CLI: string;
  CLD: string;
  CALL_ID: string;
  DELAY: number;
  DURATION: number;
  CC_STATE: string;
  I_ACCOUNT: number;
  ID: string;
  I_CUSTOMER: string;
  I_ENVIRONMENT: string;
  CALLER_MEDIA_IP: string;
  CALLEE_MEDIA_IP: string;
  SETUP_TIME: string;
  DIRECTION: string;
  NODE_ID?: string;
  I_CONNECTION: number;
}

interface CallStats {
  total: number;
  connected: number;
  arComplete: number;
  waitRoute: number;
  waitAuth: number;
  idle: number;
  disconnecting: number;
  dead: number;
  avgDuration: number;
  avgDelay: number;
}

interface ActiveCallsProps {
  accountId?: number;
}

// Call state configuration with colors and icons
const CALL_STATES = {
  'Connected': { 
    label: 'Connected', 
    color: 'text-green-600 dark:text-green-400', 
    bgColor: 'bg-green-50 dark:bg-green-950/50', 
    borderColor: 'border-green-200 dark:border-green-800',
    icon: CheckCircle,
    description: 'Call is active and in progress'
  },
  'ARComplete': { 
    label: 'Connecting', 
    color: 'text-blue-600 dark:text-blue-400', 
    bgColor: 'bg-blue-50 dark:bg-blue-950/50', 
    borderColor: 'border-blue-200 dark:border-blue-800',
    icon: PhoneCall,
    description: 'Authentication and routing complete, establishing connection'
  },
  'WaitRoute': { 
    label: 'Routing', 
    color: 'text-amber-600 dark:text-amber-400', 
    bgColor: 'bg-amber-50 dark:bg-amber-950/50', 
    borderColor: 'border-amber-200 dark:border-amber-800',
    icon: Clock,
    description: 'Waiting for routing information'
  },
  'WaitAuth': { 
    label: 'Authenticating', 
    color: 'text-purple-600 dark:text-purple-400', 
    bgColor: 'bg-purple-50 dark:bg-purple-950/50', 
    borderColor: 'border-purple-200 dark:border-purple-800',
    icon: AlertCircle,
    description: 'Authentication in progress'
  },
  'Idle': { 
    label: 'Idle', 
    color: 'text-gray-600 dark:text-gray-400', 
    bgColor: 'bg-gray-50 dark:bg-gray-950/50', 
    borderColor: 'border-gray-200 dark:border-gray-800',
    icon: Timer,
    description: 'Call received, processing started'
  },
  'Disconnecting': { 
    label: 'Disconnecting', 
    color: 'text-orange-600 dark:text-orange-400', 
    bgColor: 'bg-orange-50 dark:bg-orange-950/50', 
    borderColor: 'border-orange-200 dark:border-orange-800',
    icon: PhoneOff,
    description: 'Call is being disconnected'
  },
  'Dead': { 
    label: 'Ended', 
    color: 'text-red-600 dark:text-red-400', 
    bgColor: 'bg-red-50 dark:bg-red-950/50', 
    borderColor: 'border-red-200 dark:border-red-800',
    icon: XCircle,
    description: 'Call disconnected, waiting for cleanup'
  }
};

export function ActiveCalls({ accountId }: ActiveCallsProps) {
  const { user } = useAuth();
  const { colors, getGradientStyle, features } = useBranding();
  const [calls, setCalls] = useState<ActiveCall[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const targetAccountId = accountId || user?.sippyAccountId;

  // Calculate call statistics
  const calculateStats = (calls: ActiveCall[]): CallStats => {
    const stats: CallStats = {
      total: calls.length,
      connected: 0,
      arComplete: 0,
      waitRoute: 0,
      waitAuth: 0,
      idle: 0,
      disconnecting: 0,
      dead: 0,
      avgDuration: 0,
      avgDelay: 0
    };

    if (calls.length === 0) return stats;

    let totalDuration = 0;
    let totalDelay = 0;

    calls.forEach(call => {
      const state = call.CC_STATE?.toLowerCase();
      
      switch (state) {
        case 'connected':
          stats.connected++;
          break;
        case 'arcomplete':
          stats.arComplete++;
          break;
        case 'waitroute':
          stats.waitRoute++;
          break;
        case 'waitauth':
          stats.waitAuth++;
          break;
        case 'idle':
          stats.idle++;
          break;
        case 'disconnecting':
          stats.disconnecting++;
          break;
        case 'dead':
          stats.dead++;
          break;
      }

      totalDuration += call.DURATION || 0;
      totalDelay += call.DELAY || 0;
    });

    stats.avgDuration = totalDuration / calls.length;
    stats.avgDelay = totalDelay / calls.length;

    return stats;
  };

  const stats = calculateStats(calls);

  const fetchActiveCalls = useCallback(async () => {
    if (!targetAccountId) {
      setError('No account ID available');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const apiUrl = `/api/sippy/account/${targetAccountId}/calls/active`;
      
      // Add timeout to the fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(apiUrl, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch active calls`);
      }

      const data = await response.json();
      setCalls(data.calls || []);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error fetching active calls:', err);
      
      let errorMessage = 'Failed to fetch active calls';
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorMessage = 'Request timed out. Please try again.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [targetAccountId]);

  const disconnectCall = async (callId: string) => {
    if (!callId) {
      toast.error('Invalid call ID');
      return;
    }

    try {
      const response = await fetch(`/api/sippy/calls/${callId}/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to disconnect call`);
      }

      await response.json();
      
      toast.success('Call disconnected successfully');
      
      // Refresh the calls list after a short delay to allow the disconnect to process
      setTimeout(() => {
        fetchActiveCalls();
      }, 1000);
    } catch (err) {
      console.error('Error disconnecting call:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect call';
      toast.error(errorMessage);
    }
  };

  const disconnectAllCalls = async () => {
    if (!targetAccountId) return;

    try {
      const response = await fetch(`/api/sippy/calls/account/${targetAccountId}/disconnect`, {
        method: 'POST'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to disconnect all calls');
      }

      toast.success('All calls disconnected successfully');
      fetchActiveCalls();
    } catch (err) {
      console.error('Error disconnecting all calls:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect all calls';
      toast.error(errorMessage);
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getCallStateInfo = (state: string) => {
    return CALL_STATES[state as keyof typeof CALL_STATES] || {
      label: state,
      color: 'text-gray-600 dark:text-gray-400',
      bgColor: 'bg-gray-50 dark:bg-gray-950/50',
      borderColor: 'border-gray-200 dark:border-gray-800',
      icon: Activity,
      description: 'Unknown state'
    };
  };

  useEffect(() => {
    fetchActiveCalls();
    const interval = setInterval(fetchActiveCalls, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [fetchActiveCalls]);

  if (isLoading && calls.length === 0) {
    return (
      <div 
        className="min-h-[400px] flex items-center justify-center text-foreground"
        style={features.gradientBackground ? getGradientStyle() : {}}
      >
        <div className="text-center space-y-4">
          <div 
            className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}
          >
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Loading Active Calls
            </h3>
            <p className="text-muted-foreground">Fetching real-time call data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-950/50 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <CardTitle className="text-destructive">Error Loading Active Calls</CardTitle>
              <CardDescription>There was an error loading the active calls data</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive mb-4">{error}</p>
          <Button 
            variant="outline" 
            onClick={fetchActiveCalls}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!user?.sippyAccountId && !accountId) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-950/50 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <CardTitle className="text-destructive">No Sippy Account ID</CardTitle>
              <CardDescription>Your user account doesn&apos;t have a Sippy Account ID configured.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            Please contact an administrator to set up your Sippy account.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 text-foreground">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div 
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
              style={{ backgroundColor: `${colors.primary}20` }}
            >
              <Activity className="h-4 w-4" style={{ color: colors.primary }} />
              <span className="text-brand">Real-time Monitoring</span>
            </div>
          </div>
          <p className="text-muted-foreground">
            {stats.total} active call{stats.total !== 1 ? 's' : ''} for account {targetAccountId}
            {lastRefresh && (
              <span className="ml-2">
                • Last updated {format(lastRefresh, 'HH:mm:ss')}
              </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchActiveCalls}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {targetAccountId && stats.total > 0 && (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={disconnectAllCalls}
              className="gap-2"
            >
              <PhoneOff className="h-4 w-4" />
              Disconnect All
            </Button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Calls */}
        <Card 
          className={features.glassMorphism ? 'bg-background/90 backdrop-blur-sm' : ''}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Calls</p>
                <p className="text-2xl font-bold text-brand">
                  {stats.total}
                </p>
              </div>
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${colors.primary}20` }}
              >
                <Phone className="h-6 w-6" style={{ color: colors.primary }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Connected Calls */}
        <Card 
          className={features.glassMorphism ? 'bg-background/90 backdrop-blur-sm' : ''}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Connected</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {stats.connected}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats.total > 0 ? Math.round((stats.connected / stats.total) * 100) : 0}% of total
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-950/50 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Duration */}
        <Card 
          className={features.glassMorphism ? 'bg-background/90 backdrop-blur-sm' : ''}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Duration</p>
                <p className="text-2xl font-bold text-brand">
                  {formatDuration(stats.avgDuration)}
                </p>
              </div>
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${colors.secondary}20` }}
              >
                <Timer className="h-6 w-6" style={{ color: colors.secondary }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Delay */}
        <Card 
          className={features.glassMorphism ? 'bg-background/90 backdrop-blur-sm' : ''}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Delay</p>
                <p className="text-2xl font-bold text-brand">
                  {stats.avgDelay.toFixed(2)}s
                </p>
              </div>
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${colors.accent}20` }}
              >
                <Zap className="h-6 w-6" style={{ color: colors.accent }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Call States Overview */}
      {stats.total > 0 && (
        <Card 
          className={features.glassMorphism ? 'bg-background/90 backdrop-blur-sm' : ''}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5" style={{ color: colors.primary }} />
              Call States Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {Object.entries(CALL_STATES).map(([state, config]) => {
                // Map the state name to the correct stats property
                const getStateCount = (stateName: string): number => {
                  switch (stateName) {
                    case 'Connected':
                      return stats.connected;
                    case 'ARComplete':
                      return stats.arComplete;
                    case 'WaitRoute':
                      return stats.waitRoute;
                    case 'WaitAuth':
                      return stats.waitAuth;
                    case 'Idle':
                      return stats.idle;
                    case 'Disconnecting':
                      return stats.disconnecting;
                    case 'Dead':
                      return stats.dead;
                    default:
                      return 0;
                  }
                };
                
                const count = getStateCount(state);
                const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                const StateIcon = config.icon;
                
                return (
                  <div 
                    key={state}
                    className={`p-3 rounded-lg border ${config.borderColor} ${config.bgColor} transition-all hover:shadow-sm`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <StateIcon className={`h-4 w-4 ${config.color}`} />
                      <span className="text-xs font-medium text-muted-foreground">
                        {config.label}
                      </span>
                    </div>
                    <p className={`text-lg font-bold ${config.color}`}>{count}</p>
                    <p className="text-xs text-muted-foreground">
                      {percentage.toFixed(1)}%
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calls Table */}
      {stats.total === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="space-y-4">
              <div 
                className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
                style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}
              >
                <Phone className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  No Active Calls
                </h3>
                <p className="text-muted-foreground">
                  There are currently no active calls for account {targetAccountId}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card 
          className={features.glassMorphism ? 'bg-background/90 backdrop-blur-sm' : ''}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-5 w-5" style={{ color: colors.primary }} />
              Active Calls Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Call</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Setup Time</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>IPs</TableHead>
                    <TableHead>Delay</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calls.map((call, index) => {
                    const stateInfo = getCallStateInfo(call.CC_STATE);
                    const StateIcon = stateInfo.icon;
                    const setupDate = parseSippyDate(call.SETUP_TIME);
                    
                    return (
                      <TableRow key={call.CALL_ID || index} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="space-y-1 text-foreground">
                            <div className="font-medium">
                              {call.CLI} → {call.CLD}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {call.CALL_ID}
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={`${stateInfo.color} ${stateInfo.borderColor} gap-1`}
                          >
                            <StateIcon className="h-3 w-3" />
                            {stateInfo.label}
                          </Badge>
                        </TableCell>
                        
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {formatDuration(call.DURATION || 0)}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="text-sm text-foreground">
                            {setupDate ? format(setupDate, 'HH:mm:ss') : 'N/A'}
                          </div>
                          {setupDate && (
                            <div className="text-xs text-muted-foreground">
                              {format(setupDate, 'MMM dd')}
                            </div>
                          )}
                        </TableCell>
                        
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {call.DIRECTION || 'N/A'}
                          </Badge>
                        </TableCell>
                        
                        <TableCell>
                          <div className="space-y-1 text-xs text-foreground">
                            <div className="flex items-center gap-1">
                              <Globe className="h-3 w-3 text-muted-foreground" />
                              <span className="font-mono">{call.CALLER_MEDIA_IP || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              <span className="font-mono">{call.CALLEE_MEDIA_IP || 'N/A'}</span>
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {call.DELAY?.toFixed?.(2) || call.DELAY || 'N/A'}s
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/50" 
                            onClick={() => {
                              // Try different call ID fields in order of preference
                              const callId = call.I_CONNECTION?.toString() || call.ID || call.CALL_ID;
                              
                              if (callId) {
                                disconnectCall(callId);
                              } else {
                                toast.error('No valid call ID found');
                              }
                            }}
                            title="Disconnect Call"
                          >
                            <PhoneOff className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 