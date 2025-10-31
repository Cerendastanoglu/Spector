import {
  Page,
  Card,
  BlockStack,
  Text,
} from "@shopify/polaris";
import {
  QuestionCircleIcon,
  EmailIcon,
  BookIcon,
} from "@shopify/polaris-icons";
import styles from "./Help.module.css";

interface HelpProps {
  isVisible: boolean;
}

export function Help({ isVisible: _isVisible }: HelpProps) {
  
  const quickActions = [
    {
      icon: EmailIcon,
      title: "Email Support",
      description: "Get help directly from our team",
      action: "support@spector.app",
      type: "email" as const,
    },
    {
      icon: BookIcon,
      title: "Help Center",
      description: "Browse guides and resources",
      action: "View Resources",
      type: "docs" as const,
    },
  ];

  const commonQuestions = [
    {
      question: "How do I track inventory levels?",
      answer: "Navigate to the Dashboard to see real-time inventory status for all your products."
    },
    {
      question: "How do I export product data?",
      answer: "Go to Product Management and click the 'Export' button to download your data as CSV."
    },
    {
      question: "Can I edit multiple products at once?",
      answer: "Yes! Use the Bulk Operations feature to edit multiple products simultaneously."
    },
    {
      question: "How does revenue forecasting work?",
      answer: "Our AI analyzes your historical sales data to predict future revenue trends."
    },
  ];

  return (
    <Page>
      <div className={styles.helpPage}>
        
        {/* Hero Section */}
        <div className={styles.hero}>
          <div className={styles.heroIcon}>
            <QuestionCircleIcon />
          </div>
          <Text as="h1" variant="headingXl">
            How can we help you?
          </Text>
          <Text as="p" variant="bodyMd" tone="subdued">
            Get answers, find resources, or contact our support team
          </Text>
        </div>

        {/* Quick Actions Grid */}
        <div className={styles.actionsGrid}>
          {quickActions.map((action, index) => (
            <Card key={index}>
              <div className={styles.actionCard}>
                <div className={styles.actionIcon}>
                  <action.icon />
                </div>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingMd" fontWeight="semibold">
                    {action.title}
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    {action.description}
                  </Text>
                  {action.type === 'email' ? (
                    <a href={`mailto:${action.action}`} className={styles.actionButton}>
                      {action.action}
                    </a>
                  ) : (
                    <button className={styles.actionButton}>
                      {action.action}
                    </button>
                  )}
                </BlockStack>
              </div>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingLg">
              Frequently Asked Questions
            </Text>
            
            <div className={styles.faqList}>
              {commonQuestions.map((item, index) => (
                <div key={index} className={styles.faqItem}>
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    {item.question}
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    {item.answer}
                  </Text>
                </div>
              ))}
            </div>
          </BlockStack>
        </Card>

        {/* Footer Links */}
        <div className={styles.footerLinks}>
          <a href="https://www.spector-app.com/privacy" target="_blank" rel="noopener noreferrer">
            Privacy Policy
          </a>
          <span className={styles.separator}>•</span>
          <a href="https://www.spector-app.com/terms" target="_blank" rel="noopener noreferrer">
            Terms of Service
          </a>
          <span className={styles.separator}>•</span>
          <a href="https://www.spector-app.com/gdpr" target="_blank" rel="noopener noreferrer">
            GDPR
          </a>
        </div>

      </div>
    </Page>
  );
}
