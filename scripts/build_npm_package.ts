import { build, emptyDir } from "@deno/dnt";
import { join } from "jsr:@std/path@1/join";

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
  console.error("Usage: deno task publish:npm <path-to-package>");
  console.error(
    "Example: deno task publish:npm packages/core",
  );
  Deno.exit(1);
}

const packagePath = Deno.args[0];
const denoJsonPath = join(packagePath, "deno.json");
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
    shims: {
      deno: true,
    },
    package: {
      name,
      version,
      description,
      license: "MIT",
      repository: {
        type: "git",
        url: "git+https://github.com/meshtastic/web.git",
      },
      bugs: {
        url: "https://github.com/meshtastic/web/issues",
      },
    },
    compilerOptions: {
      lib: ["ES2022", "DOM"],
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

// // 5. Publish to NPM (only during adhoc runs)
// // After a successful build, we publish the package to the npm registry.
// if (Deno.env.get("GITHUB_ACTIONS") !== "true") {
//   console.log(
//     `\nPublishing ${name}@${version} to npm...`,
//   );
//   try {
//     const command = new Deno.Command("npm", {
//       args: ["publish", "--access", "public"],
//       cwd: outDir, // Run the command in the output directory
//     });
//     const { code, stdout, stderr } = await command.output();

//     // Write command output to the console
//     await Deno.stdout.write(stdout);
//     await Deno.stderr.write(stderr);

//     if (code !== 0) {
//       throw new Error(`'npm publish' failed with exit code: ${code}`);
//     }
//     console.log(`✅ Successfully published ${name}@${version} to npm.`);
//   } catch (error) {
//     if (error instanceof Deno.errors.NotFound) {
//       console.error("\n❌ Publishing failed:", error.message);
//       Deno.exit(1);
//     }
//   }
// } else {
//   console.log("\nSkipping publish step: Not running in GitHub Actions CI.");
// }
