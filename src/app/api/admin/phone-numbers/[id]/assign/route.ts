import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import PhoneNumber from '@/models/PhoneNumber';
import PhoneNumberAssignment from '@/models/PhoneNumberAssignment';
import PhoneNumberBilling from '@/models/PhoneNumberBilling';
import NumberRateDeck from '@/models/NumberRateDeck';
import NumberRate from '@/models/NumberRate';
import User from '@/models/User';
import BrandingSettings from '@/models/BrandingSettings';
import mongoose from 'mongoose';
import { z } from 'zod';
import { generateNumberAssignmentNotificationTemplate } from '@/lib/emailTemplates/phoneNumberNotifications';
import { logAndSendEmail } from '@/lib/emailLogger';
import SmtpService from '@/services/SmtpService';

// Type definitions for populated documents
interface PopulatedUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  company?: string;
}



// Validation schema for assigning phone numbers
const assignPhoneNumberSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  billingStartDate: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

// POST - Assign phone number to user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify the user is authenticated and is an admin
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: phoneNumberId } = await params;
    const body = await request.json();
    
    // Validate the request body
    const validatedData = assignPhoneNumberSchema.parse(body);

    // Connect to the database
    await connectToDatabase();

    // Find the phone number
    const phoneNumber = await PhoneNumber.findById(phoneNumberId);
    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number not found' }, { status: 404 });
    }

    // Check if phone number is available for assignment
    if (phoneNumber.status !== 'available') {
      return NextResponse.json(
        { error: `Phone number is ${phoneNumber.status} and cannot be assigned` },
        { status: 400 }
      );
    }

    // Find the user
    const targetUser = await User.findById(validatedData.userId);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user already has this phone number assigned
    const existingAssignment = await PhoneNumberAssignment.findOne({
      phoneNumberId: new mongoose.Types.ObjectId(phoneNumberId),
      userId: new mongoose.Types.ObjectId(validatedData.userId),
      status: 'active',
    });

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'Phone number is already assigned to this user' },
        { status: 400 }
      );
    }

    // Parse billing start date or use current date
    const billingStartDate = validatedData.billingStartDate ? 
      new Date(validatedData.billingStartDate) : 
      new Date();

    // Lookup actual rates from rate deck if assigned
    let actualMonthlyRate = phoneNumber.monthlyRate || 0;
    let actualSetupFee = phoneNumber.setupFee || 0;
    let actualCurrency = phoneNumber.currency || 'USD';

    if (phoneNumber.rateDeckId) {
      try {
        // Get the rate deck first to get its currency
        const rateDeck = await NumberRateDeck.findById(phoneNumber.rateDeckId);
        if (rateDeck) {
          actualCurrency = rateDeck.currency;

          // Find the specific rate for this country and number type
          const rate = await NumberRate.findOne({
            rateDeckId: phoneNumber.rateDeckId,
            country: phoneNumber.country,
            type: phoneNumber.numberType,
            effectiveDate: { $lte: new Date() } // Only consider rates that are effective
          })
          .sort({ effectiveDate: -1 }) // Get the most recent effective rate
          .lean();

          if (rate) {
            actualMonthlyRate = rate.rate;
            actualSetupFee = rate.setupFee || 0;
            console.log(`📊 Found rate for ${phoneNumber.country} ${phoneNumber.numberType}: ${actualMonthlyRate} ${actualCurrency}/month, setup: ${actualSetupFee} ${actualCurrency}`);
          } else {
            console.warn(`⚠️ No rate found for ${phoneNumber.country} ${phoneNumber.numberType} in rate deck ${phoneNumber.rateDeckId}`);
          }
        }
      } catch (error) {
        console.error('Error looking up rates from rate deck:', error);
        // Fall back to phone number's direct rates
      }
    }

    // Perform operations without transactions for standalone MongoDB
    try {
      console.log(`🔄 Assigning phone number ${phoneNumber.number} (${phoneNumber.country} ${phoneNumber.numberType}) to user ${validatedData.userId}`);
      console.log(`💰 Using rates: ${actualMonthlyRate} ${actualCurrency}/month, setup: ${actualSetupFee} ${actualCurrency}`);
      
      // Calculate next billing date
      const nextBillingDate = new Date(billingStartDate);
      if (phoneNumber.billingCycle === 'yearly') {
        nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
      } else {
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
      }
      
      // Update phone number status and assignment
      await PhoneNumber.findByIdAndUpdate(
        phoneNumberId,
        {
          $set: {
            status: 'assigned',
            assignedTo: new mongoose.Types.ObjectId(validatedData.userId),
            assignedBy: user.name || user.email,
            assignedAt: new Date(),
            unassignedAt: null,
            unassignedBy: null,
            unassignedReason: null,
            monthlyRate: actualMonthlyRate,
            setupFee: actualSetupFee,
            currency: actualCurrency,
            nextBillingDate: nextBillingDate,
          }
        }
      );

      // Create assignment record
      const assignment = new PhoneNumberAssignment({
        phoneNumberId: new mongoose.Types.ObjectId(phoneNumberId),
        userId: new mongoose.Types.ObjectId(validatedData.userId),
        assignedBy: user.name || user.email,
        assignedAt: new Date(),
        monthlyRate: actualMonthlyRate,
        setupFee: actualSetupFee,
        currency: actualCurrency,
        billingStartDate,
        status: 'active',
        notes: validatedData.notes,
      });

      await assignment.save();

      // Create setup fee billing if applicable
      if (actualSetupFee > 0) {
        const setupBilling = new PhoneNumberBilling({
          phoneNumberId: new mongoose.Types.ObjectId(phoneNumberId),
          userId: new mongoose.Types.ObjectId(validatedData.userId),
          assignmentId: assignment._id,
          billingPeriodStart: billingStartDate,
          billingPeriodEnd: billingStartDate, // Setup fee is one-time
          amount: actualSetupFee,
          currency: actualCurrency,
          status: 'pending',
          billingDate: new Date(),
          transactionType: 'setup_fee',
        });

        await setupBilling.save();
      }

      // Create first monthly billing if applicable
      // NOTE: Based on billing reflexions - NO PRORATION, always charge full monthly rate
      if (actualMonthlyRate > 0) {
        // Calculate billing period end
        const billingPeriodEnd = new Date(billingStartDate);
        if (phoneNumber.billingCycle === 'yearly') {
          billingPeriodEnd.setFullYear(billingPeriodEnd.getFullYear() + 1);
        } else {
          billingPeriodEnd.setMonth(billingPeriodEnd.getMonth() + 1);
        }

        // NO PRORATION: Always charge full monthly rate
        // This implements the billing reflexion to charge full amount regardless of assignment date
        const amount = actualMonthlyRate;

        const monthlyBilling = new PhoneNumberBilling({
          phoneNumberId: new mongoose.Types.ObjectId(phoneNumberId),
          userId: new mongoose.Types.ObjectId(validatedData.userId),
          assignmentId: assignment._id,
          billingPeriodStart: billingStartDate,
          billingPeriodEnd,
          amount, // Always full monthly rate
          currency: actualCurrency,
          status: 'pending',
          billingDate: phoneNumber.nextBillingDate || new Date(),
          transactionType: 'monthly_fee', // Always monthly_fee, never prorated_fee
          notes: 'Full monthly charge - no proration policy',
        });

        await monthlyBilling.save();
      }

      // Fetch the updated phone number with populated data
      const updatedPhoneNumber = await PhoneNumber.findById(phoneNumberId)
        .populate('assignedTo', 'name email company')
        .lean();

      // Fetch rate deck separately if rateDeckId exists to avoid schema registration issues
      let rateDeckInfo = null;
      if (updatedPhoneNumber?.rateDeckId) {
        try {
          // Import here to ensure the model is registered
          const NumberRateDeckModel = (await import('@/models/NumberRateDeck')).default;
          rateDeckInfo = await NumberRateDeckModel.findById(updatedPhoneNumber.rateDeckId)
            .select('name description currency')
            .lean();
        } catch (error) {
          console.warn('Could not fetch rate deck info:', error);
        }
      }

      // Transform the response
      const response = {
        ...updatedPhoneNumber,
        _id: updatedPhoneNumber!._id.toString(),
        rateDeckId: updatedPhoneNumber!.rateDeckId ? updatedPhoneNumber!.rateDeckId.toString() : undefined,
        rateDeckName: rateDeckInfo?.name || undefined,
        assignedTo: updatedPhoneNumber!.assignedTo!._id.toString(),
        assignedToUser: {
          _id: (updatedPhoneNumber!.assignedTo as unknown as PopulatedUser)._id.toString(),
          name: (updatedPhoneNumber!.assignedTo as unknown as PopulatedUser).name,
          email: (updatedPhoneNumber!.assignedTo as unknown as PopulatedUser).email,
          company: (updatedPhoneNumber!.assignedTo as unknown as PopulatedUser).company,
        },
        createdAt: updatedPhoneNumber!.createdAt.toISOString(),
        updatedAt: updatedPhoneNumber!.updatedAt.toISOString(),
        assignedAt: updatedPhoneNumber!.assignedAt?.toISOString(),
        nextBillingDate: updatedPhoneNumber!.nextBillingDate?.toISOString(),
        lastBilledDate: updatedPhoneNumber!.lastBilledDate?.toISOString(),
      };

      // Send assignment notification email to the user
      try {
        // Get branding settings
        let brandingSettings;
        try {
          brandingSettings = await BrandingSettings.findOne();
        } catch (error) {
          console.error('Error fetching branding settings:', error);
          brandingSettings = null;
        }

        // Default branding if none found
        const defaultBranding = {
          companyName: 'Your VoIP Company',
          companySlogan: 'Connecting the world',
          primaryColor: '#3b82f6',
          fontFamily: 'Inter'
        };

        const branding = {
          companyName: brandingSettings?.companyName || defaultBranding.companyName,
          companySlogan: brandingSettings?.companySlogan || defaultBranding.companySlogan,
          primaryColor: brandingSettings?.primaryColor || defaultBranding.primaryColor,
          fontFamily: brandingSettings?.fontFamily || defaultBranding.fontFamily
        };

        // Prepare notification data
        const assignmentData = {
          phoneNumber: {
            number: updatedPhoneNumber!.number,
            country: updatedPhoneNumber!.country,
            numberType: updatedPhoneNumber!.numberType,
            monthlyRate: actualMonthlyRate,
            setupFee: actualSetupFee,
            currency: actualCurrency,
            capabilities: updatedPhoneNumber!.capabilities || []
          },
          user: {
            name: targetUser.name || targetUser.email,
            email: targetUser.email
          },
          assignment: {
            assignmentId: assignment._id.toString(),
            assignedBy: user.name || user.email,
            assignedAt: new Date().toISOString(),
            billingStartDate: billingStartDate.toISOString(),
            nextBillingDate: nextBillingDate.toISOString(),
            notes: validatedData.notes || ''
          },
          branding
        };

        const emailTemplate = generateNumberAssignmentNotificationTemplate(assignmentData);

        // Send the email using logAndSendEmail
        await logAndSendEmail(
          {
            userId: targetUser._id.toString(),
            userEmail: targetUser.email,
            userName: targetUser.name || targetUser.email,
            sippyAccountId: targetUser.sippyAccountId,
            notificationType: 'number_assignment',
            emailSubject: emailTemplate.subject,
            emailBody: emailTemplate.html,
            alertData: {
              alertType: 'phone_assignment',
              value: 1,
              threshold: 0,
              phoneNumber: updatedPhoneNumber!.number,
              assignedBy: user.name || user.email,
              assignedAt: new Date().toISOString(),
              monthlyRate: actualMonthlyRate,
              currency: actualCurrency
            }
          },
          async () => {
            const smtpService = SmtpService.getInstance();
            const result = await smtpService.sendSupportEmail({
              to: targetUser.email,
              subject: emailTemplate.subject,
              html: emailTemplate.html,
              text: emailTemplate.text
            });
            return result as typeof result & { [key: string]: unknown };
          }
        );

        console.log(`📧 Assignment notification email sent to ${targetUser.email}`);
      } catch (emailError) {
        console.error('Failed to send assignment notification email:', emailError);
        // Don't fail the assignment if email fails
      }

      return NextResponse.json({
        message: 'Phone number assigned successfully',
        phoneNumber: response,
      });

    } catch (assignmentError) {
      console.error('Error during assignment operations:', assignmentError);
      
      // Try to rollback if possible (best effort)
      try {
        await PhoneNumber.findByIdAndUpdate(phoneNumberId, {
          $set: {
            status: 'available',
            assignedTo: null,
            assignedBy: null,
            assignedAt: null,
          }
        });
      } catch (rollbackError) {
        console.error('Error during rollback:', rollbackError);
      }
      
      return NextResponse.json(
        { error: 'Failed to assign phone number due to database operation failure' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error assigning phone number:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to assign phone number' },
      { status: 500 }
    );
  }
} 