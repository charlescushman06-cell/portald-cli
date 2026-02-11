interface WrapOptions {
    risk?: "low" | "med" | "high";
    actionType?: string;
}
export declare function wrap(functionName: string, options: WrapOptions): Promise<void>;
export {};
