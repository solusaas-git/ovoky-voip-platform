'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Eye,
  Check,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import { formatDate } from '@/lib/utils';
import { PhoneNumberRequest, BackorderRequest } from '@/types/phoneNumber';

interface CombinedRequestPhoneNumber {
  _id: string;
  number: string;
  country?: string;
  status?: string;
}

interface CombinedRequestUser {
  _id: string;
  name?: string;
  email: string;
  company?: string;
  onboarding?: {
    companyName?: string;
  };
}

interface CombinedRequest {
  _id: string;
  requestNumber: string;
  phoneNumber?: CombinedRequestPhoneNumber;
  user?: CombinedRequestUser;
  status: string;
  priority: string;
  reason?: string;
  description?: string;
  businessJustification?: string;
  requestType: 'cancellation' | 'backorder' | 'transfer' | 'suspend' | 'modify';
  originalType?: string; // The original request type from PhoneNumberRequest
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  processedAt?: string;
  expiresAt?: string;
  scheduledDate?: string;
  reviewNotes?: string;
  processingNotes?: string;
  reviewedBy?: string;
}

interface CombinedFilters {
  search?: string;
  status?: string;
  requestType?: 'cancellation' | 'backorder' | 'transfer' | 'suspend' | 'modify';
  priority?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export default function AdminPhoneNumberRequestsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [requests, setRequests] = useState<CombinedRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Modal states
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<CombinedRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState<CombinedFilters>({
    search: '',
    status: undefined,
    requestType: undefined,
    priority: undefined,
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  
  // Form states
  const [reviewNotes, setReviewNotes] = useState('');
  const [processingNotes, setProcessingNotes] = useState('');

  const fetchRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Build query parameters for both APIs
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });

      // Fetch both types of requests in parallel
      const [phoneNumberRequestsResponse, backorderRequestsResponse] = await Promise.all([
        fetch(`/api/admin/phone-numbers/requests?${params}`).then(res => res.ok ? res.json() : { requests: [], total: 0 }),
        fetch(`/api/admin/backorder-requests?${params}`).then(res => res.ok ? res.json() : { requests: [], total: 0 })
      ]);

      // Combine and transform the requests
      const combinedRequests: CombinedRequest[] = [];
      
      // Add phone number requests (cancellation, transfer, etc.)
      if (phoneNumberRequestsResponse.requests) {
        phoneNumberRequestsResponse.requests.forEach((req: PhoneNumberRequest) => {
          // Filter by request type if specified
          if (filters.requestType && filters.requestType !== 'cancellation' && filters.requestType !== req.requestType) {
            return;
          }
          
          combinedRequests.push({
            _id: req._id,
            requestNumber: req.requestNumber,
            phoneNumber: req.phoneNumber,
            user: req.user,
            status: req.status,
            priority: req.priority,
            reason: req.reason,
            description: req.description,
            requestType: req.requestType === 'cancel' ? 'cancellation' : (req.requestType as 'transfer' | 'suspend' | 'modify'),
            originalType: req.requestType,
            createdAt: req.createdAt,
            updatedAt: req.updatedAt,
            reviewedAt: req.reviewedAt,
            processedAt: req.processedAt
          });
        });
      }
      
      // Add backorder requests (purchase requests)
      if (backorderRequestsResponse.requests) {
        backorderRequestsResponse.requests.forEach((req: BackorderRequest) => {
          // Filter by request type if specified
          if (filters.requestType && filters.requestType !== 'backorder') {
            return;
          }
          
          combinedRequests.push({
            _id: req._id,
            requestNumber: req.requestNumber,
            phoneNumber: req.phoneNumber,
            user: req.user,
            status: req.status,
            priority: req.priority,
            reason: req.reason,
            businessJustification: req.businessJustification,
            requestType: 'backorder',
            createdAt: req.createdAt,
            updatedAt: req.updatedAt,
            reviewedAt: req.reviewedAt,
            processedAt: req.processedAt,
            expiresAt: req.expiresAt
          });
        });
      }
      
      // Sort combined requests
      combinedRequests.sort((a, b) => {
        const aValue = filters.sortBy === 'createdAt' ? new Date(a.createdAt).getTime() : a[filters.sortBy as keyof CombinedRequest] as string;
        const bValue = filters.sortBy === 'createdAt' ? new Date(b.createdAt).getTime() : b[filters.sortBy as keyof CombinedRequest] as string;
        
        if (filters.sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
      
      // Apply pagination
      const startIndex = (filters.page! - 1) * filters.limit!;
      const endIndex = startIndex + filters.limit!;
      const paginatedRequests = combinedRequests.slice(startIndex, endIndex);
      
      setRequests(paginatedRequests);
      setTotal(combinedRequests.length);
      setCurrentPage(filters.page!);
      setTotalPages(Math.ceil(combinedRequests.length / filters.limit!));
      
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load requests');
      setRequests([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchRequests();
  }, [filters, fetchRequests]);

  const handleApproveRequest = async () => {
    if (!selectedRequest) return;

    try {
      setIsSubmitting(true);
      
      // Use the appropriate API endpoint based on request type
      const apiUrl = selectedRequest.requestType === 'backorder' 
        ? '/api/admin/backorder-requests'
        : '/api/admin/phone-numbers/requests';
      
      // Prepare request body based on API requirements
      const requestBody = selectedRequest.requestType === 'backorder' 
        ? {
            requestId: selectedRequest._id,
            status: 'approved',
            reviewNotes,
            processingNotes
          }
        : {
            requestId: selectedRequest._id,
            action: 'approve',
            reviewNotes,
            processingNotes
          };
      
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve request');
      }

      toast.success('Request approved successfully');
      setShowApproveModal(false);
      setReviewNotes('');
      setProcessingNotes('');
      setSelectedRequest(null);
      fetchRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to approve request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!selectedRequest) return;

    try {
      setIsSubmitting(true);
      
      // Use the appropriate API endpoint based on request type
      const apiUrl = selectedRequest.requestType === 'backorder' 
        ? '/api/admin/backorder-requests'
        : '/api/admin/phone-numbers/requests';
      
      // Prepare request body based on API requirements
      const requestBody = selectedRequest.requestType === 'backorder' 
        ? {
            requestId: selectedRequest._id,
            status: 'rejected',
            reviewNotes
          }
        : {
            requestId: selectedRequest._id,
            action: 'reject',
            reviewNotes
          };
      
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reject request');
      }

      toast.success('Request rejected successfully');
      setShowRejectModal(false);
      setReviewNotes('');
      setSelectedRequest(null);
      fetchRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reject request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFilters = (newFilters: Partial<CombinedFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const changePage = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const getRequestTypeLabel = (requestType: string) => {
    switch (requestType) {
      case 'backorder': return 'Purchase Request';
      case 'cancellation': return 'Cancellation';
      case 'transfer': return 'Transfer';
      case 'suspend': return 'Suspend';
      case 'modify': return 'Modify';
      default: return requestType;
    }
  };

  const getRequestTypeBadgeVariant = (requestType: string) => {
    switch (requestType) {
      case 'backorder': return 'default'; // blue
      case 'cancellation': return 'destructive'; // red
      case 'transfer': return 'secondary'; // gray
      case 'suspend': return 'outline'; // transparent
      case 'modify': return 'secondary'; // gray
      default: return 'outline';
    }
  };

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'outline';
      case 'approved': return 'secondary';
      case 'rejected': return 'destructive';
      case 'completed': return 'default';
      case 'cancelled': return 'outline';
      default: return 'outline';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'outline';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  // Show loading spinner while auth is loading
  if (isAuthLoading) {
    return (
      <MainLayout>
        <PageLayout
          title="Loading..."
          description="Checking permissions"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Admin', href: '/admin' },
            { label: 'Phone Number Requests' }
          ]}
        >
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </PageLayout>
      </MainLayout>
    );
  }

  // Verify admin access only after auth is loaded
  if (user?.role !== 'admin') {
    return (
      <MainLayout>
        <PageLayout
          title="Access Denied"
          description="You don't have permission to access this page"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Phone Number Requests' }
          ]}
        >
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You don&apos;t have permission to access this page.
            </AlertDescription>
          </Alert>
        </PageLayout>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageLayout
        title="Phone Number Requests"
        description="Manage user requests for phone number purchases, cancellations, and modifications"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Admin', href: '/admin' },
          { label: 'Phone Number Requests' }
        ]}
      >
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search requests..."
                  value={filters.search || ''}
                  onChange={(e) => updateFilters({ search: e.target.value })}
                  className="pl-10"
                />
              </div>
              
              <Select value={filters.status || 'all'} onValueChange={(value) => updateFilters({ status: value === 'all' ? undefined : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.requestType || 'all'} onValueChange={(value) => updateFilters({ requestType: value === 'all' ? undefined : (value as 'cancellation' | 'backorder' | 'transfer' | 'suspend' | 'modify') })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="backorder">Purchase Requests</SelectItem>
                  <SelectItem value="cancellation">Cancellations</SelectItem>
                  <SelectItem value="transfer">Transfers</SelectItem>
                  <SelectItem value="suspend">Suspensions</SelectItem>
                  <SelectItem value="modify">Modifications</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.priority || 'all'} onValueChange={(value) => updateFilters({ priority: value === 'all' ? undefined : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{total}</div>
              <p className="text-xs text-muted-foreground">Total Requests</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {requests.filter(r => r.requestType === 'backorder').length}
              </div>
              <p className="text-xs text-muted-foreground">Purchase Requests</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">
                {requests.filter(r => r.requestType === 'cancellation').length}
              </div>
              <p className="text-xs text-muted-foreground">Cancellations</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">
                {requests.filter(r => r.status === 'pending').length}
              </div>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {requests.filter(r => r.status === 'approved' || r.status === 'completed').length}
              </div>
              <p className="text-xs text-muted-foreground">Approved</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">
                {requests.filter(r => r.priority === 'urgent' || r.priority === 'high').length}
              </div>
              <p className="text-xs text-muted-foreground">High Priority</p>
            </CardContent>
          </Card>
        </div>

        {/* Requests Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Phone Number Requests ({total})</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request #</TableHead>
                      <TableHead>Phone Number</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request._id}>
                        <TableCell className="font-mono">{request.requestNumber}</TableCell>
                        <TableCell className="font-mono">{request.phoneNumber?.number}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{request.user?.name || request.user?.email}</p>
                            <p className="text-xs text-muted-foreground">{request.user?.onboarding?.companyName || request.user?.company || 'No company'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getRequestTypeBadgeVariant(request.requestType)} className="flex items-center space-x-1 w-fit">
                            <span>{getRequestTypeLabel(request.requestType)}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getBadgeVariant(request.status)} className="flex items-center space-x-1 w-fit">
                            <span>{getStatusIcon(request.status)}</span>
                            <span>{request.status}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPriorityBadgeVariant(request.priority)}>
                            {request.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(request.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowDetailsModal(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            {request.status === 'pending' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setShowApproveModal(true);
                                  }}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setShowRejectModal(true);
                                  }}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <p className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * filters.limit!) + 1} to {Math.min(currentPage * filters.limit!, total)} of {total} results
                    </p>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => changePage(currentPage - 1)}
                        disabled={currentPage <= 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => changePage(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Request Details Modal */}
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Request Details</DialogTitle>
              <DialogDescription>
                Complete information about request {selectedRequest?.requestNumber}
              </DialogDescription>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Request Number</Label>
                    <p className="font-mono">{selectedRequest.requestNumber}</p>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Badge variant={getBadgeVariant(selectedRequest.status)} className="flex items-center space-x-1 w-fit">
                      <span>{getStatusIcon(selectedRequest.status)}</span>
                      <span>{selectedRequest.status}</span>
                    </Badge>
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    <p className="font-mono">{selectedRequest.phoneNumber?.number}</p>
                  </div>
                  <div>
                    <Label>Request Type</Label>
                    <p>{getRequestTypeLabel(selectedRequest.requestType)}</p>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Badge variant={getPriorityBadgeVariant(selectedRequest.priority)}>
                      {selectedRequest.priority}
                    </Badge>
                  </div>
                  <div>
                    <Label>Created</Label>
                    <p>{formatDate(selectedRequest.createdAt)}</p>
                  </div>
                </div>

                <div>
                  <Label>User</Label>
                  <div className="mt-1 p-3 bg-muted rounded-lg">
                    <p className="font-medium">{selectedRequest.user?.name || selectedRequest.user?.email}</p>
                    <p className="text-sm text-muted-foreground">{selectedRequest.user?.onboarding?.companyName || selectedRequest.user?.company || 'No company'}</p>
                    <p className="text-xs text-muted-foreground">{selectedRequest.user?.email}</p>
                  </div>
                </div>

                <div>
                  <Label>Reason</Label>
                  <p className="text-sm">{selectedRequest.reason}</p>
                </div>

                {selectedRequest.requestType === 'backorder' && selectedRequest.businessJustification && (
                  <div>
                    <Label>Business Justification</Label>
                    <p className="text-sm">{selectedRequest.businessJustification}</p>
                  </div>
                )}

                {selectedRequest.requestType !== 'backorder' && selectedRequest.description && (
                  <div>
                    <Label>Description</Label>
                    <p className="text-sm">{selectedRequest.description}</p>
                  </div>
                )}

                {selectedRequest.requestType === 'backorder' && selectedRequest.expiresAt && (
                  <div>
                    <Label>Expires At</Label>
                    <p className="text-sm">{formatDate(selectedRequest.expiresAt)}</p>
                  </div>
                )}

                {selectedRequest.requestType !== 'backorder' && selectedRequest.scheduledDate && (
                  <div>
                    <Label>Scheduled Date</Label>
                    <p className="text-sm">{formatDate(selectedRequest.scheduledDate)}</p>
                  </div>
                )}

                {selectedRequest.reviewNotes && (
                  <div>
                    <Label>Review Notes</Label>
                    <p className="text-sm">{selectedRequest.reviewNotes}</p>
                  </div>
                )}

                {selectedRequest.processingNotes && (
                  <div>
                    <Label>Processing Notes</Label>
                    <p className="text-sm">{selectedRequest.processingNotes}</p>
                  </div>
                )}

                {selectedRequest.reviewedBy && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Reviewed By</Label>
                      <p className="text-sm">{selectedRequest.reviewedBy}</p>
                    </div>
                    <div>
                      <Label>Reviewed At</Label>
                      <p className="text-sm">{selectedRequest.reviewedAt ? formatDate(selectedRequest.reviewedAt) : 'N/A'}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Approve Request Modal */}
        <Dialog open={showApproveModal} onOpenChange={setShowApproveModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Request</DialogTitle>
              <DialogDescription>
                {selectedRequest?.requestType === 'backorder' 
                  ? `Approve purchase request for ${selectedRequest?.phoneNumber?.number}`
                  : `Approve ${selectedRequest?.requestType} request for ${selectedRequest?.phoneNumber?.number}`
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {selectedRequest?.requestType === 'backorder' 
                    ? 'Approving this request will assign the phone number to the user and create billing records.'
                    : 'Approving this request will immediately process the requested action on the phone number.'
                  }
                </AlertDescription>
              </Alert>
              
              <div>
                <Label htmlFor="reviewNotes">Review Notes</Label>
                <Textarea
                  id="reviewNotes"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Optional notes about your review decision..."
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="processingNotes">Processing Notes</Label>
                <Textarea
                  id="processingNotes"
                  value={processingNotes}
                  onChange={(e) => setProcessingNotes(e.target.value)}
                  placeholder="Optional notes about the processing..."
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowApproveModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleApproveRequest}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Approving...
                  </>
                ) : (
                  'Approve Request'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Reject Request Modal */}
        <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Request</DialogTitle>
              <DialogDescription>
                {selectedRequest?.requestType === 'backorder' 
                  ? `Reject purchase request for ${selectedRequest?.phoneNumber?.number}`
                  : `Reject ${selectedRequest?.requestType} request for ${selectedRequest?.phoneNumber?.number}`
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="rejectReviewNotes">Review Notes *</Label>
                <Textarea
                  id="rejectReviewNotes"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Please provide a reason for rejecting this request..."
                  rows={4}
                  required
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowRejectModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleRejectRequest}
                disabled={isSubmitting || !reviewNotes.trim()}
                variant="destructive"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  'Reject Request'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageLayout>
    </MainLayout>
  );
} 