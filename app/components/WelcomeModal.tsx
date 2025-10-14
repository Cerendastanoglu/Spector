import { useState, useEffect } from "react";
import {
  Modal,
  Text,
  // Button,
  BlockStack,
  InlineStack,
  Box,
  Icon,
  Card,
  Badge,
  List,
} from "@shopify/polaris";
import {
  ChartVerticalIcon,
  PackageIcon,
  OrderIcon,
  // CheckIcon,
  StarIcon,
  CalendarIcon,
} from "@shopify/polaris-icons";

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenHelp?: () => void;
}

export function WelcomeModal({ isOpen, onClose, onOpenHelp: _onOpenHelp }: WelcomeModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isModalReady, setIsModalReady] = useState(false);

  // Add a small delay before showing modal content to prevent rendering issues
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setIsModalReady(true);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setIsModalReady(false);
    }
  }, [isOpen]);

  const slides = [
    {
      icon: StarIcon,
      title: "Welcome to Spector",
      subtitle: "Your Product Management Suite Dashboard",
      content: (
        <BlockStack gap="400">
          <Text as="p" variant="bodyMd">
            Spector helps you prevent stockouts, optimize product performance, and make 
            data-driven decisions that grow your business.
          </Text>
          <Card>
            <BlockStack gap="300">
              <Text as="h3" variant="headingMd">Key Features:</Text>
              <List type="bullet">
                <List.Item>Real-time inventory monitoring</List.Item>
                <List.Item>Advanced analytics and forecasting</List.Item>
                <List.Item>Automated alerts and notifications</List.Item>
                <List.Item>Performance insights and recommendations</List.Item>
              </List>
            </BlockStack>
          </Card>
        </BlockStack>
      )
    },
    {
      icon: ChartVerticalIcon,
      title: "Product Performance Analytics",
      subtitle: "Deep insights into your catalog health",
      content: (
        <BlockStack gap="400">
          <Text as="p" variant="bodyMd">
            Track your product performance with comprehensive analytics including 
            catalog value, product health scores, and top performers.
          </Text>
          <InlineStack gap="300" wrap={false}>
            <Box padding="400" background="bg-surface-success" borderRadius="200">
              <BlockStack gap="200" align="center">
                <Icon source={ChartVerticalIcon} tone="success" />
                <Text as="p" variant="bodyMd" fontWeight="semibold">Real-time Data</Text>
              </BlockStack>
            </Box>
            <Box padding="400" background="bg-surface-info" borderRadius="200">
              <BlockStack gap="200" align="center">
                <Icon source={PackageIcon} tone="info" />
                <Text as="p" variant="bodyMd" fontWeight="semibold">Catalog Health</Text>
              </BlockStack>
            </Box>
            <Box padding="400" background="bg-surface-warning" borderRadius="200">
              <BlockStack gap="200" align="center">
                <Icon source={OrderIcon} tone="warning" />
                <Text as="p" variant="bodyMd" fontWeight="semibold">Order Analysis</Text>
              </BlockStack>
            </Box>
          </InlineStack>
        </BlockStack>
      )
    },
    {
      icon: CalendarIcon,
      title: "Coming Soon",
      subtitle: "Exciting features in development",
      content: (
        <BlockStack gap="400">
          <Text as="p" variant="bodyMd">
            We're continuously improving Spector with new features and capabilities.
          </Text>
          <Card>
            <BlockStack gap="300">
              <InlineStack gap="200" align="space-between">
                <Text as="p" variant="bodyMd">Inventory Forecasting</Text>
                <Badge tone="info">In Development</Badge>
              </InlineStack>
              <InlineStack gap="200" align="space-between">
                <Text as="p" variant="bodyMd">Order Analysis</Text>
                <Badge tone="info">In Development</Badge>
              </InlineStack>
              <InlineStack gap="200" align="space-between">
                <Text as="p" variant="bodyMd">AI-Powered Recommendations</Text>
                <Badge tone="attention">Coming Soon</Badge>
              </InlineStack>
              <InlineStack gap="200" align="space-between">
                <Text as="p" variant="bodyMd">Advanced Integrations</Text>
                <Badge tone="attention">Coming Soon</Badge>
              </InlineStack>
            </BlockStack>
          </Card>
        </BlockStack>
      )
    }
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleClose = () => {
    setCurrentSlide(0); // Reset to first slide for next time
    setIsModalReady(false);
    onClose();
  };

  const currentSlideData = slides[currentSlide];
  const isLastSlide = currentSlide === slides.length - 1;

  // Don't render modal content until it's ready to prevent freezing
  if (!isOpen || !isModalReady) {
    return (
      <Modal
        open={isOpen}
        onClose={handleClose}
        title=""
        size="large"
      >
        <Modal.Section>
          <BlockStack gap="400" align="center">
            <Text as="p" variant="bodyMd">Loading...</Text>
          </BlockStack>
        </Modal.Section>
      </Modal>
    );
  }

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      title=""
      primaryAction={{
        content: isLastSlide ? "Get Started" : "Next",
        onAction: isLastSlide ? handleClose : nextSlide,
      }}
      secondaryActions={[
        ...(currentSlide > 0 ? [{
          content: "Previous",
          onAction: prevSlide,
        }] : []),
        {
          content: "Skip Tour",
          onAction: handleClose,
        }
      ]}
      size="large"
    >
      <Modal.Section>
        <BlockStack gap="600" align="center">
          {/* Icon and Title */}
          <BlockStack gap="400" align="center">
            <Box 
              background="bg-fill-info" 
              padding="600" 
              borderRadius="200"
            >
              <Icon source={currentSlideData.icon} tone="base" />
            </Box>
            
            <BlockStack gap="200" align="center">
              <Text as="h1" variant="headingLg" fontWeight="bold" alignment="center">
                {currentSlideData.title}
              </Text>
              <Text as="p" variant="bodyLg" tone="subdued" alignment="center">
                {currentSlideData.subtitle}
              </Text>
            </BlockStack>
          </BlockStack>

          {/* Content */}
          <Box width="100%">
            {currentSlideData.content}
          </Box>

          {/* Slide Indicators */}
          <InlineStack gap="200" align="center">
            {slides.map((_, index) => (
              <Box
                key={index}
                background={index === currentSlide ? "bg-fill-info" : "bg-fill-disabled"}
                borderRadius="100"
                minHeight="8px"
                minWidth="8px"
                padding="100"
              />
            ))}
          </InlineStack>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}