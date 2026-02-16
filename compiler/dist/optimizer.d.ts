import { IRInstr, IRModule } from "./ir.js";
export type OptIRInstr = IRInstr | {
    op: "parallel_toolcall";
    dest: string;
    calls: {
        dest: string;
        method: string;
        url: string;
        body?: string;
    }[];
};
export declare function optimize(module: IRModule): IRModule;
export declare function optimizeWithBatching(module: IRModule): {
    module: IRModule;
    batchedMain: (IRInstr | OptIRInstr)[];
};
export declare function formatOptInstr(instr: IRInstr | OptIRInstr): string;
