import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { sendTestEmail, sendInventoryAlert, type InventoryAlert } from "../services/email.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { admin: _admin, session } = await authenticate.admin(request);
  
  if (!session?.shop) {
    return json({ error: "No shop session found" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const actionType = formData.get("action") as string;

    switch (actionType) {
      case "send-test-email": {
        const email = formData.get("email") as string;
        
        if (!email) {
          return json({ error: "Email is required" }, { status: 400 });
        }

        const result = await sendTestEmail(email, session.shop);
        
        if (result.success) {
          return json({ 
            success: true, 
            message: "Test email sent successfully!",
            emailId: result.id 
          });
        } else {
          return json({ 
            error: `Failed to send test email: ${result.error}` 
          }, { status: 500 });
        }
      }

      case "send-inventory-alert": {
        const emailsStr = formData.get("emails") as string;
        const alertsStr = formData.get("alerts") as string;
        
        if (!emailsStr || !alertsStr) {
          return json({ error: "Emails and alerts are required" }, { status: 400 });
        }

        try {
          const emails = JSON.parse(emailsStr) as string[];
          const alerts = JSON.parse(alertsStr) as InventoryAlert[];

          const result = await sendInventoryAlert({
            to: emails,
            shopName: session.shop,
            alerts
          });

          if (result.success) {
            return json({ 
              success: true, 
              message: `Inventory alert sent to ${emails.length} recipient(s)`,
              emailId: result.id 
            });
          } else {
            return json({ 
              error: `Failed to send inventory alert: ${result.error}` 
            }, { status: 500 });
          }
        } catch (parseError) {
          return json({ 
            error: "Invalid JSON format in request" 
          }, { status: 400 });
        }
      }

      default:
        return json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Email API error:", error);
    return json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
};