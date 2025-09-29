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
    subtitle: "Your intelligent inventory management solution",
    features: [
      {
        icon: "📊",
        title: "Real-Time Dashboard",
        description: "Monitor inventory health with live analytics and performance metrics."
      },
      {
        icon: "🤖",
        title: "AI Forecasting",
        description: "Predict demand trends to prevent stockouts and optimize inventory."
      },
      {
        icon: "💰",
        title: "Revenue Tracking",
        description: "Track profitability and identify your best-performing products."
      },
      {
        icon: "📈",
        title: "Performance Analytics",
        description: "Analyze sales patterns and inventory turnover rates."
      },
      {
        icon: "⚡",
        title: "Quick Insights",
        description: "Get instant overview of your inventory status at a glance."
      },
      {
        icon: "🎯",
        title: "Smart Alerts",
        description: "Receive notifications for important inventory changes."
      }
    ]
  },
  {
    title: "Product Management Tools",
    subtitle: "Efficiently manage your entire product catalog",
    features: [
      {
        icon: "📦",
        title: "Product Selection",
        description: "Advanced filtering to find and select specific products quickly."
      },
      {
        icon: "✏️",
        title: "Bulk Editing",
        description: "Update prices, descriptions, and details across multiple products."
      },
      {
        icon: "🔍",
        title: "Smart Filters",
        description: "Filter by stock level, price range, vendor, and product type."
      },
      {
        icon: "📋",
        title: "Two-Step Workflow",
        description: "Select products first, then apply bulk changes efficiently."
      },
      {
        icon: "⚙️",
        title: "Bulk Operations",
        description: "Manage hundreds of products with single actions."
      },
      {
        icon: "📊",
        title: "Product Analytics",
        description: "View performance metrics for individual products."
      }
    ]
  },
  {
    title: "Automation & Notifications",
    subtitle: "Stay informed with intelligent monitoring",
    features: [
      {
        icon: "🔔",
        title: "Inventory Alerts",
        description: "Automated notifications for low stock and out-of-stock items."
      },
      {
        icon: "📧",
        title: "Email Reports",
        description: "Receive detailed inventory reports directly in your inbox."
      },
      {
        icon: "🛡️",
        title: "Data Security",
        description: "Encrypted data storage with automated retention policies."
      },
      {
        icon: "📱",
        title: "Real-time Updates",
        description: "Instant notifications for critical inventory changes."
      },
      {
        icon: "⏰",
        title: "Scheduled Reports",
        description: "Automated daily, weekly, or monthly inventory summaries."
      },
      {
        icon: "🎛️",
        title: "Custom Settings",
        description: "Configure notification preferences to match your workflow."
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
                <div className={styles.featureIcon}>{feature.icon}</div>
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