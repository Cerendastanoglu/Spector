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
    subtitle: "Transform your inventory management with intelligent insights",
    centerpiece: {
      title: "Smart Inventory Intelligence",
      description: "Harness the power of real-time analytics and AI-driven forecasting to optimize your Shopify store's performance"
    },
    features: [
      {
        icon: "📊",
        title: "Live Analytics",
        description: "Real-time inventory health monitoring"
      },
      {
        icon: "🤖",
        title: "AI Forecasting",
        description: "Predict demand and prevent stockouts"
      },
      {
        icon: "💰",
        title: "Revenue Insights",
        description: "Track profitability and margins"
      }
    ]
  },
  {
    title: "Product Management",
    subtitle: "Effortlessly manage your entire product catalog",
    centerpiece: {
      title: "Bulk Operations Hub",
      description: "Select, filter, and update hundreds of products with precision and confidence using our streamlined workflow"
    },
    features: [
      {
        icon: "🔍",
        title: "Smart Filters",
        description: "Advanced product selection tools"
      },
      {
        icon: "✏️",
        title: "Bulk Editor",
        description: "Update multiple products instantly"
      },
      {
        icon: "⚡",
        title: "Quick Actions",
        description: "One-click mass operations"
      }
    ]
  },
  {
    title: "Automation & Alerts",
    subtitle: "Stay informed with intelligent monitoring",
    centerpiece: {
      title: "Smart Notification Center",
      description: "Automated alerts, scheduled reports, and real-time monitoring keep you ahead of inventory challenges"
    },
    features: [
      {
        icon: "🔔",
        title: "Smart Alerts",
        description: "Intelligent inventory notifications"
      },
      {
        icon: "📧",
        title: "Auto Reports",
        description: "Scheduled email summaries"
      },
      {
        icon: "🔒",
        title: "Secure Data",
        description: "Enterprise-grade protection"
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

          <div className={styles.centerpiece}>
            <div className={styles.centerpieceContent}>
              <h2>{currentSlideData.centerpiece.title}</h2>
              <p>{currentSlideData.centerpiece.description}</p>
            </div>
          </div>

          <div className={styles.features}>
            {currentSlideData.features.map((feature, index) => (
              <div key={index} className={styles.feature}>
                <div className={styles.featureIcon}>{feature.icon}</div>
                <div className={styles.featureContent}>
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