'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, Mail, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Form validation schema
const formSchema = z.object({
  otpCode: z.string()
    .length(6, { message: 'Verification code must be 6 digits' })
    .regex(/^\d+$/, { message: 'Verification code must contain only numbers' }),
});

interface EmailVerificationFormProps {
  email: string;
  name: string;
  onVerificationSuccess: () => void;
  onBackToRegister?: () => void;
}

export function EmailVerificationForm({ 
  email, 
  name, 
  onVerificationSuccess, 
  onBackToRegister 
}: EmailVerificationFormProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Form definition
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      otpCode: '',
    },
  });

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Form submission handler
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsVerifying(true);
    setVerificationStatus('idle');
    setErrorMessage('');
    
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          otpCode: values.otpCode 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Verification failed');
      }

      setVerificationStatus('success');
      toast.success('Email verified successfully!');
      
      // Call success callback after a brief delay
      setTimeout(() => {
        onVerificationSuccess();
      }, 1500);

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Verification failed';
      toast.error(message);
    } finally {
      setIsVerifying(false);
    }
  }

  // Resend verification email
  async function handleResend() {
    setIsResending(true);
    setErrorMessage('');
    
    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to resend verification code');
      }

      toast.success('Verification code sent!');
      setCountdown(60); // 1 minute cooldown
      form.reset();

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to resend verification code';
      toast.error(message);
      setErrorMessage(message);
    } finally {
      setIsResending(false);
    }
  }

  const getStatusIcon = () => {
    switch (verificationStatus) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400" />;
      default:
        return <Mail className="h-5 w-5 text-[var(--brand-primary)]" />;
    }
  };

  const getStatusMessage = () => {
    switch (verificationStatus) {
      case 'success':
        return 'Email verified successfully! Redirecting...';
      case 'error':
        return errorMessage;
      default:
        return `We've sent a 6-digit verification code to ${email}`;
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          {getStatusIcon()}
        </div>
        <CardTitle>Verify Your Email</CardTitle>
        <CardDescription>
          Enter the verification code sent to your email
        </CardDescription>
      </CardHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                {getStatusMessage()}
              </AlertDescription>
            </Alert>

            <FormField
              control={form.control}
              name="otpCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Verification Code</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter 6-digit code" 
                      {...field}
                      maxLength={6}
                      className="text-center text-lg tracking-widest font-mono"
                      disabled={isVerifying || verificationStatus === 'success'}
                      autoComplete="one-time-code"
                    />
                  </FormControl>
                  <FormDescription>
                    The code expires in 10 minutes
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {errorMessage && verificationStatus === 'error' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-3">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isVerifying || verificationStatus === 'success'}
            >
              {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isVerifying ? 'Verifying...' : 
               verificationStatus === 'success' ? 'Verified!' : 'Verify Email'}
            </Button>

            <div className="flex items-center justify-between w-full text-sm">
              <span className="text-muted-foreground">
                Didn't receive the code?
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResend}
                disabled={isResending || countdown > 0 || verificationStatus === 'success'}
              >
                {isResending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                {!isResending && countdown === 0 && <RefreshCw className="mr-2 h-3 w-3" />}
                {countdown > 0 ? `Resend in ${countdown}s` : 
                 isResending ? 'Sending...' : 'Resend Code'}
              </Button>
            </div>

            {onBackToRegister && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onBackToRegister}
                className="w-full"
                disabled={isVerifying || isResending}
              >
                Back to Registration
              </Button>
            )}
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
} 