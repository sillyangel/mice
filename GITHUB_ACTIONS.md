# GitHub Actions Docker Publishing Setup

This repository includes a GitHub Actions workflow that automatically builds and publishes Docker images to GitHub Container Registry (GHCR).

## Workflow Overview

The workflow (`/.github/workflows/publish-docker.yml`) automatically:

1. **Builds** the Docker image using multi-platform support (AMD64 and ARM64)
2. **Publishes** to `ghcr.io/sillyangel/mice`
3. **Tags** images appropriately based on git refs
4. **Caches** layers for faster subsequent builds
5. **Generates** build provenance attestations for security

## Trigger Conditions

The workflow runs on:

- **Push to main/master branch** → Creates `latest` tag
- **Push tags** (e.g., `2025.07.02`) → Creates date-based version tags
- **Pull requests** → Creates PR-specific tags for testing
- **Manual dispatch** → Can be triggered manually from GitHub UI

## Image Tags Generated

Based on different triggers, the workflow creates these tags:

### Main Branch Push

- `ghcr.io/sillyangel/mice:latest`

### Tag Push (e.g., `2025.07.02`)

- `ghcr.io/sillyangel/mice:2025.07.02`
- `ghcr.io/sillyangel/mice:latest`

### Pull Request

- `ghcr.io/sillyangel/mice:pr-123`

## Multi-Platform Support

The workflow builds for multiple architectures:

- `linux/amd64` (Intel/AMD 64-bit)
- `linux/arm64` (ARM 64-bit, Apple Silicon, etc.)

## Usage After Setup

Once the workflow is set up:

1. **Push to main** → New `latest` image published
2. **Create a release** → Versioned images published
3. **Users can pull**: `docker pull ghcr.io/sillyangel/mice:latest`

## Manual Image Building

You can also build and push manually:

```bash
# Build for multiple platforms
docker buildx build --platform linux/amd64,linux/arm64 \
  -t ghcr.io/sillyangel/mice:latest \
  --push .

# Login first (if needed)
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```
