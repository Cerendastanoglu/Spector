import { useState } from "react";
import {
  Page,
  Card,
  Text,
  Button,
  BlockStack,
  InlineStack,
  Box,
  Icon,
  Grid,
  Collapsible,
} from "@shopify/polaris";
import {
  ChartVerticalIcon,
  InventoryIcon,
  OrderIcon,
  MarketsIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@shopify/polaris-icons";

interface WelcomePageProps {
  onNavigate: (tab: string) => void;
}

export function WelcomePage({ onNavigate }: WelcomePageProps) {
  const [showWhatsNew, setShowWhatsNew] = useState(false);

  return (
    <>
      {/* Add Unbounded font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Unbounded:wght@400;700&display=swap');
        .unbounded-bold {
          font-family: 'Unbounded', cursive !important;
          font-weight: 700 !important;
        }
      `}</style>
    <Page>
      <BlockStack gap="500">
        {/* Unified Welcome & What's New Section */}
        <div style={{
          background: 'linear-gradient(135deg, #fef7f9 0%, #fdf2f5 50%, #fef7f9 100%)',
          borderRadius: '24px',
          border: '1px solid rgba(255, 32, 78, 0.1)',
          padding: '64px 40px',
          boxShadow: '0 20px 60px rgba(255, 32, 78, 0.08)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Subtle background pattern */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 20% 80%, rgba(255, 32, 78, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(160, 21, 62, 0.03) 0%, transparent 50%)',
            pointerEvents: 'none'
          }} />
          
          <BlockStack gap="800">
            {/* Welcome Hero Section */}
            <BlockStack gap="600" align="center">
              <BlockStack gap="400" align="center">
                <Text as="h1" variant="heading3xl" alignment="center">
                  <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: '700' }}>
                    Welcome to Spector
                  </span>
                </Text>
                <Text as="p" variant="headingLg" alignment="center" tone="subdued">
                  <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: '600' }}>
                    Your Intelligent Inventory Management System
                  </span>
                </Text>
              </BlockStack>
              
              <Box paddingBlockStart="200" paddingBlockEnd="400" maxWidth="600px">
                <Text as="p" variant="bodyLg" alignment="center" tone="subdued">
                  Transform your inventory management with intelligent alerts, real-time tracking, and actionable insights. 
                  Spector helps you prevent stockouts, optimize product performance, and make data-driven decisions that grow your business.
                </Text>
              </Box>
              
              <InlineStack gap="400" align="center">
                <Button
                  variant="primary"
                  size="large"
                  onClick={() => onNavigate("dashboard")}
                >
                  Explore Your Dashboard
                </Button>
                <Button
                  variant="secondary"
                  size="large"
                  onClick={() => onNavigate("help")}
                >
                  Learn More
                </Button>
              </InlineStack>
            </BlockStack>

            {/* Divider with gradient */}
            <div style={{
              height: '1px',
              background: 'linear-gradient(90deg, transparent 0%, rgba(255, 32, 78, 0.2) 50%, transparent 100%)',
              margin: '0 auto',
              width: '60%'
            }} />

            {/* What's New Section - Collapsible */}
            <BlockStack gap="400">
              {/* Collapsible Header */}
              <div 
                style={{ 
                  cursor: 'pointer',
                  padding: '20px',
                  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                  borderRadius: '16px',
                  border: '2px solid rgba(148, 163, 184, 0.1)',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => setShowWhatsNew(!showWhatsNew)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)';
                  e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)';
                  e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.1)';
                }}
              >
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="100">
                    <Text as="h2" variant="headingMd">
                      <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: '600' }}>
                        What's New This Month
                      </span>
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Latest features and improvements designed to boost your productivity
                    </Text>
                  </BlockStack>
                  <Button
                    variant="tertiary"
                    icon={showWhatsNew ? ChevronUpIcon : ChevronDownIcon}
                    onClick={() => setShowWhatsNew(!showWhatsNew)}
                  >
                    {showWhatsNew ? 'Hide' : 'Show'} Updates
                  </Button>
                </InlineStack>
              </div>

              {/* Collapsible Content */}
              <Collapsible
                open={showWhatsNew}
                id="whats-new-content"
                transition={{
                  duration: '300ms',
                  timingFunction: 'ease-in-out'
                }}
              >
                <BlockStack gap="400">
            
            <Grid>
              <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
                <div style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #fefcfd 100%)',
                  padding: '32px 24px',
                  borderRadius: '16px',
                  border: '2px solid rgba(255, 32, 78, 0.1)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(255, 32, 78, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(255, 32, 78, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.04)';
                  e.currentTarget.style.borderColor = 'rgba(255, 32, 78, 0.1)';
                }}>
                  <BlockStack gap="400">
                    <div style={{
                      width: '56px',
                      height: '56px',
                      background: 'linear-gradient(135deg, #FF204E, #A0153E)',
                      borderRadius: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto'
                    }}>
                      <div style={{ color: 'white' }}>
                        <Icon source={ChartVerticalIcon} />
                      </div>
                    </div>
                    <BlockStack gap="200" align="center">
                      <Text as="h3" variant="headingMd" alignment="center">Enhanced Analytics</Text>
                      <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                        Advanced revenue tracking and profit insights to identify your most valuable products and optimize inventory decisions.
                      </Text>
                    </BlockStack>
                  </BlockStack>
                </div>
              </Grid.Cell>
              
              <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
                <div style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #fefcfd 100%)',
                  padding: '32px 24px',
                  borderRadius: '16px',
                  border: '2px solid rgba(160, 21, 62, 0.1)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(160, 21, 62, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(160, 21, 62, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.04)';
                  e.currentTarget.style.borderColor = 'rgba(160, 21, 62, 0.1)';
                }}>
                  <BlockStack gap="400">
                    <div style={{
                      width: '56px',
                      height: '56px',
                      background: 'linear-gradient(135deg, #A0153E, #5D0E41)',
                      borderRadius: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto'
                    }}>
                      <div style={{ color: 'white' }}>
                        <Icon source={MarketsIcon} />
                      </div>
                    </div>
                    <BlockStack gap="200" align="center">
                      <Text as="h3" variant="headingMd" alignment="center">Smart Forecasting</Text>
                      <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                        AI-powered predictions for optimal restocking times based on sales velocity, seasonality, and market trends.
                      </Text>
                    </BlockStack>
                  </BlockStack>
                </div>
              </Grid.Cell>
              
              <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
                <div style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #fefcfd 100%)',
                  padding: '32px 24px',
                  borderRadius: '16px',
                  border: '2px solid rgba(93, 14, 65, 0.1)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(93, 14, 65, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(93, 14, 65, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.04)';
                  e.currentTarget.style.borderColor = 'rgba(93, 14, 65, 0.1)';
                }}>
                  <BlockStack gap="400">
                    <div style={{
                      width: '56px',
                      height: '56px',
                      background: 'linear-gradient(135deg, #5D0E41, #00224D)',
                      borderRadius: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto'
                    }}>
                      <div style={{ color: 'white' }}>
                        <Icon source={OrderIcon} />
                      </div>
                    </div>
                    <BlockStack gap="200" align="center">
                      <Text as="h3" variant="headingMd" alignment="center">Mobile Alerts</Text>
                      <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                        Real-time push notifications on your mobile device when critical inventory events occur or thresholds are reached.
                      </Text>
                    </BlockStack>
                  </BlockStack>
                </div>
              </Grid.Cell>
            </Grid>
                </BlockStack>
              </Collapsible>
            </BlockStack>
          </BlockStack>
        </div>

        {/* Pro Tips for Success - Brand Colors */}
        <div style={{
          background: 'linear-gradient(135deg, #fef7f9 0%, #fdf2f5 50%, #fef7f9 100%)',
          borderRadius: '24px',
          padding: '48px 32px',
          border: '2px solid rgba(255, 32, 78, 0.1)',
          boxShadow: '0 12px 40px rgba(255, 32, 78, 0.08)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Decorative Background Elements */}
          <div style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '100px',
            height: '100px',
            background: 'radial-gradient(circle, rgba(255, 32, 78, 0.1) 0%, transparent 70%)',
            borderRadius: '50%'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-30px',
            left: '-30px',
            width: '120px',
            height: '120px',
            background: 'radial-gradient(circle, rgba(160, 21, 62, 0.05) 0%, transparent 70%)',
            borderRadius: '50%'
          }} />

          <BlockStack gap="500">
            {/* Section Header */}
            <BlockStack gap="200" align="center">
              <Text as="h2" variant="headingXl" alignment="center">
                <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: '700', color: '#A0153E' }}>
                  Pro Tips for Success
                </span>
              </Text>
              <Text as="p" variant="bodyLg" alignment="center" tone="subdued">
                Expert strategies to maximize your inventory management efficiency
              </Text>
            </BlockStack>

            {/* Tips Grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: '24px'
            }}>
              {/* Smart Thresholds Tip */}
              <div style={{
                background: 'linear-gradient(135deg, #fff7f8 0%, #fef2f2 100%)',
                borderRadius: '20px',
                padding: '32px',
                border: '2px solid rgba(255, 32, 78, 0.15)',
                boxShadow: '0 8px 32px rgba(255, 32, 78, 0.1)',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.boxShadow = '0 16px 48px rgba(255, 32, 78, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(255, 32, 78, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(255, 32, 78, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(255, 32, 78, 0.15)';
              }}>
                {/* Icon Badge */}
                <div style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  width: '48px',
                  height: '48px',
                  background: 'linear-gradient(135deg, #FF204E 0%, #A0153E 100%)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(255, 32, 78, 0.3)'
                }}>
                  <span style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>⚡</span>
                </div>

                <BlockStack gap="300">
                  <BlockStack gap="100">
                    <Text as="h3" variant="headingMd">
                      <span style={{ color: '#A0153E', fontWeight: '600' }}>Set Smart Thresholds</span>
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Configure alerts based on your average sales velocity. Fast-moving products need higher thresholds to prevent stockouts.
                    </Text>
                  </BlockStack>
                  <Button 
                    variant="primary"
                    onClick={() => onNavigate("settings")}
                    fullWidth
                  >
                    Configure Settings
                  </Button>
                </BlockStack>
              </div>

              {/* Weekly Analytics Tip */}
              <div style={{
                background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                borderRadius: '20px',
                padding: '32px',
                border: '2px solid rgba(93, 14, 65, 0.15)',
                boxShadow: '0 8px 32px rgba(93, 14, 65, 0.1)',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.boxShadow = '0 16px 48px rgba(93, 14, 65, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(93, 14, 65, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(93, 14, 65, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(93, 14, 65, 0.15)';
              }}>
                {/* Icon Badge */}
                <div style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  width: '48px',
                  height: '48px',
                  background: 'linear-gradient(135deg, #5D0E41 0%, #00224D 100%)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(93, 14, 65, 0.3)'
                }}>
                  <span style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>📊</span>
                </div>

                <BlockStack gap="300">
                  <BlockStack gap="100">
                    <Text as="h3" variant="headingMd">
                      <span style={{ color: '#5D0E41', fontWeight: '600' }}>Weekly Analytics Review</span>
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Check your dashboard every Monday to identify trends, analyze performance, and plan inventory strategy for the week ahead.
                    </Text>
                  </BlockStack>
                  <Button 
                    variant="secondary"
                    onClick={() => onNavigate("dashboard")}
                    fullWidth
                  >
                    View Dashboard
                  </Button>
                </BlockStack>
              </div>
            </div>
          </BlockStack>
        </div>

        {/* Core Features */}
        <Grid>
          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
            <Card>
              <Box padding="500">
                <BlockStack gap="300">
                  <Box background="bg-surface-success" padding="300" borderRadius="200">
                    <Icon source={InventoryIcon} tone="success" />
                  </Box>
                  <Text as="h3" variant="headingMd">Smart Alerts</Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Get notified before you run out. Set custom thresholds for each product.
                  </Text>
                </BlockStack>
              </Box>
            </Card>
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
            <Card>
              <Box padding="500">
                <BlockStack gap="300">
                  <Box background="bg-surface-info" padding="300" borderRadius="200">
                    <Icon source={ChartVerticalIcon} tone="info" />
                  </Box>
                  <Text as="h3" variant="headingMd">Real-Time Sync</Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Inventory updates instantly across all sales channels. Never oversell again.
                  </Text>
                </BlockStack>
              </Box>
            </Card>
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
            <Card>
              <Box padding="500">
                <BlockStack gap="300">
                  <Box background="bg-surface-warning" padding="300" borderRadius="200">
                    <Icon source={OrderIcon} tone="warning" />
                  </Box>
                  <Text as="h3" variant="headingMd">Sales Analytics</Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Identify your best-sellers and optimize your inventory strategy.
                  </Text>
                </BlockStack>
              </Box>
            </Card>
          </Grid.Cell>
        </Grid>

        {/* Choose Your Plan - Modern Redesign */}
        <div style={{
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #f8fafc 100%)',
          borderRadius: '24px',
          padding: '64px 40px',
          border: '1px solid rgba(148, 163, 184, 0.1)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.06)'
        }}>
          <BlockStack gap="600">
            {/* Header */}
            <BlockStack gap="300" align="center">
              <Text as="h2" variant="heading2xl" alignment="center">
                Choose Your Plan
              </Text>
              <Text as="p" variant="bodyLg" alignment="center" tone="subdued">
                Scale your inventory management as your business grows
              </Text>
            </BlockStack>
            
            {/* Pricing Cards */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
              gap: '32px',
              maxWidth: '800px',
              margin: '0 auto'
            }}>
              {/* Starter Plan */}
              <div style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #fefefe 100%)',
                borderRadius: '20px',
                padding: '40px 32px',
                border: '2px solid rgba(148, 163, 184, 0.15)',
                position: 'relative',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 20px 60px rgba(148, 163, 184, 0.15)';
                e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.06)';
                e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.15)';
              }}>
                <BlockStack gap="500">
                  {/* Plan Header */}
                  <BlockStack gap="300" align="center">
                    <div style={{
                      background: 'linear-gradient(135deg, #64748b, #475569)',
                      borderRadius: '12px',
                      padding: '12px 24px',
                      marginBottom: '8px'
                    }}>
                      <Text as="h3" variant="headingMd" alignment="center">
                        <span style={{ color: 'white', fontWeight: '600' }}>Starter</span>
                      </Text>
                    </div>
                    <BlockStack gap="100" align="center">
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '8px' }}>
                        <Text as="p" variant="heading2xl">Free</Text>
                        <Text as="p" variant="bodyLg" tone="subdued">forever</Text>
                      </div>
                      <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                        Perfect for small stores getting started
                      </Text>
                    </BlockStack>
                  </BlockStack>
                  
                  {/* Features */}
                  <BlockStack gap="300">
                    <div style={{
                      padding: '24px 0',
                      borderTop: '1px solid rgba(148, 163, 184, 0.1)',
                      borderBottom: '1px solid rgba(148, 163, 184, 0.1)'
                    }}>
                      <BlockStack gap="200">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '20px',
                            height: '20px',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>✓</span>
                          </div>
                          <Text as="p" variant="bodyMd">Track up to 100 products</Text>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '20px',
                            height: '20px',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>✓</span>
                          </div>
                          <Text as="p" variant="bodyMd">Basic analytics dashboard</Text>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '20px',
                            height: '20px',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>✓</span>
                          </div>
                          <Text as="p" variant="bodyMd">Email notifications</Text>
                        </div>
                      </BlockStack>
                    </div>
                  </BlockStack>
                  
                  <Button variant="secondary" fullWidth onClick={() => onNavigate("dashboard")}>
                    Current Plan
                  </Button>
                </BlockStack>
              </div>

              {/* Pro Plan */}
              <div style={{
                background: 'linear-gradient(135deg, #fef7f9 0%, #fdf2f5 50%, #fef7f9 100%)',
                borderRadius: '20px',
                padding: '40px 32px',
                border: '2px solid #FF204E',
                position: 'relative',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 20px 60px rgba(255, 32, 78, 0.15)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 32px 80px rgba(255, 32, 78, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 20px 60px rgba(255, 32, 78, 0.15)';
              }}>
                {/* Popular Badge */}
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'linear-gradient(135deg, #FF204E, #A0153E)',
                  borderRadius: '20px',
                  padding: '8px 20px',
                  boxShadow: '0 8px 24px rgba(255, 32, 78, 0.3)'
                }}>
                  <Text as="p" variant="bodySm" fontWeight="medium">
                    <span style={{ color: 'white' }}>Most Popular</span>
                  </Text>
                </div>

                <BlockStack gap="500">
                  {/* Plan Header */}
                  <BlockStack gap="300" align="center">
                    <div style={{
                      background: 'linear-gradient(135deg, #FF204E, #A0153E)',
                      borderRadius: '12px',
                      padding: '12px 24px',
                      marginTop: '16px',
                      marginBottom: '8px'
                    }}>
                      <Text as="h3" variant="headingMd" alignment="center">
                        <span style={{ color: 'white', fontWeight: '600' }}>Pro</span>
                      </Text>
                    </div>
                    <BlockStack gap="100" align="center">
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '8px' }}>
                        <Text as="p" variant="heading2xl">$19</Text>
                        <Text as="p" variant="bodyLg" tone="subdued">/month</Text>
                      </div>
                      <Text as="p" variant="bodySm" alignment="center" tone="success">
                        14-day free trial • Cancel anytime
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                        Advanced features for growing businesses
                      </Text>
                    </BlockStack>
                  </BlockStack>
                  
                  {/* Features */}
                  <BlockStack gap="300">
                    <div style={{
                      padding: '24px 0',
                      borderTop: '1px solid rgba(255, 32, 78, 0.1)',
                      borderBottom: '1px solid rgba(255, 32, 78, 0.1)'
                    }}>
                      <BlockStack gap="200">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '20px',
                            height: '20px',
                            background: 'linear-gradient(135deg, #FF204E, #A0153E)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>✓</span>
                          </div>
                          <Text as="p" variant="bodyMd">Unlimited products & locations</Text>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '20px',
                            height: '20px',
                            background: 'linear-gradient(135deg, #FF204E, #A0153E)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>✓</span>
                          </div>
                          <Text as="p" variant="bodyMd">Advanced analytics & forecasting</Text>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '20px',
                            height: '20px',
                            background: 'linear-gradient(135deg, #FF204E, #A0153E)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>✓</span>
                          </div>
                          <Text as="p" variant="bodyMd">Custom alerts & automations</Text>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '20px',
                            height: '20px',
                            background: 'linear-gradient(135deg, #FF204E, #A0153E)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>✓</span>
                          </div>
                          <Text as="p" variant="bodyMd">Priority support & API access</Text>
                        </div>
                      </BlockStack>
                    </div>
                  </BlockStack>
                  
                  <Button variant="primary" fullWidth onClick={() => onNavigate("help")}>
                    Start Free Trial
                  </Button>
                </BlockStack>
              </div>
            </div>
          </BlockStack>
        </div>

        {/* Quick Setup Guide */}


        {/* Getting Started - Brand Colors Design */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
          gap: '24px'
        }}>
          {/* Need Help Getting Started */}
          <div style={{
            background: 'linear-gradient(135deg, #f0f4ff 0%, #e6f1ff 100%)',
            borderRadius: '24px',
            padding: '40px',
            border: '2px solid rgba(0, 34, 77, 0.15)',
            boxShadow: '0 12px 40px rgba(0, 34, 77, 0.1)',
            transition: 'all 0.3s ease',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-6px)';
            e.currentTarget.style.boxShadow = '0 20px 60px rgba(0, 34, 77, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(0, 34, 77, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 34, 77, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(0, 34, 77, 0.15)';
          }}>
            {/* Decorative Elements */}
            <div style={{
              position: 'absolute',
              top: '-30px',
              right: '-30px',
              width: '100px',
              height: '100px',
              background: 'radial-gradient(circle, rgba(0, 34, 77, 0.1) 0%, transparent 70%)',
              borderRadius: '50%'
            }} />
            <div style={{
              position: 'absolute',
              bottom: '20px',
              left: '20px',
              width: '60px',
              height: '60px',
              background: 'rgba(0, 34, 77, 0.05)',
              borderRadius: '50%'
            }} />

            {/* Icon Badge */}
            <div style={{
              width: '60px',
              height: '60px',
              background: 'linear-gradient(135deg, #00224D 0%, #1e40af 100%)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 20px rgba(0, 34, 77, 0.3)',
              marginBottom: '24px'
            }}>
              <span style={{ color: 'white', fontSize: '28px', fontWeight: 'bold' }}>❓</span>
            </div>

            <BlockStack gap="400">
              <BlockStack gap="200">
                <Text as="h3" variant="headingLg">
                  <span style={{ 
                    color: '#00224D', 
                    fontFamily: 'Unbounded, sans-serif', 
                    fontWeight: '600' 
                  }}>
                    Need Help Getting Started?
                  </span>
                </Text>
                <Text as="p" variant="bodyLg" tone="subdued">
                  Access our comprehensive guides, video tutorials, and detailed pricing information to make the most of Spector.
                </Text>
              </BlockStack>
              <Button 
                variant="secondary"
                onClick={() => onNavigate("help")}
                size="large"
                fullWidth
              >
                Visit Help Center
              </Button>
            </BlockStack>
          </div>

          {/* Ready to Start Managing Inventory */}
          <div style={{
            background: 'linear-gradient(135deg, #fff7f8 0%, #fef2f2 100%)',
            borderRadius: '24px',
            padding: '40px',
            border: '2px solid rgba(255, 32, 78, 0.15)',
            boxShadow: '0 12px 40px rgba(255, 32, 78, 0.1)',
            transition: 'all 0.3s ease',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-6px)';
            e.currentTarget.style.boxShadow = '0 20px 60px rgba(255, 32, 78, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(255, 32, 78, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(255, 32, 78, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(255, 32, 78, 0.15)';
          }}>
            {/* Decorative Elements */}
            <div style={{
              position: 'absolute',
              top: '-30px',
              right: '-30px',
              width: '100px',
              height: '100px',
              background: 'radial-gradient(circle, rgba(255, 32, 78, 0.1) 0%, transparent 70%)',
              borderRadius: '50%'
            }} />
            <div style={{
              position: 'absolute',
              bottom: '20px',
              left: '20px',
              width: '60px',
              height: '60px',
              background: 'rgba(255, 32, 78, 0.05)',
              borderRadius: '50%'
            }} />

            {/* Icon Badge */}
            <div style={{
              width: '60px',
              height: '60px',
              background: 'linear-gradient(135deg, #FF204E 0%, #A0153E 100%)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 20px rgba(255, 32, 78, 0.3)',
              marginBottom: '24px'
            }}>
              <span style={{ color: 'white', fontSize: '28px', fontWeight: 'bold' }}>🚀</span>
            </div>

            <BlockStack gap="400">
              <BlockStack gap="200">
                <Text as="h3" variant="headingLg">
                  <span style={{ 
                    color: '#A0153E', 
                    fontFamily: 'Unbounded, sans-serif', 
                    fontWeight: '600' 
                  }}>
                    Ready to Start Managing Inventory?
                  </span>
                </Text>
                <Text as="p" variant="bodyLg" tone="subdued">
                  Jump into your analytics dashboard and discover insights about your products, sales trends, and inventory performance.
                </Text>
              </BlockStack>
              <Button 
                variant="primary"
                onClick={() => onNavigate("dashboard")}
                size="large"
                fullWidth
              >
                Open Dashboard
              </Button>
            </BlockStack>
          </div>
        </div>
      </BlockStack>
    </Page>
    </>
  );
}
