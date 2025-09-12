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
} from "@shopify/polaris";
import {
  ChartVerticalIcon,
  InventoryIcon,
  OrderIcon,
  MarketsIcon,
} from "@shopify/polaris-icons";

interface WelcomePageProps {
  onNavigate: (tab: string) => void;
}

export function WelcomePage({ onNavigate }: WelcomePageProps) {
  return (
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
                  Welcome to Spector
                </Text>
                <Text as="p" variant="headingLg" alignment="center" tone="subdued">
                  Your Intelligent Inventory Management System
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

            {/* What's New Section */}
            <BlockStack gap="600">
              <BlockStack gap="300" align="center">
                <Text as="h2" variant="headingXl" alignment="center">
                  What's New This Month
                </Text>
                <Text as="p" variant="bodyLg" alignment="center" tone="subdued">
                  Latest features and improvements designed to boost your productivity
                </Text>
              </BlockStack>
            
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
          </BlockStack>
        </div>

        {/* Pro Tips for Success */}
        <Card>
          <Box padding="600">
            <BlockStack gap="400">
              <Text as="h2" variant="headingLg">
                Pro Tips for Success
              </Text>
              <BlockStack gap="300">
                <Box padding="400" background="bg-surface-info" borderRadius="200">
                  <InlineStack gap="300" align="space-between">
                    <BlockStack gap="100">
                      <Text as="h3" variant="headingMd">Set Smart Thresholds</Text>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        Configure alerts based on your average sales velocity. Fast-moving products need higher thresholds.
                      </Text>
                    </BlockStack>
                    <Button 
                      variant="secondary"
                      onClick={() => onNavigate("settings")}
                    >
                      Configure
                    </Button>
                  </InlineStack>
                </Box>
                <Box padding="400" background="bg-surface-success" borderRadius="200">
                  <InlineStack gap="300" align="space-between">
                    <BlockStack gap="100">
                      <Text as="h3" variant="headingMd">Weekly Analytics Review</Text>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        Check your dashboard every Monday to identify trends and plan inventory for the week ahead.
                      </Text>
                    </BlockStack>
                    <Button 
                      variant="secondary"
                      onClick={() => onNavigate("dashboard")}
                    >
                      View Now
                    </Button>
                  </InlineStack>
                </Box>
              </BlockStack>
            </BlockStack>
          </Box>
        </Card>

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
        <Card>
          <Box padding="600">
            <BlockStack gap="400">
              <Text as="h2" variant="headingLg">
                🚀 Get the Most Out of Spector
              </Text>
              <Grid>
                <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4, xl: 4 }}>
                  <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                    <BlockStack gap="300">
                      <Text as="h3" variant="headingMd">1. Set Alert Thresholds</Text>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        Customize when you want to be notified for each product
                      </Text>
                      <Button 
                        variant="plain" 
                        onClick={() => onNavigate("settings")}
                      >
                        Configure Alerts →
                      </Button>
                    </BlockStack>
                  </Box>
                </Grid.Cell>
                <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4, xl: 4 }}>
                  <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                    <BlockStack gap="300">
                      <Text as="h3" variant="headingMd">2. Review Analytics</Text>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        Understand your sales patterns and inventory performance
                      </Text>
                      <Button 
                        variant="plain" 
                        onClick={() => onNavigate("dashboard")}
                      >
                        View Analytics →
                      </Button>
                    </BlockStack>
                  </Box>
                </Grid.Cell>
                <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4, xl: 4 }}>
                  <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                    <BlockStack gap="300">
                      <Text as="h3" variant="headingMd">3. Check Notifications</Text>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        Stay on top of important inventory updates and alerts
                      </Text>
                      <Button 
                        variant="plain" 
                        onClick={() => onNavigate("notifications")}
                      >
                        View Notifications →
                      </Button>
                    </BlockStack>
                  </Box>
                </Grid.Cell>
              </Grid>
            </BlockStack>
          </Box>
        </Card>

        {/* Getting Started */}
        <Grid>
          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
            <Card>
              <Box padding="500">
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">
                    Need Help Getting Started?
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Access our comprehensive guides, video tutorials, and detailed pricing information to make the most of Spector.
                  </Text>
                  <Button 
                    variant="secondary"
                    onClick={() => onNavigate("help")}
                  >
                    Visit Help Center
                  </Button>
                </BlockStack>
              </Box>
            </Card>
          </Grid.Cell>
          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
            <Card>
              <Box padding="500">
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">
                    Ready to Start Managing Inventory?
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Jump into your analytics dashboard and discover insights about your products, sales trends, and inventory performance.
                  </Text>
                  <Button 
                    variant="primary"
                    onClick={() => onNavigate("dashboard")}
                  >
                    Open Dashboard
                  </Button>
                </BlockStack>
              </Box>
            </Card>
          </Grid.Cell>
        </Grid>
      </BlockStack>
    </Page>
  );
}
