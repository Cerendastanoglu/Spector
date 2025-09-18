import { json } from "@remix-run/node";
import type { ActionFunction, LoaderFunction } from "@remix-run/node";

export const loader: LoaderFunction = async ({ request: _request }) => {
  // Mock notification data
  const notifications = [
    {
      id: "1",
      type: "low_stock",
      productId: "123",
      productTitle: "Sample Product",
      message: "Product is running low on stock",
      threshold: 10,
      currentStock: 5,
      createdAt: new Date().toISOString(),
      read: false,
    },
    {
      id: "2",
      type: "out_of_stock",
      productId: "124",
      productTitle: "Another Product",
      message: "Product is out of stock",
      threshold: 0,
      currentStock: 0,
      createdAt: new Date().toISOString(),
      read: false,
    },
  ];

  return json({ notifications });
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const action = formData.get("action");

  switch (action) {
    case "mark_read": {
      const notificationId = formData.get("notificationId");
      if (!notificationId) {
        return json({ error: "Notification ID is required" }, { status: 400 });
      }
      // Mock marking notification as read
      return json({ success: true, message: "Notification marked as read" });
    }
    case "mark_all_read": {
      // Mock marking all notifications as read
      return json({ success: true, message: "All notifications marked as read" });
    }
    case "delete": {
      const notificationId = formData.get("notificationId");
      if (!notificationId) {
        return json({ error: "Notification ID is required" }, { status: 400 });
      }
      // Mock deleting notification
      return json({ success: true, message: "Notification deleted" });
    }
    case "update_settings": {
      try {
        const settingsData = formData.get("settings");
        if (!settingsData) {
          return json({ error: "Settings data is required" }, { status: 400 });
        }
        const settings = JSON.parse(settingsData as string);
        // Mock updating notification settings
        return json({ success: true, message: "Settings updated", settings });
      } catch (error) {
        return json({ error: "Invalid settings format" }, { status: 400 });
      }
    }
    case "get-notification-config": {
      // Mock getting notification configuration
      return json({
        success: true,
        channels: [],
        rules: [],
        selectionMode: 'specific',
        selectedProducts: []
      });
    }
    case "save-notification-config": {
      try {
        const configData = formData.get("config");
        if (!configData) {
          return json({ error: "Configuration data is required" }, { status: 400 });
        }
        const config = JSON.parse(configData as string);
        // Mock saving notification configuration
        return json({ success: true, message: "Configuration saved", config });
      } catch (error) {
        return json({ error: "Invalid configuration format" }, { status: 400 });
      }
    }
    case "test-channel": {
      // Mock testing notification channel
      return json({ success: true, message: "Channel test successful" });
    }
    default:
      return json({ error: "Invalid action" }, { status: 400 });
  }
};