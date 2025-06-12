'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { Home, Phone, FileText, LogOut, Menu, X, Users, Settings, ArrowLeftFromLine, User, Mail, DollarSign, CreditCard, LifeBuoy, Hash, MessageSquare, Network } from 'lucide-react';
import { toast } from 'sonner';
import { AccountVerificationModal } from '@/components/ui/account-verification-modal';
import { AccountSuspendedDialog } from '@/components/auth/AccountSuspendedDialog';
import { BrandLogo } from '@/components/ui/brand-logo';
import { UserOnboardingForm } from '@/components/onboarding/UserOnboardingForm';
import { useOnboarding } from '@/hooks/useOnboarding';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const { needsOnboarding, needsVerification, isLoading: onboardingLoading, markOnboardingComplete } = useOnboarding();
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();

  // Toggle sidebar collapse on mobile
  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };
  
  // Handle returning to admin account
  const handleReturnToAdmin = async () => {
    try {
      const response = await fetch('/api/users/return-to-admin', {
        method: 'POST',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to return to admin account');
      }
      
      toast.success('Returned to admin account');
      
      // Redirect to users page
      router.push('/users');
      setTimeout(() => window.location.href = '/users', 500);
    } catch (error) {
      console.error('Error returning to admin:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to return to admin account');
    }
  };

  const handleOnboardingComplete = () => {
    markOnboardingComplete();
    toast.success('Onboarding completed! Your account is now under review.');
  };

  const handleOnboardingSkip = () => {
    markOnboardingComplete();
    toast.info('Onboarding skipped. You can complete it later in your account settings.');
  };

  const navSections = [
    {
      title: 'Main',
      items: [
        { href: '/dashboard', label: 'Dashboard', icon: <Home className="h-5 w-5" />, description: 'Overview & analytics' }
      ]
    },
    {
      title: 'Call Management',
      items: [
        { href: '/calls', label: 'Active Calls', icon: <Phone className="h-5 w-5" />, description: 'Live call monitoring' },
        { href: '/cdrs', label: 'CDR Reports', icon: <FileText className="h-5 w-5" />, description: 'Call detail records' }
      ]
    },
    {
      title: 'Services',
      items: [
        // Show different phone number links based on user role
        ...(user?.role === 'admin' 
          ? [
              { href: '/admin/phone-numbers', label: 'Phone Numbers', icon: <Hash className="h-5 w-5" />, description: 'Phone number management' },
              { href: '/admin/phone-number-requests', label: 'Number Requests', icon: <FileText className="h-5 w-5" />, description: 'Manage cancellation requests' },
              { href: '/admin/trunks', label: 'Trunks', icon: <Network className="h-5 w-5" />, description: 'SIP trunk management' }
            ]
          : [
              { href: '/services/numbers', label: 'Numbers', icon: <Hash className="h-5 w-5" />, description: 'Manage your phone numbers' },
              { href: '/trunks', label: 'Trunks', icon: <Network className="h-5 w-5" />, description: 'View your SIP trunks' }
            ]
        )
      ]
    },
    {
      title: 'Billing',
      items: [
        { href: '/rates', label: 'Rates', icon: <DollarSign className="h-5 w-5" />, description: 'Account rates & pricing' },
        { href: '/payments', label: 'Payments', icon: <CreditCard className="h-5 w-5" />, description: 'Payment history & balance' }
      ]
    },
    {
      title: 'Support',
      items: [
        { href: '/support/tickets', label: 'Support Tickets', icon: <LifeBuoy className="h-5 w-5" />, description: 'Support tickets & help desk' }
      ]
    },
    {
      title: 'Account',
      items: [
        { href: '/account', label: 'My Account', icon: <User className="h-5 w-5" />, description: 'Profile & billing' },
        // Only show admin items for admin role (excluding phone numbers which is now in Services)
        ...(user?.role === 'admin' ? [
          { href: '/users', label: 'Users', icon: <Users className="h-5 w-5" />, description: 'User management' },
          { href: '/admin/customer-notifications', label: 'Customer Notifications', icon: <MessageSquare className="h-5 w-5" />, description: 'Manage customer notification campaigns' },
          { href: '/admin/notifications', label: 'Notification Logs', icon: <Mail className="h-5 w-5" />, description: 'Email notification history' },
          { href: '/settings', label: 'Settings', icon: <Settings className="h-5 w-5" />, description: 'System configuration' }
        ] : [])
      ]
    }
  ];

  const isActive = (path: string) => pathname === path;

  // Show loading state while checking onboarding status - OPTIMIZED: Non-blocking
  // Instead of blocking the entire layout, we'll show the layout with a loading content area
  const showOnboardingLoader = onboardingLoading;

  // Show onboarding form if needed
  if (needsOnboarding) {
    return (
      <div className="min-h-screen bg-background">
        <UserOnboardingForm 
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      </div>
    );
  }

  // Check if user is suspended (only for non-admin users)
  const isSuspended = user && user.isSuspended && user.role !== 'admin';
  
  const shouldBlockNavigation = needsVerification || isSuspended;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile toggle button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-6 left-6 z-50 md:hidden bg-card shadow-md rounded-lg border"
        onClick={toggleSidebar}
      >
        {collapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
      </Button>

      {/* Sidebar */}
      <div
        className={`
          fixed top-4 bottom-4 left-4 z-40 w-64 transform bg-card shadow-lg rounded-xl border transition-transform duration-200 ease-in-out
          ${collapsed ? '-translate-x-full' : 'translate-x-0'} 
          md:sticky md:top-4 md:h-[calc(100vh-2rem)] md:translate-x-0 md:transform-none md:ml-4
        `}
      >
        <div className="flex h-full flex-col overflow-hidden rounded-xl bg-gradient-to-b from-card to-card/95">
          {/* Header */}
          <div className="p-6 flex-shrink-0 border-b border-border/50">
            <BrandLogo 
              size="md"
              textClassName="text-xl" 
              className="mb-1"
            />
            <p className="text-xs text-muted-foreground ml-11">Dashboard</p>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto px-3 py-4">
            {navSections.map((section, sectionIndex) => (
              <div key={section.title} className={sectionIndex > 0 ? 'mt-6' : ''}>
                <div className="px-3 mb-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {section.title}
                  </h3>
                </div>
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <Link
                      key={item.href}
                      href={shouldBlockNavigation ? '#' : item.href}
                      className={`
                        group flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                        ${shouldBlockNavigation 
                          ? 'opacity-50 pointer-events-none cursor-not-allowed' 
                          : ''
                        }
                        ${isActive(item.href)
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                        }
                      `}
                    >
                      <div className={`
                        mr-3 p-1.5 rounded-md transition-colors duration-200
                        ${isActive(item.href)
                          ? 'bg-primary-foreground/20'
                          : 'bg-muted group-hover:bg-accent-foreground/10'
                        }
                      `}>
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{item.label}</div>
                        <div className={`
                          text-xs transition-colors duration-200
                          ${isActive(item.href)
                            ? 'text-primary-foreground/70'
                            : 'text-muted-foreground group-hover:text-accent-foreground/70'
                          }
                        `}>
                          {item.description}
                        </div>
                      </div>
                      {isActive(item.href) && (
                        <div className="w-1.5 h-1.5 bg-primary-foreground rounded-full"></div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* User Profile & Actions */}
          <div className="flex-shrink-0 border-t border-border/50 p-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user?.role || 'Client'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <NotificationBell size="sm" />
              <ThemeToggle />
              
              <Button
                variant="destructive"
                size="sm"
                onClick={logout}
                className="flex-1 h-9"
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span className="text-xs">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for mobile when sidebar is open */}
      {!collapsed && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0 md:mr-4">
        {/* Impersonation banner */}
        {user?.isImpersonating && (
          <div className="px-6 md:px-8 lg:px-10 py-4 flex justify-center">
            <div className="max-w-7xl w-full bg-gradient-to-r from-amber-50 via-amber-100 to-orange-50 dark:from-amber-950 dark:via-amber-900 dark:to-orange-950 border border-amber-200 dark:border-amber-700 rounded-xl shadow-lg">
              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Warning Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center shadow-sm">
                        <User className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500 text-white">
                          Impersonation Mode
                        </span>
                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div>
                      </div>
                      <p className="text-sm text-amber-800 dark:text-amber-200 truncate">
                        Viewing as{' '}
                        <span className="font-semibold text-amber-900 dark:text-amber-100">
                          {user?.name || 'another user'}
                        </span>
                        {user?.email && (
                          <span className="text-amber-700 dark:text-amber-300 hidden sm:inline">
                            {' '}({user.email})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  {/* Action Button */}
                  <div className="flex-shrink-0">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleReturnToAdmin}
                      className="bg-white/80 hover:bg-white dark:bg-amber-800/50 dark:hover:bg-amber-700 border-amber-300 dark:border-amber-600 text-amber-800 hover:text-amber-900 dark:text-amber-200 dark:hover:text-amber-100 shadow-sm"
                    >
                      <ArrowLeftFromLine className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Return to Admin</span>
                      <span className="sm:hidden">Return</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Account Verification Modal - Only after onboarding is complete */}
        <AccountVerificationModal 
          userName={user?.name || 'User'} 
          userEmail={user?.email || ''}
          isOpen={needsVerification || false}
        />
        
        {/* Account Suspended Dialog - Show when user is suspended */}
        {isSuspended && (
          <AccountSuspendedDialog />
        )}
        
        <div className="h-full bg-gradient-to-br from-background via-background to-muted/20">
          <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto">
            <div className="min-h-[calc(100vh-8rem)]">
              {/* Show loading state while onboarding check is in progress */}
              {showOnboardingLoader ? (
                <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
                  <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground">Initializing...</p>
                  </div>
                </div>
              ) : isSuspended ? (
                <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
                  <div className="text-center space-y-4 opacity-30">
                    <div className="text-6xl">🚫</div>
                    <h2 className="text-2xl font-bold text-muted-foreground">Account Suspended</h2>
                    <p className="text-muted-foreground">Access has been temporarily restricted</p>
                  </div>
                </div>
              ) : !needsVerification ? (
                children
              ) : (
                <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
                  <div className="text-center space-y-4 opacity-30">
                    <div className="text-6xl">🔒</div>
                    <h2 className="text-2xl font-bold text-muted-foreground">Access Restricted</h2>
                    <p className="text-muted-foreground">Account verification required</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notification Center */}
      <NotificationCenter />
    </div>
  );
} 