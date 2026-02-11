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
const FRAMEWORKS = [
    { title: "Next.js (App Router)", value: "nextjs" },
    { title: "Express.js", value: "express" },
    { title: "Generic (just the SDK)", value: "generic" },
];
async function init(options) {
    console.log(chalk_1.default.bold("\n🚀 Portald Setup\n"));
    // Detect framework
    let framework = options.framework;
    if (!framework) {
        if (options.yes) {
            framework = detectFramework();
        }
        else {
            const response = await (0, prompts_1.default)({
                type: "select",
                name: "framework",
                message: "What framework are you using?",
                choices: FRAMEWORKS,
                initial: FRAMEWORKS.findIndex((f) => f.value === detectFramework()),
            });
            framework = response.framework;
        }
    }
    if (!framework) {
        console.log(chalk_1.default.red("Setup cancelled."));
        return;
    }
    // Get project details
    let appName = path_1.default.basename(process.cwd());
    let domain = "localhost:3000";
    let siteId = appName.toLowerCase().replace(/[^a-z0-9]/g, "-");
    if (!options.yes) {
        const details = await (0, prompts_1.default)([
            {
                type: "text",
                name: "appName",
                message: "App name",
                initial: appName,
            },
            {
                type: "text",
                name: "domain",
                message: "Domain (for production)",
                initial: "yoursite.com",
            },
            {
                type: "text",
                name: "siteId",
                message: "Site ID (unique identifier)",
                initial: siteId,
            },
        ]);
        appName = details.appName || appName;
        domain = details.domain || domain;
        siteId = details.siteId || siteId;
    }
    // Get example actions
    let exampleActions = ["payments.charge", "orders.create", "data.export"];
    if (!options.yes) {
        const actionsResponse = await (0, prompts_1.default)({
            type: "list",
            name: "actions",
            message: "Example action types (comma-separated)",
            initial: exampleActions.join(", "),
            separator: ",",
        });
        if (actionsResponse.actions?.length) {
            exampleActions = actionsResponse.actions.map((a) => a.trim());
        }
    }
    console.log(chalk_1.default.dim("\nCreating files...\n"));
    // Create files based on framework
    switch (framework) {
        case "nextjs":
            await createNextJsFiles({ appName, domain, siteId, exampleActions });
            break;
        case "express":
            await createExpressFiles({ appName, domain, siteId, exampleActions });
            break;
        case "generic":
            await createGenericFiles({ appName, domain, siteId, exampleActions });
            break;
    }
    // Print success message
    console.log(chalk_1.default.green("\n✅ Portald initialized!\n"));
    console.log(chalk_1.default.bold("Next steps:"));
    console.log("  1. Review the generated files");
    console.log("  2. Update your environment variables:");
    console.log(chalk_1.default.dim("     PORTALD_SITE_ID=" + siteId));
    console.log("  3. Deploy and test with an agent\n");
    console.log(chalk_1.default.dim("Docs: https://portald.ai/docs\n"));
}
function detectFramework() {
    if (fs_extra_1.default.existsSync("next.config.js") || fs_extra_1.default.existsSync("next.config.ts") || fs_extra_1.default.existsSync("next.config.mjs")) {
        return "nextjs";
    }
    try {
        const pkg = fs_extra_1.default.readJsonSync("package.json");
        if (pkg.dependencies?.express)
            return "express";
        if (pkg.dependencies?.next)
            return "nextjs";
    }
    catch { }
    return "generic";
}
async function createNextJsFiles(config) {
    const { appName, domain, siteId, exampleActions } = config;
    // Create .well-known directory
    const wellKnownDir = "public/.well-known";
    await fs_extra_1.default.ensureDir(wellKnownDir);
    // Create manifest
    const manifest = createManifest(config);
    await fs_extra_1.default.writeJson(path_1.default.join(wellKnownDir, "portald-manifest.json"), manifest, { spaces: 2 });
    console.log(chalk_1.default.green("  ✓") + " public/.well-known/portald-manifest.json");
    // Create API routes
    const apiDir = "src/app/api/portald";
    await fs_extra_1.default.ensureDir(apiDir);
    await fs_extra_1.default.ensureDir(path_1.default.join(apiDir, "handshake"));
    await fs_extra_1.default.ensureDir(path_1.default.join(apiDir, "actions"));
    await fs_extra_1.default.ensureDir(path_1.default.join(apiDir, "actions/[id]"));
    // Handshake route
    await fs_extra_1.default.writeFile(path_1.default.join(apiDir, "handshake/route.ts"), getNextJsHandshakeRoute());
    console.log(chalk_1.default.green("  ✓") + " src/app/api/portald/handshake/route.ts");
    // Actions ingest route
    await fs_extra_1.default.writeFile(path_1.default.join(apiDir, "actions/route.ts"), getNextJsActionsRoute());
    console.log(chalk_1.default.green("  ✓") + " src/app/api/portald/actions/route.ts");
    // Actions poll route
    await fs_extra_1.default.writeFile(path_1.default.join(apiDir, "actions/[id]/route.ts"), getNextJsActionPollRoute());
    console.log(chalk_1.default.green("  ✓") + " src/app/api/portald/actions/[id]/route.ts");
    // Create lib files
    const libDir = "src/lib/portald";
    await fs_extra_1.default.ensureDir(libDir);
    await fs_extra_1.default.writeFile(path_1.default.join(libDir, "client.ts"), getPortaldClient());
    console.log(chalk_1.default.green("  ✓") + " src/lib/portald/client.ts");
    await fs_extra_1.default.writeFile(path_1.default.join(libDir, "gate.ts"), getGateWrapper(exampleActions));
    console.log(chalk_1.default.green("  ✓") + " src/lib/portald/gate.ts");
    // Create example usage file
    await fs_extra_1.default.writeFile(path_1.default.join(libDir, "example.ts"), getExampleUsage(exampleActions));
    console.log(chalk_1.default.green("  ✓") + " src/lib/portald/example.ts");
}
async function createExpressFiles(config) {
    const { appName, domain, siteId, exampleActions } = config;
    // Create directories
    await fs_extra_1.default.ensureDir("public/.well-known");
    await fs_extra_1.default.ensureDir("src/portald");
    // Create manifest
    const manifest = createManifest(config);
    await fs_extra_1.default.writeJson("public/.well-known/portald-manifest.json", manifest, { spaces: 2 });
    console.log(chalk_1.default.green("  ✓") + " public/.well-known/portald-manifest.json");
    // Create Express routes
    await fs_extra_1.default.writeFile("src/portald/routes.ts", getExpressRoutes());
    console.log(chalk_1.default.green("  ✓") + " src/portald/routes.ts");
    // Create client
    await fs_extra_1.default.writeFile("src/portald/client.ts", getPortaldClient());
    console.log(chalk_1.default.green("  ✓") + " src/portald/client.ts");
    // Create gate wrapper
    await fs_extra_1.default.writeFile("src/portald/gate.ts", getGateWrapper(exampleActions));
    console.log(chalk_1.default.green("  ✓") + " src/portald/gate.ts");
    console.log(chalk_1.default.yellow("\n  Add to your Express app:"));
    console.log(chalk_1.default.dim('  import { portaldRoutes } from "./portald/routes";'));
    console.log(chalk_1.default.dim('  app.use("/api/portald", portaldRoutes);'));
}
async function createGenericFiles(config) {
    const { appName, domain, siteId, exampleActions } = config;
    await fs_extra_1.default.ensureDir("portald");
    // Create manifest
    const manifest = createManifest(config);
    await fs_extra_1.default.writeJson("portald/manifest.json", manifest, { spaces: 2 });
    console.log(chalk_1.default.green("  ✓") + " portald/manifest.json");
    // Create client
    await fs_extra_1.default.writeFile("portald/client.ts", getPortaldClient());
    console.log(chalk_1.default.green("  ✓") + " portald/client.ts");
    // Create gate wrapper
    await fs_extra_1.default.writeFile("portald/gate.ts", getGateWrapper(exampleActions));
    console.log(chalk_1.default.green("  ✓") + " portald/gate.ts");
    console.log(chalk_1.default.yellow("\n  Serve the manifest at: /.well-known/portald-manifest.json"));
}
function createManifest(config) {
    const { appName, domain, siteId, exampleActions } = config;
    return {
        portald: { version: "1" },
        site_id: siteId,
        domain: domain,
        app_name: appName,
        description: `${appName} with Portald agent authorization. Agents can request actions with user approval.`,
        agent_instructions: {
            summary: `This site uses Portald for agent authorization. Actions require user approval.`,
            handshake_endpoint: `https://${domain}/api/portald/handshake`,
            action_ingest_endpoint: `https://${domain}/api/portald/actions`,
            action_poll_endpoint: `https://${domain}/api/portald/actions/{action_id}`,
            flow: [
                "1. Call handshake with your action_code to get session token",
                "2. Submit actions via the ingest endpoint",
                "3. Low-risk actions auto-approve; med/high require user approval",
                "4. Poll action status or wait for webhook callback",
            ],
        },
        available_actions: exampleActions.map((action, i) => ({
            action_type: action,
            description: `${action.replace(".", " ")} action`,
            risk_level: i === 0 ? "high" : i === 1 ? "med" : "low",
            payload_schema: {},
        })),
    };
}
function getNextJsHandshakeRoute() {
    return `import { NextRequest, NextResponse } from "next/server";
import { portaldClient } from "@/lib/portald/client";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { action_code } = body;

  if (!action_code) {
    return NextResponse.json({ error: "Missing action_code" }, { status: 400 });
  }

  try {
    const result = await portaldClient.handshake(action_code);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}
`;
}
function getNextJsActionsRoute() {
    return `import { NextRequest, NextResponse } from "next/server";
import { portaldClient } from "@/lib/portald/client";

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  
  try {
    const result = await portaldClient.ingestAction(token, body);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
`;
}
function getNextJsActionPollRoute() {
    return `import { NextRequest, NextResponse } from "next/server";
import { portaldClient } from "@/lib/portald/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await portaldClient.getAction(token, id);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
`;
}
function getPortaldClient() {
    return `const PORTALD_API = process.env.PORTALD_API_URL ?? "https://portald.ai";

class PortaldClient {
  async handshake(actionCode: string) {
    const res = await fetch(\`\${PORTALD_API}/api/portald/v1/identity/handshake\`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action_code: actionCode }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Handshake failed");
    return data;
  }

  async ingestAction(sessionToken: string, action: {
    action_type: string;
    action_payload: Record<string, unknown>;
    risk_level?: "low" | "med" | "high";
    idempotency_key: string;
    callback_url?: string;
  }) {
    const res = await fetch(\`\${PORTALD_API}/api/agent-actions/ingest\`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": \`Bearer \${sessionToken}\`,
      },
      body: JSON.stringify(action),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Action ingest failed");
    return data;
  }

  async getAction(sessionToken: string, actionId: string) {
    const res = await fetch(\`\${PORTALD_API}/api/agent-actions/\${actionId}\`, {
      headers: { "Authorization": \`Bearer \${sessionToken}\` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to get action");
    return data;
  }

  async waitForApproval(sessionToken: string, actionId: string, timeoutMs = 300000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const action = await this.getAction(sessionToken, actionId);
      if (action.status === "approved") return { approved: true, action };
      if (action.status === "denied") return { approved: false, action };
      if (action.status === "expired") return { approved: false, action };
      await new Promise(r => setTimeout(r, 2000));
    }
    throw new Error("Approval timeout");
  }
}

export const portaldClient = new PortaldClient();
`;
}
function getGateWrapper(exampleActions) {
    return `import { portaldClient } from "./client";
import { randomUUID } from "crypto";

type GateOptions = {
  actionType: string;
  riskLevel?: "low" | "med" | "high";
  getPayload?: (...args: any[]) => Record<string, unknown>;
};

/**
 * Wrap a function to require Portald approval before execution.
 * 
 * @example
 * const gatedCharge = gate(chargeCustomer, {
 *   actionType: "payments.charge",
 *   riskLevel: "high",
 *   getPayload: (customerId, amount) => ({ customerId, amount }),
 * });
 * 
 * // In your agent handler:
 * const result = await gatedCharge(sessionToken, customerId, 100);
 */
export function gate<T extends (...args: any[]) => any>(
  fn: T,
  options: GateOptions
): (sessionToken: string, ...args: Parameters<T>) => Promise<ReturnType<T>> {
  return async (sessionToken: string, ...args: Parameters<T>) => {
    const payload = options.getPayload
      ? options.getPayload(...args)
      : { args };

    // Submit action for approval
    const action = await portaldClient.ingestAction(sessionToken, {
      action_type: options.actionType,
      action_payload: payload,
      risk_level: options.riskLevel ?? "med",
      idempotency_key: randomUUID(),
    });

    // If auto-approved (low risk), execute immediately
    if (action.approved) {
      return fn(...args);
    }

    // Wait for approval
    const result = await portaldClient.waitForApproval(sessionToken, action.action_id);
    
    if (!result.approved) {
      throw new Error(\`Action \${options.actionType} was denied\`);
    }

    // Execute the function
    return fn(...args);
  };
}

// Example: Quick gate for common patterns
export const gatePayment = <T extends (...args: any[]) => any>(fn: T, actionType = "payments.charge") =>
  gate(fn, { actionType, riskLevel: "high" });

export const gateData = <T extends (...args: any[]) => any>(fn: T, actionType = "data.modify") =>
  gate(fn, { actionType, riskLevel: "med" });
`;
}
function getExampleUsage(exampleActions) {
    const action = exampleActions[0] ?? "payments.charge";
    return `/**
 * Example: Wrapping a function with Portald approval
 */
import { gate } from "./gate";

// Your original function
async function chargeCustomer(customerId: string, amountCents: number) {
  // ... your payment logic
  console.log(\`Charging \${customerId} for \${amountCents} cents\`);
  return { success: true, chargeId: "ch_123" };
}

// Wrap it with Portald
export const gatedChargeCustomer = gate(chargeCustomer, {
  actionType: "${action}",
  riskLevel: "high",
  getPayload: (customerId, amountCents) => ({ customerId, amountCents }),
});

/**
 * Usage in your agent endpoint:
 * 
 * const sessionToken = req.headers.authorization; // From Portald handshake
 * const result = await gatedChargeCustomer(sessionToken, "cus_123", 5000);
 */
`;
}
function getExpressRoutes() {
    return `import { Router } from "express";
import { portaldClient } from "./client";

export const portaldRoutes = Router();

portaldRoutes.post("/handshake", async (req, res) => {
  const { action_code } = req.body;
  if (!action_code) {
    return res.status(400).json({ error: "Missing action_code" });
  }
  try {
    const result = await portaldClient.handshake(action_code);
    res.json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

portaldRoutes.post("/actions", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const result = await portaldClient.ingestAction(token, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

portaldRoutes.get("/actions/:id", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const result = await portaldClient.getAction(token, req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});
`;
}
