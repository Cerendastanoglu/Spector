import React from 'react';
import {
  BlockStack,
  TextField,
  Select,
  Checkbox,
  InlineStack,
  Button,
  Text,
  Icon,
} from '@shopify/polaris';
import { MoneyIcon } from '@shopify/polaris-icons';

interface BulkPriceEditorProps {
  // Price operation state
  priceOperation: 'set' | 'increase' | 'decrease' | 'round';
  setPriceOperation: (value: 'set' | 'increase' | 'decrease' | 'round') => void;
  priceValue: string;
  setPriceValue: (value: string) => void;
  pricePercentage: string;
  setPricePercentage: (value: string) => void;
  
  // Compare price state
  applyCompareChanges: boolean;
  setApplyCompareChanges: (value: boolean) => void;
  compareOperation: 'set' | 'increase' | 'decrease' | 'remove';
  setCompareOperation: (value: 'set' | 'increase' | 'decrease' | 'remove') => void;
  compareValue: string;
  setCompareValue: (value: string) => void;
  comparePercentage: string;
  setComparePercentage: (value: string) => void;
  
  // Actions
  onApply: () => void;
  isLoading: boolean;
  selectedCount: number;
  currencySymbol: string;
}

export function BulkPriceEditor({
  priceOperation,
  setPriceOperation,
  priceValue,
  setPriceValue,
  pricePercentage,
  setPricePercentage,
  applyCompareChanges,
  setApplyCompareChanges,
  compareOperation,
  setCompareOperation,
  compareValue,
  setCompareValue,
  comparePercentage,
  setComparePercentage,
  onApply,
  isLoading,
  selectedCount,
  currencySymbol,
}: BulkPriceEditorProps) {
  const priceOperationOptions = [
    { label: 'Set fixed price', value: 'set' },
    { label: 'Increase by percentage', value: 'increase' },
    { label: 'Decrease by percentage', value: 'decrease' },
    { label: 'Round to nearest dollar', value: 'round' },
  ];

  const compareOperationOptions = [
    { label: 'Set fixed compare price', value: 'set' },
    { label: 'Increase by percentage', value: 'increase' },
    { label: 'Decrease by percentage', value: 'decrease' },
    { label: 'Remove compare price', value: 'remove' },
  ];

  return (
    <BlockStack gap="400">
      <InlineStack gap="200" blockAlign="center" align="start">
        <Icon source={MoneyIcon} tone="base" />
        <Text variant="headingMd" as="h3">
          Bulk Price Update
        </Text>
      </InlineStack>

        <Text variant="bodyMd" as="p" tone="subdued">
          Update prices for {selectedCount} selected variant{selectedCount !== 1 ? 's' : ''}
        </Text>

        <Select
          label="Price operation"
          options={priceOperationOptions}
          value={priceOperation}
          onChange={(value) => setPriceOperation(value as any)}
        />

        {priceOperation === 'set' && (
          <TextField
            label="New price"
            type="number"
            value={priceValue}
            onChange={setPriceValue}
            prefix={currencySymbol}
            placeholder="0.00"
            autoComplete="off"
          />
        )}

        {(priceOperation === 'increase' || priceOperation === 'decrease') && (
          <TextField
            label={`${priceOperation === 'increase' ? 'Increase' : 'Decrease'} by`}
            type="number"
            value={pricePercentage}
            onChange={setPricePercentage}
            suffix="%"
            placeholder="0"
            autoComplete="off"
          />
        )}

        {priceOperation === 'round' && (
          <Text variant="bodyMd" as="p" tone="subdued">
            Will round all prices to the nearest dollar
          </Text>
        )}

        {/* Compare Price Section */}
        <Checkbox
          label="Also update compare at price (strikethrough price)"
          checked={applyCompareChanges}
          onChange={setApplyCompareChanges}
        />

        {applyCompareChanges && (
          <BlockStack gap="300">
            <Select
              label="Compare price operation"
              options={compareOperationOptions}
              value={compareOperation}
              onChange={(value) => setCompareOperation(value as any)}
            />

            {compareOperation === 'set' && (
              <TextField
                label="Compare at price"
                type="number"
                value={compareValue}
                onChange={setCompareValue}
                prefix={currencySymbol}
                placeholder="0.00"
                autoComplete="off"
                helpText="Original price for discount comparison"
              />
            )}

            {(compareOperation === 'increase' || compareOperation === 'decrease') && (
              <TextField
                label={`${compareOperation === 'increase' ? 'Increase' : 'Decrease'} by`}
                type="number"
                value={comparePercentage}
                onChange={setComparePercentage}
                suffix="%"
                placeholder="0"
                autoComplete="off"
              />
            )}

            {compareOperation === 'remove' && (
              <Text variant="bodyMd" as="p" tone="subdued">
                Will remove compare at price from all selected variants
              </Text>
            )}
          </BlockStack>
        )}

        <Button
          variant="primary"
          onClick={onApply}
          loading={isLoading}
          disabled={selectedCount === 0}
        >
          Apply Price Changes
        </Button>
    </BlockStack>
  );
}
