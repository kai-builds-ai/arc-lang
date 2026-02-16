export interface FormatOptions {
    indentSize: number;
    maxLineLength: number;
}
export declare function format(source: string, options?: Partial<FormatOptions>): string;
