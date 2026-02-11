"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrap = wrap;
const chalk_1 = __importDefault(require("chalk"));
async function wrap(functionName, options) {
    const riskLevel = options.risk ?? "med";
    const actionType = options.actionType ?? functionName.replace(/([A-Z])/g, ".$1").toLowerCase().replace(/^\./, "");
    console.log(chalk_1.default.bold("\n📦 Portald Function Wrapper\n"));
    console.log("Wrap your function like this:\n");
    console.log(chalk_1.default.dim("// Before"));
    console.log(`async function ${functionName}(...args) {`);
    console.log("  // your logic");
    console.log("}\n");
    console.log(chalk_1.default.dim("// After"));
    console.log(chalk_1.default.cyan(`import { gate } from "./lib/portald/gate";\n`));
    console.log(`async function _${functionName}(...args) {`);
    console.log("  // your logic");
    console.log("}\n");
    console.log(chalk_1.default.green(`export const ${functionName} = gate(_${functionName}, {`));
    console.log(chalk_1.default.green(`  actionType: "${actionType}",`));
    console.log(chalk_1.default.green(`  riskLevel: "${riskLevel}",`));
    console.log(chalk_1.default.green(`  getPayload: (...args) => ({ args }),`));
    console.log(chalk_1.default.green(`});`));
    console.log(chalk_1.default.dim("\n// Usage"));
    console.log(`const result = await ${functionName}(sessionToken, ...args);\n`);
}
