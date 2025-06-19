#!/usr/bin/env bun

/**
 * Unified binary build script for SignozMCP server
 * Supports building for specific platforms, current platform, or all platforms
 */

import { $ } from "bun";
import { existsSync, mkdirSync } from "fs";

interface BuildTarget {
  name: string;
  target: string;
  outfile: string;
  description: string;
}

const ALL_TARGETS: BuildTarget[] = [
  {
    name: "darwin-arm64",
    target: "bun-darwin-arm64", 
    outfile: "bin/signoz-mcp-darwin-arm64",
    description: "macOS ARM64 (M1/M2)"
  },
  {
    name: "darwin-x64",
    target: "bun-darwin-x64",
    outfile: "bin/signoz-mcp-darwin-x64", 
    description: "macOS Intel"
  },
  {
    name: "linux-x64",
    target: "bun-linux-x64",
    outfile: "bin/signoz-mcp-linux-x64",
    description: "Linux x64"
  },
  {
    name: "linux-arm64", 
    target: "bun-linux-arm64",
    outfile: "bin/signoz-mcp-linux-arm64",
    description: "Linux ARM64"
  },
  {
    name: "windows-x64",
    target: "bun-windows-x64", 
    outfile: "bin/signoz-mcp-windows-x64.exe",
    description: "Windows x64"
  }
];

function getCurrentTarget(): string {
  const platform = process.platform;
  const arch = process.arch;
  
  if (platform === 'darwin') {
    return `darwin-${arch}`;
  }
  if (platform === 'linux') {
    return `linux-${arch}`;
  }
  if (platform === 'win32') {
    return 'windows-x64'; // Assume x64 for Windows
  }
  
  throw new Error(`Unsupported platform: ${platform}-${arch}`);
}

function getTargetByName(name: string): BuildTarget | undefined {
  return ALL_TARGETS.find(t => t.name === name);
}

async function buildTarget(target: BuildTarget): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🔨 Building ${target.description}...`);
    
    const result = await $`bun build src/server.ts --compile --target=${target.target} --outfile=${target.outfile}`.quiet();
    
    if (result.exitCode === 0) {
      console.log(`✅ ${target.name}: Built successfully`);
      return { success: true };
    } else {
      const error = result.stderr.toString();
      console.error(`❌ ${target.name}: Build failed - ${error}`);
      return { success: false, error };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ ${target.name}: Build failed - ${errorMessage}`);
    return { success: false, error: errorMessage };
  }
}

async function runTypecheck(): Promise<void> {
  console.log("🔍 Running type check...");
  try {
    await $`bun run typecheck`.quiet();
    console.log("✅ Type check passed\n");
  } catch (error) {
    console.error("❌ Type check failed. Aborting build.");
    process.exit(1);
  }
}

async function buildTargets(targets: BuildTarget[]): Promise<void> {
  const targetCount = targets.length;
  const targetNames = targets.map(t => t.name).join(', ');
  
  if (targetCount === 1) {
    console.log(`🚀 Building SignozMCP server for ${targets[0].description}...\n`);
  } else {
    console.log(`🚀 Building SignozMCP server for ${targetCount} platforms: ${targetNames}...\n`);
  }
  
  // Ensure bin directory exists
  if (!existsSync("bin")) {
    mkdirSync("bin", { recursive: true });
  }
  
  await runTypecheck();
  
  // Build all targets in parallel
  const results = await Promise.allSettled(
    targets.map(target => buildTarget(target))
  );
  
  // Summary
  console.log("\n📊 Build Summary:");
  console.log("==================");
  
  let successCount = 0;
  let failureCount = 0;
  
  results.forEach((result, index) => {
    const target = targets[index];
    if (result.status === "fulfilled" && result.value.success) {
      console.log(`✅ ${target.name.padEnd(15)} - ${target.description}`);
      successCount++;
    } else {
      const error = result.status === "rejected" 
        ? result.reason 
        : result.value.error;
      console.log(`❌ ${target.name.padEnd(15)} - Failed: ${error}`);
      failureCount++;
    }
  });
  
  console.log(`\n🎯 Results: ${successCount} successful, ${failureCount} failed`);
  
  if (failureCount > 0) {
    console.log("\n⚠️  Some builds failed, but successful builds are available in bin/");
    process.exit(1);
  } else {
    if (targetCount === 1) {
      console.log(`\n🎉 Build completed successfully!`);
    } else {
      console.log(`\n🎉 All ${targetCount} builds completed successfully!`);
    }
    
    // Update release config if in CI and all builds succeeded
    await updateReleaseConfig();
  }
}

/**
 * Update .releaserc.json with specific asset paths and labels when running in CI
 */
async function updateReleaseConfig(): Promise<void> {
  if (!process.env.CI && !process.env.GITHUB_ACTIONS) {
    return; // Only run in CI environment
  }

  console.log("\n📝 Updating .releaserc.json with asset labels for CI...");
  
  try {
    const configPath = ".releaserc.json";
    const configFile = Bun.file(configPath);
    const config = await configFile.json();
    
    // Find the @semantic-release/github plugin configuration
    const githubPlugin = config.plugins.find((plugin: any) => {
      if (Array.isArray(plugin) && plugin[0] === "@semantic-release/github") {
        return true;
      }
      return false;
    });
    
    if (!githubPlugin || !Array.isArray(githubPlugin)) {
      console.log("⚠️  Could not find @semantic-release/github plugin configuration");
      return;
    }
    
    // Update the assets with specific paths and friendly labels
    githubPlugin[1].assets = ALL_TARGETS.map(target => ({
      path: target.outfile,
      label: target.description
    }));
    
    // Write the updated config back
    await Bun.write(configPath, JSON.stringify(config, null, 2));
    console.log("✅ Updated .releaserc.json with specific asset labels");
    
  } catch (error) {
    console.error("❌ Failed to update .releaserc.json:", error);
    // Don't fail the build if this fails
  }
}

function showHelp(): void {
  console.log(`
SignozMCP Unified Build Script

Usage:
  bun scripts/build.ts                     # Build all platforms
  bun scripts/build.ts --local             # Build current platform only
  bun scripts/build.ts <targets...>        # Build specific platforms

Examples:
  bun scripts/build.ts                     # All platforms
  bun scripts/build.ts --local             # Current platform (${getCurrentTarget()})
  bun scripts/build.ts darwin-arm64        # Single platform
  bun scripts/build.ts linux-x64 windows-x64  # Multiple platforms

Available targets:
${ALL_TARGETS.map(t => `  ${t.name.padEnd(15)} - ${t.description}`).join('\n')}

Options:
  --help, -h    Show this help message
  --local       Build for current platform only
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  // Handle help
  if (args.includes("--help") || args.includes("-h")) {
    showHelp();
    process.exit(0);
  }
  
  let targetsToBuild: BuildTarget[];
  
  if (args.length === 0) {
    // No arguments: build all platforms
    targetsToBuild = ALL_TARGETS;
  } else if (args.includes("--local")) {
    // --local flag: build current platform only
    const currentTargetName = getCurrentTarget();
    const currentTarget = getTargetByName(currentTargetName);
    
    if (!currentTarget) {
      console.error(`❌ Current platform ${currentTargetName} is not supported.`);
      console.error(`Supported targets: ${ALL_TARGETS.map(t => t.name).join(', ')}`);
      process.exit(1);
    }
    
    targetsToBuild = [currentTarget];
  } else {
    // Specific target names provided
    targetsToBuild = [];
    const invalidTargets: string[] = [];
    
    for (const arg of args) {
      const target = getTargetByName(arg);
      if (target) {
        targetsToBuild.push(target);
      } else {
        invalidTargets.push(arg);
      }
    }
    
    if (invalidTargets.length > 0) {
      console.error(`❌ Invalid targets: ${invalidTargets.join(', ')}`);
      console.error(`Supported targets: ${ALL_TARGETS.map(t => t.name).join(', ')}`);
      process.exit(1);
    }
    
    if (targetsToBuild.length === 0) {
      console.error("❌ No valid targets specified.");
      showHelp();
      process.exit(1);
    }
  }
  
  await buildTargets(targetsToBuild);
}

await main();