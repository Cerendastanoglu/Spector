import React from "react";
import {
  Card,
} from "@shopify/polaris";

interface RecentActivityProps {
  isVisible: boolean;
}

export function RecentActivity({ isVisible }: RecentActivityProps) {
  // Component has been completely removed
  
  if (!isVisible) {
    return null;
  }
  
  return (
    <Card>
      {/* Empty component - feature removed */}
    </Card>
  );
}
