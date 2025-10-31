import { useState, useEffect } from "react";
import {
  Modal,
  Text,
  BlockStack,
  InlineStack,
  Icon,
  Card,
} from "@shopify/polaris";
import {
  ChartVerticalIcon,
  PackageIcon,
  StarIcon,
} from "@shopify/polaris-icons";
import styles from "./WelcomeModal.module.css";

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenHelp?: () => void;
  hasSubscription?: boolean;
  onSubscribe?: () => void;
  subscriptionPrice?: string;
}

export function WelcomeModal({ 
  isOpen, 
  onClose, 
  onOpenHelp: _onOpenHelp,
  hasSubscription = true,
  onSubscribe: handleSubscribe,
  subscriptionPrice = '$9.99/month'
}: WelcomeModalProps) {
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
    // Slide 1: Welcome + Subscription + Basics
    {
      icon: StarIcon,
      iconClass: styles.iconWrapper,
      title: "Welcome to Spector",
      subtitle: "Your Product Management Suite",
      content: (
        <BlockStack gap="400">
          {/* Subscription Banner - Only show if no subscription */}
          {!hasSubscription && (
            <div className={styles.bannerCompact}>
              <div className={styles.bannerText}>
                <span className={styles.bannerIcon}>🎉</span>
                <Text as="p" variant="bodyMd">
                  <strong>3-day free trial</strong> • Only {subscriptionPrice} after • Cancel anytime
                </Text>
              </div>
            </div>
          )}

          <Text as="p" variant="bodyMd" tone="subdued">
            Spector helps you monitor inventory, track performance, and make data-driven decisions.
          </Text>
          
          <Card>
            <BlockStack gap="200">
              <div className={styles.featureItem}>
                <div className={styles.checkmark}>✓</div>
                <Text as="p" variant="bodyMd">
                  Real-time inventory monitoring
                </Text>
              </div>
              <div className={styles.featureItem}>
                <div className={styles.checkmark}>✓</div>
                <Text as="p" variant="bodyMd">
                  Product analytics dashboard
                </Text>
              </div>
              <div className={styles.featureItem}>
                <div className={styles.checkmark}>✓</div>
                <Text as="p" variant="bodyMd">
                  Bulk product management
                </Text>
              </div>
              <div className={styles.featureItem}>
                <div className={styles.checkmark}>✓</div>
                <Text as="p" variant="bodyMd">
                  Revenue tracking & forecasting
                </Text>
              </div>
            </BlockStack>
          </Card>
        </BlockStack>
      )
    },
    
    // Slide 2: Bulk Edit + How-to's
    {
      icon: PackageIcon,
      iconClass: `${styles.iconWrapper} ${styles.iconWrapperSlide2}`,
      title: "Bulk Product Management",
      subtitle: "Edit multiple products at once",
      content: (
        <BlockStack gap="400">
          <Text as="p" variant="bodyMd" tone="subdued">
            Save time by updating prices, inventory, and product details for multiple items simultaneously.
          </Text>
          
          <Card>
            <BlockStack gap="200">
              <div className={styles.featureItem}>
                <div className={`${styles.bullet} ${styles.bulletSlide2}`}></div>
                <Text as="p" variant="bodyMd">
                  Bulk price updates across categories
                </Text>
              </div>
              <div className={styles.featureItem}>
                <div className={`${styles.bullet} ${styles.bulletSlide2}`}></div>
                <Text as="p" variant="bodyMd">
                  Quick inventory adjustments
                </Text>
              </div>
              <div className={styles.featureItem}>
                <div className={`${styles.bullet} ${styles.bulletSlide2}`}></div>
                <Text as="p" variant="bodyMd">
                  CSV export/import functionality
                </Text>
              </div>
            </BlockStack>
          </Card>

          <a 
            href="https://docs.spector-app.com/bulk-edit" 
            target="_blank" 
            rel="noopener noreferrer"
            className={`${styles.learnButton} ${styles.learnButtonSlide2}`}
          >
            📚 Learn How It Works
          </a>
        </BlockStack>
      )
    },
    
    // Slide 3: Forecasting
    {
      icon: ChartVerticalIcon,
      iconClass: `${styles.iconWrapper} ${styles.iconWrapperSlide3}`,
      title: "Inventory Forecasting",
      subtitle: "Predict demand & prevent stockouts",
      content: (
        <BlockStack gap="400">
          <Text as="p" variant="bodyMd" tone="subdued">
            Use AI-powered forecasting to predict when you'll run out of stock and plan ahead.
          </Text>
          
          <Card>
            <BlockStack gap="200">
              <div className={styles.featureItem}>
                <div className={`${styles.bullet} ${styles.bulletSlide3}`}></div>
                <Text as="p" variant="bodyMd">
                  Sales trend analysis with charts
                </Text>
              </div>
              <div className={styles.featureItem}>
                <div className={`${styles.bullet} ${styles.bulletSlide3}`}></div>
                <Text as="p" variant="bodyMd">
                  Smart restock recommendations
                </Text>
              </div>
              <div className={styles.featureItem}>
                <div className={`${styles.bullet} ${styles.bulletSlide3}`}></div>
                <Text as="p" variant="bodyMd">
                  Demand predictions by product
                </Text>
              </div>
            </BlockStack>
          </Card>

          <a 
            href="https://docs.spector-app.com/forecasting" 
            target="_blank" 
            rel="noopener noreferrer"
            className={`${styles.learnButton} ${styles.learnButtonSlide3}`}
          >
            📈 Learn How It Works
          </a>
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

  // Handle final action - subscribe or just close
  const handleFinalAction = () => {
    if (!hasSubscription && handleSubscribe) {
      handleSubscribe();
    } else {
      handleClose();
    }
  };

  // Don't render modal content until it's ready to prevent freezing
  if (!isOpen || !isModalReady) {
    return null;
  }

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      title=""
      primaryAction={{
        content: isLastSlide 
          ? (!hasSubscription ? "🚀 Start Free Trial" : "✨ Get Started")
          : "Next →",
        onAction: isLastSlide ? handleFinalAction : nextSlide,
      }}
      secondaryActions={[
        ...(currentSlide > 0 ? [{
          content: "← Previous",
          onAction: prevSlide,
        }] : []),
        {
          content: isLastSlide ? "Explore App" : "Skip",
          onAction: handleClose,
        }
      ]}
    >
      <Modal.Section>
        <BlockStack gap="500">
          {/* Icon and Title */}
          <BlockStack gap="300" align="center">
            <div className={currentSlideData.iconClass}>
              <Icon source={currentSlideData.icon} />
            </div>
            
            <BlockStack gap="100" align="center">
              <Text as="h2" variant="headingLg" alignment="center">
                {currentSlideData.title}
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                {currentSlideData.subtitle}
              </Text>
            </BlockStack>
          </BlockStack>

          {/* Content */}
          {currentSlideData.content}

          {/* Slide Indicators */}
          <InlineStack gap="100" align="center">
            {slides.map((_, index) => (
              <div
                key={index}
                className={`${styles.slideIndicator} ${
                  index === currentSlide 
                    ? styles.slideIndicatorActive 
                    : styles.slideIndicatorInactive
                }`}
                onClick={() => setCurrentSlide(index)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setCurrentSlide(index);
                  }
                }}
              />
            ))}
          </InlineStack>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}