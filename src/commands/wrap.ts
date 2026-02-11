import chalk from "chalk";

type WrapOptions = {
  risk?: string;
  actionType?: string;
};

export async function wrap(functionName: string, options: WrapOptions) {
  const riskLevel = options.risk ?? "med";
  const actionType = options.actionType ?? functionName.replace(/([A-Z])/g, ".$1").toLowerCase().replace(/^\./, "");

  console.log(chalk.bold("\n📦 Portald Function Wrapper\n"));
  console.log("Wrap your function like this:\n");

  console.log(chalk.dim("// Before"));
  console.log(`async function ${functionName}(...args) {`);
  console.log("  // your logic");
  console.log("}\n");

  console.log(chalk.dim("// After"));
  console.log(chalk.cyan(`import { gate } from "./lib/portald/gate";\n`));
  console.log(`async function _${functionName}(...args) {`);
  console.log("  // your logic");
  console.log("}\n");
  console.log(chalk.green(`export const ${functionName} = gate(_${functionName}, {`));
  console.log(chalk.green(`  actionType: "${actionType}",`));
  console.log(chalk.green(`  riskLevel: "${riskLevel}",`));
  console.log(chalk.green(`  getPayload: (...args) => ({ args }),`));
  console.log(chalk.green(`});`));

  console.log(chalk.dim("\n// Usage"));
  console.log(`const result = await ${functionName}(sessionToken, ...args);\n`);
}
