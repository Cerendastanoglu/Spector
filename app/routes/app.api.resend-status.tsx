import { json } from "@remix-run/node";
import type { ActionFunction, LoaderFunction } from "@remix-run/node";

export const loader: LoaderFunction = async ({ request: _request }) => {
  // Mock Resend email service status
  const status = {
    service: "resend",
    status: "operational",
    lastChecked: new Date().toISOString(),
    apiKey: process.env.RESEND_API_KEY ? "configured" : "not_configured",
    emailsSent: 42,
    emailsDelivered: 40,
    emailsFailed: 2,
    lastEmail: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
  };

  return json({ status });
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const action = formData.get("action");

  switch (action) {
    case "test_email": {
      const email = formData.get("email");
      // Mock sending test email
      return json({ 
        success: true, 
        message: `Test email sent to ${email}`,
        emailId: `test_${Date.now()}`
      });
    }
    case "check_status": {
      // Mock checking service status
      return json({ 
        success: true, 
        status: "operational",
        lastChecked: new Date().toISOString()
      });
    }
    case "reset_stats": {
      // Mock resetting email statistics
      return json({ 
        success: true, 
        message: "Email statistics reset",
        stats: { sent: 0, delivered: 0, failed: 0 }
      });
    }
    default:
      return json({ error: "Invalid action" }, { status: 400 });
  }
};
