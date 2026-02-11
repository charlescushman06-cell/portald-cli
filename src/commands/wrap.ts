import chalk from "chalk";
import fs from "fs-extra";
import path from "path";

interface WrapOptions {
  risk?: "low" | "med" | "high";
  actionType?: string;
}

export async function wrap(functionName: string, options: WrapOptions) {
  console.log(chalk.bold(`\n🔐 Portald - Wrap Function: ${functionName}\n`));

  const riskLevel = options.risk ?? "med";
  const actionType = options.actionType ?? functionName;

  // Check if portald client exists
  const clientPath = "src/lib/portald.ts";
  if (!(await fs.pathExists(clientPath))) {
    console.log(chalk.yellow("⚠ Portald client not found. Run 'portald init' first."));
    process.exit(1);
  }

  const wrapperCode = `import { portald } from "@/lib/portald";

/**
 * Portald-wrapped ${functionName}
 * Risk level: ${riskLevel}
 * Action type: ${actionType}
 * 
 * This wrapper requests human approval before executing the function.
 * - low risk: auto-approved
 * - med/high risk: requires human approval via Portald dashboard
 */

// TODO: Import your original function
// import { ${functionName} as original${capitalize(functionName)} } from "./your-module";

type ${capitalize(functionName)}Params = {
  // TODO: Define your function parameters
  [key: string]: unknown;
};

type ${capitalize(functionName)}Result = {
  // TODO: Define your function result
  success: boolean;
  data?: unknown;
  error?: string;
};

export async function ${functionName}Wrapped(
  params: ${capitalize(functionName)}Params
): Promise<${capitalize(functionName)}Result> {
  // Request approval from Portald
  const approval = await portald.requestAndWait({
    actionType: "${actionType}",
    payload: params,
    riskLevel: "${riskLevel}",
    reason: \`Requesting approval for ${functionName}\`,
  });

  if (!approval.approved) {
    return {
      success: false,
      error: \`Action \${approval.status}: ${actionType} was not approved\`,
    };
  }

  // Execute the original function
  try {
    // TODO: Call your original function
    // const result = await original${capitalize(functionName)}(params);
    // return { success: true, data: result };
    
    return { success: true, data: { message: "TODO: Implement original function" } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Non-blocking version that returns immediately after requesting approval.
 * Use this with a webhook callback to handle the result asynchronously.
 */
export async function ${functionName}Async(
  params: ${capitalize(functionName)}Params,
  callbackUrl: string
): Promise<{ actionId: string; status: string }> {
  const result = await portald.requestApproval({
    actionType: "${actionType}",
    payload: params,
    riskLevel: "${riskLevel}",
    reason: \`Requesting approval for ${functionName}\`,
    callbackUrl,
  });

  return {
    actionId: result.actionId,
    status: result.status,
  };
}
`;

  const outputDir = "src/lib/portald-wrapped";
  const outputPath = path.join(outputDir, `${functionName}.ts`);

  await fs.ensureDir(outputDir);
  await fs.writeFile(outputPath, wrapperCode);

  console.log(chalk.green(`✓ Created ${outputPath}`));
  console.log();
  console.log(chalk.white("Usage:"));
  console.log(chalk.cyan(`
  import { ${functionName}Wrapped } from "@/lib/portald-wrapped/${functionName}";
  
  // Blocking - waits for approval
  const result = await ${functionName}Wrapped({ ... });
  
  // Non-blocking - uses webhook callback
  import { ${functionName}Async } from "@/lib/portald-wrapped/${functionName}";
  const { actionId } = await ${functionName}Async({ ... }, "https://your-site.com/api/portald/webhook");
`));
  console.log(chalk.dim("Don't forget to implement the original function call in the wrapper!"));
  console.log();
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
