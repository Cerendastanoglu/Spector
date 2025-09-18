import { json } from "@remix-run/node";
import type { ActionFunction, LoaderFunction } from "@remix-run/node";

export const loader: LoaderFunction = async ({ request: _request }) => {
  return json({ message: "Webflow Integration API endpoint" });
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const action = formData.get("action");

  switch (action) {
    case "setup-webflow-alerts": {
      try {
        const webflowConfigData = formData.get("webflowConfig");
        if (!webflowConfigData) {
          return json({ error: "Webflow configuration is required" }, { status: 400 });
        }
        
        const webflowConfig = JSON.parse(webflowConfigData as string);
        
        // Mock setting up Webflow customer alerts
        console.log("Setting up Webflow customer alerts:", webflowConfig);
        
        return json({ 
          success: true, 
          message: "Webflow customer alerts activated successfully",
          config: webflowConfig
        });
      } catch (error) {
        console.error("Failed to setup Webflow alerts:", error);
        return json({ error: "Invalid Webflow configuration format" }, { status: 400 });
      }
    }
    case "test-webflow-connection": {
      try {
        const siteId = formData.get("siteId");
        const token = formData.get("token");
        
        if (!siteId || !token) {
          return json({ error: "Site ID and token are required" }, { status: 400 });
        }
        
        // Mock testing Webflow connection
        return json({ 
          success: true, 
          message: "Webflow connection test successful",
          siteId,
          connected: true
        });
      } catch (error) {
        console.error("Webflow connection test failed:", error);
        return json({ error: "Connection test failed" }, { status: 500 });
      }
    }
    case "get-webflow-status": {
      // Mock getting Webflow integration status
      return json({
        success: true,
        status: "active",
        lastSync: new Date().toISOString(),
        alertsSent: 42,
        customersNotified: 28
      });
    }
    default:
      return json({ error: "Invalid action" }, { status: 400 });
  }
};
