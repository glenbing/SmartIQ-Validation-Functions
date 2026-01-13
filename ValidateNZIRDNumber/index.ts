import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// Primary weights for IRD validation
const WEIGHTS_PRIMARY = [3, 2, 7, 6, 5, 4, 3, 2];
// Secondary weights (used if primary gives check digit 10)
const WEIGHTS_SECONDARY = [7, 4, 3, 2, 5, 2, 7, 6];

// Valid IRD number range
const MIN_IRD_NUMBER = 10000000;
const MAX_IRD_NUMBER = 150000000;

function calculateCheckDigit(digits: number[], weights: number[]): number {
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += digits[i] * weights[i];
  }
  
  const remainder = sum % 11;
  if (remainder === 0) {
    return 0;
  }
  return 11 - remainder;
}

export function validateNZIRDNumber(irdNumber: string): ValidationResult {
  // Remove spaces and dashes
  const cleaned = irdNumber.replace(/[\s-]/g, "");

  // Validate it contains only digits
  if (!/^\d+$/.test(cleaned)) {
    return { isValid: false, error: "IRD number must contain only digits" };
  }

  // Check length (8 or 9 digits)
  if (cleaned.length < 8 || cleaned.length > 9) {
    return { isValid: false, error: "IRD number must be 8 or 9 digits" };
  }

  // Parse the number
  const irdNum = parseInt(cleaned, 10);

  // Check valid range
  if (irdNum < MIN_IRD_NUMBER || irdNum > MAX_IRD_NUMBER) {
    return { isValid: false, error: `IRD number out of valid range (${MIN_IRD_NUMBER.toLocaleString()} - ${MAX_IRD_NUMBER.toLocaleString()})` };
  }

  // Pad to 9 digits if needed
  const paddedIRD = cleaned.padStart(9, "0");

  // Extract base digits (first 8) and check digit (last)
  const baseDigits: number[] = [];
  for (let i = 0; i < 8; i++) {
    baseDigits.push(parseInt(paddedIRD[i], 10));
  }
  const actualCheckDigit = parseInt(paddedIRD[8], 10);

  // Calculate check digit using primary weights
  let calculatedCheckDigit = calculateCheckDigit(baseDigits, WEIGHTS_PRIMARY);

  // If check digit is 10, use secondary weights
  if (calculatedCheckDigit === 10) {
    calculatedCheckDigit = calculateCheckDigit(baseDigits, WEIGHTS_SECONDARY);
    
    // If still 10, the IRD number is invalid
    if (calculatedCheckDigit === 10) {
      return { isValid: false, error: "IRD number failed checksum validation (check digit would be 10)" };
    }
  }

  // Compare calculated check digit with actual
  if (calculatedCheckDigit !== actualCheckDigit) {
    return { 
      isValid: false, 
      error: `IRD number failed checksum validation (expected check digit: ${calculatedCheckDigit}, got: ${actualCheckDigit})` 
    };
  }

  return { isValid: true };
}

export async function httpTrigger(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  let irdNumber: string;

  // Get IRD number from query string or body
  irdNumber = request.query.get("irdNumber") || "";
  
  if (!irdNumber && request.method === "POST") {
    try {
      const body = await request.json() as any;
      irdNumber = body.irdNumber || "";
    } catch {
      // Body is not JSON or is empty
    }
  }

  if (!irdNumber) {
    return {
      status: 400,
      jsonBody: {
        isValid: false,
        error: "Missing required parameter: irdNumber"
      }
    };
  }

  const result = validateNZIRDNumber(irdNumber);

  return {
    status: 200,
    jsonBody: result
  };
}

app.http("ValidateNZIRDNumber", {
  methods: ["GET", "POST"],
  authLevel: "function",
  handler: httpTrigger
});
