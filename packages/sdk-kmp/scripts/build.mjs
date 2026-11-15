import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const gradleOut = path.join(root, "build/dist/js/productionLibrary");
const entry = path.join(dist, "sdk-kmp.mjs");

if (process.argv.includes("--if-missing") && existsSync(entry)) {
  process.exit(0);
}

const env = { ...process.env };
const homebrewJdk = "/opt/homebrew/opt/openjdk@21";
if (!env.JAVA_HOME && existsSync(homebrewJdk)) {
  env.JAVA_HOME = homebrewJdk;
}

const gradlew = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
const result = spawnSync(
  gradlew,
  ["jsBrowserProductionLibraryDistribution", "--console=plain", "-q"],
  {
    cwd: root,
    env,
    stdio: "inherit",
    shell: process.platform === "win32",
  },
);

if (result.error || result.status !== 0) {
  console.error(
    [
      "",
      "@meshtastic/sdk-kmp: the Gradle build failed.",
      "It needs JDK 21 (set JAVA_HOME, e.g. /opt/homebrew/opt/openjdk@21 on macOS) and",
      "org.meshtastic:sdk-core-js in a reachable Maven repository; see packages/sdk-kmp/README.md.",
      "",
    ].join("\n"),
  );
  process.exit(result.status ?? 1);
}

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
for (const name of readdirSync(gradleOut)) {
  if (name === "package.json") continue;
  cpSync(path.join(gradleOut, name), path.join(dist, name));
}
console.log(
  `@meshtastic/sdk-kmp: wrote ${readdirSync(dist).length} files to dist/`,
);
