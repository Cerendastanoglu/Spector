import { useState, useEffect } from "react";
import {
  Button,
  ButtonGroup,
} from "@shopify/polaris";
import styles from "./WelcomeModal.module.css";

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenHelp?: () => void;
}

const slides = [
  {
    title: "Welcome to Spector",
    subtitle: "Your intelligent inventory management solution designed to optimize your Shopify store operations",
    features: [
      {
        icon: "Analytics",
        title: "Real-Time Dashboard",
        description: "Get comprehensive insights into your inventory health with live data visualization, performance metrics, and customizable reporting tools that help you make informed business decisions."
      },
      {
        icon: "Forecast",
        title: "AI-Powered Forecasting",
        description: "Leverage advanced machine learning algorithms to predict demand patterns, seasonal trends, and optimal reorder points to prevent stockouts and reduce excess inventory costs."
      },
      {
        icon: "Revenue",
        title: "Revenue Optimization",
        description: "Track profitability across all products with detailed cost analysis, margin calculations, and performance comparisons to identify your most valuable inventory items."
      },
      {
        icon: "Performance",
        title: "Performance Analytics",
        description: "Analyze sales velocity, inventory turnover rates, and product lifecycle patterns with advanced filtering options and trend analysis for strategic planning."
      },
      {
        icon: "Insights",
        title: "Quick Insights Hub",
        description: "Access instant summaries of critical inventory metrics, alerts, and recommendations through an intuitive interface designed for busy store owners."
      },
      {
        icon: "Alerts",
        title: "Intelligent Alerts",
        description: "Receive customizable notifications for low stock levels, price changes, and critical inventory events with smart filtering to reduce notification fatigue."
      }
    ]
  },
  {
    title: "Product Management Tools",
    subtitle: "Streamline your product catalog operations with powerful bulk management capabilities",
    features: [
      {
        icon: "Selection",
        title: "Advanced Product Selection",
        description: "Use sophisticated filtering and search capabilities to quickly identify and select products based on SKU, vendor, category, stock levels, price ranges, and custom criteria."
      },
      {
        icon: "Edit",
        title: "Bulk Editing System",
        description: "Efficiently update prices, descriptions, tags, and product details across hundreds of items simultaneously with validation checks and rollback capabilities for error prevention."
      },
      {
        icon: "Filter",
        title: "Smart Filtering Engine",
        description: "Access comprehensive filtering options including stock status, profitability metrics, sales performance, vendor relationships, and custom product attributes for precise selection."
      },
      {
        icon: "Workflow",
        title: "Streamlined Workflow",
        description: "Follow an intuitive two-step process: first select your target products using our powerful filters, then apply bulk changes with confidence using our preview and confirmation system."
      },
      {
        icon: "Operations",
        title: "Bulk Operations Suite",
        description: "Perform mass updates, price adjustments, inventory corrections, and product status changes across your entire catalog with batch processing and progress tracking."
      },
      {
        icon: "ProductAnalytics",
        title: "Individual Product Insights",
        description: "Access detailed performance metrics, sales history, profit margins, and trend analysis for each product to make data-driven decisions about your inventory."
      }
    ]
  },
  {
    title: "Automation & Monitoring",
    subtitle: "Stay ahead of inventory challenges with intelligent automation and comprehensive monitoring systems",
    features: [
      {
        icon: "Notifications",
        title: "Smart Inventory Alerts",
        description: "Receive intelligent notifications for low stock thresholds, out-of-stock situations, and unusual sales patterns with customizable urgency levels and delivery preferences."
      },
      {
        icon: "Email",
        title: "Automated Email Reports",
        description: "Get comprehensive inventory reports delivered to your inbox on schedule, including performance summaries, stock level updates, and actionable recommendations for inventory optimization."
      },
      {
        icon: "Security",
        title: "Enterprise Data Security",
        description: "Benefit from bank-level encryption, automated data backups, GDPR-compliant retention policies, and secure API connections to protect your sensitive business information."
      },
      {
        icon: "RealTime",
        title: "Real-Time Monitoring",
        description: "Monitor critical inventory changes as they happen with instant notifications for significant stock movements, price fluctuations, and system alerts requiring immediate attention."
      },
      {
        icon: "Schedule",
        title: "Flexible Reporting Schedule",
        description: "Configure automated daily, weekly, or monthly inventory summaries with customizable content, metrics focus, and delivery timing to match your business review cycles."
      },
      {
        icon: "Settings",
        title: "Personalized Configuration",
        description: "Tailor notification thresholds, alert categories, report formats, and automation rules to align perfectly with your unique business processes and management style."
      }
    ]
  }
];

export function WelcomeModal({ isOpen, onClose, onOpenHelp }: WelcomeModalProps) {
  const [isModalReady, setIsModalReady] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setIsModalReady(true);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setIsModalReady(false);
      setCurrentSlide(0);
    }
  }, [isOpen]);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handlePrevious = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleGetStarted = () => {
    onClose();
  };

  const handleOpenHelp = () => {
    onClose();
    onOpenHelp?.();
  };

  const currentSlideData = slides[currentSlide];

  if (!isOpen || !isModalReady) {
    return null;
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button 
          className={styles.closeButton}
          onClick={onClose}
          type="button"
          aria-label="Close welcome modal"
        >
          ×
        </button>

        <div className={styles.content}>
          <div className={styles.header}>
            <h1>{currentSlideData.title}</h1>
            <p>{currentSlideData.subtitle}</p>
          </div>

          <div className={styles.features}>
            {currentSlideData.features.map((feature, index) => (
              <div key={index} className={styles.feature}>
                <div className={styles.featureIcon}>{feature.icon.slice(0, 3)}</div>
                <div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.slideIndicators}>
            {slides.map((_, index) => (
              <button
                key={index}
                className={`${styles.slideIndicator} ${
                  index === currentSlide ? styles.active : ''
                }`}
                onClick={() => setCurrentSlide(index)}
                type="button"
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          <div className={styles.navigation}>
            <Button
              variant="secondary"
              disabled={currentSlide === 0}
              onClick={handlePrevious}
            >
              Previous
            </Button>
            
            {currentSlide < slides.length - 1 ? (
              <Button
                variant="primary"
                onClick={handleNext}
              >
                Next
              </Button>
            ) : (
              <ButtonGroup>
                <Button
                  variant="secondary"
                  onClick={handleOpenHelp}
                >
                  View Help Guide
                </Button>
                <Button
                  variant="primary"
                  onClick={handleGetStarted}
                >
                  Get Started
                </Button>
              </ButtonGroup>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}