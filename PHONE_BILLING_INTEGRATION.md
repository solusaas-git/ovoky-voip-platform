# Phone Number Billing Integration

## Overview

This document outlines the complete phone number billing system integration with Sippy accountDebit API, implementing the billing reflexions discussed during development.

## Key Billing Principles

### 1. No Proration Policy
- **Always charge full monthly rate** regardless of assignment date
- No partial charges based on days in month
- Simplified billing process with consistent amounts

### 2. Negative Balance Handling
- Sippy accepts negative balances
- System records debit and monitors balance
- Phone numbers are suspended if payment fails due to insufficient funds

### 3. Monthly Billing Cycle
- Charges occur on assignment anniversary date
- Next billing is automatically generated after successful payment
- Continuous monthly cycle until unassignment

## Implementation Components

### 1. API Endpoints

#### `/api/phone-numbers/billing` (GET)
- **Purpose**: Retrieve billing records with filtering
- **Access**: Users see their own records, admins see all
- **Filters**: Status, transaction type, date range, user
- **Response**: Paginated billing records with phone number and user details

#### `/api/phone-numbers/billing` (POST)
- **Purpose**: Process individual billing charges via Sippy accountDebit
- **Access**: Admin only
- **Integration**: Uses Sippy XML-RPC API
- **Features**:
  - Charges user's Sippy account
  - Updates billing status based on result
  - Suspends number if insufficient funds
  - Records Sippy transaction ID

#### `/api/phone-numbers/billing` (PUT)
- **Purpose**: Create manual billing records
- **Access**: Admin only
- **Use Case**: Manual adjustments, one-time charges

#### `/api/phone-numbers/billing/process-scheduled` (POST)
- **Purpose**: Automated billing processing for cron jobs
- **Access**: Internal API key or admin
- **Features**:
  - Processes all due billing records
  - Creates next month's billing for successful payments
  - Handles failures and suspension logic
  - Comprehensive logging and reporting

#### `/api/phone-numbers/billing/process-scheduled` (GET)
- **Purpose**: Monitor billing system health
- **Access**: Admin only
- **Metrics**: Pending, processed, failed counts

### 2. Database Models

#### PhoneNumberBilling Schema
```javascript
{
  phoneNumberId: ObjectId,        // Reference to phone number
  userId: ObjectId,               // Reference to user
  assignmentId: ObjectId,         // Reference to assignment
  billingPeriodStart: Date,       // Billing period start
  billingPeriodEnd: Date,         // Billing period end
  amount: Number,                 // Charge amount (always full rate)
  currency: String,               // Currency code
  status: String,                 // pending|paid|failed|cancelled|refunded
  billingDate: Date,              // When charge is due
  paidDate: Date,                 // When charge was processed
  failureReason: String,          // Reason if failed
  transactionType: String,        // monthly_fee|setup_fee|refund
  sippyTransactionId: String,     // Sippy transaction reference
  processedBy: String,            // Who/what processed the billing
  notes: String,                  // Additional notes
  createdAt: Date,
  updatedAt: Date
}
```

### 3. User Interface Components

#### PaymentDetailsDialog Enhancement
- **Location**: `src/components/payments/AccountPayments.tsx`
- **Enhancement**: Added PhoneNumberBillingSection import and integration
- **Purpose**: Maintain existing payment functionality while adding phone billing

#### PhoneNumberBillingSection Component
- **Location**: `src/components/payments/PhoneNumberBillingSection.tsx`
- **Features**:
  - Toggle visibility (doesn't interfere with existing payments)
  - Filter by status, type, date range
  - Admin process billing button
  - Real-time status updates
  - Transaction traceability

### 4. Assignment Logic Updates

#### No-Proration Implementation
- **Location**: `src/app/api/admin/phone-numbers/[id]/assign/route.ts`
- **Changes**:
  - Removed proration calculation logic
  - Always charge full monthly rate
  - Updated transaction type to 'monthly_fee' (never 'prorated_fee')
  - Added policy notes

## Billing Workflow

### 1. Phone Number Assignment
```
1. Admin assigns phone number to user
2. Setup fee billing created (if applicable)
3. First monthly billing created with full rate
4. No proration regardless of assignment date
```

### 2. Monthly Billing Processing
```
1. Cron job calls /api/phone-numbers/billing/process-scheduled
2. System finds all pending billings due today
3. For each billing:
   a. Call Sippy accountDebit API
   b. Update billing status based on result
   c. If successful: create next month's billing
   d. If failed: mark failed and suspend number if insufficient funds
4. Return processing summary
```

### 3. Manual Processing
```
1. Admin views pending billings in payments page
2. Admin clicks "Process" button on specific billing
3. System immediately charges via Sippy API
4. Real-time status update in UI
```

## Sippy Integration Details

### accountDebit API Call
```javascript
await sippyClient.accountDebit({
  i_account: user.sippyAccountId,
  amount: billing.amount,           // Always full monthly rate
  currency: billing.currency,
  payment_notes: `Monthly charge for Number: +1234567890 (monthly_fee)`
});
```

### Response Handling
- **Success**: `result === 'success'` or `result === '1'`
- **Failure**: Any other result with error message
- **Transaction ID**: Stored in `sippyTransactionId` field

### Error Handling
- **Insufficient Funds**: Number suspended, billing marked failed
- **API Errors**: Billing marked failed with error details
- **Network Issues**: Retry logic with exponential backoff

## Automation Setup

### Cron Job Configuration
```bash
# Run daily at 2 AM to process due billings
0 2 * * * curl -X POST \
  -H "Authorization: Bearer $INTERNAL_API_KEY" \
  -H "Content-Type: application/json" \
  https://your-domain.com/api/phone-numbers/billing/process-scheduled
```

### Manual Execution
```bash
# Set environment variables
export INTERNAL_API_KEY="your-internal-api-key"
export NEXT_PUBLIC_BASE_URL="http://localhost:3001"

# Run the billing processor
node scripts/process-billing.js
```

## Security Considerations

### Authentication
- **API Key**: Internal cron jobs use `INTERNAL_API_KEY`
- **Role-Based**: Admin/super-admin required for manual processing
- **User Isolation**: Non-admins see only their own billing records

### Data Validation
- **Zod Schemas**: All API inputs validated
- **Database Transactions**: Atomic operations for consistency
- **Error Logging**: Comprehensive error tracking

## Monitoring and Observability

### Metrics Tracked
- Number of billings processed per day
- Success/failure rates
- Processing duration
- Error categories and frequencies

### Logging
- All billing operations logged with details
- Sippy API responses logged
- Error conditions logged with context

### Health Checks
- `/api/phone-numbers/billing/process-scheduled` (GET) provides health status
- Metrics available for monitoring systems

## Testing

### Manual Testing
1. Assign phone number to user
2. View billing records in payments page
3. Process billing manually via UI
4. Verify Sippy transaction and status updates

### Automated Testing
```bash
# Test the billing processor
node scripts/process-billing.js
```

### Test Scenarios
- Successful billing processing
- Insufficient funds handling
- Network failure recovery
- Invalid user data handling

## Migration and Deployment

### Environment Variables Required
```bash
INTERNAL_API_KEY=your-secure-random-key
SIPPY_API_URL=your-sippy-api-endpoint
SIPPY_USERNAME=your-sippy-username
SIPPY_PASSWORD=your-sippy-password
```

### Database Migrations
- PhoneNumberBilling collection already exists
- No additional migrations required

### Deployment Steps
1. Deploy new API endpoints
2. Deploy updated UI components
3. Set up cron job for automated processing
4. Configure monitoring and alerting

## Future Enhancements

### Possible Improvements
- **Retry Logic**: Automatic retry for failed billings
- **Notifications**: Email alerts for billing failures
- **Reporting**: Advanced billing analytics dashboard
- **Multi-Currency**: Enhanced currency handling
- **Bulk Operations**: Process multiple billings at once

### Scaling Considerations
- **Queue System**: For high-volume billing processing
- **Database Indexing**: Optimize billing queries
- **Cache**: Billing status caching for performance

## Troubleshooting

### Common Issues
1. **Missing Sippy Account ID**: User billing fails
2. **API Credentials**: Sippy authentication failures
3. **Network Timeouts**: Retry mechanisms needed
4. **Database Locks**: Transaction conflicts

### Resolution Steps
1. Check user has valid `sippyAccountId`
2. Verify Sippy API credentials in settings
3. Review error logs for specific failure reasons
4. Use manual processing for stuck billings

---

This implementation provides a robust, scalable phone number billing system that integrates seamlessly with existing payment infrastructure while maintaining the flexibility for manual oversight and automated processing. 