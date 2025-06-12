'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { UserProfileDetails } from '@/components/account/UserProfileDetails';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AccountPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  
  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return null;
  }

  if (!user) {
    return null;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Account</h1>
          <p className="text-muted-foreground mt-2">
            View and manage your account details and profile information
          </p>
        </div>

        <UserProfileDetails user={user} />
      </div>
    </MainLayout>
  );
} 