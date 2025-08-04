import { useState, useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import {
  Card,
  Text,
  DataTable,
  Badge,
  Button,
  InlineStack,
  BlockStack,
  Spinner,
  EmptyState,
  Box,
  Thumbnail,
  Link,
} from "@shopify/polaris";
import { ProductIcon } from "@shopify/polaris-icons";

interface Product {
  id: string;
  title: string;
  handle: string;
  featuredMedia?: {
    preview?: {
      image?: {
        url: string;
        altText?: string;
      };
    };
  };
  totalInventory: number;
  status: string;
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        inventoryQuantity: number;
        price: string;
      };
    }>;
  };
}

interface OutOfStockProductsProps {
  isVisible: boolean;
}

export function OutOfStockProducts({ isVisible }: OutOfStockProductsProps) {
  const fetcher = useFetcher<{ products: Product[]; hasNextPage: boolean }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isVisible && products.length === 0) {
      setIsLoading(true);
      fetcher.submit(
        { action: "fetch-out-of-stock" },
        { method: "POST", action: "/app/api/products" }
      );
    }
  }, [isVisible]);

  useEffect(() => {
    if (fetcher.data?.products) {
      setProducts(fetcher.data.products);
      setIsLoading(false);
    }
  }, [fetcher.data]);

  const handleRefresh = () => {
    setIsLoading(true);
    fetcher.submit(
      { action: "fetch-out-of-stock" },
      { method: "POST", action: "/app/api/products" }
    );
  };

  const handleRestockProduct = (productId: string) => {
    // This would typically open a modal or redirect to restock page
    console.log("Restock product:", productId);
  };

  if (!isVisible) {
    return null;
  }

  if (isLoading && products.length === 0) {
    return (
      <Card>
        <Box padding="800">
          <InlineStack align="center">
            <Spinner size="large" />
            <Text as="p" variant="bodyMd">
              Loading out of stock products...
            </Text>
          </InlineStack>
        </Box>
      </Card>
    );
  }

  if (products.length === 0) {
    return (
      <Card>
        <EmptyState
          heading="No out of stock products"
          image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
        >
          <Text as="p" variant="bodyMd">
            Great news! All your products are currently in stock.
          </Text>
          <Box paddingBlockStart="400">
            <Button onClick={handleRefresh}>Refresh</Button>
          </Box>
        </EmptyState>
      </Card>
    );
  }

  const rows = products.map((product) => {
    const variantCount = product.variants.edges.length;
    const totalOutOfStock = product.variants.edges.filter(
      (variant) => variant.node.inventoryQuantity <= 0
    ).length;

    return [
      <InlineStack gap="200" align="center">
        <Thumbnail
          source={product.featuredMedia?.preview?.image?.url || ""}
          alt={product.featuredMedia?.preview?.image?.altText || product.title}
          size="small"
        />
        <BlockStack gap="100">
          <Link url={`shopify:admin/products/${product.id.replace("gid://shopify/Product/", "")}`}>
            <Text as="span" variant="bodyMd" fontWeight="semibold">
              {product.title}
            </Text>
          </Link>
          <Text as="span" variant="bodySm" tone="subdued">
            Handle: {product.handle}
          </Text>
        </BlockStack>
      </InlineStack>,
      <Badge tone={product.status === "ACTIVE" ? "success" : "critical"}>
        {product.status}
      </Badge>,
      <Text as="span" variant="bodyMd">
        {totalOutOfStock} of {variantCount} variants
      </Text>,
      <Text as="span" variant="bodyMd">
        {product.totalInventory}
      </Text>,
      <InlineStack gap="200">
        <Button
          size="slim"
          onClick={() => handleRestockProduct(product.id)}
        >
          Restock
        </Button>
        <Button
          size="slim"
          variant="plain"
          url={`shopify:admin/products/${product.id.replace("gid://shopify/Product/", "")}`}
        >
          View
        </Button>
      </InlineStack>,
    ];
  });

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between">
          <BlockStack gap="100">
            <Text as="h2" variant="headingMd">
              Out of Stock Products
            </Text>
            <Text as="p" variant="bodyMd" tone="subdued">
              Products with zero or low inventory that need attention
            </Text>
          </BlockStack>
          <Button onClick={handleRefresh} loading={isLoading}>
            Refresh
          </Button>
        </InlineStack>

        <DataTable
          columnContentTypes={["text", "text", "text", "numeric", "text"]}
          headings={["Product", "Status", "Out of Stock Variants", "Total Inventory", "Actions"]}
          rows={rows}
        />

        {products.length > 0 && (
          <Box paddingBlockStart="400">
            <InlineStack align="center">
              <Text as="p" variant="bodySm" tone="subdued">
                Showing {products.length} out of stock products
              </Text>
            </InlineStack>
          </Box>
        )}
      </BlockStack>
    </Card>
  );
}
