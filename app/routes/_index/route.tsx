/**
 * Public Landing Page
 * 
 * OAuth-only authentication per Shopify App Store requirements.
 * Manual shop domain entry is not allowed for public apps.
 * 
 * Installation flow:
 * 1. Merchant installs from Shopify App Store
 * 2. OAuth grant page appears automatically
 * 3. After approval, merchant is redirected to /app
 */

import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  // If shop param exists, redirect to app (will trigger OAuth)
  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { };
};

export default function App() {
  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>Welcome to Spector</h1>
        <p className={styles.text}>
          Intelligent inventory management for your Shopify store. Track, manage, and optimize your product inventory with advanced analytics and automation.
        </p>
        <div className={styles.installInfo}>
          <p className={styles.infoText}>
            To install Spector, visit the Shopify App Store and click "Add app". 
            You'll be guided through a secure OAuth installation process.
          </p>
        </div>
        <ul className={styles.list}>
          <li>
            <strong>Smart Inventory Tracking</strong>. Real-time monitoring of stock levels with intelligent alerts when products run low.
          </li>
          <li>
            <strong>Bulk Product Management</strong>. Edit prices, collections, and inventory for multiple products simultaneously to save time.
          </li>
          <li>
            <strong>Advanced Analytics</strong>. Get insights into your inventory performance with detailed reports and forecasting.
          </li>
        </ul>
      </div>
    </div>
  );
}
