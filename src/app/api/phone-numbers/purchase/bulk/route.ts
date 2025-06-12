import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import PhoneNumber from '@/models/PhoneNumber';
import PhoneNumberAssignment from '@/models/PhoneNumberAssignment';
import PhoneNumberBilling from '@/models/PhoneNumberBilling';
import NumberRate from '@/models/NumberRate';
import NumberRateDeck from '@/models/NumberRateDeck';
import mongoose from 'mongoose';
import { z } from 'zod';
import { sendAdminUserPurchaseNotification } from '@/lib/adminNotifications';
import UserOnboarding from '@/models/UserOnboarding';

// TypeScript interfaces
interface PhoneNumberDocument {
  _id: mongoose.Types.ObjectId;
  number: string;
  country: string;
  numberType: string;
  rateDeckId?: mongoose.Types.ObjectId;
  setupFee?: number;
  currency: string;
  billingCycle: string;
  status: string;
  backorderOnly?: boolean;
  description?: string;
  capabilities?: string[];
  provider?: string;
  monthlyRate?: number;
  createdAt: Date;
  updatedAt: Date;
}

interface UserDocument {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

interface PurchaseResult {
  phoneNumberId: string;
  number: string;
  country: string;
  numberType: string;
  monthlyRate: number;
  setupFee: number;
  currency: string;
  billingCycle: string;
}

interface PurchaseError {
  phoneNumberId: string;
  error: string;
  number: string;
}

interface PurchasedNumber {
  number: string;
  country: string;
  numberType: string;
  monthlyRate: number;
  setupFee: number;
  capabilities: string[];
}

// Validation schema for bulk purchasing phone numbers
const bulkPurchaseSchema = z.object({
  phoneNumberIds: z.array(z.string().min(1, 'Phone number ID is required')).min(1, 'At least one phone number is required').max(20, 'Maximum 20 numbers can be purchased at once'),
});

// Helper function to find matching rate for a phone number (copied from single purchase)
const findMatchingRate = async (phoneNumber: PhoneNumberDocument, rateDeckId: string) => {
  if (!rateDeckId) return null;
  
  console.log(`[Rate Matching] Looking for rates for number: ${phoneNumber.number}, country: ${phoneNumber.country}, type: ${phoneNumber.numberType}, rateDeckId: ${rateDeckId}`);
  
  // Find all rates for this rate deck
  const rates = await NumberRate.find({
    rateDeckId: new mongoose.Types.ObjectId(rateDeckId),
  }).lean();
  
  console.log(`[Rate Matching] Found ${rates.length} rates in deck ${rateDeckId}`);
  
  if (rates.length > 0) {
    console.log(`[Rate Matching] Sample rates:`, rates.slice(0, 3).map(r => ({
      prefix: r.prefix,
      country: r.country,
      type: r.type,
      rate: r.rate
    })));
  }
  
  // Normalize phone number for prefix matching (remove + and any spaces)
  const normalizedNumber = phoneNumber.number.replace(/^\+/, '').replace(/\s/g, '');
  console.log(`[Rate Matching] Normalized phone number: ${normalizedNumber} (from ${phoneNumber.number})`);
  
  // First, try to find rates matching country and type
  const countryTypeRates = rates.filter(rate => 
    rate.country.toLowerCase() === phoneNumber.country.toLowerCase() && 
    rate.type === phoneNumber.numberType
  );
  
  console.log(`[Rate Matching] Found ${countryTypeRates.length} rates matching country and type`);
  
  if (countryTypeRates.length > 0) {
    // Among matching country/type rates, find the one with longest matching prefix
    let bestMatch = null;
    let longestMatch = 0;
    
    for (const rate of countryTypeRates) {
      // Normalize rate prefix for comparison (remove + and spaces)
      const normalizedPrefix = rate.prefix.replace(/^\+/, '').replace(/\s/g, '');
      const matches = normalizedNumber.startsWith(normalizedPrefix);
      
      console.log(`[Rate Matching] Checking prefix ${rate.prefix} (normalized: ${normalizedPrefix}) against ${normalizedNumber}: ${matches}`);
      
      if (matches && normalizedPrefix.length > longestMatch) {
        bestMatch = rate;
        longestMatch = normalizedPrefix.length;
      }
    }
    
    if (bestMatch) {
      console.log(`[Rate Matching] Best match: prefix=${bestMatch.prefix}, rate=${bestMatch.rate}, setupFee=${bestMatch.setupFee}`);
      return bestMatch;
    }
  }
  
  // Fallback: try prefix matching only
  console.log(`[Rate Matching] No country/type match, trying prefix-only matching`);
  let bestMatch = null;
  let longestMatch = 0;
  
  for (const rate of rates) {
    // Normalize rate prefix for comparison (remove + and spaces)
    const normalizedPrefix = rate.prefix.replace(/^\+/, '').replace(/\s/g, '');
    const matches = normalizedNumber.startsWith(normalizedPrefix);
    
    if (matches && normalizedPrefix.length > longestMatch) {
      bestMatch = rate;
      longestMatch = normalizedPrefix.length;
    }
  }
  
  if (bestMatch) {
    console.log(`[Rate Matching] Fallback match: prefix=${bestMatch.prefix}, rate=${bestMatch.rate}, country=${bestMatch.country}, type=${bestMatch.type}`);
  } else {
    console.log(`[Rate Matching] No matching rate found for ${phoneNumber.number}`);
  }
  
  return bestMatch;
};

// Helper function to handle phone number updates and record creation
const updatePhoneNumberAndCreateRecords = async (
  phoneNumber: PhoneNumberDocument,
  user: UserDocument,
  now: Date,
  nextBillingDate: Date,
  monthlyRate: number,
  setupFee: number
) => {
  // Update phone number status and assignment
  await PhoneNumber.findByIdAndUpdate(
    phoneNumber._id,
    {
      $set: {
        status: 'assigned',
        assignedTo: new mongoose.Types.ObjectId(user.id),
        assignedBy: user.email,
        assignedAt: now,
        nextBillingDate,
        lastBilledDate: now, // First billing starts today
        monthlyRate: monthlyRate, // Store the calculated rate
        setupFee: setupFee, // Store the calculated setup fee
        // Clear any previous unassignment data
        unassignedAt: null,
        unassignedBy: null,
        unassignedReason: null,
      }
    }
  );

  // Create assignment record
  const assignment = new PhoneNumberAssignment({
    phoneNumberId: phoneNumber._id,
    userId: new mongoose.Types.ObjectId(user.id),
    assignedBy: user.email,
    assignedAt: now,
    status: 'active',
    billingStartDate: now,
    monthlyRate: monthlyRate,
    setupFee: setupFee,
    currency: phoneNumber.currency,
    billingCycle: phoneNumber.billingCycle,
  });
  await assignment.save();

  // Create initial billing record if there's a monthly rate
  if (monthlyRate && monthlyRate > 0) {
    const billing = new PhoneNumberBilling({
      phoneNumberId: phoneNumber._id,
      userId: new mongoose.Types.ObjectId(user.id),
      assignmentId: assignment._id,
      amount: monthlyRate,
      currency: phoneNumber.currency,
      billingDate: now,
      billingPeriodStart: now,
      billingPeriodEnd: new Date(nextBillingDate.getTime() - 24 * 60 * 60 * 1000), // Day before next billing
      description: `Monthly charge for ${phoneNumber.number}`,
      transactionType: 'monthly_fee',
      status: 'pending',
    });
    await billing.save();
  }

  // Create setup fee billing if applicable
  if (setupFee && setupFee > 0) {
    const setupBilling = new PhoneNumberBilling({
      phoneNumberId: phoneNumber._id,
      userId: new mongoose.Types.ObjectId(user.id),
      assignmentId: assignment._id,
      amount: setupFee,
      currency: phoneNumber.currency,
      billingDate: now,
      billingPeriodStart: now,
      billingPeriodEnd: now,
      description: `Setup fee for ${phoneNumber.number}`,
      transactionType: 'setup_fee',
      status: 'pending',
    });
    await setupBilling.save();
  }
};

// POST - Bulk purchase phone numbers
export async function POST(request: NextRequest) {
  try {
    // Verify the user is authenticated
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to the database
    await connectToDatabase();

    const body = await request.json();
    
    // Validate the request body
    const validatedData = bulkPurchaseSchema.parse(body);

    const now = new Date();
    const results = {
      successful: [] as PurchaseResult[],
      failed: [] as PurchaseError[],
      summary: {
        total: validatedData.phoneNumberIds.length,
        successful: 0,
        failed: 0,
        totalCost: 0,
        totalSetupFees: 0,
      }
    };

    console.log(`🔄 User ${user.email} starting bulk purchase of ${validatedData.phoneNumberIds.length} phone numbers`);

    // Process each phone number individually
    for (const phoneNumberId of validatedData.phoneNumberIds) {
      try {
        // Find the phone number and verify it's available
        const phoneNumber = await PhoneNumber.findOne({
          _id: new mongoose.Types.ObjectId(phoneNumberId),
          status: 'available',
          rateDeckId: { $exists: true, $ne: null }, // Must have a rate deck assigned
          backorderOnly: { $ne: true }, // Cannot purchase backorder-only numbers directly
        }) as PhoneNumberDocument | null;

        if (!phoneNumber) {
          // Check if it's a backorder-only number to provide specific error message
          const backorderNumber = await PhoneNumber.findOne({
            _id: new mongoose.Types.ObjectId(phoneNumberId),
            status: 'available',
            backorderOnly: true,
          });
          
          if (backorderNumber) {
            results.failed.push({
              phoneNumberId,
              error: 'This phone number requires a backorder request and cannot be purchased directly',
              number: backorderNumber.number
            });
          } else {
            results.failed.push({
              phoneNumberId,
              error: 'Phone number not found or not available for purchase',
              number: 'Unknown'
            });
          }
          continue;
        }

        // Find the matching rate for this phone number
        const rate = await findMatchingRate(phoneNumber, phoneNumber.rateDeckId?.toString() || '');
        
        if (!rate) {
          results.failed.push({
            phoneNumberId,
            error: 'No rate found for this phone number',
            number: phoneNumber.number
          });
          continue;
        }

        const monthlyRate = rate.rate;
        const setupFee = rate.setupFee || phoneNumber.setupFee || 0;

        // Calculate next billing date (today + billing cycle)
        const nextBillingDate = new Date(now);
        if (phoneNumber.billingCycle === 'yearly') {
          nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
        } else {
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
        }

        // Perform the purchase operations
        try {
          console.log(`🔄 Purchasing phone number ${phoneNumber.number} with rates: ${monthlyRate} ${phoneNumber.currency}/month, setup: ${setupFee} ${phoneNumber.currency}`);
          
          await updatePhoneNumberAndCreateRecords(phoneNumber, user, now, nextBillingDate, monthlyRate, setupFee);
          
          // Create result object with available data
          const result: PurchaseResult = {
            phoneNumberId,
            number: phoneNumber.number,
            country: phoneNumber.country,
            numberType: phoneNumber.numberType,
            monthlyRate,
            setupFee,
            currency: phoneNumber.currency,
            billingCycle: phoneNumber.billingCycle,
            // rateDeckName is optional and we'll skip it to avoid populate issues
          };

          results.successful.push(result);
          results.summary.totalCost += monthlyRate;
          results.summary.totalSetupFees += setupFee;
          
          console.log(`✅ Successfully purchased phone number ${phoneNumber.number}`);
          
        } catch (purchaseError) {
          console.error(`Error purchasing phone number ${phoneNumber.number}:`, purchaseError);
          
          // Try to rollback phone number status if possible (best effort)
          try {
            await PhoneNumber.findByIdAndUpdate(phoneNumber._id, {
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
          
          results.failed.push({
            phoneNumberId,
            error: purchaseError instanceof Error ? purchaseError.message : 'Purchase operation failed',
            number: phoneNumber.number
          });
        }

      } catch (error) {
        console.error(`Error processing phone number ${phoneNumberId}:`, error);
        results.failed.push({
          phoneNumberId,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
          number: 'Unknown'
        });
      }
    }

    // Update summary counts
    results.summary.successful = results.successful.length;
    results.summary.failed = results.failed.length;

    console.log(`✅ Bulk purchase completed for user ${user.email}: ${results.summary.successful} successful, ${results.summary.failed} failed`);

    // Send admin notification if there were successful purchases
    if (results.summary.successful > 0) {
      try {
        // Get user's company information from onboarding data
        let userCompany;
        try {
          const userOnboarding = await UserOnboarding.findOne({ userId: user.id }).lean();
          userCompany = userOnboarding?.companyName;
        } catch (error) {
          console.error('Error fetching user onboarding data:', error);
        }

        await sendAdminUserPurchaseNotification({
          phoneNumber: {
            number: `${results.summary.successful} phone numbers`,
            country: 'Various',
            numberType: 'Various',
            monthlyRate: results.summary.totalCost,
            setupFee: results.summary.totalSetupFees,
            currency: results.successful[0]?.currency || 'USD',
            capabilities: []
          },
          user: {
            name: user.name || user.email,
            email: user.email,
            company: userCompany
          },
          purchase: {
            purchaseId: `BULK-${Date.now()}`,
            purchaseDate: now.toISOString(),
            totalAmount: results.summary.totalCost + results.summary.totalSetupFees,
            billingStartDate: now.toISOString(),
            nextBillingDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
          },
          purchaseType: 'bulk',
          numbersCount: results.summary.successful,
          purchasedNumbers: results.successful.map((item: PurchaseResult): PurchasedNumber => ({
            number: item.number,
            country: item.country,
            numberType: item.numberType,
            monthlyRate: item.monthlyRate,
            setupFee: item.setupFee,
            capabilities: []
          }))
        });
      } catch (emailError) {
        console.error('Failed to send admin bulk purchase notification:', emailError);
        // Don't fail the request if admin email fails
      }
    }

    const statusCode = results.summary.failed > 0 && results.summary.successful === 0 ? 400 : 
                       results.summary.failed > 0 ? 207 : // 207 Multi-Status for partial success
                       201; // 201 Created for complete success

    return NextResponse.json({
      message: `Bulk purchase completed: ${results.summary.successful} successful, ${results.summary.failed} failed`,
      successful: results.successful,
      failed: results.failed,
      summary: results.summary,
    }, { status: statusCode });

  } catch (error) {
    console.error('Error in bulk purchase:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to process bulk purchase' },
      { status: 500 }
    );
  }
} 