import prompts from "prompts";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";

type Framework = "nextjs" | "express" | "generic";

interface InitOptions {
  yes?: boolean;
  framework?: Framework;
}

function detectFramework(): Framework | null {
  if (fs.existsSync("next.config.js") || fs.existsSync("next.config.ts") || fs.existsSync("next.config.mjs")) {
    return "nextjs";
  }
  const pkg = fs.existsSync("package.json") ? fs.readJSONSync("package.json") : {};
  if (pkg.dependencies?.express) {
    return "express";
  }
  return null;
}

function getPublicDir(framework: Framework): string {
  if (framework === "nextjs") return "public";
  if (framework === "express") return "public";
  return ".";
}

function getApiDir(framework: Framework): string {
  // Check for app router vs pages router in Next.js
  if (framework === "nextjs") {
    if (fs.existsSync("src/app")) return "src/app/api/portald";
    if (fs.existsSync("app")) return "app/api/portald";
    if (fs.existsSync("src/pages")) return "src/pages/api/portald";
    return "pages/api/portald";
  }
  if (framework === "express") return "src/routes";
  return "api";
}

function isAppRouter(): boolean {
  return fs.existsSync("src/app") || fs.existsSync("app");
}

export async function init(options: InitOptions) {
  console.log(chalk.bold("\n🚀 Portald CLI - Initialize\n"));

  let framework = options.framework as Framework | undefined;
  let appName = "";
  let domain = "";

  const detected = detectFramework();
  if (detected && !framework) {
    console.log(chalk.dim(`Detected framework: ${detected}`));
    framework = detected;
  }

  if (!options.yes) {
    const responses = await prompts([
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
        initial: path.basename(process.cwd()),
      },
      {
        type: "text",
        name: "domain",
        message: "Production domain (e.g., example.com)?",
        initial: "localhost:3000",
      },
    ]);

    framework = responses.framework || framework;
    appName = responses.appName || path.basename(process.cwd());
    domain = responses.domain || "localhost:3000";
  } else {
    framework = framework || detected || "generic";
    appName = path.basename(process.cwd());
    domain = "localhost:3000";
  }

  if (!framework) {
    console.log(chalk.red("No framework selected. Exiting."));
    process.exit(1);
  }

  const publicDir = getPublicDir(framework);
  const apiDir = getApiDir(framework);
  const wellKnownDir = path.join(publicDir, ".well-known");

  // Create directories
  await fs.ensureDir(wellKnownDir);
  await fs.ensureDir(apiDir);

  // 1. Create manifest - tells agents how to interact with this site
  const manifest = {
    domain,
    app_name: appName,
    portald: { version: "1.0" },
    embed_modes: ["headless"],
    requested_capabilities: ["payment", "sensitive_action"],
    agent_instructions: {
      handshake_endpoint: "https://portald.ai/api/portald/v1/identity/handshake",
      action_ingest_endpoint: "https://portald.ai/api/agent-actions/ingest",
      action_poll_endpoint: "https://portald.ai/api/agent-actions/{action_id}",
      approvals_dashboard_url: "https://portald.ai/dashboard/approvals",
      enrollment_url: "https://portald.ai/enroll",
      notes: [
        "Submit actions via action_ingest_endpoint with Bearer token",
        "Poll action status or use callback_url for webhooks",
        "Low risk actions auto-approve, med/high require human approval",
      ],
    },
  };

  const manifestPath = path.join(wellKnownDir, "portald-manifest.json");
  await fs.writeJSON(manifestPath, manifest, { spaces: 2 });
  console.log(chalk.green(`✓ Created ${manifestPath}`));

  // 2. Create webhook handler (framework-specific)
  if (framework === "nextjs") {
    const isApp = isAppRouter();
    if (isApp) {
      // App Router
      const webhookCode = `import { NextRequest, NextResponse } from "next/server";

/**
 * Portald Webhook Handler
 * 
 * This endpoint receives callbacks from Portald when agent actions are approved/denied.
 * Register this URL in your Portald dashboard or include it in action requests.
 * 
 * URL: https://${domain}/api/portald/webhook
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
  mediation_payload?: Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as WebhookPayload;

  console.log(\`[Portald Webhook] \${body.event}: \${body.action_type} -> \${body.status}\`);

  // Handle the action based on type and status
  if (body.status === "executed") {
    // Payment was successful - fulfill the order
    switch (body.action_type) {
      case "purchase":
        // TODO: Fulfill the purchase
        // - Look up order by action_id
        // - Mark as paid
        // - Trigger shipping/delivery
        console.log(\`Purchase executed: \${body.action_id}, payment: \${body.payment_intent_id}\`);
        break;
      default:
        console.log(\`Action executed: \${body.action_type}\`);
    }
  } else if (body.status === "approved") {
    // Action approved but may not involve payment
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
      const webhookPath = path.join(apiDir, "webhook/route.ts");
      await fs.ensureDir(path.dirname(webhookPath));
      await fs.writeFile(webhookPath, webhookCode);
      console.log(chalk.green(`✓ Created ${webhookPath}`));
    } else {
      // Pages Router
      const webhookCode = `import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Portald Webhook Handler
 * 
 * This endpoint receives callbacks from Portald when agent actions are approved/denied.
 * Register this URL in your Portald dashboard or include it in action requests.
 * 
 * URL: https://${domain}/api/portald/webhook
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
  mediation_payload?: Record<string, unknown>;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.body as WebhookPayload;

  console.log(\`[Portald Webhook] \${body.event}: \${body.action_type} -> \${body.status}\`);

  // Handle the action based on type and status
  if (body.status === "executed") {
    // Payment was successful - fulfill the order
    switch (body.action_type) {
      case "purchase":
        // TODO: Fulfill the purchase
        // - Look up order by action_id
        // - Mark as paid
        // - Trigger shipping/delivery
        console.log(\`Purchase executed: \${body.action_id}, payment: \${body.payment_intent_id}\`);
        break;
      default:
        console.log(\`Action executed: \${body.action_type}\`);
    }
  } else if (body.status === "approved") {
    // Action approved but may not involve payment
    console.log(\`Action approved: \${body.action_id}\`);
  } else if (body.status === "denied") {
    // User denied the action
    console.log(\`Action denied: \${body.action_id}, reason: \${body.reason}\`);
  } else if (body.status === "failed") {
    // Payment or execution failed
    console.log(\`Action failed: \${body.action_id}, error: \${body.payment_error}\`);
  }

  return res.json({ received: true });
}
`;
      const webhookPath = path.join(apiDir, "webhook.ts");
      await fs.ensureDir(path.dirname(webhookPath));
      await fs.writeFile(webhookPath, webhookCode);
      console.log(chalk.green(`✓ Created ${webhookPath}`));
    }
  } else if (framework === "express") {
    const routeCode = `import { Router, Request, Response } from "express";

/**
 * Portald Webhook Handler
 * 
 * Mount this router: app.use("/api/portald", portaldRouter);
 * 
 * This endpoint receives callbacks from Portald when agent actions are approved/denied.
 * URL: https://${domain}/api/portald/webhook
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
  mediation_payload?: Record<string, unknown>;
}

const router = Router();

router.post("/webhook", async (req: Request, res: Response) => {
  const body = req.body as WebhookPayload;

  console.log(\`[Portald Webhook] \${body.event}: \${body.action_type} -> \${body.status}\`);

  // Handle the action based on type and status
  if (body.status === "executed") {
    // Payment was successful - fulfill the order
    switch (body.action_type) {
      case "purchase":
        // TODO: Fulfill the purchase
        console.log(\`Purchase executed: \${body.action_id}, payment: \${body.payment_intent_id}\`);
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
    const routePath = path.join(apiDir, "portald.ts");
    await fs.ensureDir(path.dirname(routePath));
    await fs.writeFile(routePath, routeCode);
    console.log(chalk.green(`✓ Created ${routePath}`));
  }

  // Summary
  console.log(chalk.bold("\n✨ Portald initialized!\n"));
  console.log(chalk.white("Your site is now Portald-enabled. Here's what was created:\n"));
  
  console.log(chalk.cyan("  📄 Manifest"));
  console.log(chalk.dim(`     ${manifestPath}`));
  console.log(chalk.dim("     Agents discover your site supports Portald via this file.\n"));
  
  console.log(chalk.cyan("  🔔 Webhook Handler"));
  console.log(chalk.dim(`     https://${domain}/api/portald/webhook`));
  console.log(chalk.dim("     Receives notifications when actions are approved/executed.\n"));

  console.log(chalk.white("How it works:\n"));
  console.log(chalk.dim("  1. An AI agent discovers your site supports Portald (via manifest)"));
  console.log(chalk.dim("  2. Agent submits purchase/action requests through Portald"));
  console.log(chalk.dim("  3. User approves the action in their Portald dashboard"));
  console.log(chalk.dim("  4. Portald executes payment and notifies your webhook"));
  console.log(chalk.dim("  5. Your webhook handler fulfills the order\n"));

  console.log(chalk.white("Next steps:\n"));
  console.log(chalk.dim("  1. Deploy your site with the manifest at /.well-known/portald-manifest.json"));
  console.log(chalk.dim("  2. Implement fulfillment logic in your webhook handler"));
  console.log(chalk.dim("  3. (Optional) Set up Stripe Connect to receive funds directly"));
  console.log(chalk.dim("     → https://portald.ai/docs/merchant-setup\n"));
}
