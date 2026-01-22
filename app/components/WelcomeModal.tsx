import { useState, useEffect } from "react";
import {
  Modal,
  Text,
  BlockStack,
  InlineStack,
  Icon,
} from "@shopify/polaris";
import {
  ChartVerticalIcon,
  PackageIcon,
  StarIcon,
  ChartLineIcon,
  CashDollarIcon,
  ProductIcon,
  EditIcon,
  ChartPopularIcon,
  LightbulbIcon,
  StarFilledIcon,
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
      icon: StarIcon, // Keep for type compatibility
      iconClass: styles.logoWrapper,
      title: "Welcome to Spector",
      subtitle: "Your intelligent bulk edit companion",
      isLogoSlide: true,
      content: (
        <BlockStack gap="400">
          <div className={styles.introText}>
            <Text as="p" variant="bodyLg" tone="subdued" alignment="center">
              Transform how you manage your Shopify catalog with powerful tools designed for efficiency
            </Text>
          </div>
          
          <div className={styles.featureGrid}>
            <div className={`${styles.featureCard} ${styles.animateIn1}`}>
              <div className={styles.featureIconGlass}>
                <Icon source={ChartLineIcon} />
              </div>
              <div>
                <Text as="p" variant="bodyMd" fontWeight="semibold">
                  Real-time Analytics
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Track performance instantly
                </Text>
              </div>
            </div>
            
            <div className={`${styles.featureCard} ${styles.animateIn2}`}>
              <div className={styles.featureIconGlass}>
                <Icon source={PackageIcon} />
              </div>
              <div>
                <Text as="p" variant="bodyMd" fontWeight="semibold">
                  Bulk Operations
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Edit hundreds at once
                </Text>
              </div>
            </div>
            
            <div className={`${styles.featureCard} ${styles.animateIn3}`}>
              <div className={styles.featureIconGlass}>
                <Icon source={ChartPopularIcon} />
              </div>
              <div>
                <Text as="p" variant="bodyMd" fontWeight="semibold">
                  Smart Forecasting
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Predict demand ahead
                </Text>
              </div>
            </div>
            
            <div className={`${styles.featureCard} ${styles.animateIn4}`}>
              <div className={styles.featureIconGlass}>
                <Icon source={CashDollarIcon} />
              </div>
              <div>
                <Text as="p" variant="bodyMd" fontWeight="semibold">
                  Revenue Tracking
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Monitor growth daily
                </Text>
              </div>
            </div>
          </div>
        </BlockStack>
      )
    },
    
    // Slide 2: Bulk Edit + How-to's
    {
      icon: PackageIcon,
      iconClass: `${styles.iconWrapperStatic} ${styles.iconWrapperSlide2}`,
      title: "Bulk Edit",
      subtitle: "Edit hundreds of products in seconds, not hours",
      content: (
        <BlockStack gap="400">
          <div className={styles.glassyCard}>
            <div className={styles.cardGlow}></div>
            <div className={styles.cardContent}>
              <div className={styles.statsRow}>
                <div className={styles.statItem}>
                  <div className={styles.statNumber}>10x</div>
                  <Text as="p" variant="bodySm" tone="subdued">Faster Editing</Text>
                </div>
                <div className={styles.statDivider}></div>
                <div className={styles.statItem}>
                  <div className={styles.statNumber}>100+</div>
                  <Text as="p" variant="bodySm" tone="subdued">Products at Once</Text>
                </div>
                <div className={styles.statDivider}></div>
                <div className={styles.statItem}>
                  <div className={styles.statNumber}>5min</div>
                  <Text as="p" variant="bodySm" tone="subdued">Average Save</Text>
                </div>
              </div>
            </div>
          </div>
          
          <BlockStack gap="300">
            <div className={`${styles.benefitCard} ${styles.float1}`}>
              <div className={styles.benefitBadge}>
                <Icon source={CashDollarIcon} />
              </div>
              <div className={styles.benefitText}>
                <Text as="p" variant="bodyMd" fontWeight="semibold">
                  Smart Pricing
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Update prices with percentage changes, fixed amounts, or replace patterns
                </Text>
              </div>
            </div>

            <div className={`${styles.benefitCard} ${styles.float2}`}>
              <div className={styles.benefitBadge}>
                <Icon source={ProductIcon} />
              </div>
              <div className={styles.benefitText}>
                <Text as="p" variant="bodyMd" fontWeight="semibold">
                  Inventory Control
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Set stock levels, SKUs, and tracking across variants instantly
                </Text>
              </div>
            </div>

            <div className={`${styles.benefitCard} ${styles.float3}`}>
              <div className={styles.benefitBadge}>
                <Icon source={EditIcon} />
              </div>
              <div className={styles.benefitText}>
                <Text as="p" variant="bodyMd" fontWeight="semibold">
                  Content Updates
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Modify titles with prefix/suffix/replace, update descriptions and tags
                </Text>
              </div>
            </div>
          </BlockStack>
        </BlockStack>
      )
    },
    
    // Slide 3: Forecasting
    {
      icon: ChartVerticalIcon,
      iconClass: `${styles.iconWrapperStatic} ${styles.iconWrapperSlide3}`,
      title: "AI-Powered Insights",
      subtitle: "Stay ahead with intelligent inventory forecasting",
      content: (
        <BlockStack gap="400">
          <div className={styles.insightCard}>
            <div className={styles.insightGlow}></div>
            <div className={styles.insightContent}>
              <Text as="p" variant="bodyMd" alignment="center">
                Machine learning analyzes your sales patterns to predict stockouts before they happen
              </Text>
            </div>
          </div>
          
          <BlockStack gap="300">
            <div className={`${styles.benefitCard} ${styles.float1}`}>
              <div className={styles.benefitBadge}>
                <Icon source={ChartPopularIcon} />
              </div>
              <div className={styles.benefitText}>
                <Text as="p" variant="bodyMd" fontWeight="semibold">
                  Trend Analysis
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Visual charts showing sales velocity and seasonal patterns
                </Text>
              </div>
            </div>

            <div className={`${styles.benefitCard} ${styles.float2}`}>
              <div className={styles.benefitBadge}>
                <Icon source={LightbulbIcon} />
              </div>
              <div className={styles.benefitText}>
                <Text as="p" variant="bodyMd" fontWeight="semibold">
                  Actionable Recommendations
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Precise restock quantities calculated from demand predictions
                </Text>
              </div>
            </div>
          </BlockStack>

          <div className={styles.ctaCard}>
            <Text as="p" variant="bodyMd" alignment="center">
              <span className={styles.ctaIcon}>
                <Icon source={StarFilledIcon} />
              </span>
              <strong> Ready to streamline your workflow?</strong>
            </Text>
            <Text as="p" variant="bodySm" tone="subdued" alignment="center">
              Join thousands of merchants saving hours every week
            </Text>
          </div>
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
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          /* Force modal footer and buttons to be clickable */
          .Polaris-Modal-Footer {
            z-index: 10000 !important;
            pointer-events: auto !important;
            position: relative !important;
          }
          
          .Polaris-Modal-Footer * {
            pointer-events: auto !important;
          }
          
          .Polaris-Modal-Footer button,
          .Polaris-Modal-Footer .Polaris-Button {
            pointer-events: auto !important;
            touch-action: manipulation !important;
            min-height: 44px !important;
            cursor: pointer !important;
            position: relative !important;
            z-index: 10001 !important;
          }
          
          /* Remove extra padding from modal section */
          .Polaris-Modal-Section {
            padding-bottom: 16px !important;
          }
        `
      }} />
      <Modal
      open={isOpen}
      onClose={handleClose}
      title=""
      primaryAction={{
        content: isLastSlide 
          ? (hasSubscription ? "Get Started" : "Start Free Trial")
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
        <BlockStack gap="200">
          {/* Icon/Logo and Title */}
          <BlockStack gap="200" align="center">
            {currentSlideData.isLogoSlide ? (
              <div className={currentSlideData.iconClass}>
                <img 
                  src="/assets/Logo.svg" 
                  alt="Spector Logo" 
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            ) : (
              <div className={currentSlideData.iconClass}>
                <Icon source={currentSlideData.icon} />
              </div>
            )}
            
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
    </>
  );
}