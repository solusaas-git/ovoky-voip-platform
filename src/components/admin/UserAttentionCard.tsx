'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  Mail, 
  Phone, 
  RefreshCw, 
  Filter,
  ExternalLink,
  Clock,
  UserX,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface PendingUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'client';
  sippyAccountId?: number;
  isEmailVerified: boolean;
  createdAt: string;
  creationMethod: 'signup' | 'admin';
  needsSippyId: boolean;
  needsEmailVerification: boolean;
  isRecent: boolean;
}

interface UserCounts {
  missingSippy: number;
  pendingVerification: number;
  totalPending: number;
}

interface PendingUsersResponse {
  users: PendingUser[];
  counts: UserCounts;
  filter: string;
  limit: number;
}

interface UserAttentionCardProps {
  onRefresh?: () => void;
}

export function UserAttentionCard({ onRefresh }: UserAttentionCardProps) {
  const [data, setData] = useState<PendingUsersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [limit, setLimit] = useState(10);

  const fetchPendingUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/users-pending?filter=${filter}&limit=${limit}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else {
        toast.error('Failed to fetch pending users');
      }
    } catch (error) {
      console.error('Error fetching pending users:', error);
      toast.error('Failed to fetch pending users');
    } finally {
      setIsLoading(false);
    }
  }, [filter, limit]);

  useEffect(() => {
    fetchPendingUsers();
  }, [fetchPendingUsers]);

  const handleFilterChange = (value: string) => {
    setFilter(value);
  };

  const handleLimitChange = (value: string) => {
    setLimit(parseInt(value));
  };

  const handleRefresh = () => {
    fetchPendingUsers();
    onRefresh?.();
  };

  const getStatusBadges = (user: PendingUser) => {
    const badges = [];
    
    if (user.needsSippyId) {
      badges.push(
        <Badge key="sippy" variant="destructive" className="text-xs">
          <Phone className="h-3 w-3 mr-1" />
          No Sippy ID
        </Badge>
      );
    }
    
    if (user.needsEmailVerification) {
      badges.push(
        <Badge key="email" variant="secondary" className="text-xs">
          <Mail className="h-3 w-3 mr-1" />
          Unverified
        </Badge>
      );
    }
    
    if (user.isRecent) {
      badges.push(
        <Badge key="recent" variant="outline" className="text-xs">
          <Clock className="h-3 w-3 mr-1" />
          Recent
        </Badge>
      );
    }
    
    return badges;
  };

  const getRoleBadge = (role: string) => {
    return (
      <Badge variant={role === 'admin' ? 'default' : 'outline'} className="text-xs">
        {role === 'admin' ? 'Admin' : 'Client'}
      </Badge>
    );
  };

  const getCreationMethodBadge = (method: string) => {
    return (
      <Badge variant={method === 'admin' ? 'default' : 'secondary'} className="text-xs">
        {method === 'admin' ? 'Admin Created' : 'Self Signup'}
      </Badge>
    );
  };

  const getFilterOptions = () => [
    { value: 'all', label: `All Pending (${data?.counts?.totalPending || 0})` },
    { value: 'missing_sippy', label: `Missing Sippy ID (${data?.counts?.missingSippy || 0})` },
    { value: 'pending_verification', label: `Pending Verification (${data?.counts?.pendingVerification || 0})` }
  ];

  if (isLoading && !data) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <span className="ml-2">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Users missing Sippy account IDs or pending email verification
        </p>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
            <a href="/users" className="flex items-center justify-center space-x-2">
              <ExternalLink className="h-4 w-4 mr-2" />
              Manage All Users
            </a>
          </Button>
        </div>
      </div>
      
      {/* Filter Controls */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
        <div className="flex items-center space-x-2 w-full lg:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Select value={filter} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-full lg:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getFilterOptions().map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-2 w-full lg:w-auto">
          <span className="text-sm text-muted-foreground flex-shrink-0">Show:</span>
          <Select value={limit.toString()} onValueChange={handleLimitChange}>
            <SelectTrigger className="w-full lg:w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 users</SelectItem>
              <SelectItem value="10">10 users</SelectItem>
              <SelectItem value="20">20 users</SelectItem>
              <SelectItem value="50">50 users</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <div className="flex items-center space-x-3 p-3 md:p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <Phone className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">Missing Sippy ID</p>
            <p className="text-xl md:text-2xl font-bold text-amber-600">{data?.counts.missingSippy || 0}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3 p-3 md:p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <Mail className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">Pending Verification</p>
            <p className="text-xl md:text-2xl font-bold text-blue-600">{data?.counts.pendingVerification || 0}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3 p-3 md:p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">Total Pending</p>
            <p className="text-xl md:text-2xl font-bold text-red-600">{data?.counts.totalPending || 0}</p>
          </div>
        </div>
      </div>

      {/* Users List */}
      {data?.users && data.users.length > 0 ? (
        <div className="space-y-3">
          {data.users.map((user) => (
            <div key={user.id} className="p-3 md:p-4 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <h4 className="font-medium truncate">{user.name}</h4>
                    <div className="flex flex-wrap gap-2">
                      {getRoleBadge(user.role)}
                      {getCreationMethodBadge(user.creationMethod)}
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                  
                  <div className="flex flex-wrap gap-2">
                    {getStatusBadges(user)}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-muted-foreground">
                    <span>Created: {format(new Date(user.createdAt), 'MMM dd, yyyy')}</span>
                    {user.sippyAccountId && (
                      <span className="sm:ml-2">Sippy ID: {user.sippyAccountId}</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-center lg:justify-start">
                  {user.isEmailVerified ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <UserX className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">No users need attention</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {filter === 'all' 
              ? 'All users have Sippy IDs and verified emails'
              : `No users match the current filter: ${filter.replace('_', ' ')}`
            }
          </p>
        </div>
      )}

      {/* Quick Action Footer */}
      {data?.users && data.users.length > 0 && (
        <div className="pt-4 border-t">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-muted-foreground">
            <span>
              Showing {data.users.length} of {data.counts.totalPending} users requiring attention
            </span>
            <Button variant="link" size="sm" asChild className="w-fit">
              <a href="/users">View all users →</a>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 