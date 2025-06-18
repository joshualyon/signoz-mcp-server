# Development Guide

## Release Process

This project uses automated semantic releases triggered by PR merges to main.

### Automated Release Flow

1. **Create PR** with conventional commits:
   - `feat: add new feature` → minor version bump (1.0.0 → 1.1.0)
   - `fix: resolve bug` → patch version bump (1.0.0 → 1.0.1)
   - `feat!: breaking change` → major version bump (1.0.0 → 2.0.0)
   - `chore:`, `docs:`, `style:`, `refactor:`, `test:` → no version bump

2. **Merge PR to main** → Triggers `release.yml` workflow:
   - Analyzes commits using semantic-release
   - Determines version bump based on commit types
   - Updates `CHANGELOG.md` with changes
   - Updates `package.json` version
   - Commits changes with `[skip ci]` to avoid loops
   - Creates git tag (e.g., `v1.1.0`)
   - Creates **draft** GitHub release with notes
   - Pushes tag to repository

3. **Tag push** → Triggers `build-binaries.yml` workflow:
   - Builds binaries for all platforms (darwin, linux, windows)
   - Uploads binaries to the draft release
   - Publishes the release (no longer draft)

### Testing Release Logic Locally

**⚠️ WARNING**: Never run `bunx semantic-release` without `--dry-run` locally!

```bash
# Safe: Preview what version would be released
bunx semantic-release --dry-run

# See what commits would trigger a release
bunx semantic-release --dry-run --debug

# Dangerous: Would actually create commits, tags, and releases
bunx semantic-release  # ❌ DON'T DO THIS LOCALLY
```

### Manual Release Process

For emergency releases or when automation fails:

```bash
# 1. Update version in package.json manually
# 2. Update CHANGELOG.md manually
# 3. Commit changes
git add package.json CHANGELOG.md
git commit -m "chore(release): 1.0.1"

# 4. Create and push tag
git tag v1.0.1
git push origin main v1.0.1

# The tag push will trigger the build-binaries workflow
```

## Build System

### Unified Build Script

The project uses a unified build script (`scripts/build.ts`) that handles all build scenarios:

```bash
# Package.json scripts
bun run build              # Build for current platform only
bun run build:binary       # Same as above
bun run build:binary:all   # Build for all platforms

# Direct script usage
bun scripts/build.ts --help                # Show help and available targets
bun scripts/build.ts --local               # Current platform only
bun scripts/build.ts                       # All platforms (default)
bun scripts/build.ts darwin-arm64          # Specific platform
bun scripts/build.ts linux-x64 windows-x64 # Multiple platforms
```

### Available Build Targets

- `darwin-arm64` - macOS ARM64 (M1/M2)
- `darwin-x64` - macOS Intel
- `linux-x64` - Linux x64
- `linux-arm64` - Linux ARM64  
- `windows-x64` - Windows x64

### Build Output

All binaries are output to the `bin/` directory:
```
bin/
├── signoz-mcp-darwin-arm64
├── signoz-mcp-darwin-x64
├── signoz-mcp-linux-arm64
├── signoz-mcp-linux-x64
└── signoz-mcp-windows-x64.exe
```

Note: The `bin/` directory is gitignored and should not be committed.

## Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Examples:**
- `feat: add metrics discovery tool`
- `fix: resolve timestamp conversion bug`
- `docs: update configuration guide`
- `chore: update dependencies`
- `feat!: change API interface` (breaking change)

## CI/CD Workflows

### GitHub Actions

The project uses two GitHub Actions workflows:

1. **`.github/workflows/release.yml`**
   - Triggers: On PR merge to main
   - Purpose: Version management and release creation
   - Actions:
     - Runs semantic-release to analyze commits
     - Updates version, CHANGELOG.md
     - Creates draft GitHub release
     - Pushes git tag

2. **`.github/workflows/build-binaries.yml`**
   - Triggers: On tag push (`v*`) or manual dispatch
   - Purpose: Build and publish binaries
   - Actions:
     - Builds binaries for all platforms
     - Uploads to draft release and publishes
     - Or uploads as artifacts for manual testing

### Manual Workflow Dispatch

You can manually trigger the build workflow from GitHub Actions:
1. Go to Actions → "Build Cross-Platform Binaries"
2. Click "Run workflow"
3. Binaries will be available as artifacts (not released)

## Testing

```bash
# Run all tests
bun test

# Run specific test suites
bun run test:unit          # Unit tests only
bun run test:integration   # Integration tests only
bun run test:ui            # Vitest UI for interactive testing

# Run tests in watch mode
bun run test:watch

# Type checking
bun run typecheck
```

### Test Organization

- `test/*.test.ts` - Unit tests
- `test/*.integration.test.ts` - Integration tests (require SIGNOZ_API_KEY)
- `test/test-utils.ts` - Shared testing utilities

## Dependencies

### Managing Dependencies

```bash
# Add a new dependency
bun add <package>

# Add a dev dependency
bun add -d <package>

# Update dependencies
bun update

# Update specific package
bun update <package>
```

### Semantic Release Dependencies

The semantic-release plugins are locked in `package.json` to ensure consistent releases:
- `semantic-release` - Core engine
- `@semantic-release/commit-analyzer` - Analyzes commits
- `@semantic-release/release-notes-generator` - Generates notes
- `@semantic-release/changelog` - Updates CHANGELOG.md
- `@semantic-release/git` - Commits changes back
- `@semantic-release/github` - Creates draft releases

## Troubleshooting

### Release Issues

**No release created after PR merge:**
- Check commit messages follow conventional format
- Verify PR was merged to `main` branch
- Check Actions tab for workflow errors

**Build workflow not triggered:**
- Ensure tag follows `v*` pattern (e.g., `v1.0.0`)
- Check workflow permissions in repository settings

**Binary build failures:**
- Run `bun run typecheck` locally
- Test build locally with `bun run build:binary:all`
- Check GitHub Actions logs for specific errors