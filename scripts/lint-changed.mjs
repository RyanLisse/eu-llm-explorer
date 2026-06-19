import { execFileSync, spawnSync } from "node:child_process";

const text = (args) => execFileSync("git", args, { encoding: "utf8" });
const changed = text(["diff", "--name-only", "--diff-filter=ACMR", "HEAD"]).trim().split("\n");
const untracked = text(["ls-files", "--others", "--exclude-standard"]).trim().split("\n");
const files = [...new Set([...changed, ...untracked])]
  .filter(Boolean)
  .filter((file) => /\.(?:[cm]?[jt]sx?|jsonc?|css)$/.test(file))
  .filter((file) => !(file.startsWith(".next/") || file.startsWith("node_modules/")));

if (files.length === 0) {
  console.log("No changed lintable files.");
  process.exit(0);
}

const result = spawnSync(
  "npx",
  [
    "biome",
    "check",
    "--javascript-formatter-enabled=false",
    "--json-formatter-enabled=false",
    "--css-formatter-enabled=false",
    "--assist-enabled=false",
    "--skip=style",
    "--skip=performance/useTopLevelRegex",
    "--skip=complexity/noExcessiveCognitiveComplexity",
    "--files-ignore-unknown=true",
    ...files,
  ],
  { stdio: "inherit" },
);

process.exit(result.status ?? 1);
