import { build, emptyDir } from "https://jsr.io/@deno/dnt/0.42.3/mod.ts";
import { join } from "https://jsr.io/@std/path/1.1.1/mod.ts";

interface DenoJsonConfig {
  name: string;
  version: string;
  description: string;
  imports?: Record<string, string>;
  exports?: Record<string, string>;
}

async function getJson(filePath: string) {
  try {
    return JSON.parse(await Deno.readTextFile(filePath));
  } catch (e) {
    if (e instanceof Error) {
      throw new Error(`Error reading or parsing ${filePath}: ${e.message}`);
    }
  }
}

if (Deno.args.length !== 1) {
  console.error("Usage: deno task build:npm <path-to-package>");
  console.error("Example: deno task build:npm packages/core");
  Deno.exit(1);
}

const packagePath = Deno.args[0];
const denoJsonPath = join(packagePath, "package.json");
const outDir = join(packagePath, "npm");

// Read the deno.json file to get the package metadata.
let jsonContent: DenoJsonConfig;

try {
  jsonContent = await getJson(denoJsonPath);
} catch (error) {
  console.log(`Error reading or parsing ${denoJsonPath}:`, error);

  if (error instanceof Deno.errors.NotFound) {
    console.error(`Error: Config file not found at ${denoJsonPath}`);
  } else {
    console.error(`Error reading or parsing ${denoJsonPath}:`, error);
  }
  Deno.exit(1);
}

const { name, version, description } = jsonContent;

if (!name || !version || !description) {
  console.error(
    `Error: 'name', 'version', and 'description' must be defined in ${denoJsonPath}`,
  );
  Deno.exit(1);
}

console.log(`Building ${name}@${version} from ${packagePath}...`);

// Clean the output directory before building.
await emptyDir(outDir);

try {
  await build({
    entryPoints: [join(packagePath, "mod.ts")],
    outDir,
    test: false,
    esModule: true,
    declaration: false,
    shims: {
      deno: true,
    },
    package: {
      name,
      version,
      description,
      license: "GPL-3.0-only",
      repository: {
        type: "git",
        url: "git+https://github.com/meshtastic/web.git",
      },
      bugs: {
        url: "https://github.com/meshtastic/web/issues",
      },
    },
    compilerOptions: {
      lib: ["DOM", "ESNext"],
    },
    postBuild() {
      Deno.copyFileSync("LICENSE", join(outDir, "LICENSE"));
      Deno.copyFileSync(
        join(packagePath, "README.md"),
        join(outDir, "README.md"),
      );
    },
  });
} catch (error) {
  console.error(`Error building ${name}@${version}:`, error);
  Deno.exit(1);
}

console.log(`✅ Successfully built ${name}@${version} to ${outDir}`);
