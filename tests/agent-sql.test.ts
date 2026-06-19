import assert from "node:assert/strict";
import test from "node:test";
import { ALLOWED_SQL_TABLES } from "../src/agent/constants";
import { validateReadOnlySql } from "../src/agent/sql";

test("exports the catalog table allowlist", () => {
  assert.deepEqual(ALLOWED_SQL_TABLES, [
    "model_routes",
    "provider_coverage",
    "coverage_regions",
    "provider_coverage_summaries",
    "vendor_scope",
  ]);
});

test("accepts basic SELECTs against allowed tables", () => {
  const result = validateReadOnlySql(
    "SELECT mr.name, pc.platform FROM model_routes mr JOIN provider_coverage pc ON pc.model = mr.name LIMIT 10",
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.sql.startsWith("SELECT"), true);
    assert.deepEqual(result.tables, ["model_routes", "provider_coverage"]);
    assert.equal(result.limit, 10);
  }
});

test("adds a hard default limit when SELECT omits LIMIT", () => {
  const result = validateReadOnlySql("SELECT name FROM model_routes");

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.sql, "SELECT name FROM model_routes LIMIT 50");
    assert.equal(result.limit, 50);
  }
});

test("rejects SELECT limits above the agent maximum", () => {
  const result = validateReadOnlySql("SELECT name FROM model_routes LIMIT 500");

  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /50 rows or fewer/);
});

test("rejects non-positive SELECT limits", () => {
  const result = validateReadOnlySql("SELECT name FROM model_routes LIMIT -1");

  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /positive integer/);
});

test("accepts quoted and schema-qualified allowed table names", () => {
  const result = validateReadOnlySql('SELECT * FROM main."model_routes" LIMIT 1');

  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.tables, ["model_routes"]);
});

test("detects comma-separated table sources", () => {
  const result = validateReadOnlySql(
    "SELECT mr.name, pc.platform FROM model_routes mr, provider_coverage pc WHERE pc.model = mr.name",
  );

  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.tables, ["model_routes", "provider_coverage"]);
});

test("rejects non-select statements", () => {
  const result = validateReadOnlySql("UPDATE model_routes SET tier = 'A'");

  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /only select/i);
});

test("rejects semicolons and comments", () => {
  assert.equal(validateReadOnlySql("SELECT * FROM model_routes;").ok, false);
  assert.equal(validateReadOnlySql("SELECT * FROM model_routes -- leak").ok, false);
  assert.equal(validateReadOnlySql("SELECT * FROM model_routes /* leak */").ok, false);
});

test("rejects write keywords even when the statement starts with SELECT", () => {
  const result = validateReadOnlySql("SELECT * FROM model_routes WHERE id IN (DELETE FROM model_routes)");

  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /delete/i);
});

test("does not treat string literal contents as SQL keywords", () => {
  const result = validateReadOnlySql("SELECT 'drop table' AS note FROM model_routes");

  assert.equal(result.ok, true);
});

test("rejects tables outside the allowlist", () => {
  const result = validateReadOnlySql("SELECT name FROM sqlite_master");

  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /sqlite_master/i);
});

test("rejects tableless SELECTs", () => {
  assert.equal(validateReadOnlySql("SELECT 1").ok, false);
  const functionResult = validateReadOnlySql("SELECT sqlite_version()");

  assert.equal(functionResult.ok, false);
  if (!functionResult.ok) assert.match(functionResult.error, /catalog table/i);
});

test("rejects forbidden tables hidden in comma-separated sources", () => {
  const result = validateReadOnlySql("SELECT * FROM model_routes, sqlite_master");

  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /sqlite_master/i);
});

test("rejects subquery table sources conservatively", () => {
  const result = validateReadOnlySql("SELECT * FROM (SELECT * FROM model_routes) AS routes");

  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /subquery/i);
});
