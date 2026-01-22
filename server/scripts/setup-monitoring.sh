#!/bin/bash

echo "📊 Setting up monitoring stack..."

mkdir -p monitoring/prometheus
mkdir -p monitoring/grafana/provisioning/datasources
mkdir -p monitoring/grafana/provisioning/dashboards
mkdir -p monitoring/alertmanager
mkdir -p monitoring/grafana/dashboards

echo "✅ Directories created"

echo "🚀 Starting monitoring stack..."
docker-compose -f docker-compose.monitoring.yml up -d

echo "✨ Monitoring stack started!"
echo ""
echo "📈 Access URLs:"
echo "  Prometheus:  http://localhost:9090"
echo "  Grafana:     http://localhost:3000 (admin/admin)"
echo "  AlertManager: http://localhost:9093"
echo ""
echo "📊 API Metrics: http://localhost:5000/api/v1/metrics"