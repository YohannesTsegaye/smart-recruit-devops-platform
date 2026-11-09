# Docker Swarm deployment

This file documents the Swarm stack used for a production-like deployment. The
database and Redis are single replicas with node-local named volumes; back up
PostgreSQL and pin those services to nodes with persistent storage before using
this layout for production data.

## Build and publish images

Use a registry address accessible to every Swarm node. The frontend image embeds
its API base URL during the build, so use the externally reachable API URL, not a
container-only DNS name:

```powershell
$env:REGISTRY = "ghcr.io/your-org"
$env:IMAGE_TAG = "phase2"
$env:API_URL = "https://api.example.com"
docker login ghcr.io
docker build --target production -t "$env:REGISTRY/smart-recruit-backend:$env:IMAGE_TAG" -f smart-recruit-backend/Dockerfile smart-recruit-backend
docker build --target production --build-arg "VITE_API_URL=$env:API_URL" -t "$env:REGISTRY/smart-recruit-frontend:$env:IMAGE_TAG" -f smart-recruit-frontend/Dockerfile smart-recruit-frontend
docker push "$env:REGISTRY/smart-recruit-backend:$env:IMAGE_TAG"
docker push "$env:REGISTRY/smart-recruit-frontend:$env:IMAGE_TAG"
```

## Initialize Swarm and create secrets

Run `docker swarm init` once on the intended manager. Keep secret source files
outside the repository with restrictive filesystem permissions; fetch their
contents from Vault or another approved secret manager. Do not put their values
in `.env`, command-line arguments, or Git.

```powershell
docker node update --label-add smart-recruit-data=true <manager-node-id>
docker secret create smart-recruit-db-password C:\secure\smart-recruit\db-password
docker secret create smart-recruit-jwt-secret C:\secure\smart-recruit\jwt-secret
```

The node label pins PostgreSQL and Redis to a manager node with persistent
storage. In a multi-node cluster, use a dedicated storage-backed node and
configure a suitable placement policy before moving these stateful services.

The stack only references the external secret names and mounts their content in
the backend and PostgreSQL containers at `/run/secrets`. The backend resolves
`DB_PASSWORD_FILE` and `JWT_SECRET_FILE` at startup.

## Deploy and inspect

Set `REGISTRY`, `IMAGE_TAG`, `FRONTEND_URL`, `POSTGRES_USER`, and
`POSTGRES_DB` in the manager shell. `API_URL` is used only during the frontend
image build. Then deploy:

```powershell
$env:REGISTRY = "ghcr.io/your-org"
$env:IMAGE_TAG = "phase2"
$env:FRONTEND_URL = "https://app.example.com"
$env:POSTGRES_USER = "smart_recruit"
$env:POSTGRES_DB = "smart_recruit"
docker stack config -c docker/swarm-stack.yml
docker stack deploy --with-registry-auth -c docker/swarm-stack.yml smart-recruit
docker stack services smart-recruit
docker service ps smart-recruit_backend
```

The frontend is published on port 8080 and the API on port 5000. Configure TLS
and public hostnames at the reverse proxy/load balancer; the Swarm stack itself
does not terminate HTTPS. The reverse-proxy and certificate setup is covered by
the infrastructure phase.

To update images, push a new immutable `IMAGE_TAG` and redeploy with that tag.
The backend and frontend have two replicas, health checks, rolling updates, and
resource bounds. PostgreSQL/Redis intentionally remain single-replica stateful
services rather than pretending a replica count alone provides safe database
high availability.
