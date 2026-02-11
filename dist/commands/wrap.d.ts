type WrapOptions = {
    risk?: string;
    actionType?: string;
};
export declare function wrap(functionName: string, options: WrapOptions): Promise<void>;
export {};
