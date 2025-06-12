import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import PhoneNumber from '@/models/PhoneNumber';
import PhoneNumberAssignment from '@/models/PhoneNumberAssignment';
import PhoneNumberBilling from '@/models/PhoneNumberBilling';
import User from '@/models/User';
import mongoose from 'mongoose';
import { z } from 'zod';

// Type definitions for bulk unassign results
interface UnassignSuccessResult {
  phoneNumberId: string;
  number: string;
  previousUser: {
    id?: string;
    email?: string;
    name?: string;
  };
  billingsCancelled: number;
  refundAmount: number;
  unassignedAt: string;
}

interface UnassignFailResult {
  phoneNumberId: string;
  error: string;
  number: string;
}

// Validation schema for bulk unassigning phone numbers
const bulkUnassignPhoneNumberSchema = z.object({
  phoneNumberIds: z.array(z.string().min(1, 'Phone number ID is required'))
    .min(1, 'At least one phone number is required')
    .max(50, 'Maximum 50 numbers can be unassigned at once'),
  reason: z.string().max(500).optional(),
  cancelPendingBilling: z.boolean().optional().default(true),
  createRefund: z.boolean().optional().default(false),
  refundAmount: z.number().min(0).optional(),
});

// POST - Bulk unassign phone numbers
export async function POST(request: NextRequest) {
  try {
    // Verify the user is authenticated and is an admin
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate the request body
    const validatedData = bulkUnassignPhoneNumberSchema.parse(body);

    // Connect to the database
    await connectToDatabase();

    const results = {
      successful: [] as UnassignSuccessResult[],
      failed: [] as UnassignFailResult[],
      summary: {
        total: validatedData.phoneNumberIds.length,
        successful: 0,
        failed: 0,
        totalRefunded: 0,
        totalBillingsCancelled: 0,
      }
    };

    console.log(`🔄 Admin ${user.email} starting bulk unassign of ${validatedData.phoneNumberIds.length} phone numbers`);

    // Process each phone number individually
    for (const phoneNumberId of validatedData.phoneNumberIds) {
      try {
        // Find the phone number
        const phoneNumber = await PhoneNumber.findById(phoneNumberId);
        
        if (!phoneNumber) {
          results.failed.push({
            phoneNumberId,
            error: 'Phone number not found',
            number: 'Unknown'
          });
          continue;
        }

        // Check if phone number is currently assigned
        if (phoneNumber.status !== 'assigned') {
          results.failed.push({
            phoneNumberId,
            error: `Phone number is ${phoneNumber.status} and cannot be unassigned`,
            number: phoneNumber.number
          });
          continue;
        }

        if (!phoneNumber.assignedTo) {
          results.failed.push({
            phoneNumberId,
            error: 'Phone number is not assigned to any user',
            number: phoneNumber.number
          });
          continue;
        }

        // Find the current active assignment
        const currentAssignment = await PhoneNumberAssignment.findOne({
          phoneNumberId: new mongoose.Types.ObjectId(phoneNumberId),
          status: 'active',
        });

        if (!currentAssignment) {
          results.failed.push({
            phoneNumberId,
            error: 'No active assignment found for this phone number',
            number: phoneNumber.number
          });
          continue;
        }

        // Get the assigned user info for logging
        const assignedUser = await User.findById(phoneNumber.assignedTo);

        try {
          console.log(`🔄 Unassigning phone number ${phoneNumber.number} from user ${assignedUser?.email || 'Unknown'}`);
          
          // Update phone number status and remove assignment
          await PhoneNumber.findByIdAndUpdate(
            phoneNumberId,
            {
              $set: {
                status: 'available',
                assignedTo: null,
                assignedBy: null,
                assignedAt: null,
                unassignedAt: new Date(),
                unassignedBy: user.email,
                unassignedReason: validatedData.reason || 'Bulk unassigned by admin',
              }
            }
          );

          // Update assignment record to mark as ended
          await PhoneNumberAssignment.findByIdAndUpdate(
            currentAssignment._id,
            {
              $set: {
                status: 'ended',
                unassignedAt: new Date(),
                unassignedBy: user.email,
                unassignedReason: validatedData.reason || 'Bulk unassigned by admin',
                billingEndDate: new Date(),
              }
            }
          );

          let billingsCancelled = 0;
          let refundAmount = 0;

          // Handle pending billing records
          if (validatedData.cancelPendingBilling) {
            // Find pending billings
            const pendingBillingsByAssignment = await PhoneNumberBilling.find({
              phoneNumberId: new mongoose.Types.ObjectId(phoneNumberId),
              assignmentId: currentAssignment._id,
              status: 'pending'
            });

            const pendingBillingsByPhoneAndUser = await PhoneNumberBilling.find({
              phoneNumberId: new mongoose.Types.ObjectId(phoneNumberId),
              userId: currentAssignment.userId,
              status: 'pending'
            });

            // Combine and deduplicate billing records
            const allPendingBillings = [
              ...pendingBillingsByAssignment,
              ...pendingBillingsByPhoneAndUser.filter(billing => 
                !pendingBillingsByAssignment.some(existing => 
                  existing._id.toString() === billing._id.toString()
                )
              )
            ];

            if (allPendingBillings.length > 0) {
              const billingIds = allPendingBillings.map(billing => billing._id);
              
              const updateResult = await PhoneNumberBilling.updateMany(
                {
                  _id: { $in: billingIds },
                  status: 'pending'
                },
                {
                  $set: {
                    status: 'cancelled',
                    failureReason: 'Assignment terminated - bulk unassign',
                    processedBy: user.email,
                    updatedAt: new Date(),
                  }
                }
              );

              billingsCancelled = updateResult.modifiedCount;
            }
          }

          // Create refund billing if requested
          if (validatedData.createRefund && validatedData.refundAmount && validatedData.refundAmount > 0) {
            const refundBilling = new PhoneNumberBilling({
              phoneNumberId: new mongoose.Types.ObjectId(phoneNumberId),
              userId: currentAssignment.userId,
              assignmentId: currentAssignment._id,
              billingPeriodStart: new Date(),
              billingPeriodEnd: new Date(),
              amount: -Math.abs(validatedData.refundAmount),
              currency: currentAssignment.currency,
              status: 'pending',
              billingDate: new Date(),
              transactionType: 'refund',
              notes: `Bulk refund for unassigned number: ${validatedData.reason || 'Assignment terminated'}`,
            });

            await refundBilling.save();
            refundAmount = validatedData.refundAmount;
          }

          // Success result
          results.successful.push({
            phoneNumberId,
            number: phoneNumber.number,
            previousUser: {
              id: assignedUser?._id?.toString(),
              email: assignedUser?.email,
              name: assignedUser?.name
            },
            billingsCancelled,
            refundAmount,
            unassignedAt: new Date().toISOString()
          });

          results.summary.totalBillingsCancelled += billingsCancelled;
          results.summary.totalRefunded += refundAmount;

          console.log(`✅ Successfully unassigned phone number ${phoneNumber.number}`);
          
        } catch (unassignError) {
          console.error(`Error unassigning phone number ${phoneNumber.number}:`, unassignError);
          
          results.failed.push({
            phoneNumberId,
            error: unassignError instanceof Error ? unassignError.message : 'Unassign operation failed',
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

    console.log(`✅ Bulk unassign completed for admin ${user.email}: ${results.summary.successful} successful, ${results.summary.failed} failed`);

    const statusCode = results.summary.failed > 0 && results.summary.successful === 0 ? 400 : 
                       results.summary.failed > 0 ? 207 : // 207 Multi-Status for partial success
                       200; // 200 OK for complete success

    return NextResponse.json({
      message: `Bulk unassign completed: ${results.summary.successful} successful, ${results.summary.failed} failed`,
      successful: results.successful,
      failed: results.failed,
      summary: results.summary,
    }, { status: statusCode });

  } catch (error) {
    console.error('Error in bulk unassign:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to process bulk unassign' },
      { status: 500 }
    );
  }
} 