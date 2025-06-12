'use client';

import { SignupForm } from '@/components/auth/SignupForm';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { SimpleLoadingScreen } from '@/components/SimpleLoadingScreen';
import { useBranding } from '@/lib/BrandingContext';

export default function RegisterPage() {
  const { settings, isLoading } = useBranding();
  
  // Show simple loading screen until branding is ready
  if (isLoading) {
    return <SimpleLoadingScreen />;
  }
  
  // Use actual branding settings
  const companyName = settings.companyName || 'Sippy Communications';

  return (
    <AuthLayout
      title="Create your account"
      subtitle={`Join ${companyName} and start managing your telecom operations`}
    >
      <SignupForm />
    </AuthLayout>
  );
} 