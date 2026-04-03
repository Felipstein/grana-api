import type { $ZodIssue } from 'zod/v4/core';

export type ValueObjectError = {
  [key in string]: string;
};

export function mapZodIssues(issues: $ZodIssue[]): ValueObjectError {
  return issues.reduce((error, issue) => ({ ...error, [issue.path.join('.')]: issue.message }), {});
}
