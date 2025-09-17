import { Resend } from 'resend';

// Initialize Resend with API key from environment
const resend = new Resend(process.env.RESEND_API_KEY);

export interface InventoryAlert {
  productTitle: string;
  variantTitle?: string;
  currentStock: number;
  threshold: number;
  productUrl?: string;
  shopName: string;
}

export interface EmailNotification {
  to: string[];
  shopName: string;
  alerts: InventoryAlert[];
}

/**
 * Send individual inventory alert email
 */
export async function sendInventoryAlert(notification: EmailNotification) {
  try {
    const { to, shopName, alerts } = notification;
    
    // Create email content
    const subject = alerts.length === 1 
      ? `🚨 Low Stock Alert: ${alerts[0].productTitle}`
      : `🚨 ${alerts.length} Low Stock Alerts for ${shopName}`;

    const htmlContent = generateAlertEmailHTML(shopName, alerts);
    const textContent = generateAlertEmailText(shopName, alerts);

    const result = await resend.emails.send({
      from: `${shopName} Inventory <inventory@spector-alerts.com>`,
      to,
      subject,
      html: htmlContent,
      text: textContent,
      tags: [
        { name: 'type', value: 'inventory-alert' },
        { name: 'shop', value: shopName },
        { name: 'alert-count', value: alerts.length.toString() }
      ]
    });

    console.log('✅ Email sent successfully:', result.data?.id);
    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send test email to verify configuration
 */
export async function sendTestEmail(to: string, shopName: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _testAlert: InventoryAlert = {
      productTitle: "Sample Product",
      variantTitle: "Blue / Large",
      currentStock: 3,
      threshold: 5,
      shopName
    };

    const result = await resend.emails.send({
      from: `${shopName} Test <test@spector-alerts.com>`,
      to: [to],
      subject: `🧪 Test: Spector Inventory Alerts Setup`,
      html: generateTestEmailHTML(shopName),
      text: `This is a test email from Spector Inventory Alerts for ${shopName}. If you received this, your email notifications are working correctly!`,
      tags: [
        { name: 'type', value: 'test-email' },
        { name: 'shop', value: shopName }
      ]
    });

    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error('❌ Failed to send test email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Generate HTML email content for inventory alerts
 */
function generateAlertEmailHTML(shopName: string, alerts: InventoryAlert[]): string {
  const alertsHTML = alerts.map(alert => `
    <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin: 12px 0; background: #fef7f7;">
      <h3 style="margin: 0 0 8px 0; color: #dc2626;">⚠️ ${alert.productTitle}</h3>
      ${alert.variantTitle ? `<p style="margin: 4px 0; color: #666;"><strong>Variant:</strong> ${alert.variantTitle}</p>` : ''}
      <p style="margin: 4px 0; color: #333;">
        <strong>Current Stock:</strong> <span style="color: #dc2626; font-weight: bold;">${alert.currentStock} units</span>
      </p>
      <p style="margin: 4px 0; color: #666;">
        <strong>Alert Threshold:</strong> ${alert.threshold} units
      </p>
      ${alert.productUrl ? `<p style="margin: 8px 0 0 0;"><a href="${alert.productUrl}" style="color: #2563eb;">View Product →</a></p>` : ''}
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Inventory Alert - ${shopName}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.5; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="border-bottom: 3px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px;">
          <h1 style="margin: 0; color: #1f2937;">📦 Inventory Alert</h1>
          <p style="margin: 4px 0 0 0; color: #666;">${shopName}</p>
        </div>

        <p style="font-size: 16px; margin-bottom: 20px;">
          You have <strong>${alerts.length}</strong> product${alerts.length !== 1 ? 's' : ''} that ${alerts.length !== 1 ? 'have' : 'has'} reached your inventory threshold:
        </p>

        ${alertsHTML}

        <div style="margin-top: 32px; padding: 16px; background: #f3f4f6; border-radius: 8px;">
          <h4 style="margin: 0 0 8px 0; color: #374151;">📈 Recommended Actions:</h4>
          <ul style="margin: 8px 0; padding-left: 20px; color: #666;">
            <li>Review sales velocity and reorder if needed</li>
            <li>Consider updating product availability on your store</li>
            <li>Check with suppliers for restocking timeline</li>
            <li>Update inventory thresholds if they're too sensitive</li>
          </ul>
        </div>

        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e0e0e0; text-align: center; color: #666; font-size: 14px;">
          <p>This alert was sent by <strong>Spector Inventory Monitoring</strong></p>
          <p>Monitoring your inventory every hour • Reliable alerts when you need them</p>
        </div>
      </body>
    </html>
  `;
}

/**
 * Generate plain text email content for inventory alerts
 */
function generateAlertEmailText(shopName: string, alerts: InventoryAlert[]): string {
  const alertsText = alerts.map(alert => `
⚠️  ${alert.productTitle}${alert.variantTitle ? ` (${alert.variantTitle})` : ''}
    Current Stock: ${alert.currentStock} units
    Alert Threshold: ${alert.threshold} units
    ${alert.productUrl ? `View: ${alert.productUrl}` : ''}
  `).join('\n');

  return `
📦 INVENTORY ALERT - ${shopName}

You have ${alerts.length} product${alerts.length !== 1 ? 's' : ''} that ${alerts.length !== 1 ? 'have' : 'has'} reached your inventory threshold:

${alertsText}

📈 RECOMMENDED ACTIONS:
• Review sales velocity and reorder if needed
• Consider updating product availability on your store  
• Check with suppliers for restocking timeline
• Update inventory thresholds if they're too sensitive

---
This alert was sent by Spector Inventory Monitoring
Monitoring your inventory every hour • Reliable alerts when you need them
  `;
}

/**
 * Generate test email HTML
 */
function generateTestEmailHTML(shopName: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Test Email - Spector Alerts</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.5; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; padding: 40px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; color: white; margin-bottom: 24px;">
          <h1 style="margin: 0 0 8px 0; font-size: 24px;">🧪 Test Successful!</h1>
          <p style="margin: 0; opacity: 0.9; font-size: 16px;">Spector Inventory Alerts</p>
        </div>

        <div style="padding: 24px; background: #f8fafc; border-radius: 8px; margin-bottom: 24px;">
          <h2 style="margin: 0 0 16px 0; color: #1f2937;">✅ Your Email Setup is Working!</h2>
          <p style="margin: 0 0 12px 0;">Congratulations! Your inventory alert system for <strong>${shopName}</strong> is properly configured.</p>
          
          <div style="background: white; padding: 16px; border-radius: 6px; border-left: 4px solid #10b981;">
            <h4 style="margin: 0 0 8px 0; color: #065f46;">What happens next:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #374151;">
              <li>Your products will be monitored every hour</li>
              <li>You'll receive alerts when inventory hits your thresholds</li>
              <li>Alerts will be sent to all configured email addresses</li>
            </ul>
          </div>
        </div>

        <div style="text-align: center; padding: 16px; background: #f3f4f6; border-radius: 8px; color: #666; font-size: 14px;">
          <p style="margin: 0;">This test email was sent by <strong>Spector</strong></p>
          <p style="margin: 4px 0 0 0;">Professional inventory monitoring for Shopify stores</p>
        </div>
      </body>
    </html>
  `;
}