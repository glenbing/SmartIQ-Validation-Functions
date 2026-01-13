# SmartIQ-Validation-Functions

Azure Functions for validating New Zealand Bank Account numbers and IRD (Inland Revenue Department) numbers.

## API Documentation

The complete API specification is available in OpenAPI v3 format: [openapi.json](./openapi.json)

You can view and interact with the API documentation using tools like:
- [Swagger Editor](https://editor.swagger.io/) - Paste the contents of openapi.json
- [Swagger UI](https://petstore.swagger.io/) - Enter the URL to your openapi.json
- [Postman](https://www.postman.com/) - Import the openapi.json file

## Functions

### 1. ValidateNZBankAccount

Validates New Zealand bank account numbers according to the official PaymentsNZ and IRD specifications.

**Endpoint:** `/api/ValidateNZBankAccount`

**Methods:** GET, POST

**Parameters:**
- `accountNumber` (string): The NZ bank account number to validate in format `XX-XXXX-XXXXXXX-XXX` (bank-branch-base-suffix)

**Example Requests:**

```bash
# GET request
curl "https://your-function-app.azurewebsites.net/api/ValidateNZBankAccount?accountNumber=01-0902-0068389-00"

# POST request
curl -X POST "https://your-function-app.azurewebsites.net/api/ValidateNZBankAccount" \
  -H "Content-Type: application/json" \
  -d '{"accountNumber": "01-0902-0068389-00"}'
```

**Response:**

```json
{
  "isValid": true
}
```

Or if invalid:

```json
{
  "isValid": false,
  "error": "Account number failed checksum validation"
}
```

**Validation Rules:**
- Bank code must be 2 digits
- Branch must be 4 digits or less
- Account base must be 7-8 digits
- Suffix must be 4 digits or less
- Bank and branch must be in valid ranges
- Must pass modulus checksum validation (algorithm varies by bank)

### 2. ValidateNZIRDNumber

Validates New Zealand IRD (Inland Revenue Department) numbers using the official modulus-11 algorithm.

**Endpoint:** `/api/ValidateNZIRDNumber`

**Methods:** GET, POST

**Parameters:**
- `irdNumber` (string): The NZ IRD number to validate (8 or 9 digits)

**Example Requests:**

```bash
# GET request
curl "https://your-function-app.azurewebsites.net/api/ValidateNZIRDNumber?irdNumber=49091850"

# POST request
curl -X POST "https://your-function-app.azurewebsites.net/api/ValidateNZIRDNumber" \
  -H "Content-Type: application/json" \
  -d '{"irdNumber": "49091850"}'
```

**Response:**

```json
{
  "isValid": true
}
```

Or if invalid:

```json
{
  "isValid": false,
  "error": "IRD number failed checksum validation (expected check digit: 5, got: 1)"
}
```

**Validation Rules:**
- Must be 8 or 9 digits
- Must be in valid range (10,000,000 - 150,000,000)
- Must pass dual-weight modulus-11 checksum validation

## Development

### Prerequisites

- Node.js 18.x or later
- Azure Functions Core Tools (for local development)
- TypeScript

### Setup

```bash
npm install
```

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Run Locally

```bash
npm start
```

## Deployment

Deploy to Azure Functions using your preferred method:

- Azure Functions Core Tools
- VS Code Azure Functions extension
- Azure CLI
- GitHub Actions

## References

- [PaymentsNZ BECS Register](https://www.paymentsnz.co.nz/)
- [NZ IRD RWT/NRWT Specification Document](https://www.ird.govt.nz/)
- Algorithm implementation based on official specifications from March 2016

## License

ISC
