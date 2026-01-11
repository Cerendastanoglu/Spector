"""
Spector Load Testing Script using Locust
Run with: locust -f scripts/loadtest.py --host=https://spector-260800553724.us-central1.run.app

For headless mode (CI/CD):
locust -f scripts/loadtest.py --host=https://spector-260800553724.us-central1.run.app \
    --users 100 --spawn-rate 10 --run-time 5m --headless
"""

from locust import HttpUser, task, between
import random


class SpectorUser(HttpUser):
    """Simulates a Shopify merchant using Spector"""
    
    # Wait 1-3 seconds between tasks (realistic user behavior)
    wait_time = between(1, 3)
    
    # Simulated Shopify session headers
    def on_start(self):
        """Called when a user starts - set up headers"""
        self.client.headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
    
    @task(10)  # Weight: 10 (most common)
    def load_app_home(self):
        """Simulate loading the main app page"""
        self.client.get("/app", name="App Home")
    
    @task(5)  # Weight: 5
    def load_products_api(self):
        """Simulate fetching products"""
        self.client.get("/app/api/products", name="Products API")
    
    @task(3)  # Weight: 3
    def load_analytics_api(self):
        """Simulate fetching product analytics"""
        self.client.get("/app/api/product-analytics", name="Analytics API")
    
    @task(3)  # Weight: 3
    def load_forecasting_api(self):
        """Simulate fetching inventory forecasting"""
        self.client.get("/app/api/inventory-forecasting", name="Forecasting API")
    
    @task(1)  # Weight: 1 (less common)
    def load_settings(self):
        """Simulate loading settings page"""
        self.client.get("/app/settings", name="Settings")


class HighLoadUser(HttpUser):
    """Simulates high-frequency API calls (bulk operations)"""
    
    wait_time = between(0.5, 1)  # Faster requests
    
    @task
    def bulk_product_fetch(self):
        """Simulate bulk product operations"""
        self.client.get("/app/api/products", name="Bulk Products")


# Run configuration tips:
# 
# Light load test (10 users):
#   locust -f scripts/loadtest.py --host=https://spector-260800553724.us-central1.run.app --users 10 --spawn-rate 2 --run-time 2m --headless
#
# Medium load test (50 users):
#   locust -f scripts/loadtest.py --host=https://spector-260800553724.us-central1.run.app --users 50 --spawn-rate 5 --run-time 5m --headless
#
# Heavy load test (100 users):
#   locust -f scripts/loadtest.py --host=https://spector-260800553724.us-central1.run.app --users 100 --spawn-rate 10 --run-time 10m --headless
#
# Web UI mode (interactive):
#   locust -f scripts/loadtest.py --host=https://spector-260800553724.us-central1.run.app
#   Then open http://localhost:8089
