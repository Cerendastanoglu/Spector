import React from 'react';
import {
  BlockStack,
  TextField,
  Select,
  InlineStack,
  Button,
  Text,
  Icon,
} from '@shopify/polaris';
import { HashtagIcon } from '@shopify/polaris-icons';

interface BulkTagEditorProps {
  tagOperation: 'add' | 'remove' | 'replace';
  setTagOperation: (value: 'add' | 'remove' | 'replace') => void;
  tagValue: string;
  setTagValue: (value: string) => void;
  tagRemoveValue: string;
  setTagRemoveValue: (value: string) => void;
  onApply: () => void;
  isLoading: boolean;
  selectedCount: number;
}

export function BulkTagEditor({
  tagOperation,
  setTagOperation,
  tagValue,
  setTagValue,
  tagRemoveValue,
  setTagRemoveValue,
  onApply,
  isLoading,
  selectedCount,
}: BulkTagEditorProps) {
  const tagOperationOptions = [
    { label: 'Add tags', value: 'add' },
    { label: 'Remove tags', value: 'remove' },
    { label: 'Replace all tags', value: 'replace' },
  ];

  return (
    <BlockStack gap="400">
      <InlineStack gap="200" blockAlign="center" align="start">
        <Icon source={HashtagIcon} tone="base" />
        <Text variant="headingMd" as="h3">
          Bulk Tag Management
        </Text>
      </InlineStack>

        <Text variant="bodyMd" as="p" tone="subdued">
          Manage tags for {selectedCount} selected product{selectedCount !== 1 ? 's' : ''}
        </Text>

        <Select
          label="Tag operation"
          options={tagOperationOptions}
          value={tagOperation}
          onChange={(value) => setTagOperation(value as any)}
        />

        {tagOperation === 'add' && (
          <TextField
            label="Tags to add"
            value={tagValue}
            onChange={setTagValue}
            placeholder="summer, sale, featured (comma-separated)"
            autoComplete="off"
            helpText="Enter tags separated by commas"
          />
        )}

        {tagOperation === 'remove' && (
          <TextField
            label="Tags to remove"
            value={tagRemoveValue}
            onChange={setTagRemoveValue}
            placeholder="old-tag, discontinued (comma-separated)"
            autoComplete="off"
            helpText="Enter tags to remove, separated by commas"
          />
        )}

        {tagOperation === 'replace' && (
          <TextField
            label="New tags"
            value={tagValue}
            onChange={setTagValue}
            placeholder="new, updated, current (comma-separated)"
            autoComplete="off"
            helpText="All existing tags will be replaced with these"
          />
        )}

        <Button
          variant="primary"
          onClick={onApply}
          loading={isLoading}
          disabled={selectedCount === 0}
        >
          Apply Tag Changes
        </Button>
    </BlockStack>
  );
}
