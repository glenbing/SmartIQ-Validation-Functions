import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

// Bank branch validation ranges
const bankBranchRanges: { [key: string]: Array<[number, number]> } = {
  "01": [[1, 999], [1100, 1199], [1800, 1899]],
  "02": [[1, 999], [1200, 1299]],
  "03": [[1, 999], [1300, 1399], [1500, 1599], [1700, 1799], [1900, 1999]],
  "06": [[1, 999], [1400, 1499]],
  "08": [[6500, 6599]],
  "09": [[0, 0]],
  "10": [[5165, 5169]],
  "11": [[5000, 6499], [6600, 8999]],
  "12": [[3000, 3299], [3400, 3499], [3600, 3699]],
  "13": [[4900, 4999]],
  "14": [[4700, 4799]],
  "15": [[3900, 3999]],
  "16": [[4400, 4499]],
  "17": [[3300, 3399]],
  "18": [[3500, 3599]],
  "19": [[4600, 4649]],
  "20": [[4100, 4199]],
  "21": [[4800, 4899]],
  "22": [[4000, 4049]],
  "23": [[3700, 3799]],
  "24": [[4300, 4349]],
  "25": [[2500, 2599]],
  "26": [[2600, 2699]],
  "27": [[3800, 3849]],
  "28": [[2100, 2149]],
  "29": [[2150, 2299]],
  "30": [[2900, 2949]],
  "31": [[2800, 2849]],
  "33": [[6700, 6799]],
  "35": [[2400, 2499]],
  "38": [[9000, 9499]]
};

// Banks that use A/B algorithm selection based on account base
const abBanks = new Set(["01", "02", "03", "06", "10", "11", "12", "13", "14", "15", 
                         "16", "17", "18", "19", "20", "21", "22", "23", "24", "27", 
                         "30", "35", "38"]);

// Algorithm configuration
interface AlgorithmConfig {
  weights: number[];
  modulo: number;
  addDigits: boolean; // For algorithms E and G
}

const algorithms: { [key: string]: AlgorithmConfig } = {
  "A": { weights: [0, 0, 6, 3, 7, 9, 0, 0, 10, 5, 8, 4, 2, 1, 0, 0, 0, 0], modulo: 11, addDigits: false },
  "B": { weights: [0, 0, 0, 0, 0, 0, 0, 0, 10, 5, 8, 4, 2, 1, 0, 0, 0, 0], modulo: 11, addDigits: false },
  "D": { weights: [0, 0, 0, 0, 0, 0, 7, 6, 5, 4, 3, 2, 1, 0, 0, 0, 0, 0], modulo: 11, addDigits: false },
  "E": { weights: [0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 4, 3, 2, 0, 0, 0, 1, 0], modulo: 11, addDigits: true },
  "F": { weights: [0, 0, 0, 0, 0, 0, 1, 7, 3, 1, 7, 3, 1, 0, 0, 0, 0, 0], modulo: 10, addDigits: false },
  "G": { weights: [0, 0, 0, 0, 0, 0, 1, 3, 7, 1, 3, 7, 1, 0, 3, 7, 1, 0], modulo: 10, addDigits: true },
  "X": { weights: [], modulo: 1, addDigits: false } // Always valid
};

// Maps bank IDs to their algorithm
const algorithmMap: { [key: string]: string } = {
  "08": "D", "09": "E", "25": "F", "26": "G", "28": "G", "29": "G",
  "31": "X", "33": "F"
};

// Threshold for choosing between algorithm A and B
const AB_ALGORITHM_THRESHOLD = 990000;

interface ValidationResult {
  isValid: boolean;
  error?: string;
}

function validateBankBranch(bank: string, branch: string): ValidationResult {
  const branchNumber = parseInt(branch, 10);
  const ranges = bankBranchRanges[bank];

  if (!ranges) {
    return { isValid: false, error: `Invalid bank code: ${bank}` };
  }

  const isValidBranch = ranges.some(
    ([min, max]) => branchNumber >= min && branchNumber <= max
  );

  if (!isValidBranch) {
    return { isValid: false, error: `Branch ${branch} is not valid for bank ${bank}` };
  }

  return { isValid: true };
}

function sumDigits(num: number): number {
  let sum = 0;
  while (num > 0) {
    sum += num % 10;
    num = Math.floor(num / 10);
  }
  return sum;
}

function applyAlgorithm(accountNumber: string, algorithmKey: string): boolean {
  const config = algorithms[algorithmKey];
  if (!config) {
    return false;
  }

  // Algorithm X always passes
  if (algorithmKey === "X") {
    return true;
  }

  const { weights, modulo, addDigits } = config;
  let sum = 0;

  for (let i = 0; i < accountNumber.length && i < weights.length; i++) {
    const digit = parseInt(accountNumber[i], 10);
    let product = digit * weights[i];
    
    if (addDigits && product > 0) {
      // For algorithms E and G, add the digits of the product
      product = sumDigits(product);
    }
    
    sum += product;
  }

  const remainder = sum % modulo;
  return remainder === 0;
}

export function validateNZBankAccount(accountNumber: string): ValidationResult {
  // Parse account parts - handle both dashes and spaces as separators
  let parts: string[];
  
  if (accountNumber.includes("-")) {
    parts = accountNumber.split("-").map(p => p.trim());
  } else {
    // Split by whitespace
    parts = accountNumber.split(/\s+/).filter(p => p.length > 0);
  }
  
  if (parts.length !== 4) {
    return { isValid: false, error: "Bank account must be in format: XX-XXXX-XXXXXXX-XXX" };
  }

  let [bank, branch, base, suffix] = parts;

  // Validate lengths
  if (bank.length !== 2) {
    return { isValid: false, error: "Bank code must be 2 digits" };
  }
  if (branch.length > 4) {
    return { isValid: false, error: "Branch must be 4 digits or less" };
  }
  if (base.length < 7 || base.length > 8) {
    return { isValid: false, error: "Account base must be 7-8 digits" };
  }
  if (suffix.length > 4) {
    return { isValid: false, error: "Account suffix must be 4 digits or less" };
  }

  // Validate bank and branch
  const branchValidation = validateBankBranch(bank, branch);
  if (!branchValidation.isValid) {
    return branchValidation;
  }

  // Pad fields to required lengths
  bank = bank.padStart(2, "0");
  branch = branch.padStart(4, "0");
  base = base.padStart(8, "0");
  suffix = suffix.padStart(4, "0");

  const fullAccount = bank + branch + base + suffix;

  // Determine which algorithm to use
  let algorithmKey: string;
  
  if (abBanks.has(bank)) {
    // For AB banks, choose A or B based on account base
    const baseNumber = parseInt(base, 10);
    algorithmKey = baseNumber < AB_ALGORITHM_THRESHOLD ? "A" : "B";
  } else {
    // Use the fixed algorithm for this bank
    algorithmKey = algorithmMap[bank];
    if (!algorithmKey) {
      return { isValid: false, error: `Unknown bank code: ${bank}` };
    }
  }

  // Apply checksum algorithm
  const checksumValid = applyAlgorithm(fullAccount, algorithmKey);
  if (!checksumValid) {
    return { isValid: false, error: "Account number failed checksum validation" };
  }

  return { isValid: true };
}

export async function httpTrigger(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  let accountNumber: string;

  // Get account number from query string or body
  accountNumber = request.query.get("accountNumber") || "";
  
  if (!accountNumber && request.method === "POST") {
    try {
      const body = await request.json() as any;
      accountNumber = body.accountNumber || "";
    } catch {
      // Body is not JSON or is empty
    }
  }

  if (!accountNumber) {
    return {
      status: 400,
      jsonBody: {
        isValid: false,
        error: "Missing required parameter: accountNumber"
      }
    };
  }

  const result = validateNZBankAccount(accountNumber);

  return {
    status: 200,
    jsonBody: result
  };
}

app.http("ValidateNZBankAccount", {
  methods: ["GET", "POST"],
  authLevel: "function",
  handler: httpTrigger
});
