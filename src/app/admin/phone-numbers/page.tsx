'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Hash, 
  Search,
  Plus,
  Trash2,
  Eye,
  UserPlus,
  UserMinus,
  Download,
  Upload,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Edit,
  Ban,
  Pause,
  Shield,
  MoreVertical,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import { formatDate, formatCurrency } from '@/lib/utils';
import { PhoneNumber, PhoneNumberFilters, CreatePhoneNumberForm, AssignPhoneNumberForm, PhoneNumberType, PhoneNumberCapability, PhoneNumberStatus, BillingCycle, ConnectionType } from '@/types/phoneNumber';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useTranslations } from '@/lib/i18n';

interface User {
  _id: string;
  name?: string;
  email: string;
  company?: string;
  onboarding?: {
    companyName?: string;
  };
}

interface RateDeck {
  _id: string;
  name: string;
  description?: string;
  currency: string;
}

interface RateDeckApiResponse {
  id: string;
  name: string;
  description?: string;
  currency: string;
}

interface Country {
  _id: string;
  name: string;
  code: string;
  phoneCode: string;
}

interface Provider {
  _id: string;
  name: string;
  description?: string;
  services: string[];
}

export default function AdminPhoneNumbersPage() {
  const { t } = useTranslations();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [rateDeckOptions, setRateDeckOptions] = useState<RateDeck[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showUnassignModal, setShowUnassignModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [showBulkUnassignModal, setShowBulkUnassignModal] = useState(false);
  const [showBulkUnassignConfirm, setShowBulkUnassignConfirm] = useState(false);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showUnreserveModal, setShowUnreserveModal] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState<PhoneNumber | null>(null);
  const [selectedNumberDetails, setSelectedNumberDetails] = useState<PhoneNumber | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
  // Bulk selection states
  const [selectedNumbers, setSelectedNumbers] = useState<Set<string>>(new Set());
  const [isSelectAllChecked, setIsSelectAllChecked] = useState(false);
  
  // Copy button states
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  
  // Filter states
  const [filters, setFilters] = useState<PhoneNumberFilters>({
    search: '',
    status: undefined,
    country: undefined,
    numberType: undefined,
    assignedTo: undefined,
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  
  // Form states
  const [createForm, setCreateForm] = useState<CreatePhoneNumberForm>({
    number: '',
    country: '',
    countryCode: '',
    numberType: 'Geographic/Local' as PhoneNumberType,
    provider: '',
    rateDeckId: '',
    currency: 'USD',
    backorderOnly: false,
    billingCycle: 'monthly',
    billingDayOfMonth: 1,
    capabilities: ['voice'] as PhoneNumberCapability[],
    // Technical connection parameters
    connectionType: undefined,
    ipAddress: '',
    port: undefined,
    login: '',
    password: '',
    domain: '',
    credentialsPort: undefined
  });
  
  const [assignForm, setAssignForm] = useState<AssignPhoneNumberForm>({
    userId: '',
    billingStartDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [unassignForm, setUnassignForm] = useState({
    reason: '',
    cancelPendingBilling: true,
    createRefund: false,
    refundAmount: 0
  });

  const [editForm, setEditForm] = useState<CreatePhoneNumberForm>({
    number: '',
    country: '',
    countryCode: '',
    numberType: 'Geographic/Local' as PhoneNumberType,
    provider: '',
    rateDeckId: '',
    currency: 'USD',
    backorderOnly: false,
    billingCycle: 'monthly',
    billingDayOfMonth: 1,
    capabilities: ['voice'] as PhoneNumberCapability[],
    // Technical connection parameters
    connectionType: undefined,
    ipAddress: '',
    port: undefined,
    login: '',
    password: '',
    domain: '',
    credentialsPort: undefined
  });

  const [reserveForm, setReserveForm] = useState({
    reason: '',
    reservedUntil: '',
    notes: ''
  });

  const [suspendForm, setSuspendForm] = useState({
    reason: '',
    suspendBilling: true,
    autoResumeDate: '',
    notes: ''
  });

  const [cancelForm, setCancelForm] = useState({
    reason: '',
    cancelBilling: true,
    createRefund: false,
    refundAmount: 0,
    gracePeriodDays: 30,
    notes: ''
  });

  const [unreserveForm, setUnreserveForm] = useState({
    reason: '',
    notes: ''
  });

  const handleCopyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [key]: true }));
      toast.success(t('phoneNumbers.admin.messages.success.copied'));
      
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch {
      toast.error(t('phoneNumbers.admin.messages.error.copyFailed'));
    }
  };

  const fetchPhoneNumbers = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v));
          } else {
            params.append(key, value.toString());
          }
        }
      });

      const response = await fetch(`/api/admin/phone-numbers?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch phone numbers');
      }
      
      const data = await response.json();
      setPhoneNumbers(data.phoneNumbers || []);
      setTotal(data.total || 0);
      setCurrentPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
              console.error('Error fetching phone numbers:', error);
        toast.error(t('phoneNumbers.admin.messages.error.loadNumbers'));
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchPhoneNumbers();
    fetchUsers();
    fetchRateDecks();
    fetchCountries();
    fetchProviders();
  }, [filters, fetchPhoneNumbers]);

  // Clear selections when phone numbers data changes
  useEffect(() => {
    setSelectedNumbers(new Set());
    setIsSelectAllChecked(false);
  }, [phoneNumbers]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users?limit=100&includeOnboarding=true');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchRateDecks = async () => {
    try {
      const response = await fetch('/api/rates/numbers/decks');
      if (response.ok) {
        const data = await response.json();
        // Map the API response to match our interface
        const mappedRateDecks = (data.rateDecks || []).map((deck: RateDeckApiResponse) => ({
          _id: deck.id,
          name: deck.name,
          description: deck.description,
          currency: deck.currency
        }));
        setRateDeckOptions(mappedRateDecks);
      }
    } catch (error) {
      console.error('Error fetching rate decks:', error);
    }
  };

  const fetchCountries = async () => {
    try {
      const response = await fetch('/api/admin/countries?isActive=true&limit=1000');
      if (response.ok) {
        const data = await response.json();
        setCountries(data.countries || []);
      }
    } catch (error) {
      console.error('Error fetching countries:', error);
    }
  };

  const fetchProviders = async () => {
    try {
      const response = await fetch('/api/admin/providers?isActive=true&limit=1000');
      if (response.ok) {
        const data = await response.json();
        setProviders(data.providers || []);
      }
    } catch (error) {
      console.error('Error fetching providers:', error);
    }
  };

  const handleCreatePhoneNumber = async () => {
    try {
      setIsSubmitting(true);
      const response = await fetch('/api/admin/phone-numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create phone number');
      }

      toast.success(t('phoneNumbers.admin.messages.success.numberCreated'));
      setShowCreateModal(false);
      resetCreateForm();
      fetchPhoneNumbers();
    } catch (error) {
      console.error('Error creating phone number:', error);
      toast.error(error instanceof Error ? error.message : t('phoneNumbers.admin.messages.error.createNumber'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignPhoneNumber = async () => {
    if (!selectedNumber) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/admin/phone-numbers/${selectedNumber._id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignForm),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign phone number');
      }

      toast.success(t('phoneNumbers.admin.messages.success.numberAssigned'));
      setShowAssignModal(false);
      setAssignForm({
        userId: '',
        billingStartDate: new Date().toISOString().split('T')[0],
        notes: ''
      });
      setSelectedNumber(null);
      fetchPhoneNumbers();
    } catch (error) {
      console.error('Error assigning phone number:', error);
      toast.error(error instanceof Error ? error.message : t('phoneNumbers.admin.messages.error.assignNumber'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnassignPhoneNumber = async () => {
    if (!selectedNumber) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/admin/phone-numbers/${selectedNumber._id}/unassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(unassignForm),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to unassign phone number');
      }

      await response.json();
      toast.success(t('phoneNumbers.admin.messages.success.numberUnassigned'));
      setShowUnassignModal(false);
      setUnassignForm({
        reason: '',
        cancelPendingBilling: true,
        createRefund: false,
        refundAmount: 0
      });
      
      // Refresh the phone number details if details modal is open
      if (showDetailsModal && selectedNumber) {
        await fetchPhoneNumberDetails(selectedNumber._id);
      }
      
      fetchPhoneNumbers();
    } catch (error) {
      console.error('Error unassigning phone number:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to unassign phone number');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditPhoneNumber = async () => {
    if (!selectedNumber) return;
    
    try {
      setIsSubmitting(true);
      
      const response = await fetch(`/api/admin/phone-numbers/${selectedNumber._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update phone number');
      }

      toast.success(t('phoneNumbers.admin.messages.success.numberUpdated'));
      setShowEditModal(false);
      setSelectedNumber(null);
      fetchPhoneNumbers(); // Refresh the list
    } catch (error) {
      console.error('Error updating phone number:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update phone number');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePhoneNumber = async (id: string) => {
    if (!confirm('Are you sure you want to delete this phone number?')) return;

    try {
      const response = await fetch(`/api/admin/phone-numbers/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete phone number');
      }

      toast.success(t('phoneNumbers.admin.messages.success.numberDeleted'));
      fetchPhoneNumbers();
    } catch (error) {
      console.error('Error deleting phone number:', error);
      toast.error(error instanceof Error ? error.message : t('phoneNumbers.admin.messages.error.deleteNumber'));
    }
  };

  // Bulk selection handlers
  const handleSelectNumber = (numberId: string, checked: boolean) => {
    const newSelected = new Set(selectedNumbers);
    if (checked) {
      newSelected.add(numberId);
    } else {
      newSelected.delete(numberId);
    }
    setSelectedNumbers(newSelected);
    
    // Update select all state
    setIsSelectAllChecked(newSelected.size === phoneNumbers.length && phoneNumbers.length > 0);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(phoneNumbers.map(number => number._id));
      setSelectedNumbers(allIds);
      setIsSelectAllChecked(true);
    } else {
      setSelectedNumbers(new Set());
      setIsSelectAllChecked(false);
    }
  };

  const handleBulkAssign = async () => {
    if (!assignForm.userId) return;
    
    const availableNumbers = phoneNumbers.filter(number => 
      selectedNumbers.has(number._id) && number.status === 'available'
    );
    
    if (availableNumbers.length === 0) {
      toast.error('No available numbers selected for assignment');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Process assignments in parallel
      const assignmentPromises = availableNumbers.map(number =>
        fetch(`/api/admin/phone-numbers/${number._id}/assign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(assignForm),
        })
      );

      const results = await Promise.allSettled(assignmentPromises);
      
      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.length - successful;
      
      if (successful > 0) {
        toast.success(t('phoneNumbers.admin.messages.success.bulkAssigned'));
      }
      if (failed > 0) {
        toast.error(`${failed} phone numbers failed to assign`);
      }
      
      setShowBulkAssignModal(false);
      setSelectedNumbers(new Set());
      setIsSelectAllChecked(false);
      setAssignForm({
        userId: '',
        billingStartDate: new Date().toISOString().split('T')[0],
        notes: ''
      });
      fetchPhoneNumbers();
    } catch (error) {
      console.error('Error bulk assigning phone numbers:', error);
      toast.error('Failed to assign phone numbers');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkDelete = async () => {
    const deletableNumbers = phoneNumbers.filter(number => 
      selectedNumbers.has(number._id) && number.status !== 'assigned'
    );
    
    if (deletableNumbers.length === 0) {
      toast.error('No deletable numbers selected (assigned numbers cannot be deleted)');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete ${deletableNumbers.length} phone numbers? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Process deletions in parallel
      const deletionPromises = deletableNumbers.map(number =>
        fetch(`/api/admin/phone-numbers/${number._id}`, {
          method: 'DELETE',
        })
      );

      const results = await Promise.allSettled(deletionPromises);
      
      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.length - successful;
      
      if (successful > 0) {
        toast.success(t('phoneNumbers.admin.messages.success.bulkDeleted'));
      }
      if (failed > 0) {
        toast.error(`${failed} phone numbers failed to delete`);
      }
      
      setSelectedNumbers(new Set());
      setIsSelectAllChecked(false);
      fetchPhoneNumbers();
    } catch (error) {
      console.error('Error bulk deleting phone numbers:', error);
      toast.error('Failed to delete phone numbers');
    } finally {
      setIsSubmitting(false);
    }
  };



  const confirmBulkUnassign = async () => {
    const assignedNumbers = phoneNumbers.filter(number => 
      selectedNumbers.has(number._id) && number.status === 'assigned'
    );

    try {
      setIsSubmitting(true);
      
      const response = await fetch('/api/admin/phone-numbers/bulk-unassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumberIds: assignedNumbers.map(number => number._id),
          reason: unassignForm.reason || 'Bulk unassigned by admin',
          cancelPendingBilling: unassignForm.cancelPendingBilling,
          createRefund: unassignForm.createRefund,
          refundAmount: unassignForm.refundAmount,
        }),
      });

      const result = await response.json();
      
      if (result.summary.successful > 0) {
        toast.success(`${result.summary.successful} phone numbers unassigned successfully`);
      }
      if (result.summary.failed > 0) {
        toast.error(`${result.summary.failed} phone numbers failed to unassign`);
      }
      
      setShowBulkUnassignModal(false);
      setShowBulkUnassignConfirm(false);
      setSelectedNumbers(new Set());
      setIsSelectAllChecked(false);
      setUnassignForm({
        reason: '',
        cancelPendingBilling: true,
        createRefund: false,
        refundAmount: 0
      });
      fetchPhoneNumbers();
    } catch (error) {
      console.error('Error bulk unassigning phone numbers:', error);
      toast.error('Failed to unassign phone numbers');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchPhoneNumberDetails = async (phoneNumberId: string) => {
    try {
      setIsLoadingDetails(true);
      const response = await fetch(`/api/admin/phone-numbers/${phoneNumberId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch phone number details');
      }
      
      const data = await response.json();
      setSelectedNumberDetails(data);
    } catch (error) {
      console.error('Error fetching phone number details:', error);
      toast.error('Failed to load phone number details');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      number: '',
      country: '',
      countryCode: '',
      numberType: 'Geographic/Local' as PhoneNumberType,
      provider: '',
      rateDeckId: '',
      currency: 'USD',
      backorderOnly: false,
      billingCycle: 'monthly',
      billingDayOfMonth: 1,
      capabilities: ['voice'] as PhoneNumberCapability[],
      // Technical connection parameters
      connectionType: undefined,
      ipAddress: '',
      port: undefined,
      login: '',
      password: '',
      domain: '',
      credentialsPort: undefined
    });
  };

  const updateFilters = (newFilters: Partial<PhoneNumberFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const changePage = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'available': return 'default';
      case 'assigned': return 'secondary';
      case 'reserved': return 'outline';
      case 'suspended': return 'destructive';
      case 'cancelled': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <CheckCircle className="h-4 w-4" />;
      case 'assigned': return <UserPlus className="h-4 w-4" />;
      case 'reserved': return <Clock className="h-4 w-4" />;
      case 'suspended': return <XCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  // Helper function to parse audit trail
  const parseAuditTrail = (notes: string) => {
    if (!notes) return [];
    
    const entries = notes.split('\n\n').filter(entry => entry.trim());
    return entries.map((entry, index) => {
      const lines = entry.split('\n');
      const firstLine = lines[0] || '';
      
      // Extract action type and basic info
      let actionType = 'OTHER';
      let actionIcon = <AlertCircle className="h-4 w-4" />;
      let actionColor = 'gray';
      
      if (firstLine.includes('RESERVED')) {
        actionType = 'RESERVED';
        actionIcon = <Shield className="h-4 w-4" />;
        actionColor = 'blue';
      } else if (firstLine.includes('UNRESERVED')) {
        actionType = 'UNRESERVED';
        actionIcon = <Shield className="h-4 w-4" />;
        actionColor = 'green';
      } else if (firstLine.includes('SUSPENDED')) {
        actionType = 'SUSPENDED';
        actionIcon = <Pause className="h-4 w-4" />;
        actionColor = 'orange';
      } else if (firstLine.includes('CANCELLED')) {
        actionType = 'CANCELLED';
        actionIcon = <Ban className="h-4 w-4" />;
        actionColor = 'red';
      } else if (firstLine.includes('ASSIGNED')) {
        actionType = 'ASSIGNED';
        actionIcon = <UserPlus className="h-4 w-4" />;
        actionColor = 'green';
      } else if (firstLine.includes('UNASSIGNED')) {
        actionType = 'UNASSIGNED';
        actionIcon = <UserMinus className="h-4 w-4" />;
        actionColor = 'orange';
      }
      
      // Extract timestamp
      const timestampMatch = firstLine.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/);
      const timestamp = timestampMatch ? timestampMatch[1] : '';
      
      // Extract user
      const userMatch = firstLine.match(/by ([^\s]+)/);
      const user = userMatch ? userMatch[1] : 'Unknown';
      
      // Extract reason
      const reasonLine = lines.find(line => line.startsWith('Reason:'));
      const reason = reasonLine ? reasonLine.replace('Reason:', '').trim() : '';
      
      // Extract notes
      const notesLine = lines.find(line => line.startsWith('Notes:'));
      const notes = notesLine ? notesLine.replace('Notes:', '').trim() : '';
      
      // Extract additional details
      const details = lines.filter(line => 
        !line.includes(actionType) && 
        !line.startsWith('Reason:') && 
        !line.startsWith('Notes:') &&
        line.trim()
      );
      
      return {
        id: index,
        actionType,
        actionIcon,
        actionColor,
        timestamp,
        user,
        reason,
        notes,
        details,
        fullEntry: entry
      };
    }).reverse(); // Reverse to show newest first
  };

  const handleReservePhoneNumber = async () => {
    if (!selectedNumber) return;
    
    try {
      setIsSubmitting(true);
      
      const response = await fetch(`/api/admin/phone-numbers/${selectedNumber._id}/reserve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reserveForm),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reserve phone number');
      }

      toast.success(t('phoneNumbers.admin.messages.success.numberReserved'));
      setShowReserveModal(false);
      setReserveForm({ reason: '', reservedUntil: '', notes: '' });
      setSelectedNumber(null);
      fetchPhoneNumbers();
    } catch (error) {
      console.error('Error reserving phone number:', error);
      toast.error(error instanceof Error ? error.message : t('phoneNumbers.admin.messages.error.reserveNumber'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuspendPhoneNumber = async () => {
    if (!selectedNumber) return;
    
    try {
      setIsSubmitting(true);
      
      const response = await fetch(`/api/admin/phone-numbers/${selectedNumber._id}/suspend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(suspendForm),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to suspend phone number');
      }

      toast.success(t('phoneNumbers.admin.messages.success.numberSuspended'));
      setShowSuspendModal(false);
      setSuspendForm({ reason: '', suspendBilling: true, autoResumeDate: '', notes: '' });
      setSelectedNumber(null);
      fetchPhoneNumbers();
    } catch (error) {
      console.error('Error suspending phone number:', error);
      toast.error(error instanceof Error ? error.message : t('phoneNumbers.admin.messages.error.suspendNumber'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelPhoneNumber = async () => {
    if (!selectedNumber) return;
    
    try {
      setIsSubmitting(true);
      
      const response = await fetch(`/api/admin/phone-numbers/${selectedNumber._id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cancelForm),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel phone number');
      }

      const result = await response.json();
      toast.success(t('phoneNumbers.admin.messages.success.numberCancelled'));
      if (result.gracePeriodDays > 0) {
        toast.info(`Number will be permanently deleted after ${result.gracePeriodDays} days`);
      }
      
      setShowCancelModal(false);
      setCancelForm({ reason: '', cancelBilling: true, createRefund: false, refundAmount: 0, gracePeriodDays: 30, notes: '' });
      setSelectedNumber(null);
      fetchPhoneNumbers();
    } catch (error) {
      console.error('Error cancelling phone number:', error);
      toast.error(error instanceof Error ? error.message : t('phoneNumbers.admin.messages.error.cancelNumber'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnreservePhoneNumber = async () => {
    if (!selectedNumber) return;
    
    try {
      setIsSubmitting(true);
      
      const response = await fetch(`/api/admin/phone-numbers/${selectedNumber._id}/unreserve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(unreserveForm),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to unreserve phone number');
      }

      toast.success(t('phoneNumbers.admin.messages.success.numberUnreserved'));
      
      setShowUnreserveModal(false);
      setUnreserveForm({ reason: '', notes: '' });
      setSelectedNumber(null);
      fetchPhoneNumbers();
    } catch (error) {
      console.error('Error unreserving phone number:', error);
      toast.error(error instanceof Error ? error.message : t('phoneNumbers.admin.messages.error.unreserveNumber'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading spinner while auth is loading
  if (isAuthLoading) {
    return (
      <MainLayout>
        <PageLayout
          title={t('phoneNumbers.admin.page.loading.title')}
          description={t('phoneNumbers.admin.page.loading.description')}
          breadcrumbs={[
            { label: t('phoneNumbers.admin.page.breadcrumbs.dashboard'), href: '/dashboard' },
            { label: t('phoneNumbers.admin.page.breadcrumbs.admin'), href: '/admin' },
            { label: t('phoneNumbers.admin.page.breadcrumbs.phoneNumbers') }
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
          title={t('phoneNumbers.admin.page.accessDenied.title')}
          description={t('phoneNumbers.admin.page.accessDenied.description')}
          breadcrumbs={[
            { label: t('phoneNumbers.admin.page.breadcrumbs.dashboard'), href: '/dashboard' },
            { label: t('phoneNumbers.admin.page.breadcrumbs.phoneNumbers') }
          ]}
        >
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('phoneNumbers.admin.page.accessDenied.message')}
            </AlertDescription>
          </Alert>
        </PageLayout>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageLayout
        title={t('phoneNumbers.admin.page.title')}
        description={t('phoneNumbers.admin.page.description')}
        breadcrumbs={[
          { label: t('phoneNumbers.admin.page.breadcrumbs.dashboard'), href: '/dashboard' },
          { label: t('phoneNumbers.admin.page.breadcrumbs.admin'), href: '/admin' },
          { label: t('phoneNumbers.admin.page.breadcrumbs.phoneNumbers') }
        ]}
        headerActions={
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('phoneNumbers.admin.actions.addNumber')}
              </Button>
            </DialogTrigger>
          </Dialog>
        }
      >
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('phoneNumbers.admin.filters.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder={t('phoneNumbers.admin.filters.searchPlaceholder')}
                  value={filters.search || ''}
                  onChange={(e) => updateFilters({ search: e.target.value })}
                  className="pl-10"
                />
              </div>
              
              <Select value={Array.isArray(filters.status) ? filters.status[0] || 'all' : filters.status || 'all'} onValueChange={(value) => updateFilters({ status: value === 'all' ? undefined : [value] as PhoneNumberStatus[] })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('phoneNumbers.admin.filters.statuses.all')} />
                </SelectTrigger>
                <SelectContent>
                  {[
                    { id: 'all', label: t('phoneNumbers.admin.filters.statuses.all'), value: 'all' },
                    { id: 'available', label: t('phoneNumbers.admin.filters.statuses.available'), value: 'available' },
                    { id: 'assigned', label: t('phoneNumbers.admin.filters.statuses.assigned'), value: 'assigned' },
                    { id: 'reserved', label: t('phoneNumbers.admin.filters.statuses.reserved'), value: 'reserved' },
                    { id: 'suspended', label: t('phoneNumbers.admin.filters.statuses.suspended'), value: 'suspended' },
                    { id: 'cancelled', label: t('phoneNumbers.admin.filters.statuses.cancelled'), value: 'cancelled' }
                  ].map(option => (
                    <SelectItem key={option.id} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={Array.isArray(filters.country) ? filters.country[0] || 'all' : filters.country || 'all'} onValueChange={(value) => updateFilters({ country: value === 'all' ? undefined : [value] })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('phoneNumbers.admin.filters.countries.all')} />
                </SelectTrigger>
                <SelectContent>
                  {[
                    { id: 'all', label: t('phoneNumbers.admin.filters.countries.all'), value: 'all' },
                    ...countries
                      .filter(country => country._id) // Filter out countries with undefined/null IDs
                      .map((country, index) => ({
                        id: `country-${country._id || index}`,
                        label: `${country.name} (+${country.phoneCode})`,
                        value: country.name
                      }))
                  ].map(option => (
                    <SelectItem key={option.id} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={Array.isArray(filters.numberType) ? filters.numberType[0] || 'all' : filters.numberType || 'all'} onValueChange={(value) => updateFilters({ numberType: value === 'all' ? undefined : [value] as PhoneNumberType[] })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('phoneNumbers.admin.filters.types.all')} />
                </SelectTrigger>
                <SelectContent>
                  {[
                    { id: 'all', label: t('phoneNumbers.admin.filters.types.all'), value: 'all' },
                    { id: 'geographic', label: t('phoneNumbers.admin.filters.types.geographic'), value: 'Geographic/Local' },
                    { id: 'mobile', label: t('phoneNumbers.admin.filters.types.mobile'), value: 'Mobile' },
                    { id: 'national', label: t('phoneNumbers.admin.filters.types.national'), value: 'National' },
                    { id: 'tollfree', label: t('phoneNumbers.admin.filters.types.tollfree'), value: 'Toll-free' },
                    { id: 'shared', label: t('phoneNumbers.admin.filters.types.shared'), value: 'Shared Cost' },
                    { id: 'npv', label: t('phoneNumbers.admin.filters.types.npv'), value: 'NPV (Verified Numbers)' },
                    { id: 'premium', label: t('phoneNumbers.admin.filters.types.premium'), value: 'Premium' }
                  ].map(option => (
                    <SelectItem key={option.id} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.assignedTo || 'all'} onValueChange={(value) => updateFilters({ assignedTo: value === 'all' ? undefined : value })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('phoneNumbers.admin.filters.users.all')} />
                </SelectTrigger>
                <SelectContent>
                  {[
                    { id: 'all', label: t('phoneNumbers.admin.filters.users.all'), value: 'all' },
                    { id: 'unassigned', label: t('phoneNumbers.admin.filters.users.unassigned'), value: 'unassigned' },
                    ...users
                      .filter(user => user._id && user._id !== '') // More specific filter - allow users with valid non-empty IDs
                      .map((user, index) => ({
                        id: `user-${user._id || index}`,
                        label: `${user.name || user.email} (${user.onboarding?.companyName || user.company || user.email})`,
                        value: user._id
                      }))
                  ].map(option => (
                    <SelectItem key={option.id} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card key="total">
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{total}</div>
              <p className="text-xs text-muted-foreground">{t('phoneNumbers.admin.stats.totalNumbers')}</p>
            </CardContent>
          </Card>
          <Card key="available">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {phoneNumbers.filter(n => n.status === 'available').length}
              </div>
              <p className="text-xs text-muted-foreground">{t('phoneNumbers.admin.stats.available')}</p>
            </CardContent>
          </Card>
          <Card key="assigned">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {phoneNumbers.filter(n => n.status === 'assigned').length}
              </div>
              <p className="text-xs text-muted-foreground">{t('phoneNumbers.admin.stats.assigned')}</p>
            </CardContent>
          </Card>
          <Card key="reserved">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">
                {phoneNumbers.filter(n => n.status === 'reserved').length}
              </div>
              <p className="text-xs text-muted-foreground">{t('phoneNumbers.admin.stats.reserved')}</p>
            </CardContent>
          </Card>
          <Card key="inactive">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">
                {phoneNumbers.filter(n => n.status === 'suspended' || n.status === 'cancelled').length}
              </div>
              <p className="text-xs text-muted-foreground">{t('phoneNumbers.admin.stats.inactive')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Phone Numbers Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t('phoneNumbers.admin.table.title', { count: total.toString() })}</CardTitle>
              <div className="flex space-x-2">
                {selectedNumbers.size > 0 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowBulkAssignModal(true)}
                      disabled={phoneNumbers.filter(n => selectedNumbers.has(n._id) && n.status === 'available').length === 0}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      {t('phoneNumbers.admin.table.bulkActions.bulkAssign', { count: phoneNumbers.filter(n => selectedNumbers.has(n._id) && n.status === 'available').length.toString() })}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowBulkUnassignModal(true)}
                      disabled={phoneNumbers.filter(n => selectedNumbers.has(n._id) && n.status === 'assigned').length === 0}
                    >
                      <UserMinus className="h-4 w-4 mr-2" />
                      {t('phoneNumbers.admin.table.bulkActions.bulkUnassign', { count: phoneNumbers.filter(n => selectedNumbers.has(n._id) && n.status === 'assigned').length.toString() })}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkDelete}
                      disabled={phoneNumbers.filter(n => selectedNumbers.has(n._id) && n.status !== 'assigned').length === 0 || isSubmitting}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('phoneNumbers.admin.table.bulkActions.bulkDelete', { count: phoneNumbers.filter(n => selectedNumbers.has(n._id) && n.status !== 'assigned').length.toString() })}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedNumbers(new Set());
                        setIsSelectAllChecked(false);
                      }}
                    >
                      {t('phoneNumbers.admin.actions.clearSelection')}
                    </Button>
                  </>
                )}
                <Button key="export" variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  {t('phoneNumbers.admin.actions.export')}
                </Button>
                <Button key="import" variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  {t('phoneNumbers.admin.actions.import')}
                </Button>
              </div>
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
                      <TableHead className="w-12">
                        <Checkbox
                          checked={isSelectAllChecked}
                          onCheckedChange={handleSelectAll}
                          aria-label={t('phoneNumbers.admin.table.headers.selectAll')}
                        />
                      </TableHead>
                      <TableHead>{t('phoneNumbers.admin.table.headers.number')}</TableHead>
                      <TableHead>{t('phoneNumbers.admin.table.headers.country')}</TableHead>
                      <TableHead>{t('phoneNumbers.admin.table.headers.type')}</TableHead>
                      <TableHead>{t('phoneNumbers.admin.table.headers.status')}</TableHead>
                      <TableHead>{t('phoneNumbers.admin.table.headers.assignedTo')}</TableHead>
                      <TableHead>{t('phoneNumbers.admin.table.headers.rateDeck')}</TableHead>
                      <TableHead>{t('phoneNumbers.admin.table.headers.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {phoneNumbers.map((number) => (
                      <TableRow key={number._id}>
                        <TableCell className="w-12">
                          <Checkbox
                            checked={selectedNumbers.has(number._id)}
                            onCheckedChange={(checked) => handleSelectNumber(number._id, !!checked)}
                            aria-label={t('phoneNumbers.admin.table.content.selectNumber', { number: number.number })}
                          />
                        </TableCell>
                        <TableCell className="font-mono">{number.number}</TableCell>
                        <TableCell>{number.country}</TableCell>
                        <TableCell>{number.numberType}</TableCell>
                        <TableCell>
                          <Badge variant={getBadgeVariant(number.status)} className="flex items-center space-x-1 w-fit">
                            <span key="icon">{getStatusIcon(number.status)}</span>
                            <span key="text">{number.status}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {number.assignedToUser ? (
                            <div>
                              <p className="font-medium">{number.assignedToUser.name || number.assignedToUser.email}</p>
                              <p className="text-xs text-muted-foreground">{number.assignedToUser.onboarding?.companyName || number.assignedToUser.company || t('phoneNumbers.admin.table.content.noCompany')}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">{t('phoneNumbers.admin.table.content.unassigned')}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {number.rateDeck ? number.rateDeck.name : t('phoneNumbers.admin.table.content.noRateDeck')}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {/* Primary Actions - Always Visible */}
                            <Button
                              key={`view-${number._id}`}
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                setSelectedNumber(number);
                                await fetchPhoneNumberDetails(number._id);
                                setShowDetailsModal(true);
                              }}
                              title={t('phoneNumbers.admin.table.actionButtons.viewDetails')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            <Button
                              key={`edit-${number._id}`}
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedNumber(number);
                                // Populate edit form with current phone number data
                                setEditForm({
                                  number: number.number,
                                  country: number.country,
                                  countryCode: number.countryCode,
                                  numberType: number.numberType,
                                  provider: number.provider || '',
                                  rateDeckId: number.rateDeck?._id || '',
                                  currency: number.currency || 'USD',
                                  backorderOnly: number.backorderOnly || false,
                                  billingCycle: number.billingCycle || 'monthly',
                                  billingDayOfMonth: number.billingDayOfMonth || 1,
                                  capabilities: number.capabilities || ['voice'],
                                  // Technical connection parameters
                                  connectionType: number.connectionType,
                                  ipAddress: number.ipAddress || '',
                                  port: number.port,
                                  login: number.login || '',
                                  password: number.password || '',
                                  domain: number.domain || '',
                                  credentialsPort: number.credentialsPort
                                });
                                setShowEditModal(true);
                              }}
                              title={t('phoneNumbers.admin.table.actionButtons.edit')}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>

                            {/* Assign Button - Always visible, disabled when not available */}
                            <Button
                              key={`assign-${number._id}`}
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedNumber(number);
                                setShowAssignModal(true);
                              }}
                              disabled={number.status !== 'available'}
                              title={number.status === 'available' ? t('phoneNumbers.admin.table.actionButtons.assign') : `Cannot assign (${number.status})`}
                            >
                              <UserPlus className="h-4 w-4" />
                            </Button>

                            {/* Unassign Button - Always visible, disabled when not assigned */}
                            <Button
                              key={`unassign-${number._id}`}
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedNumber(number);
                                setShowUnassignModal(true);
                              }}
                              disabled={number.status !== 'assigned'}
                              title={number.status === 'assigned' ? t('phoneNumbers.admin.table.actionButtons.unassign') : `Cannot unassign (${number.status})`}
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                            
                            {/* More Actions Dropdown */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" title={t('phoneNumbers.admin.table.actionButtons.more')}>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {/* Reserve Action - Only for available numbers */}
                                {number.status === 'available' && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedNumber(number);
                                      setShowReserveModal(true);
                                    }}
                                  >
                                    <Shield className="h-4 w-4 mr-2" />
                                    {t('phoneNumbers.admin.table.actionButtons.reserve')}
                                  </DropdownMenuItem>
                                )}

                                {/* Suspend Action - For available, assigned, or reserved numbers */}
                                {['available', 'assigned', 'reserved'].includes(number.status) && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedNumber(number);
                                      setShowSuspendModal(true);
                                    }}
                                  >
                                    <Pause className="h-4 w-4 mr-2" />
                                    {t('phoneNumbers.admin.table.actionButtons.suspend')}
                                  </DropdownMenuItem>
                                )}

                                {/* Unreserve Action - Only for reserved numbers */}
                                {number.status === 'reserved' && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedNumber(number);
                                      setShowUnreserveModal(true);
                                    }}
                                  >
                                    <Shield className="h-4 w-4 mr-2" />
                                    {t('phoneNumbers.admin.table.actionButtons.unreserve')}
                                  </DropdownMenuItem>
                                )}

                                {/* Separator before destructive actions */}
                                {number.status !== 'cancelled' && (
                                  <DropdownMenuSeparator />
                                )}

                                {/* Cancel Action - For any status except already cancelled */}
                                {number.status !== 'cancelled' && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedNumber(number);
                                      setShowCancelModal(true);
                                    }}
                                    className="text-orange-600 focus:text-orange-600"
                                  >
                                    <Ban className="h-4 w-4 mr-2" />
                                    {t('phoneNumbers.admin.table.actionButtons.cancel')}
                                  </DropdownMenuItem>
                                )}

                                {/* Delete Action - Only for non-assigned numbers */}
                                {number.status !== 'assigned' && (
                                  <DropdownMenuItem
                                    onClick={() => handleDeletePhoneNumber(number._id)}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {t('phoneNumbers.admin.table.actionButtons.delete')}
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
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
                      {t('phoneNumbers.admin.pagination.showing', { 
                        start: (((currentPage - 1) * filters.limit!) + 1).toString(), 
                        end: Math.min(currentPage * filters.limit!, total).toString(), 
                        total: total.toString() 
                      })}
                    </p>
                    <div className="flex space-x-2">
                      <Button
                        key="previous"
                        variant="outline"
                        size="sm"
                        onClick={() => changePage(currentPage - 1)}
                        disabled={currentPage <= 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        {t('phoneNumbers.admin.pagination.previous')}
                      </Button>
                      <Button
                        key="next"
                        variant="outline"
                        size="sm"
                        onClick={() => changePage(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                      >
                        {t('phoneNumbers.admin.pagination.next')}
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Phone Number Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('phoneNumbers.admin.modals.create.title')}</DialogTitle>
              <DialogDescription>
                {t('phoneNumbers.admin.modals.create.description')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="number">{t('phoneNumbers.admin.modals.create.fields.number')} *</Label>
                  <Input
                    id="number"
                    value={createForm.number}
                    onChange={(e) => setCreateForm({ ...createForm, number: e.target.value })}
                    placeholder={t('phoneNumbers.admin.modals.create.fields.numberPlaceholder')}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="country">{t('phoneNumbers.admin.modals.create.fields.country')} *</Label>
                  <Select 
                    value={createForm.country} 
                    onValueChange={(countryName) => {
                      const selectedCountry = countries.find(c => c.name === countryName);
                      setCreateForm({ 
                        ...createForm, 
                        country: countryName,
                        countryCode: selectedCountry?.code || ''
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('phoneNumbers.admin.modals.create.fields.country')} />
                    </SelectTrigger>
                    <SelectContent>
                      {countries
                        .filter(country => country._id) // Filter out countries with undefined/null IDs
                        .map((country, index) => (
                          <SelectItem key={`create-country-${country._id || index}`} value={country.name}>
                            {country.name} (+{country.phoneCode})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="numberType">{t('phoneNumbers.admin.modals.create.fields.numberType')} *</Label>
                  <Select value={createForm.numberType} onValueChange={(value: PhoneNumberType) => setCreateForm({ ...createForm, numberType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        { id: 'geographic', label: t('phoneNumbers.admin.filters.types.geographic'), value: 'Geographic/Local' },
                        { id: 'mobile', label: t('phoneNumbers.admin.filters.types.mobile'), value: 'Mobile' },
                        { id: 'national', label: t('phoneNumbers.admin.filters.types.national'), value: 'National' },
                        { id: 'tollfree', label: t('phoneNumbers.admin.filters.types.tollfree'), value: 'Toll-free' },
                        { id: 'shared', label: t('phoneNumbers.admin.filters.types.shared'), value: 'Shared Cost' },
                        { id: 'npv', label: t('phoneNumbers.admin.filters.types.npv'), value: 'NPV (Verified Numbers)' },
                        { id: 'premium', label: t('phoneNumbers.admin.filters.types.premium'), value: 'Premium' }
                      ].map(option => (
                        <SelectItem key={option.id} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="provider">{t('phoneNumbers.admin.modals.create.fields.provider')} *</Label>
                  <Select 
                    value={createForm.provider} 
                    onValueChange={(value) => setCreateForm({ ...createForm, provider: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('phoneNumbers.admin.modals.create.fields.provider')} />
                    </SelectTrigger>
                    <SelectContent>
                      {providers
                        .filter(provider => provider._id) // Filter out providers with undefined/null IDs
                        .map((provider, index) => (
                          <SelectItem key={`create-provider-${provider._id || index}`} value={provider.name}>
                            <div>
                              <div>{provider.name}</div>
                              {provider.description && (
                                <div className="text-xs text-muted-foreground">{provider.description}</div>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="rateDeckId">{t('phoneNumbers.admin.modals.create.fields.rateDeck')} *</Label>
                  <Select value={createForm.rateDeckId} onValueChange={(value) => setCreateForm({ ...createForm, rateDeckId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('phoneNumbers.admin.modals.create.fields.rateDeck')} />
                    </SelectTrigger>
                    <SelectContent>
                      {rateDeckOptions
                        .filter(rateDeck => rateDeck._id) // Filter out rate decks with undefined/null IDs
                        .map((rateDeck, index) => (
                          <SelectItem key={`create-ratedeck-${rateDeck._id || index}`} value={rateDeck._id}>
                            <div>
                              <div>{rateDeck.name}</div>
                              {rateDeck.description && (
                                <div className="text-xs text-muted-foreground">{rateDeck.description}</div>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="col-span-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={createForm.backorderOnly || false}
                    onCheckedChange={(checked) => setCreateForm({ ...createForm, backorderOnly: !!checked })}
                  />
                  <Label htmlFor="backorderOnly" className="text-sm font-medium">
                    {t('phoneNumbers.admin.modals.create.fields.backorderOnly')}
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('phoneNumbers.admin.modals.create.fields.backorderDescription')}
                </p>
              </div>
              
              {/* Technical Connection Parameters */}
              <div className="col-span-2">
                <div className="flex items-center space-x-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium text-muted-foreground">{t('phoneNumbers.admin.modals.create.tabs.technical')}</Label>
                </div>
                <div className="mt-2 space-y-3">
                  <div>
                    <Label htmlFor="connectionType">{t('phoneNumbers.admin.modals.create.fields.connectionType')}</Label>
                    <Select 
                      value={createForm.connectionType || 'none'} 
                      onValueChange={(value: ConnectionType | 'none') => setCreateForm({ ...createForm, connectionType: value === 'none' ? undefined : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('phoneNumbers.admin.modals.create.fields.connectionType')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="ip_routing">IP Routing</SelectItem>
                        <SelectItem value="credentials">Credentials</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {createForm.connectionType === 'ip_routing' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="ipAddress">{t('phoneNumbers.admin.modals.create.fields.ipAddress')}</Label>
                        <Input
                          id="ipAddress"
                          value={createForm.ipAddress}
                          onChange={(e) => setCreateForm({ ...createForm, ipAddress: e.target.value })}
                          placeholder="192.168.1.1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="port">{t('phoneNumbers.admin.modals.create.fields.port')}</Label>
                        <Input
                          id="port"
                          type="number"
                          value={createForm.port || ''}
                          onChange={(e) => setCreateForm({ ...createForm, port: parseInt(e.target.value) || undefined })}
                          placeholder="5060"
                        />
                      </div>
                    </div>
                  )}
                  
                  {createForm.connectionType === 'credentials' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="login">{t('phoneNumbers.admin.modals.create.fields.login')}</Label>
                        <Input
                          id="login"
                          value={createForm.login}
                          onChange={(e) => setCreateForm({ ...createForm, login: e.target.value })}
                          placeholder="username"
                        />
                      </div>
                      <div>
                        <Label htmlFor="password">{t('phoneNumbers.admin.modals.create.fields.password')}</Label>
                        <Input
                          id="password"
                          type="password"
                          value={createForm.password}
                          onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                          placeholder="password"
                        />
                      </div>
                      <div>
                        <Label htmlFor="domain">{t('phoneNumbers.admin.modals.create.fields.domain')}</Label>
                        <Input
                          id="domain"
                          value={createForm.domain}
                          onChange={(e) => setCreateForm({ ...createForm, domain: e.target.value })}
                          placeholder="sip.example.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="credentialsPort">{t('phoneNumbers.admin.modals.create.fields.credentialsPort')}</Label>
                        <Input
                          id="credentialsPort"
                          type="number"
                          value={createForm.credentialsPort || ''}
                          onChange={(e) => setCreateForm({ ...createForm, credentialsPort: parseInt(e.target.value) || undefined })}
                          placeholder="5060"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={createForm.description || ''}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Optional description for this phone number"
                  rows={2}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                {t('phoneNumbers.admin.modals.create.buttons.cancel')}
              </Button>
              <Button
                onClick={handleCreatePhoneNumber}
                disabled={isSubmitting || !createForm.number || !createForm.country || !createForm.provider || !createForm.rateDeckId}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('phoneNumbers.admin.modals.create.buttons.creating')}
                  </>
                ) : (
                  t('phoneNumbers.admin.modals.create.buttons.create')
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Assign Phone Number Modal */}
        <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('phoneNumbers.admin.modals.assign.title')}</DialogTitle>
              <DialogDescription>
                {t('phoneNumbers.admin.modals.assign.description', { number: selectedNumber?.number || '' })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="userId">{t('phoneNumbers.admin.modals.assign.fields.user')} *</Label>
                <Select value={assignForm.userId} onValueChange={(value) => setAssignForm({ ...assignForm, userId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('phoneNumbers.admin.modals.assign.fields.user')} />
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      if (users.length === 0) {
                        return [
                          <SelectItem key="no-users" value="no-users" disabled>
                            No users available
                          </SelectItem>
                        ];
                      }
                      
                      return users.map((user, index) => {
                        const userId = user._id || `fallback-${index}`;
                        const userEmail = user.email || 'No email';
                        const userName = user.name || userEmail;
                        const companyName = user.onboarding?.companyName || user.company || userEmail;
                        
                        return (
                          <SelectItem key={`assign-user-${userId}`} value={userId}>
                            {userName} ({companyName})
                          </SelectItem>
                        );
                      });
                    })()}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="billingStartDate">{t('phoneNumbers.admin.modals.assign.fields.billingStartDate')}</Label>
                <Input
                  id="billingStartDate"
                  type="date"
                  value={assignForm.billingStartDate}
                  onChange={(e) => setAssignForm({ ...assignForm, billingStartDate: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="notes">{t('phoneNumbers.admin.modals.assign.fields.notes')}</Label>
                <Textarea
                  id="notes"
                  value={assignForm.notes}
                  onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                  placeholder={t('phoneNumbers.admin.modals.assign.fields.notes')}
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowAssignModal(false)}>
                {t('phoneNumbers.admin.modals.assign.buttons.cancel')}
              </Button>
              <Button
                onClick={handleAssignPhoneNumber}
                disabled={isSubmitting || !assignForm.userId}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('phoneNumbers.admin.modals.assign.buttons.assigning')}
                  </>
                ) : (
                  t('phoneNumbers.admin.modals.assign.buttons.assign')
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Unassign Phone Number Modal */}
        <Dialog open={showUnassignModal} onOpenChange={setShowUnassignModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('phoneNumbers.admin.modals.unassign.title')}</DialogTitle>
              <DialogDescription>
                {t('phoneNumbers.admin.modals.unassign.description', { number: selectedNumber?.number || '' })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="reason">{t('phoneNumbers.admin.modals.unassign.fields.reason')}</Label>
                <Textarea
                  id="reason"
                  value={unassignForm.reason}
                  onChange={(e) => setUnassignForm({ ...unassignForm, reason: e.target.value })}
                  placeholder={t('phoneNumbers.admin.modals.unassign.fields.reason')}
                  rows={3}
                />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={unassignForm.cancelPendingBilling}
                    onCheckedChange={(checked) => setUnassignForm({ ...unassignForm, cancelPendingBilling: !!checked })}
                  />
                  <Label htmlFor="bulkCancelPendingBilling" className="text-sm font-medium">
                    {t('phoneNumbers.admin.modals.unassign.fields.cancelPendingBilling')}
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={unassignForm.createRefund}
                    onCheckedChange={(checked) => setUnassignForm({ ...unassignForm, createRefund: !!checked })}
                  />
                  <Label htmlFor="bulkCreateRefund" className="text-sm font-medium">
                    {t('phoneNumbers.admin.modals.unassign.fields.createRefund')}
                  </Label>
                </div>
                
                {unassignForm.createRefund && (
                  <div>
                    <Label htmlFor="bulkRefundAmount">{t('phoneNumbers.admin.modals.unassign.fields.refundAmount')}</Label>
                    <Input
                      id="bulkRefundAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={unassignForm.refundAmount}
                      onChange={(e) => setUnassignForm({ ...unassignForm, refundAmount: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      This amount will be refunded for each unassigned number
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowUnassignModal(false)}>
                {t('phoneNumbers.admin.modals.unassign.buttons.cancel')}
              </Button>
              <Button
                onClick={handleUnassignPhoneNumber}
                disabled={isSubmitting}
                variant="destructive"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('phoneNumbers.admin.modals.unassign.buttons.unassigning')}
                  </>
                ) : (
                  t('phoneNumbers.admin.modals.unassign.buttons.unassign')
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Phone Number Details Modal */}
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className=" sm:max-w-1lg max-w-[50vw] max-h-[95vh] overflow-hidden">
            <DialogHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-2xl font-bold">{t('phoneNumbers.admin.modals.details.title')}</DialogTitle>
                  <DialogDescription className="text-base mt-1">
                    Complete information and history for {selectedNumber?.number}
                  </DialogDescription>
                </div>
                {selectedNumberDetails && (
                  <div className="flex items-center space-x-3">
                    <Badge variant={getBadgeVariant(selectedNumberDetails.status)} className="flex items-center space-x-2 px-3 py-1 text-sm">
                      {getStatusIcon(selectedNumberDetails.status)}
                      <span className="capitalize font-medium">{selectedNumberDetails.status}</span>
                    </Badge>
                    {selectedNumberDetails.backorderOnly && (
                      <Badge variant="outline" className="text-orange-600 border-orange-200">
                        Backorder Only
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </DialogHeader>
            
            {isLoadingDetails ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin mr-3" />
                <span className="text-lg">{t('phoneNumbers.admin.messages.loading.details')}</span>
              </div>
            ) : selectedNumberDetails && (
              <div className="overflow-y-auto max-h-[calc(95vh-120px)]">
                {/* Header Cards Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {/* Number Info Card */}
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-500 rounded-lg">
                          <Hash className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">{t('phoneNumbers.admin.modals.details.fields.number')}</p>
                          <p className="text-xl font-bold font-mono text-blue-900 dark:text-blue-100">{selectedNumberDetails.number}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Location Card */}
                  <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-green-500 rounded-lg">
                          <Clock className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-green-700 dark:text-green-300">Location</p>
                          <p className="text-lg font-bold text-green-900 dark:text-green-100">{selectedNumberDetails.country}</p>
                          <p className="text-sm text-green-600 dark:text-green-400">+{selectedNumberDetails.countryCode} • {selectedNumberDetails.numberType}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Rate Info Card */}
                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-purple-500 rounded-lg">
                          <Hash className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-purple-700 dark:text-purple-300">{t('phoneNumbers.admin.modals.details.fields.rateDeck')}</p>
                          <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                            {selectedNumberDetails.rateDeck ? selectedNumberDetails.rateDeck.name : 'No Rate Deck'}
                          </p>
                          {selectedNumberDetails.monthlyRate && (
                            <p className="text-sm text-purple-600 dark:text-purple-400">
                              {formatCurrency(selectedNumberDetails.monthlyRate, selectedNumberDetails.currency || 'USD')}/month
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Current Assignment Alert */}
                {selectedNumberDetails.assignedToUser && (
                  <Alert className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
                    <UserPlus className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800 dark:text-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">Currently assigned to:</span> {selectedNumberDetails.assignedToUser.name || selectedNumberDetails.assignedToUser.email}
                          <span className="ml-2 text-sm">({selectedNumberDetails.assignedToUser.onboarding?.companyName || selectedNumberDetails.assignedToUser.company || 'No company'})</span>
                          {selectedNumberDetails.assignedAt && (
                            <div className="text-sm mt-1">
                              Assigned: {formatDate(selectedNumberDetails.assignedAt)}
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setShowUnassignModal(true);
                            setShowDetailsModal(false);
                          }}
                          className="text-blue-600 border-blue-200 hover:bg-blue-100"
                        >
                          <UserMinus className="h-4 w-4 mr-1" />
                          Unassign
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Main Content Tabs */}
                <div className="space-y-6">
                  {/* Technical Details Section */}
                  <Card>
                    <CardHeader className="bg-muted/30">
                      <CardTitle className="flex items-center space-x-2">
                        <Hash className="h-5 w-5" />
                        <span>Technical Details</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Provider</Label>
                            <p className="text-sm font-medium">{selectedNumberDetails.provider || 'Not specified'}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Currency</Label>
                            <p className="text-sm font-medium">{selectedNumberDetails.currency || 'USD'}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Billing Cycle</Label>
                            <p className="text-sm font-medium capitalize">{selectedNumberDetails.billingCycle || 'monthly'}</p>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Billing Day</Label>
                            <p className="text-sm font-medium">{selectedNumberDetails.billingDayOfMonth || 1} of each month</p>
                          </div>
                          {selectedNumberDetails.setupFee && selectedNumberDetails.setupFee > 0 && (
                            <div>
                              <Label className="text-sm font-medium text-muted-foreground">Setup Fee</Label>
                              <p className="text-sm font-medium">{formatCurrency(selectedNumberDetails.setupFee, selectedNumberDetails.currency || 'USD')}</p>
                            </div>
                          )}
                          {selectedNumberDetails.nextBillingDate && (
                            <div>
                              <Label className="text-sm font-medium text-muted-foreground">Next Billing</Label>
                              <p className="text-sm font-medium">{formatDate(selectedNumberDetails.nextBillingDate)}</p>
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          {selectedNumberDetails.capabilities && selectedNumberDetails.capabilities.length > 0 && (
                            <div>
                              <Label className="text-sm font-medium text-muted-foreground">Capabilities</Label>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {selectedNumberDetails.capabilities.map((capability) => (
                                  <Badge key={capability} variant="outline" className="text-xs">
                                    {capability}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                            <p className="text-sm font-medium">{formatDate(selectedNumberDetails.createdAt)}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                            <p className="text-sm font-medium">{formatDate(selectedNumberDetails.updatedAt)}</p>
                          </div>
                        </div>
                      </div>

                      {selectedNumberDetails.description && (
                        <div className="mt-6 pt-4 border-t">
                          <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                          <p className="text-sm mt-1">{selectedNumberDetails.description}</p>
                        </div>
                      )}

                      {/* Technical Connection Parameters */}
                      <div className="mt-6 pt-4 border-t">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-2">
                            <Hash className="h-4 w-4 text-muted-foreground" />
                            <Label className="text-sm font-medium text-muted-foreground">Technical Connection Parameters</Label>
                          </div>
                          {selectedNumberDetails.connectionType && (
                            <Badge variant="outline" className="text-slate-700 border-slate-300">
                              {selectedNumberDetails.connectionType === 'ip_routing' ? 'IP Routing' : 'Credential-Based'}
                            </Badge>
                          )}
                        </div>
                        
                        {selectedNumberDetails.connectionType ? (
                          <div className="space-y-4">
                            {/* Connection Method Overview */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              <div>
                                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Connection Method</Label>
                                <div className="mt-2 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                  <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${selectedNumberDetails.connectionType === 'ip_routing' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                      {selectedNumberDetails.connectionType === 'ip_routing' ? (
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                                        </svg>
                                      ) : (
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                        </svg>
                                      )}
                                    </div>
                                    <div>
                                      <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                                        {selectedNumberDetails.connectionType === 'ip_routing' ? 'IP Address Routing' : 'Username/Password Authentication'}
                                      </p>
                                      <p className="text-xs text-slate-600 dark:text-slate-400">
                                        {selectedNumberDetails.connectionType === 'ip_routing' 
                                          ? 'Direct routing based on source IP address' 
                                          : 'Authentication using login credentials'
                                        }
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <div>
                                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Configuration Status</Label>
                                <div className="mt-2 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-green-100 text-green-700">
                                      <CheckCircle className="h-4 w-4" />
                                    </div>
                                    <div>
                                      <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">Configured</p>
                                      <p className="text-xs text-slate-600 dark:text-slate-400">Ready for user setup</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Connection Details */}
                            <div className="bg-muted/30 rounded-lg border p-4">
                              <h5 className="font-medium text-sm mb-3 flex items-center gap-2">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Connection Parameters
                              </h5>
                              
                              {selectedNumberDetails.connectionType === 'ip_routing' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {selectedNumberDetails.ipAddress && (
                                    <div className="group">
                                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">IP Address</Label>
                                      <div className="mt-1 flex items-center gap-2">
                                        <code className="flex-1 px-3 py-2 bg-background text-foreground rounded border font-mono text-sm">
                                          {selectedNumberDetails.ipAddress}
                                        </code>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleCopyToClipboard(selectedNumberDetails.ipAddress!, `ipAddress`)}
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
                                  {selectedNumberDetails.port && (
                                    <div className="group">
                                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Port</Label>
                                      <div className="mt-1 flex items-center gap-2">
                                        <code className="flex-1 px-3 py-2 bg-background text-foreground rounded border font-mono text-sm">
                                          {selectedNumberDetails.port}
                                        </code>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleCopyToClipboard(selectedNumberDetails.port!.toString(), `port`)}
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
                              
                              {selectedNumberDetails.connectionType === 'credentials' && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {selectedNumberDetails.login && (
                                      <div className="group">
                                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Username</Label>
                                        <div className="mt-1 flex items-center gap-2">
                                          <code className="flex-1 px-3 py-2 bg-background text-foreground rounded border font-mono text-sm">
                                            {selectedNumberDetails.login}
                                          </code>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleCopyToClipboard(selectedNumberDetails.login!, `login`)}
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
                                    {selectedNumberDetails.password && (
                                      <div className="group">
                                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Password</Label>
                                        <div className="mt-1 flex items-center gap-2">
                                          <code className="flex-1 px-3 py-2 bg-background text-foreground rounded border font-mono text-sm">
                                            ••••••••
                                          </code>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleCopyToClipboard(selectedNumberDetails.password!, `password`)}
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
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {selectedNumberDetails.domain && (
                                      <div className="group">
                                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Server/Domain</Label>
                                        <div className="mt-1 flex items-center gap-2">
                                          <code className="flex-1 px-3 py-2 bg-background text-foreground rounded border font-mono text-sm">
                                            {selectedNumberDetails.domain}
                                          </code>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleCopyToClipboard(selectedNumberDetails.domain!, `domain`)}
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
                                    {selectedNumberDetails.credentialsPort && (
                                      <div className="group">
                                        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Port</Label>
                                        <div className="mt-1 flex items-center gap-2">
                                          <code className="flex-1 px-3 py-2 bg-background text-foreground rounded border font-mono text-sm">
                                            {selectedNumberDetails.credentialsPort}
                                          </code>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleCopyToClipboard(selectedNumberDetails.credentialsPort!.toString(), `credentialsPort`)}
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

                              {/* Setup Instructions */}
                              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/50 rounded-lg border border-blue-200 dark:border-blue-800">
                                <div className="flex items-start gap-2">
                                  <svg className="h-4 w-4 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                  </svg>
                                  <div>
                                    <p className="font-medium text-blue-900 dark:text-blue-100 text-xs">User Setup Instructions</p>
                                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                      {selectedNumberDetails.connectionType === 'ip_routing' 
                                        ? `User configures PBX to route calls from ${selectedNumberDetails.ipAddress}:${selectedNumberDetails.port || '5060'} for this number.`
                                        : `User authenticates with username "${selectedNumberDetails.login}" and provided password at ${selectedNumberDetails.domain}:${selectedNumberDetails.credentialsPort || '5060'}.`
                                      }
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-6 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 rounded-lg border border-orange-200 text-center">
                            <div className="mx-auto w-12 h-12 bg-orange-100 dark:bg-orange-900/50 rounded-full flex items-center justify-center mb-3">
                              <AlertCircle className="h-6 w-6 text-orange-600" />
                            </div>
                            <p className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-2">
                              No Connection Parameters Configured
                            </p>
                            <p className="text-xs text-orange-700 dark:text-orange-300 mb-4">
                              This number doesn&apos;t have technical connection details. Configure IP routing or credential-based connection parameters for user setup.
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditForm({
                                  ...editForm,
                                  number: selectedNumberDetails.number,
                                  country: selectedNumberDetails.country,
                                  countryCode: selectedNumberDetails.countryCode,
                                  numberType: selectedNumberDetails.numberType,
                                  provider: selectedNumberDetails.provider || '',
                                  rateDeckId: selectedNumberDetails.rateDeck?._id || '',
                                  currency: selectedNumberDetails.currency || 'USD',
                                  backorderOnly: selectedNumberDetails.backorderOnly || false,
                                  billingCycle: selectedNumberDetails.billingCycle || 'monthly',
                                  billingDayOfMonth: selectedNumberDetails.billingDayOfMonth || 1,
                                  capabilities: selectedNumberDetails.capabilities || ['voice'],
                                  description: selectedNumberDetails.description || '',
                                  region: selectedNumberDetails.region || '',
                                  timeZone: selectedNumberDetails.timeZone || '',
                                  connectionType: selectedNumberDetails.connectionType,
                                  ipAddress: selectedNumberDetails.ipAddress || '',
                                  port: selectedNumberDetails.port,
                                  login: selectedNumberDetails.login || '',
                                  password: selectedNumberDetails.password || '',
                                  domain: selectedNumberDetails.domain || '',
                                  credentialsPort: selectedNumberDetails.credentialsPort,
                                  notes: selectedNumberDetails.notes || ''
                                });
                                setSelectedNumber(selectedNumberDetails);
                                setShowEditModal(true);
                                setShowDetailsModal(false);
                              }}
                              className="text-orange-700 border-orange-300 hover:bg-orange-100"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Add Connection Details
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Assignment History Section */}
                  {selectedNumberDetails.assignmentHistory && selectedNumberDetails.assignmentHistory.length > 0 && (
                    <Card>
                      <CardHeader className="bg-muted/30">
                        <CardTitle className="flex items-center space-x-2">
                          <UserPlus className="h-5 w-5" />
                          <span>Assignment History</span>
                          <Badge variant="outline" className="ml-2">
                            {selectedNumberDetails.assignmentHistory?.length || 0} assignment{(selectedNumberDetails.assignmentHistory?.length || 0) !== 1 ? 's' : ''}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          {selectedNumberDetails.assignmentHistory?.map((assignment, index) => (
                            <div key={assignment._id} className="relative">
                              {/* Timeline connector */}
                              {index < (selectedNumberDetails.assignmentHistory?.length || 0) - 1 && (
                                <div className="absolute left-4 top-12 w-0.5 h-full bg-muted-foreground/20"></div>
                              )}
                              
                              <div className="flex space-x-4">
                                <div className="flex-shrink-0">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    assignment.status === 'active' && selectedNumberDetails.status === 'assigned' 
                                      ? 'bg-green-500' 
                                      : 'bg-muted-foreground/20'
                                  }`}>
                                    <UserPlus className={`h-4 w-4 ${
                                      assignment.status === 'active' && selectedNumberDetails.status === 'assigned' 
                                        ? 'text-white' 
                                        : 'text-muted-foreground'
                                    }`} />
                                  </div>
                                </div>
                                
                                <Card className="flex-1">
                                  <CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center space-x-2">
                                        <Badge variant={assignment.status === 'active' ? 'default' : 'secondary'}>
                                          {assignment.status}
                                        </Badge>
                                        {assignment.status === 'active' && selectedNumberDetails.status === 'assigned' && (
                                          <Badge variant="outline" className="text-green-600 border-green-200">
                                            Current
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        Duration: {assignment.unassignedAt 
                                          ? Math.ceil((new Date(assignment.unassignedAt).getTime() - new Date(assignment.assignedAt).getTime()) / (1000 * 60 * 60 * 24))
                                          : Math.ceil((new Date().getTime() - new Date(assignment.assignedAt).getTime()) / (1000 * 60 * 60 * 24))
                                        } days
                                      </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                                      <div>
                                        <Label className="text-xs font-medium text-muted-foreground">User</Label>
                                        <p className="font-medium">{assignment.user?.name || assignment.user?.email || 'Unknown User'}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {assignment.user?.onboarding?.companyName || assignment.user?.company || 'No company'}
                                        </p>
                                      </div>
                                      <div>
                                        <Label className="text-xs font-medium text-muted-foreground">Assigned Date</Label>
                                        <p className="font-medium">{formatDate(assignment.assignedAt)}</p>
                                        {assignment.assignedBy && (
                                          <p className="text-xs text-muted-foreground">by {assignment.assignedBy}</p>
                                        )}
                                      </div>
                                      {assignment.unassignedAt && (
                                        <div>
                                          <Label className="text-xs font-medium text-muted-foreground">Unassigned Date</Label>
                                          <p className="font-medium">{formatDate(assignment.unassignedAt)}</p>
                                        </div>
                                      )}
                                      <div>
                                        <Label className="text-xs font-medium text-muted-foreground">Monthly Rate</Label>
                                        <p className="font-medium">{formatCurrency(assignment.monthlyRate, assignment.currency)}</p>
                                      </div>
                                      {assignment.setupFee > 0 && (
                                        <div>
                                          <Label className="text-xs font-medium text-muted-foreground">Setup Fee</Label>
                                          <p className="font-medium">{formatCurrency(assignment.setupFee, assignment.currency)}</p>
                                        </div>
                                      )}
                                    </div>
                                    
                                    {assignment.unassignedReason && (
                                      <div className="mt-3 p-2 bg-orange-50 dark:bg-orange-950 rounded border-l-4 border-orange-200">
                                        <Label className="text-xs font-medium text-orange-700 dark:text-orange-300">Unassignment Reason</Label>
                                        <p className="text-sm text-orange-800 dark:text-orange-200">{assignment.unassignedReason}</p>
                                      </div>
                                    )}
                                    
                                    {assignment.notes && (
                                      <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-950 rounded border-l-4 border-blue-200">
                                        <Label className="text-xs font-medium text-blue-700 dark:text-blue-300">Notes</Label>
                                        <p className="text-sm text-blue-800 dark:text-blue-200">{assignment.notes}</p>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Enhanced Audit Trail Section */}
                  {selectedNumberDetails.notes && (() => {
                    const auditEntries = parseAuditTrail(selectedNumberDetails.notes);
                    return (
                      <Card>
                        <CardHeader className="bg-muted/30">
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center space-x-2">
                              <AlertCircle className="h-5 w-5" />
                              <span>Action History & Audit Trail</span>
                              <Badge variant="outline" className="ml-2">
                                {auditEntries.length} action{auditEntries.length !== 1 ? 's' : ''}
                              </Badge>
                            </CardTitle>
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>Latest first • UTC timestamps</span>
                            </div>
                          </div>
                          <DialogDescription>
                            Chronological timeline of all administrative actions with detailed context
                          </DialogDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                          {auditEntries.length > 0 ? (
                            <div className="space-y-4">
                              {auditEntries.map((entry, index) => (
                                <div key={entry.id} className="relative">
                                  {/* Timeline connector */}
                                  {index < auditEntries.length - 1 && (
                                    <div className="absolute left-6 top-14 w-0.5 h-full bg-gradient-to-b from-muted-foreground/30 to-transparent"></div>
                                  )}
                                  
                                  <div className="flex space-x-4">
                                    {/* Action Icon */}
                                    <div className="flex-shrink-0">
                                      <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                                        entry.actionColor === 'blue' ? 'bg-blue-50 border-blue-200 dark:bg-blue-950' :
                                        entry.actionColor === 'green' ? 'bg-green-50 border-green-200 dark:bg-green-950' :
                                        entry.actionColor === 'orange' ? 'bg-orange-50 border-orange-200 dark:bg-orange-950' :
                                        entry.actionColor === 'red' ? 'bg-red-50 border-red-200 dark:bg-red-950' :
                                        'bg-gray-50 border-gray-200 dark:bg-gray-950'
                                      }`}>
                                        <span className={
                                          entry.actionColor === 'blue' ? 'text-blue-600' :
                                          entry.actionColor === 'green' ? 'text-green-600' :
                                          entry.actionColor === 'orange' ? 'text-orange-600' :
                                          entry.actionColor === 'red' ? 'text-red-600' :
                                          'text-gray-600'
                                        }>
                                          {entry.actionIcon}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    {/* Action Content */}
                                    <Card className="flex-1 shadow-sm hover:shadow-md transition-shadow">
                                      <CardContent className="p-4">
                                        {/* Action Header */}
                                        <div className="flex items-center justify-between mb-3">
                                          <div className="flex items-center space-x-3">
                                            <Badge 
                                              variant={entry.actionColor === 'red' ? 'destructive' : 'secondary'}
                                              className={
                                                entry.actionColor === 'blue' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                                entry.actionColor === 'green' ? 'bg-green-100 text-green-800 border-green-200' :
                                                entry.actionColor === 'orange' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                                                ''
                                              }
                                            >
                                              {entry.actionType}
                                            </Badge>
                                            <span className="text-sm font-medium text-muted-foreground">
                                              by {entry.user}
                                            </span>
                                          </div>
                                          {entry.timestamp && (
                                            <div className="text-xs text-muted-foreground">
                                              {formatDate(entry.timestamp)}
                                            </div>
                                          )}
                                        </div>
                                        
                                        {/* Action Details */}
                                        {entry.reason && (
                                          <div className="mb-3">
                                            <Label className="text-xs font-medium text-muted-foreground">Reason</Label>
                                            <p className="text-sm mt-1 bg-muted/30 rounded p-2">{entry.reason}</p>
                                          </div>
                                        )}
                                        
                                        {entry.details.length > 0 && (
                                          <div className="mb-3">
                                            <Label className="text-xs font-medium text-muted-foreground">Additional Details</Label>
                                            <div className="text-sm mt-1 space-y-1">
                                              {entry.details.map((detail, idx) => (
                                                <div key={idx} className="text-muted-foreground bg-muted/20 rounded px-2 py-1">
                                                  {detail}
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        
                                        {entry.notes && (
                                          <div>
                                            <Label className="text-xs font-medium text-muted-foreground">Notes</Label>
                                            <p className="text-sm mt-1 bg-blue-50 dark:bg-blue-950 rounded p-2 border-l-4 border-blue-200">
                                              {entry.notes}
                                            </p>
                                          </div>
                                        )}
                                      </CardContent>
                                    </Card>
                                  </div>
                                </div>
                              ))}
                              
                              {/* Raw Audit Log Toggle */}
                              <div className="pt-4 border-t">
                                <details className="group">
                                  <summary className="flex items-center space-x-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                                    <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                                    <span>View Raw Audit Log</span>
                                  </summary>
                                  <div className="mt-3 bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border">
                                    <pre className="text-xs whitespace-pre-wrap font-mono text-slate-700 dark:text-slate-300 overflow-x-auto max-h-60 overflow-y-auto">
                                      {selectedNumberDetails.notes}
                                    </pre>
                                  </div>
                                </details>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-8 text-muted-foreground">
                              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p>No audit trail available</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })()}
                </div>
              </div>
            )}
            
            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Last updated: {selectedNumberDetails ? formatDate(selectedNumberDetails.updatedAt) : ''}</span>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedNumber) {
                      setEditForm({
                        number: selectedNumber.number,
                        country: selectedNumber.country,
                        countryCode: selectedNumber.countryCode,
                        numberType: selectedNumber.numberType,
                        provider: selectedNumber.provider || '',
                        rateDeckId: selectedNumber.rateDeck?._id || '',
                        currency: selectedNumber.currency || 'USD',
                        backorderOnly: selectedNumber.backorderOnly || false,
                        billingCycle: selectedNumber.billingCycle || 'monthly',
                        billingDayOfMonth: selectedNumber.billingDayOfMonth || 1,
                        capabilities: selectedNumber.capabilities || ['voice'],
                        // Technical connection parameters
                        connectionType: selectedNumber.connectionType,
                        ipAddress: selectedNumber.ipAddress || '',
                        port: selectedNumber.port,
                        login: selectedNumber.login || '',
                        password: selectedNumber.password || '',
                        domain: selectedNumber.domain || '',
                        credentialsPort: selectedNumber.credentialsPort
                      });
                      setShowEditModal(true);
                      setShowDetailsModal(false);
                    }
                  }}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  {t('phoneNumbers.admin.table.actionButtons.edit')}
                </Button>
                <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
                  {t('phoneNumbers.admin.modals.details.buttons.close')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Phone Number Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('phoneNumbers.admin.modals.edit.title')}</DialogTitle>
              <DialogDescription>
                {t('phoneNumbers.admin.modals.edit.description', { number: selectedNumber?.number || '' })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="editNumber">{t('phoneNumbers.admin.modals.edit.fields.number')} *</Label>
                  <Input
                    id="editNumber"
                    value={editForm.number}
                    onChange={(e) => setEditForm({ ...editForm, number: e.target.value })}
                    placeholder={t('phoneNumbers.admin.modals.edit.fields.numberPlaceholder')}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="editCountry">{t('phoneNumbers.admin.modals.edit.fields.country')} *</Label>
                  <Select 
                    value={editForm.country} 
                    onValueChange={(countryName) => {
                      const selectedCountry = countries.find(c => c.name === countryName);
                      setEditForm({ 
                        ...editForm, 
                        country: countryName,
                        countryCode: selectedCountry?.code || ''
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('phoneNumbers.admin.modals.edit.fields.countryPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {countries
                        .filter(country => country._id)
                        .map((country, index) => (
                          <SelectItem key={`edit-country-${country._id || index}`} value={country.name}>
                            {country.name} (+{country.phoneCode})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="editNumberType">{t('phoneNumbers.admin.modals.edit.fields.numberType')} *</Label>
                  <Select value={editForm.numberType} onValueChange={(value: PhoneNumberType) => setEditForm({ ...editForm, numberType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        { id: 'geographic', label: t('phoneNumbers.admin.modals.edit.numberTypes.geographic'), value: 'Geographic/Local' },
                        { id: 'mobile', label: t('phoneNumbers.admin.modals.edit.numberTypes.mobile'), value: 'Mobile' },
                        { id: 'national', label: t('phoneNumbers.admin.modals.edit.numberTypes.national'), value: 'National' },
                        { id: 'tollfree', label: t('phoneNumbers.admin.modals.edit.numberTypes.tollfree'), value: 'Toll-free' },
                        { id: 'shared', label: t('phoneNumbers.admin.modals.edit.numberTypes.shared'), value: 'Shared Cost' },
                        { id: 'npv', label: t('phoneNumbers.admin.modals.edit.numberTypes.npv'), value: 'NPV (Verified Numbers)' },
                        { id: 'premium', label: t('phoneNumbers.admin.modals.edit.numberTypes.premium'), value: 'Premium' }
                      ].map(option => (
                        <SelectItem key={option.id} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="editProvider">{t('phoneNumbers.admin.modals.edit.fields.provider')}</Label>
                  <Select value={editForm.provider} onValueChange={(value) => setEditForm({ ...editForm, provider: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('phoneNumbers.admin.modals.edit.fields.providerPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {providers
                        .filter(provider => provider._id)
                        .map((provider, index) => (
                          <SelectItem key={`edit-provider-${provider._id || index}`} value={provider.name}>
                            {provider.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="editRateDeck">{t('phoneNumbers.admin.modals.edit.fields.rateDeck')}</Label>
                  <Select value={editForm.rateDeckId} onValueChange={(value) => setEditForm({ ...editForm, rateDeckId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('phoneNumbers.admin.modals.edit.fields.rateDeckPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {rateDeckOptions
                        .filter(rateDeck => rateDeck._id)
                        .map((rateDeck, index) => (
                          <SelectItem key={`edit-rate-deck-${rateDeck._id || index}`} value={rateDeck._id}>
                            {rateDeck.name} ({rateDeck.currency})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={editForm.backorderOnly || false}
                      onCheckedChange={(checked) => setEditForm({ ...editForm, backorderOnly: !!checked })}
                    />
                    <Label htmlFor="editBackorderOnly" className="text-sm font-medium">
                      {t('phoneNumbers.admin.modals.edit.fields.backorderOnly')}
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('phoneNumbers.admin.modals.edit.fields.backorderDescription')}
                  </p>
                </div>

                <div>
                  <Label htmlFor="editBillingCycle">{t('phoneNumbers.admin.modals.edit.fields.billingCycle')}</Label>
                  <Select value={editForm.billingCycle} onValueChange={(value: BillingCycle) => setEditForm({ ...editForm, billingCycle: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">{t('phoneNumbers.admin.modals.edit.billingCycles.monthly')}</SelectItem>
                      <SelectItem value="yearly">{t('phoneNumbers.admin.modals.edit.billingCycles.yearly')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="editBillingDay">{t('phoneNumbers.admin.modals.edit.fields.billingDay')}</Label>
                  <Input
                    id="editBillingDay"
                    type="number"
                    min="1"
                    max="31"
                    value={editForm.billingDayOfMonth}
                    onChange={(e) => setEditForm({ ...editForm, billingDayOfMonth: parseInt(e.target.value) || 1 })}
                  />
                </div>

                <div className="col-span-2">
                  <Label>{t('phoneNumbers.admin.modals.edit.fields.capabilities')}</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(['voice', 'sms', 'fax', 'data'] as PhoneNumberCapability[]).map((capability) => (
                      <div key={capability} className="flex items-center space-x-2">
                        <Checkbox
                          checked={editForm.capabilities.includes(capability)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setEditForm({ ...editForm, capabilities: [...editForm.capabilities, capability] });
                            } else {
                              setEditForm({ ...editForm, capabilities: editForm.capabilities.filter(c => c !== capability) });
                            }
                          }}
                        />
                        <Label htmlFor={`edit-capability-${capability}`} className="text-sm capitalize">
                          {t(`phoneNumbers.admin.modals.edit.capabilities.${capability}`)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Technical Connection Parameters */}
                <div className="col-span-2">
                  <div className="flex items-center space-x-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium text-muted-foreground">{t('phoneNumbers.admin.modals.edit.sections.technical')}</Label>
                  </div>
                  <div className="mt-2 space-y-3">
                    <div>
                      <Label htmlFor="editConnectionType">{t('phoneNumbers.admin.modals.edit.fields.connectionType')}</Label>
                      <Select 
                        value={editForm.connectionType || 'none'} 
                        onValueChange={(value: ConnectionType | 'none') => setEditForm({ ...editForm, connectionType: value === 'none' ? undefined : value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('phoneNumbers.admin.modals.edit.fields.connectionTypePlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{t('phoneNumbers.admin.modals.edit.connectionTypes.none')}</SelectItem>
                          <SelectItem value="ip_routing">{t('phoneNumbers.admin.modals.edit.connectionTypes.ip_routing')}</SelectItem>
                          <SelectItem value="credentials">{t('phoneNumbers.admin.modals.edit.connectionTypes.credentials')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {editForm.connectionType === 'ip_routing' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="editIpAddress">{t('phoneNumbers.admin.modals.edit.fields.ipAddress')}</Label>
                          <Input
                            id="editIpAddress"
                            value={editForm.ipAddress}
                            onChange={(e) => setEditForm({ ...editForm, ipAddress: e.target.value })}
                            placeholder="192.168.1.1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="editPort">{t('phoneNumbers.admin.modals.edit.fields.port')}</Label>
                          <Input
                            id="editPort"
                            type="number"
                            value={editForm.port || ''}
                            onChange={(e) => setEditForm({ ...editForm, port: parseInt(e.target.value) || undefined })}
                            placeholder="5060"
                          />
                        </div>
                      </div>
                    )}
                    
                    {editForm.connectionType === 'credentials' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="editLogin">{t('phoneNumbers.admin.modals.edit.fields.login')}</Label>
                          <Input
                            id="editLogin"
                            value={editForm.login}
                            onChange={(e) => setEditForm({ ...editForm, login: e.target.value })}
                            placeholder="username"
                          />
                        </div>
                        <div>
                          <Label htmlFor="editPassword">{t('phoneNumbers.admin.modals.edit.fields.password')}</Label>
                          <Input
                            id="editPassword"
                            type="password"
                            value={editForm.password}
                            onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                            placeholder="password"
                          />
                        </div>
                        <div>
                          <Label htmlFor="editDomain">{t('phoneNumbers.admin.modals.edit.fields.domain')}</Label>
                          <Input
                            id="editDomain"
                            value={editForm.domain}
                            onChange={(e) => setEditForm({ ...editForm, domain: e.target.value })}
                            placeholder="sip.example.com"
                          />
                        </div>
                        <div>
                          <Label htmlFor="editCredentialsPort">{t('phoneNumbers.admin.modals.edit.fields.credentialsPort')}</Label>
                          <Input
                            id="editCredentialsPort"
                            type="number"
                            value={editForm.credentialsPort || ''}
                            onChange={(e) => setEditForm({ ...editForm, credentialsPort: parseInt(e.target.value) || undefined })}
                            placeholder="5060"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowEditModal(false)}>
                {t('phoneNumbers.admin.modals.edit.buttons.cancel')}
              </Button>
              <Button
                onClick={handleEditPhoneNumber}
                disabled={isSubmitting || !editForm.number || !editForm.country}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('phoneNumbers.admin.modals.edit.buttons.updating')}
                  </>
                ) : (
                  t('phoneNumbers.admin.modals.edit.buttons.update')
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Assign Phone Numbers Modal */}
        <Dialog open={showBulkAssignModal} onOpenChange={setShowBulkAssignModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk Assign Phone Numbers</DialogTitle>
              <DialogDescription>
                Assign {phoneNumbers.filter(n => selectedNumbers.has(n._id) && n.status === 'available').length} available phone numbers to a user
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Show selected numbers summary */}
              <div className="p-3 bg-muted/30 rounded-lg">
                <Label className="text-sm font-medium">Selected Numbers Summary</Label>
                <div className="mt-2 text-sm space-y-1">
                  <div>Total Selected: {selectedNumbers.size}</div>
                  <div className="text-green-600">
                    Available for Assignment: {phoneNumbers.filter(n => selectedNumbers.has(n._id) && n.status === 'available').length}
                  </div>
                  {phoneNumbers.filter(n => selectedNumbers.has(n._id) && n.status !== 'available').length > 0 && (
                    <div className="text-yellow-600">
                      Not Available: {phoneNumbers.filter(n => selectedNumbers.has(n._id) && n.status !== 'available').length} (will be skipped)
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="bulkUserId">User *</Label>
                <Select value={assignForm.userId} onValueChange={(value) => setAssignForm({ ...assignForm, userId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      if (users.length === 0) {
                        return [
                          <SelectItem key="no-users" value="no-users" disabled>
                            No users available
                          </SelectItem>
                        ];
                      }
                      
                      return users.map((user, index) => {
                        const userId = user._id || `fallback-${index}`;
                        const userEmail = user.email || 'No email';
                        const userName = user.name || userEmail;
                        const companyName = user.onboarding?.companyName || user.company || userEmail;
                        
                        return (
                          <SelectItem key={`bulk-assign-user-${userId}`} value={userId}>
                            {userName} ({companyName})
                          </SelectItem>
                        );
                      });
                    })()}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="bulkBillingStartDate">Billing Start Date</Label>
                <Input
                  id="bulkBillingStartDate"
                  type="date"
                  value={assignForm.billingStartDate}
                  onChange={(e) => setAssignForm({ ...assignForm, billingStartDate: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="bulkNotes">Notes</Label>
                <Textarea
                  id="bulkNotes"
                  value={assignForm.notes}
                  onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                  placeholder="Optional bulk assignment notes"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowBulkAssignModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleBulkAssign}
                disabled={isSubmitting || !assignForm.userId || phoneNumbers.filter(n => selectedNumbers.has(n._id) && n.status === 'available').length === 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  `Assign ${phoneNumbers.filter(n => selectedNumbers.has(n._id) && n.status === 'available').length} Numbers`
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Unassign Phone Numbers Modal */}
        <Dialog open={showBulkUnassignModal} onOpenChange={setShowBulkUnassignModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk Unassign Phone Numbers</DialogTitle>
              <DialogDescription>
                Unassign {phoneNumbers.filter(n => selectedNumbers.has(n._id) && n.status === 'assigned').length} assigned phone numbers from their users
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Show selected numbers summary */}
              <div className="p-3 bg-muted/30 rounded-lg">
                <Label className="text-sm font-medium">Selected Numbers Summary</Label>
                <div className="mt-2 text-sm space-y-1">
                  <div>Total Selected: {selectedNumbers.size}</div>
                  <div className="text-orange-600">
                    Assigned for Unassignment: {phoneNumbers.filter(n => selectedNumbers.has(n._id) && n.status === 'assigned').length}
                  </div>
                  {phoneNumbers.filter(n => selectedNumbers.has(n._id) && n.status !== 'assigned').length > 0 && (
                    <div className="text-yellow-600">
                      Not Assigned: {phoneNumbers.filter(n => selectedNumbers.has(n._id) && n.status !== 'assigned').length} (will be skipped)
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="bulkUnassignReason">Reason (Optional)</Label>
                <Textarea
                  id="bulkUnassignReason"
                  value={unassignForm.reason}
                  onChange={(e) => setUnassignForm({ ...unassignForm, reason: e.target.value })}
                  placeholder="Reason for bulk unassignment..."
                  rows={3}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={unassignForm.cancelPendingBilling}
                    onCheckedChange={(checked) => setUnassignForm({ ...unassignForm, cancelPendingBilling: !!checked })}
                  />
                  <Label htmlFor="bulkCancelPendingBilling" className="text-sm font-medium">
                    Cancel pending billing records
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={unassignForm.createRefund}
                    onCheckedChange={(checked) => setUnassignForm({ ...unassignForm, createRefund: !!checked })}
                  />
                  <Label htmlFor="bulkCreateRefund" className="text-sm font-medium">
                    Create refund for each number
                  </Label>
                </div>

                {unassignForm.createRefund && (
                  <div className="ml-6">
                    <Label htmlFor="bulkRefundAmount">Refund Amount (per number)</Label>
                    <Input
                      id="bulkRefundAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={unassignForm.refundAmount}
                      onChange={(e) => setUnassignForm({ ...unassignForm, refundAmount: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      This amount will be refunded for each unassigned number
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowBulkUnassignModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={confirmBulkUnassign}
                disabled={isSubmitting || phoneNumbers.filter(n => selectedNumbers.has(n._id) && n.status === 'assigned').length === 0}
                variant="destructive"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Unassigning...
                  </>
                ) : (
                  `Unassign ${phoneNumbers.filter(n => selectedNumbers.has(n._id) && n.status === 'assigned').length} Numbers`
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Unassign Confirmation Dialog */}
        <AlertDialog open={showBulkUnassignConfirm} onOpenChange={setShowBulkUnassignConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Bulk Unassignment</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to unassign {phoneNumbers.filter(n => selectedNumbers.has(n._id) && n.status === 'assigned').length} phone numbers? This will make them available again and cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowBulkUnassignConfirm(false)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmBulkUnassign}
                disabled={isSubmitting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Unassigning...
                  </>
                ) : (
                  'Unassign Numbers'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reserve Phone Number Modal */}
        <Dialog open={showReserveModal} onOpenChange={setShowReserveModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('phoneNumbers.admin.modals.reserve.title')}</DialogTitle>
              <DialogDescription>
                {t('phoneNumbers.admin.modals.reserve.description', { number: selectedNumber?.number || '' })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="reserveReason">{t('phoneNumbers.admin.modals.reserve.fields.reason')} *</Label>
                <Textarea
                  id="reserveReason"
                  value={reserveForm.reason}
                  onChange={(e) => setReserveForm({ ...reserveForm, reason: e.target.value })}
                  placeholder={t('phoneNumbers.admin.modals.reserve.fields.reason')}
                  rows={3}
                  required
                />
              </div>

              <div>
                <Label htmlFor="reservedUntil">{t('phoneNumbers.admin.modals.reserve.fields.reservedUntil')}</Label>
                <Input
                  id="reservedUntil"
                  type="datetime-local"
                  value={reserveForm.reservedUntil}
                  onChange={(e) => setReserveForm({ ...reserveForm, reservedUntil: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  If not specified, the number will be reserved for 7 days
                </p>
              </div>
              
              <div>
                <Label htmlFor="reserveNotes">{t('phoneNumbers.admin.modals.reserve.fields.notes')}</Label>
                <Textarea
                  id="reserveNotes"
                  value={reserveForm.notes}
                  onChange={(e) => setReserveForm({ ...reserveForm, notes: e.target.value })}
                  placeholder={t('phoneNumbers.admin.modals.reserve.fields.notes')}
                  rows={2}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowReserveModal(false)}>
                {t('phoneNumbers.admin.modals.reserve.buttons.cancel')}
              </Button>
              <Button
                onClick={handleReservePhoneNumber}
                disabled={isSubmitting || !reserveForm.reason.trim()}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('phoneNumbers.admin.modals.reserve.buttons.reserving')}
                  </>
                ) : (
                  t('phoneNumbers.admin.modals.reserve.buttons.reserve')
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Suspend Phone Number Modal */}
        <Dialog open={showSuspendModal} onOpenChange={setShowSuspendModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('phoneNumbers.admin.modals.suspend.title')}</DialogTitle>
              <DialogDescription>
                {t('phoneNumbers.admin.modals.suspend.description', { number: selectedNumber?.number || '' })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="suspendReason">{t('phoneNumbers.admin.modals.suspend.fields.reason')} *</Label>
                <Textarea
                  id="suspendReason"
                  value={suspendForm.reason}
                  onChange={(e) => setSuspendForm({ ...suspendForm, reason: e.target.value })}
                  placeholder={t('phoneNumbers.admin.modals.suspend.fields.reason')}
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={suspendForm.suspendBilling}
                    onCheckedChange={(checked) => setSuspendForm({ ...suspendForm, suspendBilling: !!checked })}
                  />
                  <Label htmlFor="suspendBilling" className="text-sm font-medium">
                    Suspend billing for this number
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  Pending billing records will be marked as suspended
                </p>
              </div>

                              <div>
                <Label htmlFor="autoResumeDate">{t('phoneNumbers.admin.modals.suspend.fields.suspendedUntil')}</Label>
                <Input
                  id="autoResumeDate"
                  type="datetime-local"
                  value={suspendForm.autoResumeDate}
                  onChange={(e) => setSuspendForm({ ...suspendForm, autoResumeDate: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  If specified, the number will automatically resume on this date
                </p>
              </div>
              
              <div>
                <Label htmlFor="suspendNotes">{t('phoneNumbers.admin.modals.suspend.fields.notes')}</Label>
                <Textarea
                  id="suspendNotes"
                  value={suspendForm.notes}
                  onChange={(e) => setSuspendForm({ ...suspendForm, notes: e.target.value })}
                  placeholder={t('phoneNumbers.admin.modals.suspend.fields.notes')}
                  rows={2}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowSuspendModal(false)}>
                {t('phoneNumbers.admin.modals.suspend.buttons.cancel')}
              </Button>
              <Button
                onClick={handleSuspendPhoneNumber}
                disabled={isSubmitting || !suspendForm.reason.trim()}
                variant="destructive"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('phoneNumbers.admin.modals.suspend.buttons.suspending')}
                  </>
                ) : (
                  t('phoneNumbers.admin.modals.suspend.buttons.suspend')
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Cancel Phone Number Modal */}
        <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('phoneNumbers.admin.modals.cancel.title')}</DialogTitle>
              <DialogDescription>
                {t('phoneNumbers.admin.modals.cancel.description', { number: selectedNumber?.number || '' })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="cancelReason">{t('phoneNumbers.admin.modals.cancel.fields.reason')} *</Label>
                <Textarea
                  id="cancelReason"
                  value={cancelForm.reason}
                  onChange={(e) => setCancelForm({ ...cancelForm, reason: e.target.value })}
                  placeholder={t('phoneNumbers.admin.modals.cancel.fields.reason')}
                  rows={3}
                  required
                />
              </div>

              <div>
                <Label htmlFor="gracePeriodDays">Grace Period (Days)</Label>
                <Input
                  id="gracePeriodDays"
                  type="number"
                  min="0"
                  max="365"
                  value={cancelForm.gracePeriodDays}
                  onChange={(e) => setCancelForm({ ...cancelForm, gracePeriodDays: parseInt(e.target.value) || 30 })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Number will be permanently deleted after this many days (0 = immediate deletion)
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={cancelForm.cancelBilling}
                    onCheckedChange={(checked) => setCancelForm({ ...cancelForm, cancelBilling: !!checked })}
                  />
                  <Label htmlFor="cancelBilling" className="text-sm font-medium">
                    Cancel all pending billing
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={cancelForm.createRefund}
                    onCheckedChange={(checked) => setCancelForm({ ...cancelForm, createRefund: !!checked })}
                  />
                  <Label htmlFor="createRefund" className="text-sm font-medium">
                    Create refund
                  </Label>
                </div>
                
                {cancelForm.createRefund && (
                  <div className="ml-6">
                    <Label htmlFor="refundAmount">Refund Amount</Label>
                    <Input
                      id="refundAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={cancelForm.refundAmount}
                      onChange={(e) => setCancelForm({ ...cancelForm, refundAmount: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                    />
                  </div>
                )}
              </div>
              
              <div>
                <Label htmlFor="cancelNotes">Additional Notes</Label>
                <Textarea
                  id="cancelNotes"
                  value={cancelForm.notes}
                  onChange={(e) => setCancelForm({ ...cancelForm, notes: e.target.value })}
                  placeholder="Optional additional notes..."
                  rows={2}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowCancelModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCancelPhoneNumber}
                disabled={isSubmitting || !cancelForm.reason.trim()}
                variant="destructive"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  'Cancel Number'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Unreserve Phone Number Modal */}
        <Dialog open={showUnreserveModal} onOpenChange={setShowUnreserveModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Unreserve Phone Number</DialogTitle>
              <DialogDescription>
                Make {selectedNumber?.number} available again
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="unreserveReason">Reason for Unreserving *</Label>
                <Textarea
                  id="unreserveReason"
                  value={unreserveForm.reason}
                  onChange={(e) => setUnreserveForm({ ...unreserveForm, reason: e.target.value })}
                  placeholder="Enter reason for unreserving this number..."
                  rows={3}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="unreserveNotes">Additional Notes</Label>
                <Textarea
                  id="unreserveNotes"
                  value={unreserveForm.notes}
                  onChange={(e) => setUnreserveForm({ ...unreserveForm, notes: e.target.value })}
                  placeholder="Optional additional notes..."
                  rows={2}
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowUnreserveModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleUnreservePhoneNumber}
                disabled={isSubmitting || !unreserveForm.reason.trim()}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Unreserving...
                  </>
                ) : (
                  'Unreserve Number'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageLayout>
    </MainLayout>
  );
}