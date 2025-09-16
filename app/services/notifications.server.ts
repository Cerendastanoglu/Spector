import { PrismaClient } from '@prisma/client';
import { sendInventoryAlert, type InventoryAlert } from './email.server';

const prisma = new PrismaClient();

export interface NotificationRuleData {
  id: string;
  shop: string;
  productId: string;
  variantId?: string;
  productTitle: string;
  variantTitle?: string;
  threshold: number;
  isActive: boolean;
  channels: { email: string }[];
}

export interface InventoryCheckResult {
  productId: string;
  variantId?: string;
  productTitle: string;
  variantTitle?: string;
  currentStock: number;
  threshold: number;
  previousStock?: number;
  breachedThreshold: boolean;
}

/**
 * Save notification rule to database
 */
export async function saveNotificationRule(rule: {
  shop: string;
  productId: string;
  variantId?: string;
  productTitle: string;
  variantTitle?: string;
  threshold: number;
  emails: string[];
}) {
  try {
    // Create notification rule
    const notificationRule = await prisma.notificationRule.create({
      data: {
        shop: rule.shop,
        productId: rule.productId,
        variantId: rule.variantId,
        productTitle: rule.productTitle,
        variantTitle: rule.variantTitle,
        threshold: rule.threshold,
        isActive: true,
      },
    });

    // Create notification channels for emails
    const channels = await Promise.all(
      rule.emails.map(email =>
        prisma.notificationChannel.create({
          data: {
            ruleId: notificationRule.id,
            email: email,
          },
        })
      )
    );

    console.log(`✅ Saved notification rule: ${rule.productTitle} (threshold: ${rule.threshold})`);
    return { success: true, ruleId: notificationRule.id, channels: channels.length };
  } catch (error) {
    console.error('❌ Failed to save notification rule:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get all active notification rules for a shop
 */
export async function getNotificationRules(shop: string): Promise<NotificationRuleData[]> {
  try {
    const rules = await prisma.notificationRule.findMany({
      where: {
        shop,
        isActive: true,
      },
      include: {
        channels: true,
      },
    });

    return rules.map(rule => ({
      id: rule.id,
      shop: rule.shop,
      productId: rule.productId,
      variantId: rule.variantId || undefined,
      productTitle: rule.productTitle,
      variantTitle: rule.variantTitle || undefined,
      threshold: rule.threshold,
      isActive: rule.isActive,
      channels: rule.channels.map(channel => ({ email: channel.email })),
    }));
  } catch (error) {
    console.error('❌ Failed to get notification rules:', error);
    return [];
  }
}

/**
 * Check inventory levels and send notifications
 */
export async function checkInventoryAndNotify(shop: string, inventoryData: InventoryCheckResult[]) {
  try {
    const rules = await getNotificationRules(shop);
    const alertsToSend: { [email: string]: InventoryAlert[] } = {};

    for (const inventory of inventoryData) {
      if (!inventory.breachedThreshold) continue;

      // Find matching rules
      const matchingRules = rules.filter(rule => 
        rule.productId === inventory.productId &&
        (rule.variantId === inventory.variantId || !rule.variantId)
      );

      for (const rule of matchingRules) {
        // Create alert
        const alert: InventoryAlert = {
          productTitle: inventory.productTitle,
          variantTitle: inventory.variantTitle,
          currentStock: inventory.currentStock,
          threshold: rule.threshold,
          shopName: shop,
        };

        // Group alerts by email recipients
        for (const channel of rule.channels) {
          if (!alertsToSend[channel.email]) {
            alertsToSend[channel.email] = [];
          }
          alertsToSend[channel.email].push(alert);
        }

        // Log the notification
        await prisma.notificationLog.create({
          data: {
            ruleId: rule.id,
            productTitle: inventory.productTitle,
            oldQuantity: inventory.previousStock || inventory.currentStock,
            newQuantity: inventory.currentStock,
            threshold: rule.threshold,
            emailsSent: rule.channels.length,
          },
        });
      }
    }

    // Send grouped alerts
    let totalEmailsSent = 0;
    for (const [email, alerts] of Object.entries(alertsToSend)) {
      const result = await sendInventoryAlert({
        to: [email],
        shopName: shop,
        alerts,
      });

      if (result.success) {
        totalEmailsSent++;
        console.log(`✅ Sent ${alerts.length} alert(s) to ${email}`);
      } else {
        console.error(`❌ Failed to send alerts to ${email}:`, result.error);
      }
    }

    console.log(`📧 Total emails sent: ${totalEmailsSent}`);
    return { success: true, emailsSent: totalEmailsSent, alertsProcessed: inventoryData.length };
  } catch (error) {
    console.error('❌ Failed to check inventory and notify:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Update notification rule threshold
 */
export async function updateNotificationRule(ruleId: string, updates: {
  threshold?: number;
  isActive?: boolean;
}) {
  try {
    const updatedRule = await prisma.notificationRule.update({
      where: { id: ruleId },
      data: updates,
    });

    console.log(`✅ Updated notification rule: ${updatedRule.productTitle}`);
    return { success: true, rule: updatedRule };
  } catch (error) {
    console.error('❌ Failed to update notification rule:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Delete notification rule
 */
export async function deleteNotificationRule(ruleId: string) {
  try {
    await prisma.notificationRule.delete({
      where: { id: ruleId },
    });

    console.log(`✅ Deleted notification rule: ${ruleId}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to delete notification rule:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get notification logs for analytics
 */
export async function getNotificationLogs(shop: string, limit = 50) {
  try {
    const logs = await prisma.notificationLog.findMany({
      where: {
        rule: {
          shop,
        },
      },
      include: {
        rule: {
          select: {
            productTitle: true,
            variantTitle: true,
          },
        },
      },
      orderBy: {
        sentAt: 'desc',
      },
      take: limit,
    });

    return logs.map(log => ({
      id: log.id,
      productTitle: log.productTitle,
      variantTitle: log.rule.variantTitle,
      oldQuantity: log.oldQuantity,
      newQuantity: log.newQuantity,
      threshold: log.threshold,
      emailsSent: log.emailsSent,
      sentAt: log.sentAt,
    }));
  } catch (error) {
    console.error('❌ Failed to get notification logs:', error);
    return [];
  }
}