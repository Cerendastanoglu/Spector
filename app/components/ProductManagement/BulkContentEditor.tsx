import { useState } from 'react';
import {
  BlockStack,
  Button,
  ButtonGroup,
  Card,
  InlineStack,
  TextField,
  Text,
} from '@shopify/polaris';

interface BulkContentEditorProps {
  onApply: (operation: string, value: string) => void;
  isLoading?: boolean;
}

export function BulkContentEditor({
  onApply,
  isLoading = false,
}: BulkContentEditorProps) {
  const [titleOperation, setTitleOperation] = useState<'prefix' | 'suffix' | 'replace'>('prefix');
  const [titleValue, setTitleValue] = useState('');
  const [descriptionValue, setDescriptionValue] = useState('');
  const [vendorValue, setVendorValue] = useState('');
  const [productTypeValue, setProductTypeValue] = useState('');

  const handleApplyTitle = () => {
    if (titleValue) {
      onApply(`title-${titleOperation}`, titleValue);
      setTitleValue('');
    }
  };

  const handleApplyDescription = () => {
    if (descriptionValue) {
      onApply('description', descriptionValue);
      setDescriptionValue('');
    }
  };

  const handleApplyVendor = () => {
    if (vendorValue) {
      onApply('vendor', vendorValue);
      setVendorValue('');
    }
  };

  const handleApplyProductType = () => {
    if (productTypeValue) {
      onApply('productType', productTypeValue);
      setProductTypeValue('');
    }
  };

  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h3" variant="headingMd">
          Content Management
        </Text>

        {/* Title Updates */}
        <BlockStack gap="200">
          <Text as="p" variant="bodyMd" fontWeight="semibold">
            Product Title
          </Text>
          
          <ButtonGroup variant="segmented">
            <Button
              pressed={titleOperation === 'prefix'}
              onClick={() => setTitleOperation('prefix')}
              disabled={isLoading}
            >
              Add Prefix
            </Button>
            <Button
              pressed={titleOperation === 'suffix'}
              onClick={() => setTitleOperation('suffix')}
              disabled={isLoading}
            >
              Add Suffix
            </Button>
            <Button
              pressed={titleOperation === 'replace'}
              onClick={() => setTitleOperation('replace')}
              disabled={isLoading}
            >
              Replace
            </Button>
          </ButtonGroup>

          <InlineStack gap="200" blockAlign="end">
            <div style={{ flexGrow: 1 }}>
              <TextField
                label=""
                value={titleValue}
                onChange={setTitleValue}
                placeholder={
                  titleOperation === 'prefix' ? 'Text to add at start' :
                  titleOperation === 'suffix' ? 'Text to add at end' :
                  'New title'
                }
                autoComplete="off"
                disabled={isLoading}
              />
            </div>
            <Button
              onClick={handleApplyTitle}
              loading={isLoading}
              disabled={!titleValue || isLoading}
            >
              Apply
            </Button>
          </InlineStack>
          
          <Text as="p" variant="bodyXs" tone="subdued">
            {titleOperation === 'prefix' && 'Add text at the beginning of product titles'}
            {titleOperation === 'suffix' && 'Add text at the end of product titles'}
            {titleOperation === 'replace' && 'Replace entire product title with new text'}
          </Text>
        </BlockStack>

        {/* Description */}
        <BlockStack gap="200">
          <Text as="p" variant="bodyMd" fontWeight="semibold">
            Product Description
          </Text>
          
          <InlineStack gap="200" blockAlign="end">
            <div style={{ flexGrow: 1 }}>
              <TextField
                label=""
                value={descriptionValue}
                onChange={setDescriptionValue}
                placeholder="Enter new description"
                multiline={3}
                autoComplete="off"
                disabled={isLoading}
              />
            </div>
            <Button
              onClick={handleApplyDescription}
              loading={isLoading}
              disabled={!descriptionValue || isLoading}
            >
              Apply
            </Button>
          </InlineStack>
          
          <Text as="p" variant="bodyXs" tone="subdued">
            Replace product descriptions with new text
          </Text>
        </BlockStack>

        {/* Vendor */}
        <BlockStack gap="200">
          <Text as="p" variant="bodyMd" fontWeight="semibold">
            Vendor
          </Text>
          
          <InlineStack gap="200" blockAlign="end">
            <div style={{ flexGrow: 1 }}>
              <TextField
                label=""
                value={vendorValue}
                onChange={setVendorValue}
                placeholder="Enter vendor name"
                autoComplete="off"
                disabled={isLoading}
              />
            </div>
            <Button
              onClick={handleApplyVendor}
              loading={isLoading}
              disabled={!vendorValue || isLoading}
            >
              Apply
            </Button>
          </InlineStack>
          
          <Text as="p" variant="bodyXs" tone="subdued">
            Set or update vendor for selected products
          </Text>
        </BlockStack>

        {/* Product Type */}
        <BlockStack gap="200">
          <Text as="p" variant="bodyMd" fontWeight="semibold">
            Product Type
          </Text>
          
          <InlineStack gap="200" blockAlign="end">
            <div style={{ flexGrow: 1 }}>
              <TextField
                label=""
                value={productTypeValue}
                onChange={setProductTypeValue}
                placeholder="Enter product type"
                autoComplete="off"
                disabled={isLoading}
              />
            </div>
            <Button
              onClick={handleApplyProductType}
              loading={isLoading}
              disabled={!productTypeValue || isLoading}
            >
              Apply
            </Button>
          </InlineStack>
          
          <Text as="p" variant="bodyXs" tone="subdued">
            Categorize products by type (e.g., "Clothing", "Electronics")
          </Text>
        </BlockStack>

        {/* Help Text */}
        <Card background="bg-surface-secondary">
          <BlockStack gap="200">
            <Text as="p" variant="bodySm" fontWeight="semibold">
              Content Tips:
            </Text>
            <BlockStack gap="100">
              <Text as="p" variant="bodyXs" tone="subdued">
                • Use prefixes/suffixes for seasonal or promotional updates
              </Text>
              <Text as="p" variant="bodyXs" tone="subdued">
                • Keep descriptions consistent across similar products
              </Text>
              <Text as="p" variant="bodyXs" tone="subdued">
                • Vendor and product type help with organization and filtering
              </Text>
              <Text as="p" variant="bodyXs" tone="subdued">
                • All changes apply to selected products only
              </Text>
            </BlockStack>
          </BlockStack>
        </Card>
      </BlockStack>
    </Card>
  );
}
