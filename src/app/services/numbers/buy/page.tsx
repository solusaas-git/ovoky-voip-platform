'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Hash,
  Search,
  X,
  Loader2,
  ShoppingCart,
  CheckCircle,
  Calendar,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Package,
  Trash2,
  Check,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, formatCurrency, maskPhoneNumber } from '@/lib/utils';
import { PhoneNumber } from '@/types/phoneNumber';
import { Textarea } from '@/components/ui/textarea';

interface AvailableNumbersResponse {
  phoneNumbers: PhoneNumber[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  filters: {
    countries: string[];
    numberTypes: string[];
  };
}

interface BulkPurchaseResult {
  successful: Array<{
    phoneNumberId: string;
    number: string;
    country: string;
    numberType: string;
    monthlyRate: number;
    setupFee: number;
    currency: string;
    billingCycle: string;
    rateDeckName?: string;
  }>;
  failed: Array<{
    phoneNumberId: string;
    error: string;
    number: string;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
    totalCost: number;
    totalSetupFees: number;
  };
}

export default function BuyNumbersPage() {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [filters, setFilters] = useState({
    countries: [] as string[],
    numberTypes: [] as string[],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Selection states for bulk operations
  const [selectedNumbers, setSelectedNumbers] = useState<Set<string>>(new Set());
  const [isSelectAll, setIsSelectAll] = useState(false);
  
  // Modal states
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showBulkPurchaseModal, setShowBulkPurchaseModal] = useState(false);
  const [showBulkResultModal, setShowBulkResultModal] = useState(false);
  const [showBackorderModal, setShowBackorderModal] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState<PhoneNumber | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isBulkPurchasing, setIsBulkPurchasing] = useState(false);
  const [isSubmittingBackorder, setIsSubmittingBackorder] = useState(false);
  const [bulkPurchaseResult, setBulkPurchaseResult] = useState<BulkPurchaseResult | null>(null);
  
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [numberTypeFilter, setNumberTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState('monthlyRate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Backorder form state
  const [backorderForm, setBackorderForm] = useState({
    reason: '',
    businessJustification: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent'
  });

  const limit = 12;

  useEffect(() => {
    fetchAvailableNumbers();
  }, [currentPage, searchTerm, countryFilter, numberTypeFilter, sortBy, sortOrder]);

  // Reset selections when phone numbers change
  useEffect(() => {
    setSelectedNumbers(new Set());
    setIsSelectAll(false);
  }, [phoneNumbers]);

  const fetchAvailableNumbers = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder,
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (countryFilter !== 'all') params.append('country', countryFilter);
      if (numberTypeFilter !== 'all') params.append('numberType', numberTypeFilter);

      const response = await fetch(`/api/phone-numbers/available?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch available numbers');
      }
      
      const data: AvailableNumbersResponse = await response.json();
      console.log('API Response data:', data);
      console.log('Phone numbers:', data.phoneNumbers?.map(p => ({ 
        number: p.number, 
        monthlyRate: p.monthlyRate, 
        setupFee: p.setupFee 
      })));
      
      setPhoneNumbers(data.phoneNumbers || []);
      setTotal(data.total || 0);
      setCurrentPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
      setFilters(data.filters || { countries: [], numberTypes: [] });
    } catch (error) {
      console.error('Error fetching available numbers:', error);
      toast.error('Failed to load available numbers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSinglePurchase = async () => {
    if (!selectedNumber) return;

    try {
      setIsPurchasing(true);
      const response = await fetch('/api/phone-numbers/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumberId: selectedNumber._id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to purchase number');
      }

      toast.success(`Phone number ${selectedNumber.number} purchased successfully!`);
      setShowPurchaseModal(false);
      setSelectedNumber(null);
      fetchAvailableNumbers(); // Refresh the list
    } catch (error) {
      console.error('Error purchasing number:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to purchase number');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleBulkPurchase = async () => {
    if (selectedNumbers.size === 0) return;

    try {
      setIsBulkPurchasing(true);
      const phoneNumberIds = Array.from(selectedNumbers);
      
      const response = await fetch('/api/phone-numbers/purchase/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumberIds,
        }),
      });

      const result: BulkPurchaseResult = await response.json();
      
      setBulkPurchaseResult(result);
      setShowBulkPurchaseModal(false);
      setShowBulkResultModal(true);
      
      // Clear selections
      setSelectedNumbers(new Set());
      setIsSelectAll(false);
      
      // Refresh the list after bulk purchase
      fetchAvailableNumbers();
      
    } catch (error) {
      console.error('Error bulk purchasing numbers:', error);
      toast.error('Failed to purchase numbers');
    } finally {
      setIsBulkPurchasing(false);
    }
  };

  const handleBackorderRequest = async () => {
    if (!selectedNumber) return;

    try {
      setIsSubmittingBackorder(true);
      const response = await fetch('/api/backorder-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumberId: selectedNumber._id,
          reason: backorderForm.reason,
          businessJustification: backorderForm.businessJustification,
          priority: backorderForm.priority,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit backorder request');
      }

      const result = await response.json();
      toast.success(`Backorder request submitted successfully! Request ID: ${result.request.requestNumber}`);
      setShowBackorderModal(false);
      setSelectedNumber(null);
      setBackorderForm({
        reason: '',
        businessJustification: '',
        priority: 'medium'
      });
    } catch (error) {
      console.error('Error submitting backorder request:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit backorder request');
    } finally {
      setIsSubmittingBackorder(false);
    }
  };

  const handleSelectNumber = (numberId: string, checked: boolean) => {
    // Find the number to check if it's backorder-only
    const number = phoneNumbers.find(n => n._id === numberId);
    if (number?.backorderOnly) {
      toast.warning('Backorder-only numbers cannot be selected for bulk purchase. Please submit individual backorder requests.');
      return;
    }
    
    const newSelected = new Set(selectedNumbers);
    if (checked) {
      if (newSelected.size >= 20) {
        toast.warning('You can only select up to 20 numbers for bulk purchase.');
        return;
      }
      newSelected.add(numberId);
    } else {
      newSelected.delete(numberId);
    }
    setSelectedNumbers(newSelected);
    
    // Update select all state
    const availableForBulk = phoneNumbers.filter(n => !n.backorderOnly);
    setIsSelectAll(newSelected.size === availableForBulk.length && availableForBulk.length > 0);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Only select numbers that are not backorder-only
      const availableForBulk = phoneNumbers.filter(n => !n.backorderOnly);
      const limitedSelection = availableForBulk.slice(0, 20);
      const allIds = new Set(limitedSelection.map(number => number._id));
      setSelectedNumbers(allIds);
      setIsSelectAll(limitedSelection.length === availableForBulk.length);
      
      if (availableForBulk.length > 20) {
        toast.info(`Selected first 20 of ${availableForBulk.length} available numbers.`);
      }
    } else {
      setSelectedNumbers(new Set());
      setIsSelectAll(false);
    }
  };

  const getSelectedNumbers = () => {
    return phoneNumbers.filter(n => selectedNumbers.has(n._id));
  };

  const getTotalCost = () => {
    const selected = getSelectedNumbers();
    const monthlyTotal = selected.reduce((sum, n) => sum + (n.monthlyRate || 0), 0);
    const setupTotal = selected.reduce((sum, n) => sum + (n.setupFee || 0), 0);
    return { monthlyTotal, setupTotal };
  };

  const changePage = (page: number) => {
    setCurrentPage(page);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCountryFilter('all');
    setNumberTypeFilter('all');
    setSortBy('monthlyRate');
    setSortOrder('asc');
    setCurrentPage(1);
  };

  return (
    <MainLayout>
      <PageLayout
        title="Buy Phone Numbers"
        description="Purchase available numbers directly or submit backorder requests for numbers requiring approval"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Services', href: '/services' },
          { label: 'Numbers', href: '/services/numbers' },
          { label: 'Buy Numbers' }
        ]}
      >
        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Search & Filters</CardTitle>
              {phoneNumbers.length > 0 && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={isSelectAll}
                    onCheckedChange={handleSelectAll}
                    className="mr-2"
                  />
                  <Label htmlFor="select-all" className="text-sm font-medium">
                    Select All Direct Purchase ({Math.min(phoneNumbers.filter(n => !n.backorderOnly).length, 20)}{phoneNumbers.filter(n => !n.backorderOnly).length > 20 ? ' of ' + phoneNumbers.filter(n => !n.backorderOnly).length : ''}) - Max 20
                  </Label>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search numbers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {filters.countries.map((country) => (
                    <SelectItem key={country} value={country}>{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={numberTypeFilter} onValueChange={setNumberTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {filters.numberTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={`${sortBy}_${sortOrder}`} onValueChange={(value) => {
                const [field, order] = value.split('_');
                setSortBy(field);
                setSortOrder(order as 'asc' | 'desc');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthlyRate_asc">Price: Low to High</SelectItem>
                  <SelectItem value="monthlyRate_desc">Price: High to Low</SelectItem>
                  <SelectItem value="country_asc">Country A-Z</SelectItem>
                  <SelectItem value="country_desc">Country Z-A</SelectItem>
                  <SelectItem value="number_asc">Number A-Z</SelectItem>
                  <SelectItem value="number_desc">Number Z-A</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {(searchTerm || countryFilter !== 'all' || numberTypeFilter !== 'all' || sortBy !== 'monthlyRate' || sortOrder !== 'asc') && (
              <Button variant="ghost" onClick={clearFilters} className="mt-2">
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{total}</div>
              <p className="text-xs text-muted-foreground">Total Numbers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {phoneNumbers.filter(n => !n.backorderOnly).length}
              </div>
              <p className="text-xs text-muted-foreground">Direct Purchase</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">
                {phoneNumbers.filter(n => n.backorderOnly).length}
              </div>
              <p className="text-xs text-muted-foreground">Backorder Only</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{filters.countries.length}</div>
              <p className="text-xs text-muted-foreground">Countries</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {phoneNumbers.length > 0 ? formatCurrency(Math.min(...phoneNumbers.map(n => n.monthlyRate || 0)), phoneNumbers[0]?.currency || 'USD') : '-'}
              </div>
              <p className="text-xs text-muted-foreground">Starting From</p>
            </CardContent>
          </Card>
        </div>

        {/* Available Numbers Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : phoneNumbers.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Hash className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No numbers available</h3>
                <p className="text-muted-foreground">
                  {searchTerm || countryFilter !== 'all' || numberTypeFilter !== 'all' 
                    ? 'Try adjusting your filters to see more results.'
                    : 'No phone numbers are currently available for purchase.'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {phoneNumbers.map((number) => (
                <Card key={number._id} className={`hover:shadow-lg transition-shadow ${selectedNumbers.has(number._id) ? 'ring-2 ring-green-500 bg-green-50/50' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Checkbox
                        checked={selectedNumbers.has(number._id)}
                        onCheckedChange={(checked) => handleSelectNumber(number._id, !!checked)}
                        className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                        disabled={number.backorderOnly}
                      />
                      <CardTitle className="text-lg font-mono flex-1 min-w-0">{maskPhoneNumber(number.number)}</CardTitle>
                    </div>
                    
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm text-muted-foreground">
                        {number.country} • {number.numberType}
                      </div>
                      {number.backorderOnly ? (
                        <Badge variant="outline" className="text-orange-600 border-orange-200 text-xs whitespace-nowrap">
                          Backorder
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-200 text-xs whitespace-nowrap">
                          Available
                        </Badge>
                      )}
                    </div>
                    
                    <CardDescription className="text-xs text-muted-foreground">
                      {number.backorderOnly 
                        ? 'Requires admin approval for purchase'
                        : 'Full number shown after purchase'
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-xs text-muted-foreground">Monthly Rate</Label>
                        <p className="font-medium text-lg text-green-600">
                          {formatCurrency(number.monthlyRate || 0, number.currency)}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Setup Fee</Label>
                        <p className="font-medium">
                          {number.setupFee ? formatCurrency(number.setupFee, number.currency) : 'Free'}
                        </p>
                      </div>
                    </div>

                    {number.capabilities && number.capabilities.length > 0 && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Capabilities</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {number.capabilities.map((capability) => (
                            <Badge key={capability} variant="secondary" className="text-xs">
                              {capability}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {number.backorderOnly ? (
                      <Button
                        onClick={() => {
                          setSelectedNumber(number);
                          setShowBackorderModal(true);
                        }}
                        className="w-full bg-orange-600 hover:bg-orange-700"
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Request Backorder
                      </Button>
                    ) : (
                      <Button
                        onClick={() => {
                          setSelectedNumber(number);
                          setShowPurchaseModal(true);
                        }}
                        className="w-full bg-green-600 hover:bg-green-700"
                        disabled={selectedNumbers.has(number._id)}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        {selectedNumbers.has(number._id) ? 'Selected for Bulk' : 'Purchase Number'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, total)} of {total} results
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
          </>
        )}

        {/* Floating Bulk Actions Panel */}
        {selectedNumbers.size > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
            <Card className="shadow-xl border-2 border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800">
                      {selectedNumbers.size} number{selectedNumbers.size > 1 ? 's' : ''} selected
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <DollarSign className="h-4 w-4" />
                    <span>
                      Monthly: {formatCurrency(getTotalCost().monthlyTotal, phoneNumbers[0]?.currency || 'USD')}
                      {getTotalCost().setupTotal > 0 && (
                        <> + Setup: {formatCurrency(getTotalCost().setupTotal, phoneNumbers[0]?.currency || 'USD')}</>
                      )}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedNumbers(new Set());
                        setIsSelectAll(false);
                      }}
                      className="border-green-300 text-green-700 hover:bg-green-100"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setShowBulkPurchaseModal(true)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Package className="h-4 w-4 mr-1" />
                      Purchase {selectedNumbers.size} Number{selectedNumbers.size > 1 ? 's' : ''}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Purchase Confirmation Modal */}
        <Dialog open={showPurchaseModal} onOpenChange={setShowPurchaseModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Purchase Phone Number</DialogTitle>
              <DialogDescription>
                Confirm your purchase of {maskPhoneNumber(selectedNumber?.number || '')}
              </DialogDescription>
            </DialogHeader>
            {selectedNumber && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label>Phone Number</Label>
                    <p className="font-mono text-lg">{maskPhoneNumber(selectedNumber.number)}</p>
                    <p className="text-xs text-muted-foreground">Full number provided after purchase</p>
                  </div>
                  <div>
                    <Label>Country</Label>
                    <p>{selectedNumber.country}</p>
                  </div>
                  <div>
                    <Label>Type</Label>
                    <p>{selectedNumber.numberType}</p>
                  </div>
                  <div>
                    <Label>Monthly Rate</Label>
                    <p className="font-semibold text-green-600">
                      {formatCurrency(selectedNumber.monthlyRate || 0, selectedNumber.currency)}
                    </p>
                  </div>
                  <div>
                    <Label>Setup Fee</Label>
                    <p className="font-semibold">
                      {selectedNumber.setupFee && selectedNumber.setupFee > 0 
                        ? formatCurrency(selectedNumber.setupFee, selectedNumber.currency)
                        : 'Free'
                      }
                    </p>
                  </div>
                </div>

                <Alert>
                  <Calendar className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Billing starts today:</strong> Your first billing cycle will begin today ({formatDate(new Date())}) and billing will occur {selectedNumber.billingCycle === 'yearly' ? 'yearly' : 'monthly'}.
                  </AlertDescription>
                </Alert>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    By purchasing this number, you agree to the monthly charges and billing terms. You can cancel anytime through your number management page.
                  </AlertDescription>
                </Alert>
              </div>
            )}
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowPurchaseModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSinglePurchase}
                disabled={isPurchasing}
                className="bg-green-600 hover:bg-green-700"
              >
                {isPurchasing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Purchasing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirm Purchase
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Purchase Confirmation Modal */}
        <Dialog open={showBulkPurchaseModal} onOpenChange={setShowBulkPurchaseModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-green-600" />
                Bulk Purchase Confirmation
              </DialogTitle>
              <DialogDescription>
                Review your bulk purchase of {selectedNumbers.size} phone number{selectedNumbers.size > 1 ? 's' : ''}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-green-50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{selectedNumbers.size}</div>
                  <div className="text-sm text-muted-foreground">Numbers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(getTotalCost().monthlyTotal, phoneNumbers[0]?.currency || 'USD')}
                  </div>
                  <div className="text-sm text-muted-foreground">Monthly Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(getTotalCost().setupTotal, phoneNumbers[0]?.currency || 'USD')}
                  </div>
                  <div className="text-sm text-muted-foreground">Setup Fees</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(getTotalCost().monthlyTotal + getTotalCost().setupTotal, phoneNumbers[0]?.currency || 'USD')}
                  </div>
                  <div className="text-sm text-muted-foreground">First Bill Total</div>
                </div>
              </div>

              {/* Selected Numbers List */}
              <div>
                <h3 className="font-semibold mb-3">Selected Numbers</h3>
                <div className="max-h-60 overflow-y-auto border rounded-lg">
                  <div className="grid gap-2 p-4">
                    {getSelectedNumbers().map((number) => (
                      <div key={number._id} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                        <div className="flex-1">
                          <div className="font-mono font-medium">{maskPhoneNumber(number.number)}</div>
                          <div className="text-sm text-muted-foreground">
                            {number.country} • {number.numberType}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-green-600">
                            {formatCurrency(number.monthlyRate || 0, number.currency)}/mo
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {number.setupFee && number.setupFee > 0 
                              ? `+${formatCurrency(number.setupFee, number.currency)} setup`
                              : 'Free setup'
                            }
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Important Notes */}
              <Alert>
                <Calendar className="h-4 w-4" />
                <AlertDescription>
                  <strong>Billing Information:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                    <li>Billing starts today ({formatDate(new Date())}) for all purchased numbers</li>
                    <li>Monthly charges will be billed on the same date each month</li>
                    <li>Setup fees (if any) are one-time charges</li>
                    <li>You can manage or cancel these numbers anytime from your dashboard</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Bulk Purchase Process:</strong> Numbers will be processed individually. 
                  If some purchases fail, you&apos;ll receive a detailed report showing which numbers 
                  were successfully purchased and which failed with reasons.
                </AlertDescription>
              </Alert>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowBulkPurchaseModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleBulkPurchase}
                disabled={isBulkPurchasing}
                className="bg-green-600 hover:bg-green-700"
              >
                {isBulkPurchasing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirm Bulk Purchase
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Purchase Results Modal */}
        <Dialog open={showBulkResultModal} onOpenChange={setShowBulkResultModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {bulkPurchaseResult?.summary.failed === 0 ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : bulkPurchaseResult?.summary.successful === 0 ? (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                )}
                Bulk Purchase Results
              </DialogTitle>
              <DialogDescription>
                {bulkPurchaseResult?.summary.failed === 0 
                  ? `All ${bulkPurchaseResult.summary.successful} phone numbers purchased successfully!`
                  : bulkPurchaseResult?.summary.successful === 0
                  ? `All ${bulkPurchaseResult.summary.failed} purchases failed.`
                  : `${bulkPurchaseResult?.summary.successful} successful, ${bulkPurchaseResult?.summary.failed} failed.`
                }
              </DialogDescription>
            </DialogHeader>
            
            {bulkPurchaseResult && (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{bulkPurchaseResult.summary.total}</div>
                    <div className="text-sm text-muted-foreground">Total Attempted</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{bulkPurchaseResult.summary.successful}</div>
                    <div className="text-sm text-muted-foreground">Successful</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{bulkPurchaseResult.summary.failed}</div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(
                        bulkPurchaseResult.summary.totalCost + bulkPurchaseResult.summary.totalSetupFees, 
                        bulkPurchaseResult.successful[0]?.currency || 'USD'
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Cost</div>
                  </div>
                </div>

                {/* Successful Purchases */}
                {bulkPurchaseResult.successful.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-green-600 mb-3 flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      Successful Purchases ({bulkPurchaseResult.successful.length})
                    </h3>
                    <div className="max-h-40 overflow-y-auto border rounded-lg">
                      <div className="divide-y">
                        {bulkPurchaseResult.successful.map((result) => (
                          <div key={result.phoneNumberId} className="p-3 flex items-center justify-between">
                            <div>
                              <div className="font-mono font-medium">{result.number}</div>
                              <div className="text-sm text-muted-foreground">
                                {result.country} • {result.numberType}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-green-600">
                                {formatCurrency(result.monthlyRate, result.currency)}/mo
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {result.setupFee && result.setupFee > 0 
                                  ? `+${formatCurrency(result.setupFee, result.currency)} setup`
                                  : 'Free setup'
                                }
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Failed Purchases */}
                {bulkPurchaseResult.failed.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-red-600 mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Failed Purchases ({bulkPurchaseResult.failed.length})
                    </h3>
                    <div className="max-h-40 overflow-y-auto border rounded-lg">
                      <div className="divide-y">
                        {bulkPurchaseResult.failed.map((result, index) => (
                          <div key={`${result.phoneNumberId}-${index}`} className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="font-mono font-medium">{result.number}</div>
                              <Badge variant="destructive">Failed</Badge>
                            </div>
                            <div className="text-sm text-red-600 mt-1">{result.error}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Next Steps */}
                {bulkPurchaseResult.successful.length > 0 && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Next Steps:</strong> Your purchased numbers are now active and can be managed 
                      from your <a href="/services/numbers" className="text-green-600 hover:underline">Numbers Dashboard</a>. 
                      Billing records have been created and will appear in your billing section.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowBulkResultModal(false)}
              >
                Close
              </Button>
              {bulkPurchaseResult?.successful.length && bulkPurchaseResult.successful.length > 0 && (
                <Button 
                  onClick={() => window.location.href = '/services/numbers'}
                  className="bg-green-600 hover:bg-green-700"
                >
                  View My Numbers
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Backorder Request Modal */}
        <Dialog open={showBackorderModal} onOpenChange={setShowBackorderModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Submit Backorder Request</DialogTitle>
              <DialogDescription>
                Request admin approval to purchase {selectedNumber?.number}
              </DialogDescription>
            </DialogHeader>
            
            {selectedNumber && (
              <div className="space-y-6">
                {/* Number Details */}
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Phone Number</Label>
                      <p className="font-mono font-medium">{selectedNumber.number}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Monthly Rate</Label>
                      <p className="font-medium text-green-600">
                        {formatCurrency(selectedNumber.monthlyRate || 0, selectedNumber.currency)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Country & Type</Label>
                      <p>{selectedNumber.country} • {selectedNumber.numberType}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Setup Fee</Label>
                      <p>{selectedNumber.setupFee ? formatCurrency(selectedNumber.setupFee, selectedNumber.currency) : 'Free'}</p>
                    </div>
                  </div>
                </div>

                {/* Request Form */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="priority">Priority Level</Label>
                    <Select value={backorderForm.priority} onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') => setBackorderForm({...backorderForm, priority: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low - No rush</SelectItem>
                        <SelectItem value="medium">Medium - Standard processing</SelectItem>
                        <SelectItem value="high">High - Priority processing</SelectItem>
                        <SelectItem value="urgent">Urgent - Immediate attention</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="reason">Reason for Request</Label>
                    <Input
                      id="reason"
                      value={backorderForm.reason}
                      onChange={(e) => setBackorderForm({...backorderForm, reason: e.target.value})}
                      placeholder="Brief reason for requesting this number..."
                      maxLength={200}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {backorderForm.reason.length}/200 characters
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="businessJustification">Business Justification</Label>
                    <Textarea
                      id="businessJustification"
                      value={backorderForm.businessJustification}
                      onChange={(e) => setBackorderForm({...backorderForm, businessJustification: e.target.value})}
                      placeholder="Provide detailed business justification for why you need this specific number..."
                      rows={4}
                      maxLength={1000}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {backorderForm.businessJustification.length}/1000 characters
                    </p>
                  </div>
                </div>

                {/* Important Information */}
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Backorder Process:</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                      <li>Your request will be reviewed by our admin team</li>
                      <li>You&apos;ll receive email notifications about status updates</li>
                      <li>If approved, the number will be automatically assigned to your account</li>
                      <li>Billing will start only after approval and assignment</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </div>
            )}
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowBackorderModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleBackorderRequest}
                disabled={isSubmittingBackorder || !backorderForm.reason.trim() || !backorderForm.businessJustification.trim()}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {isSubmittingBackorder ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4 mr-2" />
                    Submit Request
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageLayout>
    </MainLayout>
  );
} 