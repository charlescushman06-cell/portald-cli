type Framework = "nextjs" | "express" | "generic";
interface InitOptions {
    yes?: boolean;
    framework?: Framework;
}
export declare function init(options: InitOptions): Promise<void>;
export {};
