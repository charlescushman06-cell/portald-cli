# portald

Add Portald agent authorization to your project in under 5 minutes.

## Quick Start

```bash
npx portald init
```

This will:
1. Detect your framework (Next.js, Express, or generic)
2. Create the Portald manifest at `.well-known/portald-manifest.json`
3. Set up API routes for agent handshake and action handling
4. Generate a `gate()` wrapper to protect your functions

## Usage

### Initialize Portald

```bash
# Interactive setup
npx portald init

# Use defaults (auto-detect framework)
npx portald init -y

# Specify framework
npx portald init --framework nextjs
```

### Wrap a Function

```bash
npx portald wrap chargeCustomer --risk high --action-type payments.charge
```

This shows you how to wrap any function with Portald approval.

## Generated Files

For **Next.js**:
- `public/.well-known/portald-manifest.json` - Agent-readable manifest
- `src/app/api/portald/handshake/route.ts` - Agent authentication
- `src/app/api/portald/actions/route.ts` - Action ingestion
- `src/app/api/portald/actions/[id]/route.ts` - Action polling
- `src/lib/portald/client.ts` - Portald API client
- `src/lib/portald/gate.ts` - Function wrapper
- `src/lib/portald/example.ts` - Example usage

## Wrapping Functions

```typescript
import { gate } from "./lib/portald/gate";

// Your original function
async function chargeCustomer(customerId: string, amount: number) {
  // payment logic
  return { success: true };
}

// Wrap it with Portald approval
export const gatedCharge = gate(chargeCustomer, {
  actionType: "payments.charge",
  riskLevel: "high",
  getPayload: (customerId, amount) => ({ customerId, amount }),
});

// Use in your agent endpoint
const result = await gatedCharge(sessionToken, "cus_123", 5000);
```

## Risk Levels

- `low` - Auto-approved, logged for audit
- `med` - Requires user approval
- `high` - Requires user approval + extra verification

## Documentation

Full docs: https://portald.ai/docs

## License

MIT
