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
      // const notificationId = formData.get("notificationId");
      // Mock marking notification as read
      return json({ success: true, message: "Notification marked as read" });
    }
    case "mark_all_read": {
      // Mock marking all notifications as read
      return json({ success: true, message: "All notifications marked as read" });
    }
    case "delete": {
      // const notificationId = formData.get("notificationId");
      // Mock deleting notification
      return json({ success: true, message: "Notification deleted" });
    }
    case "update_settings": {
      const settings = JSON.parse(formData.get("settings") as string);
      // Mock updating notification settings
      return json({ success: true, message: "Settings updated", settings });
    }
    default:
      return json({ error: "Invalid action" }, { status: 400 });
  }
};