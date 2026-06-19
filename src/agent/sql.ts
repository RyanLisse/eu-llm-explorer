import { ALLOWED_SQL_TABLES, type AllowedSqlTable } from "./constants";

export interface ValidSqlRead {
  readonly ok: true;
  readonly sql: string;
  readonly tables: ReadonlyArray<AllowedSqlTable>;
}

export interface InvalidSqlRead {
  readonly ok: false;
  readonly error: string;
}

export type SqlValidationResult = ValidSqlRead | InvalidSqlRead;

const ALLOWED_TABLE_SET = new Set<string>(ALLOWED_SQL_TABLES);

const WRITE_KEYWORDS = [
  "alter",
  "attach",
  "create",
  "delete",
  "detach",
  "drop",
  "insert",
  "pragma",
  "reindex",
  "replace",
  "truncate",
  "update",
  "vacuum",
] as const;

const COMMENT_PATTERNS = [/--/, /\/\*/, /\*\//, /(^|\s)#/];
const SOURCE_SECTION_PATTERN =
  /\b(?:from|join)\b\s+([\s\S]*?)(?=\b(?:where|group\s+by|order\s+by|having|limit|offset|union|intersect|except|join|on)\b|$)/gi;
const IDENTIFIER_PATTERN =
  /^(?:"[^"]+"|`[^`]+`|\[[^\]]+\]|[a-zA-Z_][\w$]*)(?:\s*\.\s*(?:"[^"]+"|`[^`]+`|\[[^\]]+\]|[a-zA-Z_][\w$]*))?/;

const stripStringLiterals = (sql: string): string =>
  sql.replace(/'(?:''|[^'])*'/g, (match) => " ".repeat(match.length));

const normalizeIdentifier = (identifier: string): string => {
  const parts = identifier
    .split(".")
    .map((part) => part.trim().replace(/^["`\[]|["`\]]$/g, ""))
    .filter(Boolean);
  return (parts.at(-1) ?? "").toLowerCase();
};

const findTableReferences = (sqlWithoutStrings: string): ReadonlyArray<string> => {
  const tables = new Set<string>();
  for (const match of sqlWithoutStrings.matchAll(SOURCE_SECTION_PATTERN)) {
    const sourceSection = match[1];
    if (!sourceSection) continue;
    for (const sourcePart of sourceSection.split(",")) {
      const trimmedSource = sourcePart.trim();
      if (!trimmedSource) continue;
      if (trimmedSource.startsWith("(")) {
        tables.add("(subquery)");
        continue;
      }
      const rawTable = trimmedSource.match(IDENTIFIER_PATTERN)?.[0];
      if (rawTable) tables.add(normalizeIdentifier(rawTable));
    }
  }
  return [...tables];
};

export function validateReadOnlySql(sql: string): SqlValidationResult {
  const trimmed = sql.trim();
  if (!trimmed) {
    return { ok: false, error: "SQL query is required." };
  }

  if (trimmed.includes(";")) {
    return { ok: false, error: "Only single SELECT statements without semicolons are allowed." };
  }

  const withoutStrings = stripStringLiterals(trimmed);

  if (COMMENT_PATTERNS.some((pattern) => pattern.test(withoutStrings))) {
    return { ok: false, error: "SQL comments are not allowed." };
  }

  if (!/^\s*select\b/i.test(trimmed)) {
    return { ok: false, error: "Only SELECT statements are allowed." };
  }

  const forbiddenKeyword = WRITE_KEYWORDS.find((keyword) =>
    new RegExp(`\\b${keyword}\\b`, "i").test(withoutStrings),
  );
  if (forbiddenKeyword) {
    return { ok: false, error: `Forbidden SQL keyword: ${forbiddenKeyword.toUpperCase()}.` };
  }

  const referencedTables = findTableReferences(withoutStrings);
  if (referencedTables.length === 0) {
    return { ok: false, error: "SELECT queries must read from an allowlisted catalog table." };
  }

  const forbiddenTable = referencedTables.find((table) => !ALLOWED_TABLE_SET.has(table));
  if (forbiddenTable) {
    return {
      ok: false,
      error: `Table "${forbiddenTable}" is not available to the agent read tool.`,
    };
  }

  return {
    ok: true,
    sql: trimmed,
    tables: referencedTables as ReadonlyArray<AllowedSqlTable>,
  };
}
