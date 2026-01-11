#!/bin/bash
# Spector DR Simulation Script
# Usage: ./scripts/dr-simulation.sh [scenario]

set -e

PROJECT_ID="tough-bearing-478915-t7"
SERVICE_NAME="spector"
REGION="us-central1"
SERVICE_URL="https://spector-445znzcibq-uc.a.run.app"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "  Spector DR Simulation Tool"
echo "========================================"
echo ""

# Function to check service health
check_health() {
    echo -e "${YELLOW}Checking service health...${NC}"
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/app" --max-time 10 || echo "000")
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ]; then
        echo -e "${GREEN}✓ Service is healthy (HTTP $HTTP_CODE)${NC}"
        return 0
    else
        echo -e "${RED}✗ Service is unhealthy (HTTP $HTTP_CODE)${NC}"
        return 1
    fi
}

# Function to check database connectivity
check_database() {
    echo -e "${YELLOW}Checking database connectivity...${NC}"
    
    # This checks if Cloud SQL instance is running
    STATUS=$(gcloud sql instances describe spector-db --format="value(state)" 2>/dev/null || echo "UNKNOWN")
    
    if [ "$STATUS" = "RUNNABLE" ]; then
        echo -e "${GREEN}✓ Database is running${NC}"
        return 0
    else
        echo -e "${RED}✗ Database status: $STATUS${NC}"
        return 1
    fi
}

# Function to check Cloud Run service
check_cloudrun() {
    echo -e "${YELLOW}Checking Cloud Run service...${NC}"
    
    INSTANCE_COUNT=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.traffic[0].percent)" 2>/dev/null || echo "0")
    
    if [ "$INSTANCE_COUNT" = "100" ]; then
        echo -e "${GREEN}✓ Cloud Run service is receiving 100% traffic${NC}"
        return 0
    else
        echo -e "${RED}✗ Cloud Run traffic: $INSTANCE_COUNT%${NC}"
        return 1
    fi
}

# Function to run health check simulation
simulate_healthcheck() {
    echo ""
    echo "========================================"
    echo "  Running Health Check Simulation"
    echo "========================================"
    echo ""
    
    check_health
    check_database
    check_cloudrun
    
    echo ""
    echo -e "${GREEN}Health check simulation complete!${NC}"
}

# Function to run traffic spike simulation
simulate_traffic_spike() {
    echo ""
    echo "========================================"
    echo "  Running Traffic Spike Simulation"
    echo "========================================"
    echo ""
    
    if ! command -v locust &> /dev/null; then
        echo -e "${RED}Error: Locust is not installed. Run: pip3 install locust${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}Starting traffic spike test (50 users, 2 minutes)...${NC}"
    echo "Monitor at: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME/metrics?project=$PROJECT_ID"
    echo ""
    
    locust -f scripts/loadtest.py \
        --host=$SERVICE_URL \
        --users 50 \
        --spawn-rate 5 \
        --run-time 2m \
        --headless \
        --only-summary
    
    echo ""
    echo -e "${GREEN}Traffic spike simulation complete!${NC}"
    echo "Check metrics at: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME/metrics?project=$PROJECT_ID"
}

# Function to test failover (read-only)
simulate_failover_readonly() {
    echo ""
    echo "========================================"
    echo "  Failover Readiness Check (Read-Only)"
    echo "========================================"
    echo ""
    
    echo -e "${YELLOW}Checking current revision...${NC}"
    CURRENT_REVISION=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.traffic[0].revisionName)")
    echo "Current revision: $CURRENT_REVISION"
    
    echo ""
    echo -e "${YELLOW}Listing available revisions...${NC}"
    gcloud run revisions list --service=$SERVICE_NAME --region=$REGION --limit=5
    
    echo ""
    echo -e "${YELLOW}Checking backup database status...${NC}"
    gcloud sql backups list --instance=spector-db --limit=3 2>/dev/null || echo "No backups found or unable to list"
    
    echo ""
    echo -e "${GREEN}Failover readiness check complete!${NC}"
    echo ""
    echo "To rollback to a previous revision, run:"
    echo "  gcloud run services update-traffic $SERVICE_NAME --region=$REGION --to-revisions=REVISION_NAME=100"
}

# Function to check secrets
check_secrets() {
    echo ""
    echo "========================================"
    echo "  Secrets Health Check"
    echo "========================================"
    echo ""
    
    SECRETS=("SHOPIFY_API_SECRET" "DATABASE_URL" "ENCRYPTION_KEY" "UPSTASH_REDIS_REST_URL" "UPSTASH_REDIS_REST_TOKEN")
    
    for SECRET in "${SECRETS[@]}"; do
        VERSION=$(gcloud secrets versions list $SECRET --limit=1 --format="value(name)" 2>/dev/null || echo "NOT_FOUND")
        if [ "$VERSION" != "NOT_FOUND" ]; then
            echo -e "${GREEN}✓ $SECRET - Latest version exists${NC}"
        else
            echo -e "${RED}✗ $SECRET - Not found or no versions${NC}"
        fi
    done
    
    echo ""
    echo -e "${GREEN}Secrets check complete!${NC}"
}

# Function to generate DR report
generate_report() {
    echo ""
    echo "========================================"
    echo "  Generating DR Status Report"
    echo "========================================"
    echo ""
    
    REPORT_FILE="dr-report-$(date +%Y%m%d-%H%M%S).txt"
    
    {
        echo "Spector DR Status Report"
        echo "Generated: $(date)"
        echo "========================================"
        echo ""
        echo "Service Status:"
        gcloud run services describe $SERVICE_NAME --region=$REGION --format="table(status.url,status.conditions[0].status,status.traffic[0].percent)"
        echo ""
        echo "Recent Revisions:"
        gcloud run revisions list --service=$SERVICE_NAME --region=$REGION --limit=5 --format="table(name,status.conditions[0].status,spec.containers[0].resources.limits.memory)"
        echo ""
        echo "Database Status:"
        gcloud sql instances describe spector-db --format="table(name,state,settings.tier)"
        echo ""
        echo "Recent Backups:"
        gcloud sql backups list --instance=spector-db --limit=3 --format="table(id,startTime,status)"
    } > "$REPORT_FILE"
    
    echo -e "${GREEN}Report saved to: $REPORT_FILE${NC}"
    cat "$REPORT_FILE"
}

# Main menu
show_menu() {
    echo "Select a simulation to run:"
    echo ""
    echo "  1) Health Check - Check all services"
    echo "  2) Traffic Spike - Simulate high load (uses Locust)"
    echo "  3) Failover Check - Check rollback readiness (read-only)"
    echo "  4) Secrets Check - Verify all secrets exist"
    echo "  5) Generate Report - Create DR status report"
    echo "  6) Exit"
    echo ""
    read -p "Enter choice [1-6]: " choice
    
    case $choice in
        1) simulate_healthcheck ;;
        2) simulate_traffic_spike ;;
        3) simulate_failover_readonly ;;
        4) check_secrets ;;
        5) generate_report ;;
        6) echo "Goodbye!"; exit 0 ;;
        *) echo -e "${RED}Invalid choice${NC}"; show_menu ;;
    esac
}

# Handle command line arguments
if [ $# -eq 0 ]; then
    show_menu
else
    case $1 in
        health) simulate_healthcheck ;;
        traffic) simulate_traffic_spike ;;
        failover) simulate_failover_readonly ;;
        secrets) check_secrets ;;
        report) generate_report ;;
        *) echo "Usage: $0 [health|traffic|failover|secrets|report]"; exit 1 ;;
    esac
fi
