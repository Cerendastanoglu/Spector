import { useState, useEffect } from "react";
import {
  Button,
  Icon,
} from "@shopify/polaris";
import {
  ChartVerticalIcon,
  PackageIcon,
  OrderIcon,
  StarIcon,
  CheckIcon,
} from "@shopify/polaris-icons";
import styles from "./WelcomeModal.module.css";

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isModalReady, setIsModalReady] = useState(false);

  // Add a small delay before showing modal content
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setIsModalReady(true);
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setIsModalReady(false);
      setCurrentStep(0);
    }
  }, [isOpen]);

  const features = [
    {
      icon: ChartVerticalIcon,
      title: "Smart Analytics",
      description: "Real-time insights into your product performance and inventory health"
    },
    {
      icon: PackageIcon,
      title: "Inventory Management",
      description: "Never run out of stock with intelligent monitoring and alerts"
    },
    {
      icon: OrderIcon,
      title: "Bulk Operations",
      description: "Manage hundreds of products efficiently with powerful bulk editing tools"
    }
  ];

  const nextStep = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  if (!isOpen || !isModalReady) {
    return null;
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.glassModal}>
        {/* Close button */}
        <button 
          className={styles.closeButton}
          onClick={onClose}
          type="button"
        >
          ✕
        </button>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.logoContainer}>
            <div className={styles.logo}>
              <Icon source={StarIcon} />
            </div>
          </div>
          <h1 className={styles.title}>Welcome to Spector</h1>
          <p className={styles.subtitle}>
            Your intelligent inventory management companion
          </p>
        </div>

        {/* Progress Steps */}
        <div className={styles.progressContainer}>
          {[0, 1, 2].map((step) => (
            <div 
              key={step}
              className={`${styles.progressStep} ${step <= currentStep ? styles.active : ''}`}
            />
          ))}
        </div>

        {/* Content */}
        <div className={styles.content}>
          {currentStep === 0 && (
            <div className={styles.step}>
              <div className={styles.stepHeader}>
                <h2>Get Started in Seconds</h2>
                <p>Spector is designed to help you manage inventory effortlessly</p>
              </div>
              <div className={styles.checklistContainer}>
                {[
                  "Connect your Shopify store",
                  "Analyze your current inventory",
                  "Start optimizing your business"
                ].map((item, index) => (
                  <div key={index} className={styles.checklistItem}>
                    <div className={styles.checkIcon}>
                      <Icon source={CheckIcon} />
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className={styles.step}>
              <div className={styles.stepHeader}>
                <h2>Powerful Features</h2>
                <p>Everything you need to optimize your inventory</p>
              </div>
              <div className={styles.featuresGrid}>
                {features.map((feature, index) => (
                  <div key={index} className={styles.featureCard}>
                    <div className={styles.featureIcon}>
                      <Icon source={feature.icon} />
                    </div>
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className={styles.step}>
              <div className={styles.stepHeader}>
                <h2>You're All Set!</h2>
                <p>Start exploring your dashboard and discover insights</p>
              </div>
              <div className={styles.finalStep}>
                <div className={styles.successIcon}>
                  <Icon source={CheckIcon} />
                </div>
                <div className={styles.finalMessage}>
                  <h3>Ready to optimize your inventory?</h3>
                  <p>Click "Get Started" to begin your journey with Spector</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <Button
            variant="primary"
            size="large"
            onClick={nextStep}
          >
            {currentStep === 2 ? "Get Started" : "Continue"}
          </Button>
          {currentStep > 0 && (
            <Button
              variant="plain"
              onClick={() => setCurrentStep(currentStep - 1)}
            >
              Back
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}