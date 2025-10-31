/**
 * Resend Email Service Configuration
 * 
 * Simple Resend integration for email notifications
 */
import { Resend } from 'resend';
import { logger } from "~/utils/logger";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function getResendStatus() {
  try {
    if (!process.env.RESEND_API_KEY) {
      return {
        configured: false,
        error: 'RESEND_API_KEY not found in environment variables'
      };
    }

    // Simple API validation by attempting to fetch API key info
    const response = await fetch('https://api.resend.com/emails', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      return {
        configured: false,
        error: 'Invalid API key'
      };
    }

    return {
      configured: true,
      status: 'API key is valid'
    };
  } catch (error) {
    return {
      configured: false,
      error: `Failed to validate Resend API: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export async function sendTestEmail(to: string, shop: string, content?: string) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return {
        success: false,
        message: 'RESEND_API_KEY not configured'
      };
    }

    const subject = `Test Email from Spector - ${shop}`;
    const htmlContent = content || `
      <h2>Test Email Successful!</h2>
      <p>This is a test email from your Spector app for <strong>${shop}</strong>.</p>
      <p>Your email notifications are working correctly.</p>
      <p>Timestamp: ${new Date().toISOString()}</p>
    `;

    const { data, error } = await resend.emails.send({
      from: 'Spector <onboarding@resend.dev>',
      to: [to],
      subject: subject,
      html: htmlContent,
    });

    if (error) {
      logger.error('❌ Resend API error:', error);
      return {
        success: false,
        message: `Failed to send email: ${error.message || 'Unknown error'}`
      };
    }

    logger.info('✅ Test email sent successfully:', data?.id);
    return {
      success: true,
      messageId: data?.id,
      message: 'Test email sent successfully'
    };
  } catch (error) {
    logger.error('❌ Error sending test email:', error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export async function sendOutOfStockAlert(to: string, shopName: string, products: Array<{title: string, inventory: number, handle?: string}>) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return {
        success: false,
        message: 'RESEND_API_KEY not configured'
      };
    }

    const subject = `🚨 Out of Stock Alert - ${shopName}`;
    const productList = products.map(p => `
      <li>
        <strong>${p.title}</strong> - ${p.inventory} in stock
        ${p.handle ? `<br><small>Handle: ${p.handle}</small>` : ''}
      </li>
    `).join('');

    const htmlContent = `
      <h2>🚨 Out of Stock Alert</h2>
      <p>The following products in <strong>${shopName}</strong> are running low or out of stock:</p>
      <ul>${productList}</ul>
      <p>Please restock these items as soon as possible.</p>
      <p><em>Alert sent at: ${new Date().toISOString()}</em></p>
    `;

    const { data, error } = await resend.emails.send({
      from: 'Spector <onboarding@resend.dev>',
      to: [to],
      subject: subject,
      html: htmlContent,
    });

    if (error) {
      logger.error('❌ Resend API error:', error);
      return {
        success: false,
        message: `Failed to send alert: ${error.message || 'Unknown error'}`
      };
    }

    logger.info('✅ Out of stock alert sent successfully:', data?.id);
    return {
      success: true,
      messageId: data?.id,
      message: 'Out of stock alert sent successfully'
    };
  } catch (error) {
    logger.error('❌ Error sending out of stock alert:', error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export async function sendNotificationEmail(to: string, subject: string, htmlContent: string, shopName?: string) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return {
        success: false,
        message: 'RESEND_API_KEY not configured'
      };
    }

    const finalSubject = shopName ? `${subject} - ${shopName}` : subject;
    
    const { data, error } = await resend.emails.send({
      from: 'Spector <onboarding@resend.dev>',
      to: [to],
      subject: finalSubject,
      html: htmlContent,
    });

    if (error) {
      logger.error('❌ Resend API error:', error);
      return {
        success: false,
        message: `Failed to send notification: ${error.message || 'Unknown error'}`
      };
    }

    logger.info('✅ Notification email sent successfully:', data?.id);
    return {
      success: true,
      messageId: data?.id,
      message: 'Notification email sent successfully'
    };
  } catch (error) {
    logger.error('❌ Error sending notification email:', error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
