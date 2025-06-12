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
  Server, 
  Network, 
  Settings, 
  Clock,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Eye,
  EyeOff,
  Shield
} from 'lucide-react';
import { Trunk } from '@/types/trunk';
import { RegistrationStatus } from '@/components/sippy/RegistrationStatus';
import { AccountStatusBadge } from '@/components/sippy/AccountStatusBadge';
import { AccountCapacityDisplay } from '@/components/sippy/AccountCapacityDisplay';
import { AuthRulesDisplay } from '@/components/sippy/AuthRulesDisplay';
import { useAuth } from '@/lib/AuthContext';

export default function UserTrunkViewPage() {
  const router = useRouter();
  const params = useParams();
  const trunkId = params.id as string;
  const { user } = useAuth();

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

      const response = await fetch(`/api/trunks/${trunkId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Trunk not found or not assigned to you');
        } else if (response.status === 401) {
          router.push('/login');
          return;
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
            { label: 'Services', href: '/services' },
            { label: 'Trunks', href: '/trunks' },
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
            { label: 'Services', href: '/services' },
            { label: 'Trunks', href: '/trunks' },
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
        description="Your SIP trunk configuration details"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Services', href: '/services' },
          { label: 'Trunks', href: '/trunks' },
          { label: trunk.name }
        ]}
        headerActions={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Trunks
          </Button>
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
                {user?.sippyAccountId && (
                  <AccountStatusBadge 
                    accountId={user.sippyAccountId}
                    refreshInterval={60}
                  />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Trunk Name</h3>
                  <p className="text-lg font-semibold">{trunk.name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Assigned Date</h3>
                  <p className="text-lg flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>{new Date(trunk.assignedAt).toLocaleDateString()}</span>
                  </p>
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
                <span>Connection Configuration</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">PBX Configuration</h4>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Use these details to configure your PBX or SIP client to connect to this trunk.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Username</h3>
                  <div className="flex items-center space-x-2">
                    <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono">{trunk.username}</code>
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
                  <h3 className="text-sm font-medium text-muted-foreground">Domain/Host</h3>
                  <div className="flex items-center space-x-2">
                    <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono">{trunk.domain}</code>
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
                          <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono">{ip}</code>
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
                        <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono">{trunk.ipAddress}</code>
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
                  <div className="flex items-center space-x-2">
                    <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono">{trunk.port || 5060}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard((trunk.port || 5060).toString(), 'port')}
                    >
                      {copiedField === 'port' ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
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

          {/* Account Capacity */}
          {user?.sippyAccountId && (
            <AccountCapacityDisplay accountId={user.sippyAccountId} />
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
              {user?.sippyAccountId ? (
                <AuthRulesDisplay accountId={user.sippyAccountId} />
              ) : (
                <div className="text-center py-8">
                  <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">SIP Account Not Configured</h3>
                  <p className="text-muted-foreground">
                    Authentication rules will be available once your SIP account is properly configured.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Codec Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Supported Codecs</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Configure your PBX to use one or more of these supported audio codecs:
                </p>
                <div className="flex flex-wrap gap-2">
                  {trunk.codecs.map((codec) => (
                    <Badge key={codec} variant="secondary" className="text-sm">
                      {codec}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SIP Registration Status */}
          {user?.sippyAccountId && (
            <RegistrationStatus 
              accountId={user.sippyAccountId} 
              autoRefresh={true}
            />
          )}

          {/* Quick Setup Guide */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Quick Setup Guide</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h4 className="font-medium text-green-900 dark:text-green-100 mb-3">Basic Configuration Steps:</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-green-800 dark:text-green-200">
                  <li>Configure your PBX/SIP client with the connection details above</li>
                  <li>Use the username and password provided (click the eye icon to reveal password)</li>
                  <li>Set the authentication method to "{trunk.authType || 'password'}"</li>
                  <li>Enable {trunk.registrationRequired ? 'registration' : 'no registration'}</li>
                  <li>Configure at least one of the supported codecs: {trunk.codecs.join(', ')}</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* Support Information */}
          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                If you need assistance configuring your PBX or have any issues with this trunk, 
                please contact our support team with the trunk name "{trunk.name}" for reference.
              </p>
            </CardContent>
          </Card>
        </div>


      </PageLayout>
    </MainLayout>
  );
} 