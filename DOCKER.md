# Docker Deployment

This application can be easily deployed using Docker with configurable environment variables.

## Quick Start

### Using Docker Run

```bash
# Run using pre-built image (app will prompt for Navidrome config)
docker run -p 3000:3000 ghcr.io/sillyangel/mice:latest

# Or build locally
docker build -t mice .
docker run -p 3000:3000 mice

# Run with pre-configured Navidrome settings
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_NAVIDROME_URL=http://your-navidrome-server:4533 \
  -e NEXT_PUBLIC_NAVIDROME_USERNAME=your_username \
  -e NEXT_PUBLIC_NAVIDROME_PASSWORD=your_password \
  -e PORT=3000 \
  ghcr.io/sillyangel/mice:latest
```

### Using Docker Compose

1. Copy the environment template:

   ```bash
   cp .env.docker .env
   ```

2. Edit `.env` with your configuration:

   ```bash
   nano .env
   ```

3. Start the application:

   ```bash
   docker-compose up -d
   ```

**Note**: The default docker-compose.yml uses the pre-built image `ghcr.io/sillyangel/mice:latest`.

For local development, you can use the override example:

```bash
cp docker-compose.override.yml.example docker-compose.override.yml
# This will build locally instead of using the pre-built image
```

## Configuration Options

All configuration is done through environment variables. If Navidrome server configuration is not provided via environment variables, the application will automatically prompt you to configure it within the client interface.

### Optional Variables

- `NEXT_PUBLIC_NAVIDROME_URL`: URL of your Navidrome server (optional - app will prompt if not set)
- `NEXT_PUBLIC_NAVIDROME_USERNAME`: Navidrome username (optional - app will prompt if not set)
- `NEXT_PUBLIC_NAVIDROME_PASSWORD`: Navidrome password (optional - app will prompt if not set)
- `PORT`: Port for the application to listen on (default: `3000`)
- `HOST_PORT`: Host port to map to container port (docker-compose only, default: `3000`)
- `NEXT_PUBLIC_POSTHOG_KEY`: PostHog analytics key (optional)
- `NEXT_PUBLIC_POSTHOG_HOST`: PostHog analytics host (optional)

## Examples

### Basic Setup (App will prompt for configuration)

```bash
# Using pre-built image - app will ask for Navidrome server details on first launch
docker run -p 3000:3000 ghcr.io/sillyangel/mice:latest

# Or build locally
docker build -t mice .
docker run -p 3000:3000 mice
```

### Pre-configured Development Setup

```bash
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_NAVIDROME_URL=http://localhost:4533 \
  -e NEXT_PUBLIC_NAVIDROME_USERNAME=admin \
  -e NEXT_PUBLIC_NAVIDROME_PASSWORD=admin \
  ghcr.io/sillyangel/mice:latest
```

### Pre-configured Production Setup

```bash
docker run -p 80:3000 \
  -e NEXT_PUBLIC_NAVIDROME_URL=https://music.yourdomain.com \
  -e NEXT_PUBLIC_NAVIDROME_USERNAME=your_user \
  -e NEXT_PUBLIC_NAVIDROME_PASSWORD=your_secure_password \
  -e PORT=3000 \
  --restart unless-stopped \
  ghcr.io/sillyangel/mice:latest
```

### Using Environment File

#### Option 1: Let the app prompt for configuration

Create a minimal `.env` file:

```env
PORT=3000
HOST_PORT=80
```

#### Option 2: Pre-configure Navidrome settings

Create a `.env` file with Navidrome configuration:

```env
NAVIDROME_URL=https://music.yourdomain.com
NAVIDROME_USERNAME=your_user
NAVIDROME_PASSWORD=your_secure_password
PORT=3000
HOST_PORT=80
```

Then run either way:

```bash
docker-compose up -d
```

## Health Check

The Docker Compose setup includes a health check that verifies the application is responding correctly. You can check the health status with:

```bash
docker-compose ps
```

## Troubleshooting

### Common Issues

1. **Connection refused**: Ensure your Navidrome server is accessible from the Docker container
2. **Authentication failed**: Verify your username and password are correct
3. **Port conflicts**: Change the `HOST_PORT` if port 3000 is already in use

### Logs

View application logs:

```bash
# Docker run
docker logs <container_name>

# Docker compose
docker-compose logs -f mice
```

### Container Shell Access

Access the container for debugging:

```bash
# Docker run
docker exec -it <container_name> sh

# Docker compose
docker-compose exec mice sh
```
