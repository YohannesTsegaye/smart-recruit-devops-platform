# Prometheus & Grafana Metrics Setup Guide

This guide explains how to expose and monitor metrics from the Smart Recruit application using Prometheus and Grafana.

## Overview

The application now exposes metrics at the `/metrics` endpoint that Prometheus can scrape. The following metrics are available:

- **HTTP Request Metrics**: Duration, total requests, and error counts
- **Application Metrics**: Job posts, candidates, and users counts
- **Connection Metrics**: Active and database connections

## Quick Start

### 1. Start the Application

Make sure your NestJS backend is running:

```bash
cd backend
npm run start:dev
```

The application will be available at `http://localhost:5000` and metrics at `http://localhost:5000/metrics`

### 2. Start Prometheus

#### Option A: Using Docker

```bash
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  -v "$(pwd)/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml" \
  prom/prometheus
```

#### Option B: Using Docker Compose

The `docker-compose.yml` file includes Prometheus and Grafana services. Run:

```bash
docker-compose up -d prometheus grafana
```

#### Option C: Local Installation

If you installed Prometheus locally:

```bash
prometheus --config.file=prometheus/prometheus.yml
```

Prometheus will be available at `http://localhost:9090`

### 3. Start Grafana

#### Option A: Using Docker

```bash
docker run -d \
  --name grafana \
  -p 3000:3000 \
  -v "$(pwd)/grafana/provisioning:/etc/grafana/provisioning" \
  -e "GF_SECURITY_ADMIN_PASSWORD=admin" \
  grafana/grafana
```

#### Option B: Using Docker Compose

```bash
docker-compose up -d grafana
```

#### Option C: Local Installation

If you installed Grafana locally, start the service and the datasource will be automatically configured from `grafana/provisioning/datasources/prometheus.yml`

Grafana will be available at `http://localhost:3000` (default credentials: admin/admin)

## Configuration

### Prometheus Configuration

The Prometheus configuration is located at `backend/prometheus/prometheus.yml`. 

**Important**: If Prometheus is running in Docker and your app is running locally, use `host.docker.internal:5000` as the target. If both are running locally, use `localhost:5000`.

### Grafana Configuration

The Grafana datasource is automatically provisioned from `backend/grafana/provisioning/datasources/prometheus.yml`.

**Important**: If Grafana is running in Docker and Prometheus is running locally, use `host.docker.internal:9090` as the Prometheus URL. If both are running locally, use `http://localhost:9090`.

## Available Metrics

### HTTP Metrics

- `http_request_duration_seconds` - Histogram of HTTP request durations
- `http_requests_total` - Counter of total HTTP requests
- `http_request_errors_total` - Counter of HTTP errors (status >= 400)

### Application Metrics

- `job_posts_total` - Gauge of total job posts (by status)
- `candidates_total` - Gauge of total candidates (by status)
- `users_total` - Gauge of total users (by role)

### System Metrics

- `active_connections` - Gauge of active connections
- `database_connections` - Gauge of database connections

## Testing the Setup

1. **Verify Metrics Endpoint**: Visit `http://localhost:5000/metrics` - you should see Prometheus-formatted metrics

2. **Verify Prometheus**: Visit `http://localhost:9090` and check:
   - Status → Targets: Should show "smart-recruit-backend" as UP
   - Graph: Try querying `http_requests_total`

3. **Verify Grafana**: Visit `http://localhost:3000`:
   - Login with admin/admin (or your configured password)
   - Go to Configuration → Data Sources
   - Verify "Prometheus" datasource is configured and working
   - Create a new dashboard and add panels with queries like:
     - `rate(http_requests_total[5m])` - Request rate
     - `histogram_quantile(0.95, http_request_duration_seconds_bucket)` - 95th percentile latency

## Example Grafana Queries

### Request Rate
```
rate(http_requests_total[5m])
```

### Error Rate
```
rate(http_request_errors_total[5m])
```

### Request Duration (95th percentile)
```
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

### Total Job Posts
```
job_posts_total
```

### Total Candidates
```
candidates_total
```

## Troubleshooting

### Prometheus can't scrape metrics

1. Check that your app is running and accessible
2. Verify the target URL in `prometheus.yml` matches your setup:
   - Docker → Docker: Use service name (e.g., `backend:5000`)
   - Docker → Local: Use `host.docker.internal:5000`
   - Local → Local: Use `localhost:5000`
3. Check Prometheus targets page: `http://localhost:9090/targets`

### Grafana can't connect to Prometheus

1. Verify Prometheus is running and accessible
2. Check the URL in `grafana/provisioning/datasources/prometheus.yml`
3. Test the connection in Grafana: Configuration → Data Sources → Prometheus → Save & Test

### No metrics appearing

1. Make some HTTP requests to your application to generate metrics
2. Check the `/metrics` endpoint directly: `http://localhost:5000/metrics`
3. Verify the interceptor is working by checking application logs

## Next Steps

- Create custom Grafana dashboards for your application
- Set up alerting rules in Prometheus
- Add more custom metrics specific to your business logic
- Monitor database query performance
- Track authentication failures

