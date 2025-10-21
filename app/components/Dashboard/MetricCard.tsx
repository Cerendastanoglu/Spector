import { InlineStack, BlockStack, Box, Icon, Text, Spinner } from "@shopify/polaris";

interface MetricCardProps {
  /** Icon to display */
  icon: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  /** Icon background color tone */
  iconTone?: 'info' | 'success' | 'warning' | 'critical';
  /** Icon background color */
  iconBackground?: 'bg-surface-info' | 'bg-surface-success' | 'bg-surface-warning' | 'bg-surface-critical';
  /** Label text */
  label: string;
  /** Main value to display */
  value: string | number;
  /** Subtitle text */
  subtitle?: string;
  /** Whether to show loading spinner */
  isLoading?: boolean;
}

/**
 * Reusable metric card component for displaying key performance indicators
 * 
 * Displays an icon, label, value, and optional subtitle with consistent styling.
 * Supports loading state with spinner.
 */
export function MetricCard({
  icon,
  iconTone = 'info',
  iconBackground = 'bg-surface-info',
  label,
  value,
  subtitle,
  isLoading = false,
}: MetricCardProps) {
  return (
    <InlineStack gap="300" blockAlign="center">
      <Box 
        background={iconBackground}
        padding="200" 
        borderRadius="100"
      >
        <Icon source={icon} tone={iconTone} />
      </Box>
      <BlockStack gap="050">
        <Text as="p" variant="bodySm" tone="subdued">
          {label}
        </Text>
        <Text as="span" variant="headingLg" fontWeight="bold">
          {value}
        </Text>
        {subtitle && (
          <Text as="p" variant="bodyXs" tone="subdued">
            {subtitle}
          </Text>
        )}
        {isLoading && (
          <InlineStack gap="100" blockAlign="center">
            <Spinner size="small" />
            <Text as="p" variant="bodyXs" tone="subdued">Updating...</Text>
          </InlineStack>
        )}
      </BlockStack>
    </InlineStack>
  );
}
