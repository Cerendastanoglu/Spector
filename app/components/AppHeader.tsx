import { useState } from "react";
import {
  Text,
  Button,
  Popover,
  ActionList,
  Icon,
  InlineStack,
  Box,
  Badge,
  Tooltip,
  Card,
  BlockStack,
} from "@shopify/polaris";
import {
  SettingsIcon,
  QuestionCircleIcon,
  NotificationIcon,
  ProductIcon,
} from "@shopify/polaris-icons";

interface AppHeaderProps {
  onTabChange: (tab: string) => void;
  activeTab: string;
  outOfStockCount?: number;
}

export function AppHeader({ onTabChange, activeTab, outOfStockCount = 0 }: AppHeaderProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const toggleUserMenuOpen = () => setIsUserMenuOpen(!isUserMenuOpen);
  const toggleSettingsOpen = () => setIsSettingsOpen(!isSettingsOpen);

  const userMenuActions = [
    {
      content: "Settings",
      icon: SettingsIcon,
      onAction: () => {
        onTabChange("settings");
        setIsUserMenuOpen(false);
      },
    },
    {
      content: "Help & Support",
      icon: QuestionCircleIcon,
      onAction: () => {
        onTabChange("help");
        setIsUserMenuOpen(false);
      },
    },
  ];

  const settingsActions = [
    {
      content: "App Preferences",
      onAction: () => {
        onTabChange("preferences");
        setIsSettingsOpen(false);
      },
    },
    {
      content: "Notification Settings",
      onAction: () => {
        onTabChange("notifications");
        setIsSettingsOpen(false);
      },
    },
    {
      content: "API Configuration",
      onAction: () => {
        onTabChange("api-config");
        setIsSettingsOpen(false);
      },
    },
  ];

  const userMenuMarkup = (
    <Popover
      active={isUserMenuOpen}
      activator={
        <Button onClick={toggleUserMenuOpen} disclosure icon={SettingsIcon} />
      }
      onClose={toggleUserMenuOpen}
    >
      <ActionList items={userMenuActions} />
    </Popover>
  );

  const settingsMenuMarkup = (
    <Popover
      active={isSettingsOpen}
      activator={
        <Tooltip content="Settings">
          <Button onClick={toggleSettingsOpen} icon={SettingsIcon} />
        </Tooltip>
      }
      onClose={toggleSettingsOpen}
    >
      <ActionList items={settingsActions} />
    </Popover>
  );

  const notificationMarkup = (
    <Tooltip content="Notifications">
      <Button 
        icon={NotificationIcon}
        onClick={() => onTabChange("notifications")}
      />
    </Tooltip>
  );

  const secondaryMenuMarkup = (
    <InlineStack gap="200">
      {notificationMarkup}
      {settingsMenuMarkup}
      {userMenuMarkup}
    </InlineStack>
  );

  const logoMarkup = (
    <InlineStack gap="300" align="center">
      <Box paddingInlineStart="400">
        <Icon source={ProductIcon} tone="base" />
      </Box>
      <BlockStack gap="100">
        <Text as="h1" variant="headingLg" tone="base">
          Spector
        </Text>
        <Text as="p" variant="bodySm" tone="subdued">
          Advanced Product Monitoring
        </Text>
      </BlockStack>
    </InlineStack>
  );

  const navigationMarkup = (
    <InlineStack gap="400" align="center">
      <Button
        pressed={activeTab === "dashboard"}
        onClick={() => onTabChange("dashboard")}
        variant="tertiary"
      >
        Dashboard
      </Button>
      <InlineStack gap="200" align="center">
        <Button
          pressed={activeTab === "out-of-stock"}
          onClick={() => onTabChange("out-of-stock")}
          variant="tertiary"
        >
          Out of Stock Products
        </Button>
        {outOfStockCount > 0 && (
          <Badge tone="critical" size="small">
            {outOfStockCount.toString()}
          </Badge>
        )}
      </InlineStack>
      <Button
        pressed={activeTab === "analytics"}
        onClick={() => onTabChange("analytics")}
        variant="tertiary"
      >
        Analytics
      </Button>
      <Button
        pressed={activeTab === "reports"}
        onClick={() => onTabChange("reports")}
        variant="tertiary"
      >
        Reports
      </Button>
    </InlineStack>
  );

  return (
    <Card>
      <Box padding="400">
        <InlineStack align="space-between" blockAlign="center">
          <InlineStack gap="600" align="center">
            {logoMarkup}
            <Box paddingInlineStart="800">
              {navigationMarkup}
            </Box>
          </InlineStack>
          {secondaryMenuMarkup}
        </InlineStack>
      </Box>
    </Card>
  );
}
