declare module "papaparse" {
  interface ParseConfig {
    delimiter?: string;
    newline?: string;
    quoteChar?: string;
    escapeChar?: string;
    header?: boolean;
    dynamicTyping?: boolean;
    preview?: number;
    step?: (results: ParseResult, parser: Parser) => void;
    complete?: (results: ParseResult) => void;
    error?: (error: ParseError) => void;
    skipEmptyLines?: boolean | "greedy";
    transform?: (value: string, field: string | number) => unknown;
  }

  interface ParseResult {
    data: Record<string, string>[];
    errors: ParseError[];
    meta: {
      delimiter: string;
      linebreak: string;
      aborted: boolean;
      fields: string[];
      truncated: boolean;
    };
  }

  interface ParseError {
    type: string;
    code: string;
    message: string;
    row: number;
  }

  interface Parser {
    abort: () => void;
    pause: () => void;
    resume: () => void;
  }

  function parse(input: string | File | NodeJS.ReadableStream, config?: ParseConfig): ParseResult;
  function parse(input: string | File | NodeJS.ReadableStream, config?: Omit<ParseConfig, "complete" | "step">): { abort: () => void };

  export default { parse };
  export { parse, ParseConfig, ParseResult, ParseError, Parser };
}
