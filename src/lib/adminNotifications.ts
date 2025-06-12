import User from '@/models/User';
import BrandingSettings from '@/models/BrandingSettings';
import { logAndSendEmail } from '@/lib/emailLogger';
import SmtpService from '@/services/SmtpService';
import {
  generateAdminUserPurchaseNotificationTemplate,
  generateAdminBackorderRequestNotificationTemplate,
  generateAdminCancellationRequestNotificationTemplate,
  AdminUserPurchaseNotificationData,
  AdminBackorderRequestNotificationData,
  AdminCancellationRequestNotificationData
} from '@/lib/emailTemplates/phoneNumberNotifications';

/**
 * Get admin email addresses who should receive notifications
 */
export async function getAdminEmails(): Promise<string[]> {
  try {
    const adminUsers = await User.find({ role: 'admin' }).select('email').lean();
    return adminUsers.map(admin => admin.email);
  } catch (error) {
    console.error('Error fetching admin emails:', error);
    return [];
  }
}

/**
 * Get branding settings for email templates
 */
async function getBrandingSettings() {
  try {
    const brandingSettings = await BrandingSettings.findOne();
    return {
      companyName: brandingSettings?.companyName || 'Your VoIP Company',
      companySlogan: brandingSettings?.companySlogan || 'Connecting the world',
      primaryColor: brandingSettings?.primaryColor || '#3b82f6',
      fontFamily: brandingSettings?.fontFamily || 'Inter'
    };
  } catch (error) {
    console.error('Error fetching branding settings:', error);
    return {
      companyName: 'Your VoIP Company',
      companySlogan: 'Connecting the world',
      primaryColor: '#3b82f6',
      fontFamily: 'Inter'
    };
  }
}

/**
 * Send admin notification when user purchases phone numbers
 */
export async function sendAdminUserPurchaseNotification(data: {
  phoneNumber: {
    number: string;
    country: string;
    numberType: string;
    monthlyRate: number;
    setupFee?: number;
    currency: string;
    capabilities: string[];
  };
  user: {
    name: string;
    email: string;
    company?: string;
  };
  purchase: {
    purchaseId: string;
    purchaseDate: string;
    totalAmount: number;
    billingStartDate: string;
    nextBillingDate: string;
  };
  purchaseType: 'direct' | 'bulk';
  numbersCount?: number;
  purchasedNumbers?: Array<{
    number: string;
    country: string;
    numberType: string;
    monthlyRate: number;
    setupFee?: number;
    capabilities: string[];
  }>;
}): Promise<void> {
  try {
    const adminEmails = await getAdminEmails();
    if (adminEmails.length === 0) {
      console.log('No admin emails found for purchase notification');
      return;
    }

    const branding = await getBrandingSettings();

    // Send notification to each admin
    for (const adminEmail of adminEmails) {
      const notificationData: AdminUserPurchaseNotificationData = {
        ...data,
        branding,
        adminEmail
      };

      const emailTemplate = generateAdminUserPurchaseNotificationTemplate(notificationData);

      // Send the email using logAndSendEmail
      await logAndSendEmail(
        {
          userId: 'admin', // Admin notification
          userEmail: adminEmail,
          userName: 'Admin',
          notificationType: data.purchaseType === 'bulk' ? 'admin_user_purchase_bulk' : 'admin_user_purchase_single',
          emailSubject: emailTemplate.subject,
          emailBody: emailTemplate.html
        },
        async () => {
          const smtpService = SmtpService.getInstance();
          return await smtpService.sendSupportEmail({
            to: adminEmail,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
            text: emailTemplate.text
          }) as any;
        }
      );
    }

    console.log(`📧 Admin purchase notifications sent to ${adminEmails.length} admins for user ${data.user.email}`);
  } catch (error) {
    console.error('Failed to send admin purchase notification:', error);
    // Don't fail the purchase if admin email fails
  }
}

/**
 * Send admin notification when user submits backorder request
 */
export async function sendAdminBackorderRequestNotification(data: {
  phoneNumber: {
    number: string;
    country: string;
    numberType: string;
    monthlyRate: number;
    setupFee?: number;
    currency: string;
    capabilities: string[];
  };
  user: {
    name: string;
    email: string;
    company?: string;
  };
  request: {
    requestNumber: string;
    submittedAt: string;
    reason?: string;
    businessJustification?: string;
  };
  requestType?: 'single' | 'bulk';
  numbersCount?: number;
}): Promise<void> {
  try {
    const adminEmails = await getAdminEmails();
    if (adminEmails.length === 0) {
      console.log('No admin emails found for backorder request notification');
      return;
    }

    const branding = await getBrandingSettings();

    // Send notification to each admin
    for (const adminEmail of adminEmails) {
      const notificationData: AdminBackorderRequestNotificationData = {
        ...data,
        branding,
        adminEmail
      };

      const emailTemplate = generateAdminBackorderRequestNotificationTemplate(notificationData);

      // Send the email using logAndSendEmail
      await logAndSendEmail(
        {
          userId: 'admin', // Admin notification
          userEmail: adminEmail,
          userName: 'Admin',
          notificationType: 'admin_backorder_request',
          emailSubject: emailTemplate.subject,
          emailBody: emailTemplate.html
        },
        async () => {
          const smtpService = SmtpService.getInstance();
          return await smtpService.sendSupportEmail({
            to: adminEmail,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
            text: emailTemplate.text
          }) as any;
        }
      );
    }

    console.log(`📧 Admin backorder request notifications sent to ${adminEmails.length} admins for request ${data.request.requestNumber}`);
  } catch (error) {
    console.error('Failed to send admin backorder request notification:', error);
    // Don't fail the request if admin email fails
  }
}

/**
 * Send admin notification when user submits cancellation request
 */
export async function sendAdminCancellationRequestNotification(data: {
  phoneNumber: {
    number: string;
    country: string;
    numberType: string;
    monthlyRate: number;
    setupFee?: number;
    currency: string;
    capabilities: string[];
  };
  user: {
    name: string;
    email: string;
    company?: string;
  };
  request: {
    requestId: string;
    submittedAt: string;
    reason?: string;
    businessJustification?: string;
  };
}): Promise<void> {
  try {
    const adminEmails = await getAdminEmails();
    if (adminEmails.length === 0) {
      console.log('No admin emails found for cancellation request notification');
      return;
    }

    const branding = await getBrandingSettings();

    // Send notification to each admin
    for (const adminEmail of adminEmails) {
      const notificationData: AdminCancellationRequestNotificationData = {
        ...data,
        branding,
        adminEmail
      };

      const emailTemplate = generateAdminCancellationRequestNotificationTemplate(notificationData);

      // Send the email using logAndSendEmail
      await logAndSendEmail(
        {
          userId: 'admin', // Admin notification
          userEmail: adminEmail,
          userName: 'Admin',
          notificationType: 'admin_cancellation_request',
          emailSubject: emailTemplate.subject,
          emailBody: emailTemplate.html
        },
        async () => {
          const smtpService = SmtpService.getInstance();
          return await smtpService.sendSupportEmail({
            to: adminEmail,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
            text: emailTemplate.text
          }) as any;
        }
      );
    }

    console.log(`📧 Admin cancellation request notifications sent to ${adminEmails.length} admins for request ${data.request.requestId}`);
  } catch (error) {
    console.error('Failed to send admin cancellation request notification:', error);
    // Don't fail the request if admin email fails
  }
} 