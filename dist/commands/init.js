"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.init = init;
const prompts_1 = __importDefault(require("prompts"));
const chalk_1 = __importDefault(require("chalk"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
function detectFramework() {
    if (fs_extra_1.default.existsSync("next.config.js") || fs_extra_1.default.existsSync("next.config.ts") || fs_extra_1.default.existsSync("next.config.mjs")) {
        return "nextjs";
    }
    const pkg = fs_extra_1.default.existsSync("package.json") ? fs_extra_1.default.readJSONSync("package.json") : {};
    if (pkg.dependencies?.express) {
        return "express";
    }
    return null;
}
function getPublicDir(framework) {
    if (framework === "nextjs")
        return "public";
    if (framework === "express")
        return "public";
    return ".";
}
function getApiDir(framework) {
    // Check for app router vs pages router in Next.js
    if (framework === "nextjs") {
        if (fs_extra_1.default.existsSync("src/app"))
            return "src/app/api/portald";
        if (fs_extra_1.default.existsSync("app"))
            return "app/api/portald";
        if (fs_extra_1.default.existsSync("src/pages"))
            return "src/pages/api/portald";
        return "pages/api/portald";
    }
    if (framework === "express")
        return "src/routes";
    return "api";
}
function isAppRouter() {
    return fs_extra_1.default.existsSync("src/app") || fs_extra_1.default.existsSync("app");
}
async function init(options) {
    console.log(chalk_1.default.bold("\n🚀 Portald CLI - Initialize\n"));
    let framework = options.framework;
    let appName = "";
    let domain = "";
    const detected = detectFramework();
    if (detected && !framework) {
        console.log(chalk_1.default.dim(`Detected framework: ${detected}`));
        framework = detected;
    }
    if (!options.yes) {
        const responses = await (0, prompts_1.default)([
            {
                type: framework ? null : "select",
                name: "framework",
                message: "What framework are you using?",
                choices: [
                    { title: "Next.js", value: "nextjs" },
                    { title: "Express", value: "express" },
                    { title: "Generic / Other", value: "generic" },
                ],
            },
            {
                type: "text",
                name: "appName",
                message: "App name (for manifest)?",
                initial: path_1.default.basename(process.cwd()),
            },
            {
                type: "text",
                name: "domain",
                message: "Production domain (e.g., example.com)?",
                initial: "localhost:3000",
            },
        ]);
        framework = responses.framework || framework;
        appName = responses.appName || path_1.default.basename(process.cwd());
        domain = responses.domain || "localhost:3000";
    }
    else {
        framework = framework || detected || "generic";
        appName = path_1.default.basename(process.cwd());
        domain = "localhost:3000";
    }
    if (!framework) {
        console.log(chalk_1.default.red("No framework selected. Exiting."));
        process.exit(1);
    }
    const publicDir = getPublicDir(framework);
    const apiDir = getApiDir(framework);
    const wellKnownDir = path_1.default.join(publicDir, ".well-known");
    // Create directories
    await fs_extra_1.default.ensureDir(wellKnownDir);
    await fs_extra_1.default.ensureDir(apiDir);
    // 1. Create manifest - tells agents how to interact with this site
    const manifest = {
        domain,
        app_name: appName,
        portald: { version: "1.0" },
        embed_modes: ["headless"],
        requested_capabilities: ["payment", "sensitive_action"],
        agent_instructions: {
            handshake_endpoint: "https://www.portald.ai/api/portald/v1/identity/handshake",
            action_ingest_endpoint: "https://www.portald.ai/api/agent-actions/ingest",
            action_poll_endpoint: "https://www.portald.ai/api/agent-actions/{action_id}",
            approvals_dashboard_url: "https://portald.ai/dashboard/approvals",
            enrollment_url: "https://portald.ai/enroll",
            notes: [
                "Submit actions via action_ingest_endpoint with Bearer token",
                "Poll action status or use callback_url for webhooks",
                "Low risk actions auto-approve, med/high require human approval",
            ],
        },
    };
    const manifestPath = path_1.default.join(wellKnownDir, "portald-manifest.json");
    await fs_extra_1.default.writeJSON(manifestPath, manifest, { spaces: 2 });
    console.log(chalk_1.default.green(`✓ Created ${manifestPath}`));
    // 2. Create webhook handler (framework-specific) with signature verification
    if (framework === "nextjs") {
        const isApp = isAppRouter();
        if (isApp) {
            // App Router
            const webhookCode = `import { NextRequest, NextResponse } from "next/server";
import { createPortaldClient } from "portald/sdk";

/**
 * Portald Webhook Handler
 * 
 * This endpoint receives callbacks from Portald when agent actions are approved/denied.
 * All webhooks are signed with HMAC - verify signatures to prevent spoofing.
 * 
 * URL: https://${domain}/api/portald/webhook
 * 
 * Required env vars:
 *   PORTALD_SITE_ID - Your site ID from Portald dashboard
 *   PORTALD_WEBHOOK_SECRET - Your webhook secret (keep secure!)
 */

interface WebhookPayload {
  event: "action.decided";
  action_id: string;
  status: "approved" | "denied" | "executed" | "failed";
  action_type: string;
  decided_at: string;
  reason?: string;
  payment_intent_id?: string;
  payment_error?: string;
  amount_cents?: number;
}

export async function POST(req: NextRequest) {
  // Get raw body for signature verification
  const rawBody = await req.text();
  const timestamp = req.headers.get("x-portald-timestamp") ?? "";
  const signature = req.headers.get("x-portald-signature") ?? "";

  // Verify webhook signature (prevents spoofing)
  const portald = createPortaldClient();
  if (!portald.verifyWebhookSignature(rawBody, timestamp, signature)) {
    console.error("[Portald Webhook] Invalid signature - possible spoofing attempt");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody) as WebhookPayload;
  console.log(\`[Portald Webhook] \${body.event}: \${body.action_type} -> \${body.status}\`);

  // Handle the action based on type and status
  if (body.status === "executed") {
    // Payment was successful - fulfill the order!
    switch (body.action_type) {
      case "purchase":
        // TODO: Fulfill the purchase
        // - Look up order by action_id
        // - Mark as paid
        // - Trigger shipping/delivery
        console.log(\`Purchase executed: \${body.action_id}\`);
        console.log(\`  Amount: $\${(body.amount_cents ?? 0) / 100}\`);
        console.log(\`  Payment: \${body.payment_intent_id}\`);
        
        // IMPORTANT: Verify payment with Portald for high-value orders
        // const verification = await portald.verifyPayment(body.action_id);
        // if (!verification.verified) { /* handle error */ }
        break;
      default:
        console.log(\`Action executed: \${body.action_type}\`);
    }
  } else if (body.status === "approved") {
    // Action approved (non-payment actions)
    console.log(\`Action approved: \${body.action_id}\`);
  } else if (body.status === "denied") {
    // User denied the action
    console.log(\`Action denied: \${body.action_id}, reason: \${body.reason}\`);
  } else if (body.status === "failed") {
    // Payment or execution failed
    console.log(\`Action failed: \${body.action_id}, error: \${body.payment_error}\`);
  }

  return NextResponse.json({ received: true });
}
`;
            const webhookPath = path_1.default.join(apiDir, "webhook/route.ts");
            await fs_extra_1.default.ensureDir(path_1.default.dirname(webhookPath));
            await fs_extra_1.default.writeFile(webhookPath, webhookCode);
            console.log(chalk_1.default.green(`✓ Created ${webhookPath}`));
        }
        else {
            // Pages Router
            const webhookCode = `import type { NextApiRequest, NextApiResponse } from "next";
import { createPortaldClient } from "portald/sdk";

/**
 * Portald Webhook Handler
 * 
 * This endpoint receives callbacks from Portald when agent actions are approved/denied.
 * All webhooks are signed with HMAC - verify signatures to prevent spoofing.
 * 
 * URL: https://${domain}/api/portald/webhook
 * 
 * Required env vars:
 *   PORTALD_SITE_ID - Your site ID from Portald dashboard
 *   PORTALD_WEBHOOK_SECRET - Your webhook secret (keep secure!)
 */

// Disable body parsing to get raw body for signature verification
export const config = {
  api: { bodyParser: false },
};

interface WebhookPayload {
  event: "action.decided";
  action_id: string;
  status: "approved" | "denied" | "executed" | "failed";
  action_type: string;
  decided_at: string;
  reason?: string;
  payment_intent_id?: string;
  payment_error?: string;
  amount_cents?: number;
}

async function getRawBody(req: NextApiRequest): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Get raw body for signature verification
  const rawBody = await getRawBody(req);
  const timestamp = (req.headers["x-portald-timestamp"] as string) ?? "";
  const signature = (req.headers["x-portald-signature"] as string) ?? "";

  // Verify webhook signature (prevents spoofing)
  const portald = createPortaldClient();
  if (!portald.verifyWebhookSignature(rawBody, timestamp, signature)) {
    console.error("[Portald Webhook] Invalid signature - possible spoofing attempt");
    return res.status(401).json({ error: "Invalid signature" });
  }

  const body = JSON.parse(rawBody) as WebhookPayload;
  console.log(\`[Portald Webhook] \${body.event}: \${body.action_type} -> \${body.status}\`);

  // Handle the action based on type and status
  if (body.status === "executed") {
    // Payment was successful - fulfill the order!
    switch (body.action_type) {
      case "purchase":
        console.log(\`Purchase executed: \${body.action_id}\`);
        console.log(\`  Amount: $\${(body.amount_cents ?? 0) / 100}\`);
        console.log(\`  Payment: \${body.payment_intent_id}\`);
        break;
      default:
        console.log(\`Action executed: \${body.action_type}\`);
    }
  } else if (body.status === "approved") {
    console.log(\`Action approved: \${body.action_id}\`);
  } else if (body.status === "denied") {
    console.log(\`Action denied: \${body.action_id}, reason: \${body.reason}\`);
  } else if (body.status === "failed") {
    console.log(\`Action failed: \${body.action_id}, error: \${body.payment_error}\`);
  }

  return res.json({ received: true });
}
`;
            const webhookPath = path_1.default.join(apiDir, "webhook.ts");
            await fs_extra_1.default.ensureDir(path_1.default.dirname(webhookPath));
            await fs_extra_1.default.writeFile(webhookPath, webhookCode);
            console.log(chalk_1.default.green(`✓ Created ${webhookPath}`));
        }
    }
    else if (framework === "express") {
        const routeCode = `import { Router, Request, Response } from "express";
import { createPortaldClient } from "portald/sdk";

/**
 * Portald Webhook Handler
 * 
 * Mount this router: app.use("/api/portald", portaldRouter);
 * IMPORTANT: Use express.raw() middleware for this route to get raw body.
 * 
 * URL: https://${domain}/api/portald/webhook
 * 
 * Required env vars:
 *   PORTALD_SITE_ID - Your site ID from Portald dashboard
 *   PORTALD_WEBHOOK_SECRET - Your webhook secret (keep secure!)
 */

interface WebhookPayload {
  event: "action.decided";
  action_id: string;
  status: "approved" | "denied" | "executed" | "failed";
  action_type: string;
  decided_at: string;
  reason?: string;
  payment_intent_id?: string;
  payment_error?: string;
  amount_cents?: number;
}

const router = Router();

// Use raw body parser for signature verification
router.post("/webhook", (req: Request, res: Response) => {
  const rawBody = (req as any).rawBody || JSON.stringify(req.body);
  const timestamp = (req.headers["x-portald-timestamp"] as string) ?? "";
  const signature = (req.headers["x-portald-signature"] as string) ?? "";

  // Verify webhook signature (prevents spoofing)
  const portald = createPortaldClient();
  if (!portald.verifyWebhookSignature(rawBody, timestamp, signature)) {
    console.error("[Portald Webhook] Invalid signature - possible spoofing attempt");
    return res.status(401).json({ error: "Invalid signature" });
  }

  const body = JSON.parse(rawBody) as WebhookPayload;
  console.log(\`[Portald Webhook] \${body.event}: \${body.action_type} -> \${body.status}\`);

  // Handle the action based on type and status
  if (body.status === "executed") {
    switch (body.action_type) {
      case "purchase":
        console.log(\`Purchase executed: \${body.action_id}\`);
        console.log(\`  Amount: $\${(body.amount_cents ?? 0) / 100}\`);
        console.log(\`  Payment: \${body.payment_intent_id}\`);
        break;
      default:
        console.log(\`Action executed: \${body.action_type}\`);
    }
  } else if (body.status === "approved") {
    console.log(\`Action approved: \${body.action_id}\`);
  } else if (body.status === "denied") {
    console.log(\`Action denied: \${body.action_id}, reason: \${body.reason}\`);
  } else if (body.status === "failed") {
    console.log(\`Action failed: \${body.action_id}, error: \${body.payment_error}\`);
  }

  res.json({ received: true });
});

export default router;
`;
        const routePath = path_1.default.join(apiDir, "portald.ts");
        await fs_extra_1.default.ensureDir(path_1.default.dirname(routePath));
        await fs_extra_1.default.writeFile(routePath, routeCode);
        console.log(chalk_1.default.green(`✓ Created ${routePath}`));
    }
    // 3. Create .env.example with required variables
    const envExample = `# Portald Configuration
# Get these values from https://portald.ai/dashboard after registering your site

PORTALD_SITE_ID=your_site_id_here
PORTALD_WEBHOOK_SECRET=your_webhook_secret_here
`;
    const envPath = ".env.example";
    if (!fs_extra_1.default.existsSync(envPath)) {
        await fs_extra_1.default.writeFile(envPath, envExample);
        console.log(chalk_1.default.green(`✓ Created ${envPath}`));
    }
    // Summary
    console.log(chalk_1.default.bold("\n✨ Portald initialized!\n"));
    console.log(chalk_1.default.white("Your site is now Portald-enabled. Here's what was created:\n"));
    console.log(chalk_1.default.cyan("  📄 Manifest"));
    console.log(chalk_1.default.dim(`     ${manifestPath}`));
    console.log(chalk_1.default.dim("     Agents discover your site supports Portald via this file.\n"));
    console.log(chalk_1.default.cyan("  🔔 Webhook Handler"));
    console.log(chalk_1.default.dim(`     https://${domain}/api/portald/webhook`));
    console.log(chalk_1.default.dim("     Receives signed notifications when actions are approved/executed.\n"));
    console.log(chalk_1.default.cyan("  🔐 Environment Variables"));
    console.log(chalk_1.default.dim("     PORTALD_SITE_ID - Your site ID"));
    console.log(chalk_1.default.dim("     PORTALD_WEBHOOK_SECRET - For verifying webhook signatures\n"));
    console.log(chalk_1.default.white("How it works:\n"));
    console.log(chalk_1.default.dim("  1. An AI agent discovers your site supports Portald (via manifest)"));
    console.log(chalk_1.default.dim("  2. Agent submits purchase/action requests through Portald"));
    console.log(chalk_1.default.dim("  3. User approves the action in their Portald dashboard"));
    console.log(chalk_1.default.dim("  4. Portald executes payment and sends signed webhook to your server"));
    console.log(chalk_1.default.dim("  5. Your webhook handler verifies signature and fulfills the order\n"));
    console.log(chalk_1.default.white("Next steps:\n"));
    console.log(chalk_1.default.yellow("  1. Register your site at https://portald.ai/merchant"));
    console.log(chalk_1.default.dim("     → You'll get PORTALD_SITE_ID and PORTALD_WEBHOOK_SECRET"));
    console.log(chalk_1.default.yellow("  2. Add the env vars to your deployment"));
    console.log(chalk_1.default.yellow("  3. Deploy with the manifest at /.well-known/portald-manifest.json"));
    console.log(chalk_1.default.yellow("  4. Implement fulfillment logic in your webhook handler\n"));
}
