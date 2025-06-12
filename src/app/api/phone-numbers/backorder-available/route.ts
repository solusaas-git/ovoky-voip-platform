import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import PhoneNumber from '@/models/PhoneNumber';
import NumberRateDeck from '@/models/NumberRateDeck';
import NumberRate from '@/models/NumberRate';
import mongoose from 'mongoose';

// TypeScript interfaces
interface PhoneNumberQuery {
  status: string;
  backorderOnly: boolean;
  rateDeckId: { $exists: boolean; $ne: null };
  $or?: Array<{
    number?: { $regex: string; $options: string };
    country?: { $regex: string; $options: string };
    description?: { $regex: string; $options: string };
  }>;
  country?: string;
  numberType?: string;
}

interface SortOptions {
  [key: string]: 1 | -1;
}

interface PhoneNumberDocument {
  _id: mongoose.Types.ObjectId;
  number: string;
  country: string;
  numberType: string;
  rateDeckId?: mongoose.Types.ObjectId;
  setupFee?: number;
  createdAt: Date;
  updatedAt: Date;
  status: string;
  backorderOnly?: boolean;
  description?: string;
  currency?: string;
  capabilities?: string[];
  provider?: string;
  monthlyRate?: number;
}

// GET - List backorder-only phone numbers available for request
export async function GET(request: NextRequest) {
  try {
    // Verify the user is authenticated
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to the database
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const search = searchParams.get('search') || '';
    const country = searchParams.get('country');
    const numberType = searchParams.get('numberType');
    const sortBy = searchParams.get('sortBy') || 'monthlyRate';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    // Build query for backorder-only phone numbers
    const query: PhoneNumberQuery = {
      status: 'available',
      backorderOnly: true, // Only show backorder-only numbers
      rateDeckId: { $exists: true, $ne: null }, // Must have a rate deck assigned
    };

    if (search) {
      query.$or = [
        { number: { $regex: search, $options: 'i' } },
        { country: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (country) {
      query.country = country;
    }

    if (numberType) {
      query.numberType = numberType;
    }

    // Build sort object
    const sort: SortOptions = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    
    const [phoneNumbers, total, countries, numberTypes] = await Promise.all([
      PhoneNumber.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean() as Promise<PhoneNumberDocument[]>,
      PhoneNumber.countDocuments(query),
      // Get available countries for filter
      PhoneNumber.distinct('country', { status: 'available', backorderOnly: true, rateDeckId: { $exists: true, $ne: null } }),
      // Get available number types for filter
      PhoneNumber.distinct('numberType', { status: 'available', backorderOnly: true, rateDeckId: { $exists: true, $ne: null } })
    ]);

    console.log(`[API] Backorder-only numbers query result: ${phoneNumbers.length} numbers, total: ${total}`);

    // Transform the response and fetch rates for each number
    const transformedNumbers = await Promise.all(
      phoneNumbers.map(async (number) => {
        const rate = await findMatchingRate(number, number.rateDeckId?.toString() || '');
        console.log(`[API] Backorder number ${number.number}: rateDeckId=${number.rateDeckId}, rate=${rate?.rate || 'not found'}, prefix=${rate?.prefix || 'N/A'}`);
        
        return {
          ...number,
          _id: number._id.toString(),
          rateDeckId: number.rateDeckId ? number.rateDeckId.toString() : undefined,
          rateDeckName: undefined, // Not populated
          monthlyRate: rate?.rate || 0,
          setupFee: rate?.setupFee || number.setupFee || 0,
          ratePrefix: rate?.prefix,
          rateDescription: rate?.description,
          createdAt: number.createdAt.toISOString(),
          updatedAt: number.updatedAt.toISOString(),
        };
      })
    );

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      phoneNumbers: transformedNumbers,
      total,
      page,
      limit,
      totalPages,
      filters: {
        countries: countries.sort(),
        numberTypes: numberTypes.sort(),
      },
    });
  } catch (error) {
    console.error('Error fetching backorder-only phone numbers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch backorder-only phone numbers' },
      { status: 500 }
    );
  }
}

// Helper function to find matching rate for a phone number
const findMatchingRate = async (phoneNumber: PhoneNumberDocument, rateDeckId: string) => {
  if (!rateDeckId) return null;
  
  console.log(`[Rate Matching] Looking for rates for backorder number: ${phoneNumber.number}, country: ${phoneNumber.country}, type: ${phoneNumber.numberType}, rateDeckId: ${rateDeckId}`);
  
  // Find all rates for this rate deck
  const rates = await NumberRate.find({
    rateDeckId: new mongoose.Types.ObjectId(rateDeckId),
  }).lean();
  
  console.log(`[Rate Matching] Found ${rates.length} rates in deck ${rateDeckId}`);
  
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