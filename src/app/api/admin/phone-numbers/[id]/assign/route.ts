import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import PhoneNumber from '@/models/PhoneNumber';
import PhoneNumberAssignment from '@/models/PhoneNumberAssignment';
import PhoneNumberBilling from '@/models/PhoneNumberBilling';
import NumberRate from '@/models/NumberRate';
import NumberRateDeck from '@/models/NumberRateDeck';
import RateDeckAssignment from '@/models/RateDeckAssignment';
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

// Helper function to get user's assigned number rate deck
const getUserAssignedRateDeck = async (userId: string) => {
  try {
    // Find the user's active number rate deck assignment
    const assignment = await RateDeckAssignment.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      rateDeckType: 'number',
      isActive: true,
    }).populate('rateDeckId').lean();

    if (!assignment || !assignment.rateDeckId) {
      return null;
    }

    return assignment.rateDeckId as unknown as {
      _id: mongoose.Types.ObjectId;
      name: string;
      description?: string;
      currency: string;
    };
  } catch (error) {
    console.error('Error fetching user assigned rate deck:', error);
    return null;
  }
};

// Helper function to find matching rate in rate deck
const findMatchingRateInDeck = async (rateDeckId: mongoose.Types.ObjectId, country: string, numberType: string) => {
  try {
    const rate = await NumberRate.findOne({
      rateDeckId: rateDeckId,
      country: country,
      type: numberType,
      effectiveDate: { $lte: new Date() } // Only consider rates that are effective
    })
    .sort({ effectiveDate: -1 }) // Get the most recent effective rate
    .lean();

    return rate;
  } catch (error) {
    console.error('Error finding matching rate:', error);
    return null;
  }
};

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

    // Get user's assigned rate deck and lookup rates
    let actualMonthlyRate = 0;
    let actualSetupFee = 0;
    let actualCurrency = 'USD';
    let userRateDeck = null;

    try {
      // Get the user's assigned rate deck
      userRateDeck = await getUserAssignedRateDeck(validatedData.userId);
      
      if (userRateDeck) {
        actualCurrency = userRateDeck.currency;
        
        // Find the specific rate for this phone number in the user's rate deck
        const rate = await findMatchingRateInDeck(
          userRateDeck._id,
          phoneNumber.country,
          phoneNumber.numberType
        );

        if (rate) {
          actualMonthlyRate = rate.rate;
          actualSetupFee = rate.setupFee || 0;
          console.log(`📊 Found rate for ${phoneNumber.country} ${phoneNumber.numberType} in user's rate deck "${userRateDeck.name}": ${actualMonthlyRate} ${actualCurrency}/month, setup: ${actualSetupFee} ${actualCurrency}`);
        } else {
          console.warn(`⚠️ No rate found for ${phoneNumber.country} ${phoneNumber.numberType} in user's assigned rate deck "${userRateDeck.name}"`);
          return NextResponse.json(
            { error: `No rate found for ${phoneNumber.country} ${phoneNumber.numberType} numbers in user's assigned rate deck "${userRateDeck.name}". Please ensure the rate deck contains rates for this number type and country.` },
            { status: 400 }
          );
        }
      } else {
        console.warn(`⚠️ User ${validatedData.userId} has no assigned number rate deck`);
        return NextResponse.json(
          { error: 'User has no assigned number rate deck. Please assign a rate deck to the user before assigning phone numbers.' },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error('Error looking up user rate deck and rates:', error);
      return NextResponse.json(
        { error: 'Failed to determine billing rates for this user' },
        { status: 500 }
      );
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
      // Note: We don't store rate deck info on the phone number anymore
      // Rates are determined from the user's assigned rate deck
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

      // Use the user's rate deck info instead of phone number's rate deck
      let rateDeckInfo = null;
      if (userRateDeck) {
        rateDeckInfo = {
          name: userRateDeck.name,
          description: userRateDeck.description,
          currency: userRateDeck.currency,
        };
      }

      // Transform the response
      const response = {
        ...updatedPhoneNumber,
        _id: updatedPhoneNumber!._id.toString(),
        // Rate deck info comes from the user's assigned rate deck, not the phone number
        rateDeckId: userRateDeck ? userRateDeck._id.toString() : undefined,
        rateDeckName: rateDeckInfo?.name || undefined,
        rateDeck: userRateDeck ? {
          _id: userRateDeck._id.toString(),
          name: userRateDeck.name,
          description: userRateDeck.description,
          currency: userRateDeck.currency,
        } : undefined,
        // Include the calculated rates for display
        monthlyRate: actualMonthlyRate,
        setupFee: actualSetupFee,
        currency: actualCurrency,
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