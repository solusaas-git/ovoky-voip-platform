'use client';

import { LoginForm } from '@/components/auth/LoginForm';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { SimpleLoadingScreen } from '@/components/SimpleLoadingScreen';
import { useBranding } from '@/lib/BrandingContext';

export default function LoginPage() {
  const { settings, isLoading } = useBranding();
  
  // Show simple loading screen until branding is ready
  if (isLoading) {
    return <SimpleLoadingScreen />;
  }
  
  // Use actual branding settings
  const companyName = settings.companyName || 'OVOKY';

  return (
    <AuthLayout
      title="Welcome back"
      subtitle={`Sign in to access ${companyName} dashboard`}
    >
      <LoginForm />
    </AuthLayout>
  );
} 