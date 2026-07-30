import * as p from "@clack/prompts";
import pc from "picocolors";

export { p };

export type TextOptions = {
  message: string;
  placeholder?: string;
  defaultValue?: string;
  validate?: (value: string) => string | undefined;
};

export async function text(options: TextOptions): Promise<string> {
  const result = await p.text({
    message: options.message,
    placeholder: options.placeholder,
    defaultValue: options.defaultValue,
    validate: options.validate,
  });

  if (p.isCancel(result)) {
    p.cancel(pc.red("Setup cancelled."));
    process.exit(0);
  }

  return result;
}

export type SelectOptions = {
  message: string;
  options: Array<{ value: string; label: string; hint?: string }>;
  initialValue?: string;
};

export async function select(options: SelectOptions): Promise<string> {
  const result = await p.select({
    message: options.message,
    options: options.options,
    initialValue: options.initialValue,
  });

  if (p.isCancel(result)) {
    p.cancel(pc.red("Setup cancelled."));
    process.exit(0);
  }

  return result as string;
}

export type MultiSelectOptions = {
  message: string;
  options: Array<{ value: string; label: string; hint?: string }>;
  required?: boolean;
  initialValues?: string[];
};

export async function multiSelect(
  options: MultiSelectOptions,
): Promise<string[]> {
  const result = await p.multiselect({
    message: options.message,
    options: options.options,
    required: options.required,
    initialValues: options.initialValues,
  });

  if (p.isCancel(result)) {
    p.cancel(pc.red("Setup cancelled."));
    process.exit(0);
  }

  return result as string[];
}

export function intro(title: string): void {
  p.intro(title);
}

export function outro(message: string): void {
  p.outro(message);
}

export function log(message: string): void {
  p.log.message(message);
}

export function spinner() {
  return p.spinner();
}
