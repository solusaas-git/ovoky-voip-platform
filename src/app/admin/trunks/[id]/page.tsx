'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Server, 
  Network, 
  Settings, 
  User, 
  Shield, 
  Clock,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Eye,
  EyeOff
} from 'lucide-react';
import { Trunk } from '@/types/trunk';
import { RegistrationStatus } from '@/components/sippy/RegistrationStatus';
import { StatusWithAccountManagement } from '@/components/sippy/StatusWithAccountManagement';
import { AccountParametersManager } from '@/components/sippy/AccountParametersManager';
import { AuthRulesDisplay } from '@/components/sippy/AuthRulesDisplay';

export default function TrunkViewPage() {
  const router = useRouter();
  const params = useParams();
  const trunkId = params.id as string;

  const [trunk, setTrunk] = useState<Trunk | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);


  useEffect(() => {
    if (trunkId) {
      fetchTrunk();
    }
  }, [trunkId]);

  const fetchTrunk = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/trunks/${trunkId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Trunk not found');
        } else {
          throw new Error('Failed to fetch trunk details');
        }
        return;
      }

      const data = await response.json();
      setTrunk(data);
    } catch (error) {
      console.error('Error fetching trunk:', error);
      setError('Failed to load trunk details');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!trunk || !confirm(`Are you sure you want to delete the trunk "${trunk.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/trunks/${trunkId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete trunk');
      }

      router.push('/admin/trunks');
    } catch (error) {
      console.error('Error deleting trunk:', error);
      alert('Failed to delete trunk');
    }
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };



  if (loading) {
    return (
      <MainLayout>
        <PageLayout
          title="Loading..."
          description="Loading trunk details"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Admin', href: '/admin' },
            { label: 'Trunks', href: '/admin/trunks' },
            { label: 'Details' }
          ]}
        >
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </PageLayout>
      </MainLayout>
    );
  }

  if (error || !trunk) {
    return (
      <MainLayout>
        <PageLayout
          title="Error"
          description="Failed to load trunk details"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Admin', href: '/admin' },
            { label: 'Trunks', href: '/admin/trunks' },
            { label: 'Details' }
          ]}
          headerActions={
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          }
        >
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || 'Trunk not found'}</AlertDescription>
          </Alert>
        </PageLayout>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageLayout
        title={trunk.name}
        description={`Trunk details and configuration`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Admin', href: '/admin' },
          { label: 'Trunks', href: '/admin/trunks' },
          { label: trunk.name }
        ]}
        headerActions={
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button variant="outline" onClick={() => router.push(`/admin/trunks/${trunk._id}/edit`)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Status and Basic Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Server className="h-5 w-5" />
                  <span>Trunk Overview</span>
                </CardTitle>
                <StatusWithAccountManagement 
                  accountId={trunk.assignedToUser?.sippyAccountId}
                  onRefresh={fetchTrunk}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Trunk Name</h3>
                  <p className="text-lg font-semibold">{trunk.name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Created</h3>
                  <p className="text-lg">{new Date(trunk.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              
              {trunk.description && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
                  <p className="text-sm mt-1">{trunk.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Connection Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Network className="h-5 w-5" />
                <span>Connection Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Username</h3>
                  <div className="flex items-center space-x-2">
                    <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{trunk.username}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(trunk.username, 'username')}
                    >
                      {copiedField === 'username' ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Password</h3>
                  <div className="flex items-center space-x-2">
                                         <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono">
                       {showPassword ? trunk.password : '••••••••'}
                     </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    {showPassword && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(trunk.password, 'password')}
                      >
                        {copiedField === 'password' ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Domain</h3>
                  <div className="flex items-center space-x-2">
                    <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{trunk.domain}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(trunk.domain, 'domain')}
                    >
                      {copiedField === 'domain' ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">IP Addresses</h3>
                  <div className="space-y-2 mt-1">
                    {/* Unified IP Address Display */}
                    {trunk.ipAddresses && trunk.ipAddresses.length > 0 ? (
                      // Modern format: use ipAddresses array
                      trunk.ipAddresses.map((ip: string, index: number) => (
                        <div key={index} className="flex items-center space-x-2">
                          <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{ip}</code>
                          {index === 0 && <Badge variant="outline" className="text-xs">Primary</Badge>}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(ip, `ipAddress-${index}`)}
                          >
                            {copiedField === `ipAddress-${index}` ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      ))
                    ) : trunk.ipAddress ? (
                      // Backward compatibility: fallback to ipAddress field
                      <div className="flex items-center space-x-2">
                        <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{trunk.ipAddress}</code>
                        <Badge variant="outline" className="text-xs">Primary</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(trunk.ipAddress!, 'ipAddress')}
                        >
                          {copiedField === 'ipAddress' ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No IP addresses configured</p>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Port</h3>
                  <p className="text-sm font-mono">{trunk.port || 5060}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Authentication Type</h3>
                  <p className="text-sm capitalize">{trunk.authType || 'password'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Registration Required</h3>
                  <p className="text-sm">{trunk.registrationRequired ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Capacity Management */}
          {trunk.assignedToUser?.sippyAccountId && (
            <AccountParametersManager
              accountId={trunk.assignedToUser.sippyAccountId}
              onUpdate={fetchTrunk}
            />
          )}

          {/* Authentication Rules */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Authentication Rules</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trunk.assignedToUser?.sippyAccountId ? (
                <AuthRulesDisplay accountId={trunk.assignedToUser.sippyAccountId} isAdmin={true} />
              ) : (
                <div className="text-center py-8">
                  <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No SIP Account</h3>
                  <p className="text-muted-foreground">
                    This trunk is not assigned to a user with a configured SIP account. Authentication 
                    rules will be available once the trunk is properly assigned and configured.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Codecs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Codec Configuration</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {trunk.codecs.map((codec) => (
                  <Badge key={codec} variant="secondary" className="text-sm">
                    {codec}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Assignment Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Assignment Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {trunk.assignedToUser ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Assigned User</h3>
                      <p className="text-lg font-semibold">
                        {trunk.assignedToUser.name || trunk.assignedToUser.email}
                      </p>
                      <p className="text-sm text-muted-foreground">{trunk.assignedToUser.email}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Company</h3>
                      <p className="text-sm">
                        {trunk.assignedToUser.company || 
                         trunk.assignedToUser.onboarding?.companyName || 
                         'Not specified'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Assigned Date</h3>
                    <p className="text-sm flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>{new Date(trunk.assignedAt).toLocaleString()}</span>
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-6">
                  <User className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                  <p className="text-muted-foreground">This trunk is not assigned to any user</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* SIP Registration Status */}
          {trunk.assignedToUser?.sippyAccountId && (
            <RegistrationStatus 
              accountId={trunk.assignedToUser.sippyAccountId} 
              autoRefresh={true}
            />
          )}

          {/* Admin Notes */}
          {trunk.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Admin Notes</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{trunk.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Sippy Integration (if configured) */}
          {(trunk.sippyAccountId || trunk.sippyTrunkId) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Sippy Integration</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {trunk.sippyAccountId && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Sippy Account ID</h3>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">{trunk.sippyAccountId}</code>
                  </div>
                )}
                {trunk.sippyTrunkId && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Sippy Trunk ID</h3>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">{trunk.sippyTrunkId}</code>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>


      </PageLayout>
    </MainLayout>
  );
} 