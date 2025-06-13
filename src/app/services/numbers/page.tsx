'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Hash,
  Search,
  X,
  Loader2,
  AlertCircle,
  UserX,
  ShoppingCart,
  CheckCircle,
  Phone,
  Copy,
  MessageSquare,
  FileText,
  Terminal,
  BookOpen,
  HelpCircle,
  AlertTriangle,
  Globe,
  Key
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, formatCurrency } from '@/lib/utils';
import { 
  PhoneNumber, 
  PhoneNumberRequest, 
  CreatePhoneNumberRequestForm, 
  RequestPriority 
} from '@/types/phoneNumber';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTranslations } from '@/lib/i18n';

// Interface for backorder requests
interface BackorderRequest {
  _id: string;
  requestNumber: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  phoneNumberId: string; // Just the ID
  phoneNumber?: { // The populated phone number data
    _id: string;
    number: string;
    country: string;
    countryCode: string;
    numberType: string;
    provider: string;
    monthlyRate: number;
    setupFee?: number;
    currency: string;
    capabilities: string[];
  };
  reason: string;
  businessJustification: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'approved' | 'rejected';
  reviewNotes?: string;
  processingNotes?: string;
  createdAt: string;
  updatedAt: string;
}

// Combined interface for displaying both types of requests
interface CombinedRequest {
  _id: string;
  requestNumber: string;
  requestType: 'cancel' | 'modify' | 'backorder';
  phoneNumber?: {
    _id: string;
    number: string;
    country: string;
    countryCode: string;
    numberType: string;
    provider: string;
    monthlyRate: number;
    setupFee?: number;
    currency: string;
    capabilities: string[];
  };
  reason?: string;
  description?: string;
  businessJustification?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  reviewNotes?: string;
  processingNotes?: string;
  scheduledDate?: string;
  createdAt: string;
  updatedAt: string;
}

export default function PhoneNumbersPage() {
  const { t } = useTranslations();
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [requests, setRequests] = useState<CombinedRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('numbers');
  
  // Modal states
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRequestDetailsModal, setShowRequestDetailsModal] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState<PhoneNumber | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<CombinedRequest | null>(null);
  
  // Copy button states
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Form states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cancelForm, setCancelForm] = useState<CreatePhoneNumberRequestForm>({
    phoneNumberId: '',
    requestType: 'cancel',
    reason: '',
    description: '',
    priority: 'medium' as RequestPriority,
    scheduledDate: undefined
  });

  const router = useRouter();

  useEffect(() => {
    fetchPhoneNumbers();
    fetchRequests();
  }, [activeTab]);

  const fetchPhoneNumbers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/phone-numbers');
      if (!response.ok) {
        throw new Error('Failed to fetch phone numbers');
      }
      const data = await response.json();
      setPhoneNumbers(data.phoneNumbers || []);
    } catch (error) {
      console.error('Error fetching phone numbers:', error);
      setPhoneNumbers([]);
      toast.error(t('phoneNumbers.messages.error.loadNumbers'));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      // Fetch both regular requests and backorder requests in parallel
      const [regularRequestsResponse, backorderRequestsResponse] = await Promise.all([
        fetch('/api/phone-numbers/requests'),
        fetch('/api/backorder-requests')
      ]);

      const combinedRequests: CombinedRequest[] = [];

      // Process regular phone number requests
      if (regularRequestsResponse.ok) {
        const regularData = await regularRequestsResponse.json();
        const regularRequests = (regularData.requests || []).map((req: PhoneNumberRequest) => ({
          _id: req._id,
          requestNumber: req.requestNumber,
          requestType: req.requestType,
          phoneNumber: req.phoneNumber,
          reason: req.reason,
          description: req.description,
          priority: req.priority,
          status: req.status,
          reviewNotes: req.reviewNotes,
          scheduledDate: req.scheduledDate,
          createdAt: req.createdAt,
          updatedAt: req.updatedAt
        }));
        combinedRequests.push(...regularRequests);
      }

      // Process backorder requests
      if (backorderRequestsResponse.ok) {
        const backorderData = await backorderRequestsResponse.json();
        const backorderRequests = (backorderData.requests || []).map((req: BackorderRequest) => {
          return {
            _id: req._id,
            requestNumber: req.requestNumber,
            requestType: 'backorder' as const,
            phoneNumber: req.phoneNumber ? {
              _id: req.phoneNumber._id,
              number: req.phoneNumber.number,
              country: req.phoneNumber.country,
              countryCode: req.phoneNumber.countryCode,
              numberType: req.phoneNumber.numberType,
              provider: req.phoneNumber.provider,
              monthlyRate: req.phoneNumber.monthlyRate,
              setupFee: req.phoneNumber.setupFee,
              currency: req.phoneNumber.currency,
              capabilities: req.phoneNumber.capabilities
            } : undefined,
            reason: req.reason,
            businessJustification: req.businessJustification,
            priority: req.priority,
            status: req.status,
            reviewNotes: req.reviewNotes,
            processingNotes: req.processingNotes,
            createdAt: req.createdAt,
            updatedAt: req.updatedAt
          };
        });
        combinedRequests.push(...backorderRequests);
      }

      // Sort combined requests by creation date (newest first)
      combinedRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setRequests(combinedRequests);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load requests');
    }
  };

  const handleCancelRequest = async () => {
    if (!selectedNumber) return;

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/phone-numbers/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...cancelForm,
          phoneNumberId: selectedNumber._id,
          requestType: 'cancel'
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit cancel request');
      }

      const data = await response.json();
      toast.success(t('phoneNumbers.messages.success.requestSubmitted'));
      setShowCancelModal(false);
      setCancelForm({
        phoneNumberId: '',
        requestType: 'cancel',
        reason: '',
        description: '',
        priority: 'medium' as RequestPriority,
        scheduledDate: undefined
      });
      setSelectedNumber(null);
      fetchRequests();
    } catch (error) {
      console.error('Error submitting cancel request:', error);
      toast.error(error instanceof Error ? error.message : t('phoneNumbers.messages.error.submitRequest'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdrawRequest = async (requestId: string, requestNumber: string) => {
    try {
      const response = await fetch(`/api/phone-numbers/requests?requestId=${requestId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to withdraw request');
      }

      toast.success(t('phoneNumbers.messages.success.requestWithdrawn'));
      fetchRequests(); // Refresh requests list
    } catch (error) {
      console.error('Error withdrawing request:', error);
      toast.error(error instanceof Error ? error.message : t('phoneNumbers.messages.error.withdrawRequest'));
    }
  };

  const filteredNumbers = phoneNumbers.filter(number => {
    const matchesSearch = !searchTerm || 
      number.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      number.country.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || getPhoneNumberDisplayStatus(number) === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'assigned': return 'default';
      case 'suspended': return 'destructive';
      case 'pending_cancellation': return 'secondary';
      default: return 'outline';
    }
  };

  const getPhoneNumberDisplayStatus = (number: PhoneNumber) => {
    // Check if there's a pending or approved cancellation request
    const hasPendingCancellation = requests.some(req => 
      req.phoneNumber?.number === number.number && 
      req.requestType === 'cancel' &&
      (req.status === 'pending' || req.status === 'approved')
    );
    
    if (hasPendingCancellation) {
      return 'pending_cancellation';
    }
    
    return number.status;
  };

  const getDisplayStatusText = (status: string) => {
    switch (status) {
      case 'pending_cancellation': return t('phoneNumbers.numbers.statuses.pendingCancellation');
      case 'assigned': return t('phoneNumbers.numbers.statuses.assigned');
      case 'suspended': return t('phoneNumbers.numbers.statuses.suspended');
      case 'available': return t('phoneNumbers.numbers.statuses.available');
      case 'reserved': return t('phoneNumbers.numbers.statuses.reserved');
      case 'cancelled': return t('phoneNumbers.numbers.statuses.cancelled');
      default: return status.replace('_', ' ');
    }
  };

  const getReasonDisplayText = (reason: string) => {
    switch (reason) {
      case 'no_longer_needed': return t('phoneNumbers.reasons.noLongerNeeded');
      case 'cost_reduction': return t('phoneNumbers.reasons.costReduction');
      case 'service_issues': return t('phoneNumbers.reasons.serviceIssues');
      case 'business_closure': return t('phoneNumbers.reasons.businessClosure');
      case 'other': return t('phoneNumbers.reasons.other');
      default: return reason;
    }
  };

  const getRequestBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'outline';
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'completed': return 'secondary';
      case 'cancelled': return 'outline';
      default: return 'outline';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'low': return 'outline';
      case 'medium': return 'default';
      case 'high': return 'destructive';
      case 'urgent': return 'destructive';
      default: return 'outline';
    }
  };

  const getOrdinalSuffix = (day: number) => {
    if (day >= 11 && day <= 13) {
      return 'th';
    }
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  const handleCopyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [key]: true }));
      toast.success(t('phoneNumbers.messages.success.copiedToClipboard'));
      
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <MainLayout>
      <PageLayout
        title={t('phoneNumbers.page.title')}
        description={t('phoneNumbers.page.description')}
        breadcrumbs={[
          { label: t('phoneNumbers.page.breadcrumbs.dashboard'), href: '/dashboard' },
          { label: t('phoneNumbers.page.breadcrumbs.services'), href: '/services' },
          { label: t('phoneNumbers.page.breadcrumbs.numbers') }
        ]}
        headerActions={
          <Button 
            onClick={() => router.push('/services/numbers/buy')}
            className="bg-green-600 hover:bg-green-700"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            {t('phoneNumbers.header.buttons.buyNumbers')}
          </Button>
        }
      >
        {/* Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="numbers">{t('phoneNumbers.tabs.myNumbers')} ({phoneNumbers.length})</TabsTrigger>
            <TabsTrigger value="requests">{t('phoneNumbers.tabs.requests')} ({requests.length})</TabsTrigger>
          </TabsList>

          {/* Phone Numbers Tab */}
          <TabsContent value="numbers" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('phoneNumbers.filters.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      type="text"
                      placeholder={t('phoneNumbers.filters.searchPlaceholder')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('phoneNumbers.filters.statusFilter.allStatuses')}</SelectItem>
                      <SelectItem value="assigned">{t('phoneNumbers.filters.statusFilter.active')}</SelectItem>
                      <SelectItem value="pending_cancellation">{t('phoneNumbers.filters.statusFilter.pendingCancellation')}</SelectItem>
                      <SelectItem value="suspended">{t('phoneNumbers.filters.statusFilter.suspended')}</SelectItem>
                    </SelectContent>
                  </Select>
                  {(searchTerm || statusFilter !== 'all') && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('all');
                      }}
                      className="px-3"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Phone Numbers Grid */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : filteredNumbers.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <Hash className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{t('phoneNumbers.numbers.empty.title')}</h3>
                    <p className="text-muted-foreground">
                      {searchTerm || statusFilter !== 'all' 
                        ? t('phoneNumbers.numbers.empty.descriptionFiltered')
                        : t('phoneNumbers.numbers.empty.descriptionEmpty')
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredNumbers.map((number) => (
                  <Card key={number._id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-mono">{number.number}</CardTitle>
                        <Badge variant={getBadgeVariant(getPhoneNumberDisplayStatus(number))}>
                          {getDisplayStatusText(getPhoneNumberDisplayStatus(number))}
                        </Badge>
                      </div>
                      <CardDescription>
                        {number.country} • {number.numberType}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <Label className="text-xs text-muted-foreground">{t('phoneNumbers.numbers.fields.monthlyRate')}</Label>
                          <p className="font-medium">
                            {number.monthlyRate ? formatCurrency(number.monthlyRate, number.currency) : 'Free'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">{t('phoneNumbers.numbers.fields.nextBilling')}</Label>
                          <p className="font-medium">
                            {number.nextBillingDate ? formatDate(number.nextBillingDate) : 'N/A'}
                          </p>
                        </div>
                      </div>

                      {number.capabilities && number.capabilities.length > 0 && (
                        <div>
                          <Label className="text-xs text-muted-foreground">{t('phoneNumbers.numbers.fields.capabilities')}</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {number.capabilities.map((capability) => (
                              <Badge key={capability} variant="outline" className="text-xs">
                                {capability}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex space-x-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedNumber(number);
                            setShowDetailsModal(true);
                          }}
                          className="flex-1"
                        >
                          {t('phoneNumbers.numbers.buttons.viewDetails')}
                        </Button>
                        {(getPhoneNumberDisplayStatus(number) === 'assigned') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedNumber(number);
                              setShowCancelModal(true);
                            }}
                            className="text-red-600 hover:text-red-700"
                            disabled={requests.some(req => 
                              req.phoneNumber?.number === number.number && 
                              (req.status === 'pending' || req.status === 'approved')
                            )}
                            title={requests.some(req => 
                              req.phoneNumber?.number === number.number && 
                              (req.status === 'pending' || req.status === 'approved')
                            ) ? t('phoneNumbers.numbers.tooltips.requestAlreadyPending') : t('phoneNumbers.numbers.tooltips.requestCancellation')}
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      {/* Show pending request info */}
                      {(() => {
                        const pendingRequest = requests.find(req => 
                          req.phoneNumber?.number === number.number && 
                          req.requestType === 'cancel' &&
                          (req.status === 'pending' || req.status === 'approved')
                        );
                        
                        if (pendingRequest) {
                          return (
                            <div className="mt-3 p-2 bg-muted/50 rounded-lg border-l-2 border-orange-400">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                                  <p className="text-xs text-muted-foreground">
                                    {t('phoneNumbers.numbers.pendingRequest.cancellationPending', { 
                                      requestNumber: pendingRequest.requestNumber, 
                                      status: pendingRequest.status 
                                    })}
                                  </p>
                                </div>
                                {pendingRequest.status === 'pending' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleWithdrawRequest(pendingRequest._id, pendingRequest.requestNumber)}
                                    className="text-xs h-6 px-2 text-blue-600 hover:text-blue-700"
                                    title="Cancel the cancellation request and keep your number"
                                  >
                                    {t('phoneNumbers.numbers.buttons.keepNumber')}
                                  </Button>
                                )}
                              </div>
                              {pendingRequest.scheduledDate && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {t('phoneNumbers.numbers.pendingRequest.scheduled', { 
                                    date: formatDate(pendingRequest.scheduledDate) 
                                  })}
                                </p>
                              )}
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests" className="space-y-6">
            {requests.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{t('phoneNumbers.requests.empty.title')}</h3>
                    <p className="text-muted-foreground">
                      {t('phoneNumbers.requests.empty.description')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>{t('phoneNumbers.requests.title')}</CardTitle>
                  <CardDescription>
                    {t('phoneNumbers.requests.description')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('phoneNumbers.requests.table.headers.requestId')}</TableHead>
                        <TableHead>{t('phoneNumbers.requests.table.headers.type')}</TableHead>
                        <TableHead>{t('phoneNumbers.requests.table.headers.phoneNumber')}</TableHead>
                        <TableHead>{t('phoneNumbers.requests.table.headers.status')}</TableHead>
                        <TableHead>{t('phoneNumbers.requests.table.headers.priority')}</TableHead>
                        <TableHead>{t('phoneNumbers.requests.table.headers.submitted')}</TableHead>
                        <TableHead className="text-right">{t('phoneNumbers.requests.table.headers.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.map((request) => (
                        <TableRow key={request._id}>
                          <TableCell className="font-mono text-sm">
                            {request.requestNumber}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={request.requestType === 'backorder' ? 'outline' : 'secondary'}
                              className={
                                request.requestType === 'backorder' 
                                  ? 'text-orange-600 border-orange-200' 
                                  : request.requestType === 'cancel'
                                  ? 'text-red-600 border-red-200'
                                  : 'text-blue-600 border-blue-200'
                              }
                            >
                              {request.requestType === 'backorder' ? t('phoneNumbers.requests.types.purchase') : 
                               request.requestType === 'cancel' ? t('phoneNumbers.requests.types.cancel') : 
                               t('phoneNumbers.requests.types.modify')}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono">
                            {request.phoneNumber?.number || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getRequestBadgeVariant(request.status)}>
                              {request.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getPriorityBadgeVariant(request.priority)}>
                              {request.priority}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(request.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setShowRequestDetailsModal(true);
                                }}
                              >
                                {t('phoneNumbers.requests.buttons.viewDetails')}
                              </Button>
                              {request.status === 'pending' && request.requestType === 'cancel' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleWithdrawRequest(request._id, request.requestNumber)}
                                  className="text-blue-600 hover:text-blue-700"
                                >
                                  {t('phoneNumbers.requests.buttons.keepNumber')}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Request Details Modal */}
        <Dialog open={showRequestDetailsModal} onOpenChange={setShowRequestDetailsModal}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {t('phoneNumbers.modals.requestDetails.title')}
                {selectedRequest && (
                  <Badge 
                    variant={selectedRequest.requestType === 'backorder' ? 'outline' : 'secondary'}
                    className={
                      selectedRequest.requestType === 'backorder' 
                        ? 'text-orange-600 border-orange-200' 
                        : selectedRequest.requestType === 'cancel'
                        ? 'text-red-600 border-red-200'
                        : 'text-blue-600 border-blue-200'
                    }
                  >
                    {selectedRequest.requestType === 'backorder' ? t('phoneNumbers.requests.types.purchaseRequest') : 
                     selectedRequest.requestType === 'cancel' ? t('phoneNumbers.requests.types.cancellationRequest') : 
                     t('phoneNumbers.requests.types.modificationRequest')}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                {selectedRequest?.requestType === 'backorder' 
                  ? t('phoneNumbers.modals.requestDetails.descriptions.backorder')
                  : selectedRequest?.requestType === 'cancel'
                  ? t('phoneNumbers.modals.requestDetails.descriptions.cancel')
                  : t('phoneNumbers.modals.requestDetails.descriptions.modify')
                }
              </DialogDescription>
            </DialogHeader>

            {selectedRequest && (
              <div className="space-y-6">
                {/* Request Overview */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <Label className="text-xs text-muted-foreground">{t('phoneNumbers.modals.requestDetails.overview.requestId')}</Label>
                    <p className="font-mono font-medium">{selectedRequest.requestNumber}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t('phoneNumbers.modals.requestDetails.overview.status')}</Label>
                    <Badge variant={getRequestBadgeVariant(selectedRequest.status)} className="mt-1">
                      {selectedRequest.status}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t('phoneNumbers.modals.requestDetails.overview.priority')}</Label>
                    <Badge variant={getPriorityBadgeVariant(selectedRequest.priority)} className="mt-1">
                      {selectedRequest.priority}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t('phoneNumbers.modals.requestDetails.overview.submitted')}</Label>
                    <p className="text-sm">{formatDate(selectedRequest.createdAt)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t('phoneNumbers.modals.requestDetails.overview.lastUpdated')}</Label>
                    <p className="text-sm">{formatDate(selectedRequest.updatedAt)}</p>
                  </div>
                  {selectedRequest.scheduledDate && (
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('phoneNumbers.modals.requestDetails.overview.scheduledDate')}</Label>
                      <p className="text-sm">{formatDate(selectedRequest.scheduledDate)}</p>
                    </div>
                  )}
                </div>

                {/* Phone Number Details */}
                {selectedRequest.phoneNumber && (
                  <div>
                    <h4 className="font-semibold mb-3">{t('phoneNumbers.modals.requestDetails.phoneNumberInfo.title')}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 border rounded-lg">
                      <div>
                        <Label className="text-xs text-muted-foreground">{t('phoneNumbers.modals.requestDetails.phoneNumberInfo.number')}</Label>
                        <p className="font-mono font-medium text-lg">{selectedRequest.phoneNumber.number}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">{t('phoneNumbers.modals.requestDetails.phoneNumberInfo.country')}</Label>
                        <p>{selectedRequest.phoneNumber.country} (+{selectedRequest.phoneNumber.countryCode})</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">{t('phoneNumbers.modals.requestDetails.phoneNumberInfo.type')}</Label>
                        <p>{selectedRequest.phoneNumber.numberType}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">{t('phoneNumbers.modals.requestDetails.phoneNumberInfo.provider')}</Label>
                        <p>{selectedRequest.phoneNumber.provider}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">{t('phoneNumbers.modals.requestDetails.phoneNumberInfo.monthlyRate')}</Label>
                        <p className="font-medium">
                          {formatCurrency(selectedRequest.phoneNumber.monthlyRate, selectedRequest.phoneNumber.currency)}
                        </p>
                      </div>
                      {selectedRequest.phoneNumber.setupFee && (
                        <div>
                          <Label className="text-xs text-muted-foreground">{t('phoneNumbers.modals.requestDetails.phoneNumberInfo.setupFee')}</Label>
                          <p className="font-medium">
                            {formatCurrency(selectedRequest.phoneNumber.setupFee, selectedRequest.phoneNumber.currency)}
                          </p>
                        </div>
                      )}
                      {selectedRequest.phoneNumber.capabilities && selectedRequest.phoneNumber.capabilities.length > 0 && (
                        <div className="col-span-full">
                          <Label className="text-xs text-muted-foreground">Capabilities</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedRequest.phoneNumber.capabilities.map((capability) => (
                              <Badge key={capability} variant="outline" className="text-xs">
                                {capability}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Request Details */}
                <div>
                  <h4 className="font-semibold mb-3">Request Information</h4>
                  <div className="space-y-4">
                    {selectedRequest.reason && (
                      <div>
                        <Label className="text-sm font-medium">Reason</Label>
                        <p className="text-sm mt-1 p-3 bg-muted/50 rounded">
                          {getReasonDisplayText(selectedRequest.reason)}
                        </p>
                      </div>
                    )}

                    {selectedRequest.requestType === 'backorder' && selectedRequest.businessJustification && (
                      <div>
                        <Label className="text-sm font-medium">Business Justification</Label>
                        <p className="text-sm mt-1 p-3 bg-muted/50 rounded whitespace-pre-wrap">
                          {selectedRequest.businessJustification}
                        </p>
                      </div>
                    )}

                    {selectedRequest.description && (
                      <div>
                        <Label className="text-sm font-medium">Description</Label>
                        <p className="text-sm mt-1 p-3 bg-muted/50 rounded whitespace-pre-wrap">
                          {selectedRequest.description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Admin/Review Notes */}
                {(selectedRequest.reviewNotes || selectedRequest.processingNotes) && (
                  <div>
                    <h4 className="font-semibold mb-3">Admin Response</h4>
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="whitespace-pre-wrap">
                        {selectedRequest.reviewNotes || selectedRequest.processingNotes}
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {/* Actions */}
                {selectedRequest.status === 'pending' && selectedRequest.requestType === 'cancel' && (
                  <div className="flex justify-end pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => {
                        handleWithdrawRequest(selectedRequest._id, selectedRequest.requestNumber);
                        setShowRequestDetailsModal(false);
                      }}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Keep My Number
                    </Button>
                  </div>
                )}

                {/* Status Timeline for Backorder Requests */}
                {selectedRequest.requestType === 'backorder' && (
                  <div>
                    <h4 className="font-semibold mb-3">What Happens Next?</h4>
                    <div className="space-y-3 text-sm">
                      <div className={`flex items-center gap-3 p-3 rounded-lg ${
                        selectedRequest.status === 'pending' ? 'bg-orange-50 border border-orange-200' : 'bg-muted/50'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${
                          selectedRequest.status === 'pending' ? 'bg-orange-500 animate-pulse' : 'bg-muted-foreground'
                        }`}></div>
                        <div>
                          <p className="font-medium">Under Review</p>
                          <p className="text-muted-foreground">
                            Admin team is reviewing your backorder request and business justification
                          </p>
                        </div>
                      </div>
                      
                      <div className={`flex items-center gap-3 p-3 rounded-lg ${
                        selectedRequest.status === 'approved' ? 'bg-green-50 border border-green-200' : 'bg-muted/50'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${
                          selectedRequest.status === 'approved' ? 'bg-green-500' : 'bg-muted-foreground'
                        }`}></div>
                        <div>
                          <p className="font-medium">Assignment & Billing</p>
                          <p className="text-muted-foreground">
                            Number will be assigned to your account and billing will begin
                          </p>
                        </div>
                      </div>

                      {selectedRequest.status === 'rejected' && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
                          <div className="w-2 h-2 rounded-full bg-red-500"></div>
                          <div>
                            <p className="font-medium">Request Rejected</p>
                            <p className="text-muted-foreground">
                              See admin notes above for the reason and next steps
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Phone Number Details Modal */}
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className="sm:max-w-4xl max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader className="pb-4 border-b flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Phone className="h-6 w-6 text-primary" />
                    </div>
                    {t('phoneNumbers.modals.numberDetails.title')}
                  </DialogTitle>
                  <DialogDescription className="text-base mt-2">
                    {t('phoneNumbers.modals.numberDetails.description', { number: selectedNumber?.number || '' })}
                  </DialogDescription>
                </div>
                {selectedNumber && (
                  <div className="flex items-center space-x-3">
                    <Badge variant={getBadgeVariant(getPhoneNumberDisplayStatus(selectedNumber))} className="px-3 py-1.5 text-sm font-medium">
                      {getDisplayStatusText(getPhoneNumberDisplayStatus(selectedNumber))}
                    </Badge>
                    {selectedNumber.backorderOnly && (
                      <Badge variant="outline" className="text-orange-600 border-orange-200 px-3 py-1.5">
                        {t('phoneNumbers.modals.numberDetails.badges.backorderOnly')}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </DialogHeader>
            
            {selectedNumber && (
              <div className="flex-1 overflow-y-auto space-y-6 pr-2 py-2">
                {/* Scroll indicator */}
                <div className="text-center text-xs text-muted-foreground mb-2">
                  {t('phoneNumbers.modals.numberDetails.scrollIndicator')}
                </div>

                {/* Header Information */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 rounded-xl p-6 border border-blue-200/50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-blue-900 dark:text-blue-100">{t('phoneNumbers.modals.numberDetails.sections.numberInfo.title')}</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyToClipboard(selectedNumber.number, 'number')}
                      className="text-xs"
                    >
                      {copiedStates.number ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                          {t('phoneNumbers.modals.numberDetails.buttons.copied')}
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 mr-1" />
                          {t('phoneNumbers.modals.numberDetails.buttons.copyNumber')}
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                      <Label className="text-blue-700 dark:text-blue-300 text-xs font-medium uppercase tracking-wide">{t('phoneNumbers.modals.numberDetails.sections.numberInfo.fields.phoneNumber')}</Label>
                      <p className="font-mono text-xl font-bold text-blue-900 dark:text-blue-100 mt-1">{selectedNumber.number}</p>
                    </div>
                    <div>
                      <Label className="text-blue-700 dark:text-blue-300 text-xs font-medium uppercase tracking-wide">{t('phoneNumbers.modals.numberDetails.sections.numberInfo.fields.country')}</Label>
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mt-1">
                        {selectedNumber.country} (+{selectedNumber.countryCode})
                      </p>
                    </div>
                    <div>
                      <Label className="text-blue-700 dark:text-blue-300 text-xs font-medium uppercase tracking-wide">{t('phoneNumbers.modals.numberDetails.sections.numberInfo.fields.type')}</Label>
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mt-1">{selectedNumber.numberType}</p>
                    </div>
                  </div>
                </div>

                {/* Billing Information */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 rounded-xl p-6 border border-green-200/50">
                  <h3 className="text-xl font-semibold text-green-900 dark:text-green-100 mb-4">{t('phoneNumbers.modals.numberDetails.sections.billing.title')}</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                      <Label className="text-green-700 dark:text-green-300 text-xs font-medium uppercase tracking-wide">Monthly Rate</Label>
                      <p className="text-lg font-bold text-green-900 dark:text-green-100 mt-1">
                        {selectedNumber.monthlyRate ? formatCurrency(selectedNumber.monthlyRate, selectedNumber.currency) : 'Free'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-green-700 dark:text-green-300 text-xs font-medium uppercase tracking-wide">Setup Fee</Label>
                      <p className="text-lg font-bold text-green-900 dark:text-green-100 mt-1">
                        {selectedNumber.setupFee ? formatCurrency(selectedNumber.setupFee, selectedNumber.currency) : 'Free'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-green-700 dark:text-green-300 text-xs font-medium uppercase tracking-wide">Billing Cycle</Label>
                      <p className="text-sm font-medium text-green-800 dark:text-green-200 mt-1 capitalize">{selectedNumber.billingCycle}</p>
                    </div>
                    <div>
                      <Label className="text-green-700 dark:text-green-300 text-xs font-medium uppercase tracking-wide">Next Billing</Label>
                      <p className="text-sm font-medium text-green-800 dark:text-green-200 mt-1">
                        {selectedNumber.nextBillingDate ? formatDate(selectedNumber.nextBillingDate) : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Assignment Information */}
                <div className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/50 dark:to-violet-950/50 rounded-xl p-6 border border-purple-200/50">
                  <h3 className="text-xl font-semibold text-purple-900 dark:text-purple-100 mb-4">Assignment Details</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <Label className="text-purple-700 dark:text-purple-300 text-xs font-medium uppercase tracking-wide">Assigned Date</Label>
                      <p className="text-sm font-medium text-purple-800 dark:text-purple-200 mt-1">
                        {selectedNumber.assignedAt ? formatDate(selectedNumber.assignedAt) : 'Not assigned'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-purple-700 dark:text-purple-300 text-xs font-medium uppercase tracking-wide">Billing Day</Label>
                      <p className="text-sm font-medium text-purple-800 dark:text-purple-200 mt-1">
                        {selectedNumber.billingDayOfMonth ? `${selectedNumber.billingDayOfMonth}${getOrdinalSuffix(selectedNumber.billingDayOfMonth)} of month` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-purple-700 dark:text-purple-300 text-xs font-medium uppercase tracking-wide">Region</Label>
                      <p className="text-sm font-medium text-purple-800 dark:text-purple-200 mt-1">
                        {selectedNumber.region || 'Not specified'}
                      </p>
                    </div>
                  </div>
                  {selectedNumber.timeZone && (
                    <div className="mt-4">
                      <Label className="text-purple-700 dark:text-purple-300 text-xs font-medium uppercase tracking-wide">Time Zone</Label>
                      <p className="text-sm font-medium text-purple-800 dark:text-purple-200 mt-1">{selectedNumber.timeZone}</p>
                    </div>
                  )}
                </div>

                {/* Capabilities */}
                {selectedNumber.capabilities && selectedNumber.capabilities.length > 0 && (
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50 rounded-xl p-6 border border-amber-200/50">
                    <h3 className="text-xl font-semibold text-amber-900 dark:text-amber-100 mb-4">Service Capabilities</h3>
                    <div className="flex flex-wrap gap-3">
                      {selectedNumber.capabilities.map((capability) => (
                        <Badge 
                          key={capability} 
                          variant="secondary" 
                          className="px-4 py-2 text-sm font-medium bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900 dark:text-amber-100"
                        >
                          <div className="flex items-center gap-2">
                            {capability === 'voice' && <Phone className="h-4 w-4" />}
                            {capability === 'sms' && <MessageSquare className="h-4 w-4" />}
                            {capability === 'fax' && <FileText className="h-4 w-4" />}
                            <span className="capitalize">{capability}</span>
                          </div>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Technical Connection Parameters - Enhanced Section */}
                <div className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-950/50 dark:to-gray-950/50 rounded-xl p-6 border-2 border-blue-300 border-dashed">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Terminal className="h-5 w-5" />
                      🔧 {t('phoneNumbers.modals.numberDetails.sections.technical.title')}
                    </h3>
                    {selectedNumber.connectionType && (
                      <Badge variant="outline" className="text-slate-700 border-slate-300 dark:text-slate-300">
                        {selectedNumber.connectionType === 'ip_routing' ? 'IP Routing' : 'Credential-Based'}
                      </Badge>
                    )}
                  </div>
                  
                  {selectedNumber.connectionType ? (
                    <div className="space-y-6">
                      {/* Connection Method Overview */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium uppercase tracking-wide">Connection Method</Label>
                          <div className="mt-2 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${selectedNumber.connectionType === 'ip_routing' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                {selectedNumber.connectionType === 'ip_routing' ? <Globe className="h-4 w-4" /> : <Key className="h-4 w-4" />}
                              </div>
                              <div>
                                <p className="font-medium text-slate-900 dark:text-slate-100">
                                  {selectedNumber.connectionType === 'ip_routing' ? 'IP Address Routing' : 'Username/Password Authentication'}
                                </p>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                  {selectedNumber.connectionType === 'ip_routing' 
                                    ? 'Direct routing based on source IP address' 
                                    : 'Authentication using login credentials'
                                  }
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium uppercase tracking-wide">Configuration Status</Label>
                          <div className="mt-2 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-green-100 text-green-700">
                                <CheckCircle className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-medium text-slate-900 dark:text-slate-100">Configured</p>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Ready for use</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Connection Details */}
                      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                          <Terminal className="h-4 w-4" />
                          Connection Parameters
                        </h4>
                        
                        {selectedNumber.connectionType === 'ip_routing' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {selectedNumber.ipAddress && (
                              <div className="group">
                                <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium uppercase tracking-wide">IP Address</Label>
                                <div className="mt-2 flex items-center gap-2">
                                  <code className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded border font-mono text-sm">
                                    {selectedNumber.ipAddress}
                                  </code>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCopyToClipboard(selectedNumber.ipAddress!, 'ipAddress')}
                                    className="transition-all duration-200"
                                    title="Copy to clipboard"
                                  >
                                    {copiedStates.ipAddress ? (
                                      <CheckCircle className="h-3 w-3 text-green-600" />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            )}
                            {selectedNumber.port && (
                              <div className="group">
                                <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium uppercase tracking-wide">Port</Label>
                                <div className="mt-2 flex items-center gap-2">
                                  <code className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded border font-mono text-sm">
                                    {selectedNumber.port}
                                  </code>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCopyToClipboard(selectedNumber.port!.toString(), 'port')}
                                    className="transition-all duration-200"
                                    title="Copy to clipboard"
                                  >
                                    {copiedStates.port ? (
                                      <CheckCircle className="h-3 w-3 text-green-600" />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {selectedNumber.connectionType === 'credentials' && (
                          <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {selectedNumber.login && (
                                <div className="group">
                                  <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium uppercase tracking-wide">Username</Label>
                                  <div className="mt-2 flex items-center gap-2">
                                    <code className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded border font-mono text-sm">
                                      {selectedNumber.login}
                                    </code>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleCopyToClipboard(selectedNumber.login!, 'login')}
                                      className="transition-all duration-200"
                                      title="Copy to clipboard"
                                    >
                                      {copiedStates.login ? (
                                        <CheckCircle className="h-3 w-3 text-green-600" />
                                      ) : (
                                        <Copy className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              )}
                              {selectedNumber.password && (
                                <div className="group">
                                  <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium uppercase tracking-wide">Password</Label>
                                  <div className="mt-2 flex items-center gap-2">
                                    <code className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded border font-mono text-sm">
                                      ••••••••
                                    </code>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleCopyToClipboard(selectedNumber.password!, 'password')}
                                      className="transition-all duration-200"
                                      title="Copy password to clipboard"
                                    >
                                      {copiedStates.password ? (
                                        <CheckCircle className="h-3 w-3 text-green-600" />
                                      ) : (
                                        <Copy className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {selectedNumber.domain && (
                                <div className="group">
                                  <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium uppercase tracking-wide">Server/Domain</Label>
                                  <div className="mt-2 flex items-center gap-2">
                                    <code className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded border font-mono text-sm">
                                      {selectedNumber.domain}
                                    </code>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleCopyToClipboard(selectedNumber.domain!, 'domain')}
                                      className="transition-all duration-200"
                                      title="Copy to clipboard"
                                    >
                                      {copiedStates.domain ? (
                                        <CheckCircle className="h-3 w-3 text-green-600" />
                                      ) : (
                                        <Copy className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              )}
                              {selectedNumber.credentialsPort && (
                                <div className="group">
                                  <Label className="text-slate-700 dark:text-slate-300 text-xs font-medium uppercase tracking-wide">Port</Label>
                                  <div className="mt-2 flex items-center gap-2">
                                    <code className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded border font-mono text-sm">
                                      {selectedNumber.credentialsPort}
                                    </code>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleCopyToClipboard(selectedNumber.credentialsPort!.toString(), 'credentialsPort')}
                                      className="transition-all duration-200"
                                      title="Copy to clipboard"
                                    >
                                      {copiedStates.credentialsPort ? (
                                        <CheckCircle className="h-3 w-3 text-green-600" />
                                      ) : (
                                        <Copy className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Quick Setup Guide */}
                        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/50 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="flex items-start gap-3">
                            <BookOpen className="h-5 w-5 text-blue-600 mt-0.5" />
                            <div>
                              <p className="font-medium text-blue-900 dark:text-blue-100 text-sm">{t('phoneNumbers.modals.numberDetails.sections.setupInstructions.title')}</p>
                              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                {selectedNumber.connectionType === 'ip_routing' 
                                  ? t('phoneNumbers.modals.numberDetails.sections.setupInstructions.ipRouting', { 
                                      ipAddress: selectedNumber.ipAddress || '', 
                                      port: (selectedNumber.port || 5060).toString() 
                                    })
                                  : t('phoneNumbers.modals.numberDetails.sections.setupInstructions.credentials', { 
                                      login: selectedNumber.login || '', 
                                      domain: selectedNumber.domain || '', 
                                      port: (selectedNumber.credentialsPort || 5060).toString() 
                                    })
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <div className="mx-auto w-16 h-16 bg-yellow-100 dark:bg-yellow-900/50 rounded-full flex items-center justify-center mb-4">
                        <AlertTriangle className="h-8 w-8 text-yellow-600" />
                      </div>
                      <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Configuration Pending</h4>
                      <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
                        Technical connection parameters haven't been configured for this number yet. 
                        Contact our support team for setup assistance.
                      </p>
                      <Button variant="outline" className="gap-2">
                        <HelpCircle className="h-4 w-4" />
                        Contact Support
                      </Button>
                    </div>
                  )}
                </div>

                {/* Description */}
                {selectedNumber.description && (
                  <div className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950/50 dark:to-cyan-950/50 rounded-xl p-6 border border-teal-200/50">
                    <h3 className="text-xl font-semibold text-teal-900 dark:text-teal-100 mb-3">Description</h3>
                    <p className="text-teal-800 dark:text-teal-200 leading-relaxed">{selectedNumber.description}</p>
                  </div>
                )}
              </div>
            )}
            
            <div className="border-t pt-4 mt-6">
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setShowDetailsModal(false)} className="px-6">
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Cancel Request Modal */}
        <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('phoneNumbers.modals.cancelRequest.title')}</DialogTitle>
              <DialogDescription>
                {t('phoneNumbers.modals.cancelRequest.description')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="reason">{t('phoneNumbers.modals.cancelRequest.form.reason.label')}</Label>
                <Select value={cancelForm.reason} onValueChange={(value) => setCancelForm({ ...cancelForm, reason: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('phoneNumbers.modals.cancelRequest.form.reason.placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no_longer_needed">{t('phoneNumbers.modals.cancelRequest.form.reason.options.noLongerNeeded')}</SelectItem>
                    <SelectItem value="cost_reduction">{t('phoneNumbers.modals.cancelRequest.form.reason.options.costReduction')}</SelectItem>
                    <SelectItem value="service_issues">{t('phoneNumbers.modals.cancelRequest.form.reason.options.serviceIssues')}</SelectItem>
                    <SelectItem value="business_closure">{t('phoneNumbers.modals.cancelRequest.form.reason.options.businessClosure')}</SelectItem>
                    <SelectItem value="other">{t('phoneNumbers.modals.cancelRequest.form.reason.options.other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="priority">{t('phoneNumbers.modals.cancelRequest.form.priority.label')}</Label>
                <Select value={cancelForm.priority} onValueChange={(value: RequestPriority) => setCancelForm({ ...cancelForm, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('phoneNumbers.modals.cancelRequest.form.priority.options.low')}</SelectItem>
                    <SelectItem value="medium">{t('phoneNumbers.modals.cancelRequest.form.priority.options.medium')}</SelectItem>
                    <SelectItem value="high">{t('phoneNumbers.modals.cancelRequest.form.priority.options.high')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="scheduledDate">{t('phoneNumbers.modals.cancelRequest.form.scheduledDate.label')}</Label>
                <Input
                  id="scheduledDate"
                  type="date"
                  value={cancelForm.scheduledDate || ''}
                  onChange={(e) => setCancelForm({ ...cancelForm, scheduledDate: e.target.value || undefined })}
                  min={new Date().toISOString().split('T')[0]}
                />
                <p className="text-xs text-muted-foreground mt-1">{t('phoneNumbers.modals.cancelRequest.form.scheduledDate.helper')}</p>
              </div>
              
              <div>
                <Label htmlFor="description">{t('phoneNumbers.modals.cancelRequest.form.description.label')}</Label>
                <Textarea
                  id="description"
                  value={cancelForm.description}
                  onChange={(e) => setCancelForm({ ...cancelForm, description: e.target.value })}
                  placeholder={t('phoneNumbers.modals.cancelRequest.form.description.placeholder')}
                  rows={4}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowCancelModal(false)}>
                {t('phoneNumbers.modals.cancelRequest.buttons.cancel')}
              </Button>
              <Button
                onClick={handleCancelRequest}
                disabled={isSubmitting || !cancelForm.reason}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('phoneNumbers.modals.cancelRequest.buttons.submitting')}
                  </>
                ) : (
                  t('phoneNumbers.modals.cancelRequest.buttons.submit')
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageLayout>
    </MainLayout>
  );
} 