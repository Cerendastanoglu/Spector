import { useState } from "react";
import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Collapsible,
} from "@shopify/polaris";

interface HelpProps {
  isVisible: boolean;
  onNavigateToDashboard?: () => void;
}

export function Help({ isVisible: _isVisible, onNavigateToDashboard: _onNavigateToDashboard }: HelpProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    dashboard: false,
    productManagement: false,
    forecasting: false,
    automation: false,
    pricing: false,
    collections: false,
    tags: false,
    content: false,
    inventory: false,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const brandColor = "#ee2c52";
  
  return (
    <BlockStack gap="400">
      {/* Help & Support */}
      <Card>
        <BlockStack gap="400">
          <BlockStack gap="200">
            <Text as="h2" variant="headingLg">
              Help & Support
            </Text>
            <Text as="p" variant="bodyMd" tone="subdued">
              Get help from our team - we typically respond within 24 hours
            </Text>
          </BlockStack>
          
          <BlockStack gap="200">
            <Text as="p" variant="bodyMd">
              For all inquiries, please contact us at:
            </Text>
            <div style={{ 
              padding: '12px 16px', 
              backgroundColor: '#f6f6f7', 
              borderRadius: '8px',
              display: 'inline-block',
              maxWidth: 'fit-content'
            }}>
              <Text as="p" variant="bodyLg" fontWeight="semibold">
                ceren@spector-app.com
              </Text>
            </div>
          </BlockStack>
        </BlockStack>
      </Card>

      {/* Getting Started Guide */}
      <Card>
        <BlockStack gap="400">
          <BlockStack gap="200">
            <Text as="h2" variant="headingLg">
              Getting Started
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Learn how to use Spector's powerful features
            </Text>
          </BlockStack>

          {/* Dashboard Section */}
          <div style={{ 
            borderLeft: `4px solid ${brandColor}`, 
            paddingLeft: '16px',
            backgroundColor: 'transparent',
            transition: 'background-color 0.2s ease',
          }}>
            <div
              onClick={() => toggleSection('dashboard')}
              style={{
                cursor: 'pointer',
                padding: '12px 0',
              }}
            >
              <InlineStack gap="300" blockAlign="center">
                <div style={{ minWidth: '20px', display: 'flex', alignItems: 'center' }}>
                  {openSections.dashboard ? (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M5 12.5L10 7.5L15 12.5" stroke={brandColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M5 7.5L10 12.5L15 7.5" stroke={brandColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <InlineStack gap="200" blockAlign="center" wrap={false}>
                  <Text as="span" variant="headingMd" fontWeight="semibold">
                    Dashboard
                  </Text>
                  <Text as="span" variant="bodySm" tone="subdued">
                    - View inventory analytics and product metrics
                  </Text>
                </InlineStack>
              </InlineStack>
            </div>
            
            <Collapsible
              open={openSections.dashboard}
              id="dashboard-collapsible"
              transition={{ duration: '200ms', timingFunction: 'ease-in-out' }}
            >
              <div style={{ paddingTop: '16px', paddingBottom: '16px' }}>
                <BlockStack gap="300">
                  <Text as="p" variant="bodyMd">
                    The <strong style={{ color: brandColor }}>Dashboard</strong> is your inventory control center. Here's how to use it effectively:
                  </Text>
                  
                  <BlockStack gap="200">
                    <Text as="p" variant="bodyMd" fontWeight="semibold">
                      Step-by-Step Guide:
                    </Text>
                    
                    <div style={{ paddingLeft: '12px' }}>
                      <Text as="p" variant="bodyMd">
                        <strong>1. Start with Analytics Dashboard Cards</strong>
                      </Text>
                      <div style={{ marginBottom: '12px' }}>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Look at the top cards. They show:<br/>
                          • Total products in your store<br/>
                          • Total inventory count<br/>
                          • Items that need attention (out of stock or running low)<br/>
                          <br/>
                          <strong>Action:</strong> If "Needs Attention" is high, scroll down to see which products need restocking.
                        </Text>
                      </div>

                      <Text as="p" variant="bodyMd">
                        <strong>2. Check Stock Status Overview Chart</strong>
                      </Text>
                      <div style={{ marginBottom: '12px' }}>
                        <Text as="p" variant="bodySm" tone="subdued">
                          The bar chart shows your inventory health at a glance:<br/>
                          • <strong style={{ color: '#10b981' }}>Green bars</strong> = In Stock (21+ items) - You're good!<br/>
                          • <strong style={{ color: '#eab308' }}>Yellow bars</strong> = Low (6-20 items) - Watch these<br/>
                          • <strong style={{ color: '#f59e0b' }}>Orange bars</strong> = Critical (1-5 items) - Order soon<br/>
                          • <strong style={{ color: '#ef4444' }}>Red bars</strong> = Out of Stock (0 items) - Urgent!<br/>
                          <br/>
                          <strong>Action:</strong> If you see big red or orange bars, prioritize restocking those categories.
                        </Text>
                      </div>

                      <Text as="p" variant="bodyMd">
                        <strong>3. Review Price Distribution Analysis</strong>
                      </Text>
                      <div style={{ marginBottom: '12px' }}>
                        <Text as="p" variant="bodySm" tone="subdued">
                          See how many products fall into each price range (e.g., $0-50, $50-100, $100-200).<br/>
                          <br/>
                          <strong>Action:</strong> Use this to understand your pricing strategy. Are most products budget or premium?
                        </Text>
                      </div>

                      <Text as="p" variant="bodyMd">
                        <strong>4. Scroll to Top Products by Catalog Value</strong>
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        This table shows your most valuable products (price × quantity in stock).<br/>
                        <br/>
                        <strong>Action:</strong> These are your highest-value assets. Make sure they never go out of stock! Click on any product to see more details or click the checkboxes to bulk edit them in Bulk Edit.
                      </Text>
                    </div>
                  </BlockStack>

                  <div style={{ 
                    backgroundColor: '#f0f9ff', 
                    padding: '12px', 
                    borderRadius: '8px',
                    borderLeft: `3px solid ${brandColor}`,
                  }}>
                    <Text as="p" variant="bodyMd" fontWeight="semibold">
                      Quick Action Example:
                    </Text>
                    <Text as="p" variant="bodySm">
                      You see "12 products need attention" → Check the chart and notice red bars → Scroll to the table → See "Premium Sneakers" is out of stock → Click "Bulk Edit" tab → Filter or select that product → Bulk edit to update inventory or pricing.
                    </Text>
                  </div>

                  <div style={{ 
                    backgroundColor: '#f0f9ff', 
                    padding: '12px', 
                    borderRadius: '8px',
                    borderLeft: `3px solid #0ea5e9`,
                  }}>
                    <Text as="p" variant="bodyMd">
                      <strong>Pro Tip:</strong> Visit the Dashboard daily to catch stock issues early. It takes just 30 seconds to spot problems before they affect your sales!
                    </Text>
                  </div>
                </BlockStack>
              </div>
            </Collapsible>
          </div>

          {/* Bulk Edit Section */}
          <div style={{ 
            borderLeft: `4px solid ${brandColor}`, 
            paddingLeft: '16px',
            backgroundColor: 'transparent',
            transition: 'background-color 0.2s ease',
          }}>
            <div
              onClick={() => toggleSection('productManagement')}
              style={{
                cursor: 'pointer',
                padding: '12px 0',
              }}
            >
              <InlineStack gap="300" blockAlign="center">
                <div style={{ minWidth: '20px', display: 'flex', alignItems: 'center' }}>
                  {openSections.productManagement ? (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M5 12.5L10 7.5L15 12.5" stroke={brandColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M5 7.5L10 12.5L15 7.5" stroke={brandColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <InlineStack gap="200" blockAlign="center" wrap={false}>
                  <Text as="span" variant="headingMd" fontWeight="semibold">
                    Bulk Edit
                  </Text>
                  <Text as="span" variant="bodySm" tone="subdued">
                    - Edit multiple products at once with bulk operations
                  </Text>
                </InlineStack>
              </InlineStack>
            </div>
            
            <Collapsible
              open={openSections.productManagement}
              id="product-management-collapsible"
              transition={{ duration: '200ms', timingFunction: 'ease-in-out' }}
            >
              <div style={{ paddingTop: '16px', paddingBottom: '16px' }}>
                <BlockStack gap="400">
                  <Text as="p" variant="bodyMd">
                    <strong style={{ color: brandColor }}>Bulk Edit</strong> lets you edit hundreds of products in seconds instead of one-by-one. Save hours of manual work with powerful bulk operations.
                  </Text>
                  
                  <BlockStack gap="300">
                    <Text as="p" variant="bodyMd" fontWeight="semibold">
                      How It Works - Two Simple Steps:
                    </Text>
                    <div style={{ 
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: '16px',
                    }}>
                      {/* Step 1 */}
                      <div style={{ 
                        backgroundColor: '#f9fafb',
                        padding: '16px',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                      }}>
                        <BlockStack gap="200">
                          <div style={{ textAlign: 'center' }}>
                            <span style={{ 
                              display: 'inline-block',
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              backgroundColor: brandColor,
                              color: 'white',
                              textAlign: 'center',
                              lineHeight: '40px',
                              fontSize: '20px',
                              fontWeight: 'bold',
                            }}>1</span>
                          </div>
                          <Text as="p" variant="bodyMd" fontWeight="bold" alignment="center">
                            Select Your Products
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                            Use filters (Out of Stock, Low Stock, etc.), search by name, or select all. You'll see exactly how many products are selected before making changes.
                          </Text>
                        </BlockStack>
                      </div>

                      {/* Step 2 */}
                      <div style={{ 
                        backgroundColor: '#f9fafb',
                        padding: '16px',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                      }}>
                        <BlockStack gap="200">
                          <div style={{ textAlign: 'center' }}>
                            <span style={{ 
                              display: 'inline-block',
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              backgroundColor: brandColor,
                              color: 'white',
                              textAlign: 'center',
                              lineHeight: '40px',
                              fontSize: '20px',
                              fontWeight: 'bold',
                            }}>2</span>
                          </div>
                          <Text as="p" variant="bodyMd" fontWeight="bold" alignment="center">
                            Choose Your Bulk Operation
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                            Pick from 5 powerful operations below. Each has multiple options to fit your exact needs.
                          </Text>
                        </BlockStack>
                      </div>
                    </div>
                  </BlockStack>

                  <div style={{ 
                    height: '1px',
                    backgroundColor: '#e5e7eb',
                    margin: '8px 0',
                  }}></div>

                  <BlockStack gap="300">
                    <Text as="p" variant="bodyMd" fontWeight="semibold">
                      5 Powerful Bulk Operations:
                    </Text>
                    {/* Pricing */}
                    <div style={{ 
                      border: '2px solid #10b981',
                      borderRadius: '12px',
                      overflow: 'hidden',
                    }}>
                      <div 
                        onClick={() => toggleSection('pricing')}
                        style={{ 
                          cursor: 'pointer',
                          padding: '16px',
                          backgroundColor: openSections.pricing ? '#f0fdf4' : 'white',
                          transition: 'background-color 200ms ease',
                        }}
                      >
                        <InlineStack gap="300" blockAlign="center">
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path 
                              d={openSections.pricing ? "M5 7.5L10 12.5L15 7.5" : "M7.5 5L12.5 10L7.5 15"}
                              stroke="#10b981" 
                              strokeWidth="2" 
                              strokeLinecap="round" 
                              strokeLinejoin="round"
                            />
                          </svg>
                          <BlockStack gap="100">
                            <Text as="h3" variant="headingMd" fontWeight="bold">
                              💰 Pricing
                            </Text>
                            <Text as="p" variant="bodySm" tone="subdued">
                              Adjust prices across multiple products instantly
                            </Text>
                          </BlockStack>
                        </InlineStack>
                      </div>
                      <Collapsible id="pricing-collapsible" open={openSections.pricing} transition={{ duration: '200ms', timingFunction: 'ease' }}>
                        <div style={{ padding: '20px', backgroundColor: '#f0fdf4' }}>
                          <BlockStack gap="300">
                            <BlockStack gap="200">
                              <Text as="p" variant="bodyMd" fontWeight="semibold">
                                What you can do:
                              </Text>
                              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                <li><strong>Increase prices</strong> - Raise prices by a percentage (e.g., +10% for inflation)</li>
                                <li><strong>Decrease prices</strong> - Create sales by lowering prices (e.g., -20% for Black Friday)</li>
                                <li><strong>Round prices</strong> - Make prices neat (e.g., $19.99 → $20.00)</li>
                                <li><strong>Set compare-at prices</strong> - Show "Was $50, Now $40" strikethrough pricing</li>
                                <li><strong>Update cost per item</strong> - Track your profit margins accurately</li>
                              </ul>
                            </BlockStack>

                            <div style={{
                              backgroundColor: 'white',
                              padding: '12px',
                              borderRadius: '8px',
                              border: '1px solid #d1fae5',
                            }}>
                              <Text as="p" variant="bodySm">
                                <strong>Example:</strong> Running a 15% off sale? Select all products → Pricing → Decrease 15% → Check "Set compare-at price" → Apply. Done in 30 seconds!
                              </Text>
                            </div>

                            {/* Video placeholder */}
                            <div style={{
                              backgroundColor: 'white',
                              padding: '16px',
                              borderRadius: '8px',
                              border: '1px solid #d1fae5',
                            }}>
                              <Text as="p" variant="bodyMd" fontWeight="semibold" alignment="center">
                                📺 Watch How to Bulk Edit Prices
                              </Text>
                              <div style={{
                                marginTop: '12px',
                                position: 'relative',
                                paddingBottom: '56.25%',
                                height: 0,
                                overflow: 'hidden',
                                maxWidth: '100%',
                                backgroundColor: '#f3f4f6',
                                borderRadius: '8px',
                              }}>
                                <iframe
                                  style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    border: 'none',
                                    borderRadius: '8px',
                                  }}
                                  src="https://www.youtube.com/embed/YOUR_VIDEO_ID_HERE"
                                  title="Bulk Pricing Tutorial"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              </div>
                            </div>
                          </BlockStack>
                        </div>
                      </Collapsible>
                    </div>

                    {/* Collections */}
                    <div style={{ 
                      border: '2px solid #f59e0b',
                      borderRadius: '12px',
                      overflow: 'hidden',
                    }}>
                      <div 
                        onClick={() => toggleSection('collections')}
                        style={{ 
                          cursor: 'pointer',
                          padding: '16px',
                          backgroundColor: openSections.collections ? '#fffbeb' : 'white',
                          transition: 'background-color 200ms ease',
                        }}
                      >
                        <InlineStack gap="300" blockAlign="center">
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path 
                              d={openSections.collections ? "M5 7.5L10 12.5L15 7.5" : "M7.5 5L12.5 10L7.5 15"}
                              stroke="#f59e0b" 
                              strokeWidth="2" 
                              strokeLinecap="round" 
                              strokeLinejoin="round"
                            />
                          </svg>
                          <BlockStack gap="100">
                            <Text as="h3" variant="headingMd" fontWeight="bold">
                              📁 Collections
                            </Text>
                            <Text as="p" variant="bodySm" tone="subdued">
                              Organize products into collections effortlessly
                            </Text>
                          </BlockStack>
                        </InlineStack>
                      </div>
                      <Collapsible id="collections-collapsible" open={openSections.collections} transition={{ duration: '200ms', timingFunction: 'ease' }}>
                        <div style={{ padding: '20px', backgroundColor: '#fffbeb' }}>
                          <BlockStack gap="300">
                            <BlockStack gap="200">
                              <Text as="p" variant="bodyMd" fontWeight="semibold">
                                What you can do:
                              </Text>
                              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                <li><strong>Add to collections</strong> - Put products in one or multiple collections at once</li>
                                <li><strong>Remove from collections</strong> - Clean up old or seasonal collections quickly</li>
                              </ul>
                            </BlockStack>

                            <div style={{
                              backgroundColor: 'white',
                              padding: '12px',
                              borderRadius: '8px',
                              border: '1px solid #fef3c7',
                            }}>
                              <Text as="p" variant="bodySm">
                                <strong>Example:</strong> New summer collection? Filter by "summer" tag → Select all → Collections → Add to "Summer 2025" → Done!
                              </Text>
                            </div>

                            {/* Video placeholder */}
                            <div style={{
                              backgroundColor: 'white',
                              padding: '16px',
                              borderRadius: '8px',
                              border: '1px solid #fef3c7',
                            }}>
                              <Text as="p" variant="bodyMd" fontWeight="semibold" alignment="center">
                                📺 Watch How to Manage Collections
                              </Text>
                              <div style={{
                                marginTop: '12px',
                                position: 'relative',
                                paddingBottom: '56.25%',
                                height: 0,
                                overflow: 'hidden',
                                maxWidth: '100%',
                                backgroundColor: '#f3f4f6',
                                borderRadius: '8px',
                              }}>
                                <iframe
                                  style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    border: 'none',
                                    borderRadius: '8px',
                                  }}
                                  src="https://www.youtube.com/embed/YOUR_VIDEO_ID_HERE"
                                  title="Bulk Collections Tutorial"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              </div>
                            </div>
                          </BlockStack>
                        </div>
                      </Collapsible>
                    </div>

                    {/* Tags */}
                    <div style={{ 
                      border: '2px solid #ec4899',
                      borderRadius: '12px',
                      overflow: 'hidden',
                    }}>
                      <div 
                        onClick={() => toggleSection('tags')}
                        style={{ 
                          cursor: 'pointer',
                          padding: '16px',
                          backgroundColor: openSections.tags ? '#fef2f8' : 'white',
                          transition: 'background-color 200ms ease',
                        }}
                      >
                        <InlineStack gap="300" blockAlign="center">
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path 
                              d={openSections.tags ? "M5 7.5L10 12.5L15 7.5" : "M7.5 5L12.5 10L7.5 15"}
                              stroke="#ec4899" 
                              strokeWidth="2" 
                              strokeLinecap="round" 
                              strokeLinejoin="round"
                            />
                          </svg>
                          <BlockStack gap="100">
                            <Text as="h3" variant="headingMd" fontWeight="bold">
                              🏷️ Tags
                            </Text>
                            <Text as="p" variant="bodySm" tone="subdued">
                              Label and organize products with tags
                            </Text>
                          </BlockStack>
                        </InlineStack>
                      </div>
                      <Collapsible id="tags-collapsible" open={openSections.tags} transition={{ duration: '200ms', timingFunction: 'ease' }}>
                        <div style={{ padding: '20px', backgroundColor: '#fef2f8' }}>
                          <BlockStack gap="300">
                            <BlockStack gap="200">
                              <Text as="p" variant="bodyMd" fontWeight="semibold">
                                What you can do:
                              </Text>
                              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                <li><strong>Add tags</strong> - Attach new tags while keeping existing ones (e.g., add "sale", "new")</li>
                                <li><strong>Remove tags</strong> - Delete specific tags from all selected products</li>
                              </ul>
                            </BlockStack>

                            <div style={{
                              backgroundColor: 'white',
                              padding: '12px',
                              borderRadius: '8px',
                              border: '1px solid #fce7f3',
                            }}>
                              <Text as="p" variant="bodySm">
                                <strong>Example:</strong> Season ending? Select all winter products → Tags → Remove "winter" → Add "clearance" → Update!
                              </Text>
                            </div>

                            {/* Video placeholder */}
                            <div style={{
                              backgroundColor: 'white',
                              padding: '16px',
                              borderRadius: '8px',
                              border: '1px solid #fce7f3',
                            }}>
                              <Text as="p" variant="bodyMd" fontWeight="semibold" alignment="center">
                                📺 Watch How to Bulk Edit Tags
                              </Text>
                              <div style={{
                                marginTop: '12px',
                                position: 'relative',
                                paddingBottom: '56.25%',
                                height: 0,
                                overflow: 'hidden',
                                maxWidth: '100%',
                                backgroundColor: '#f3f4f6',
                                borderRadius: '8px',
                              }}>
                                <iframe
                                  style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    border: 'none',
                                    borderRadius: '8px',
                                  }}
                                  src="https://www.youtube.com/embed/YOUR_VIDEO_ID_HERE"
                                  title="Bulk Tags Tutorial"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              </div>
                            </div>
                          </BlockStack>
                        </div>
                      </Collapsible>
                    </div>

                    {/* Content */}
                    <div style={{ 
                      border: '2px solid #3b82f6',
                      borderRadius: '12px',
                      overflow: 'hidden',
                    }}>
                      <div 
                        onClick={() => toggleSection('content')}
                        style={{ 
                          cursor: 'pointer',
                          padding: '16px',
                          backgroundColor: openSections.content ? '#eff6ff' : 'white',
                          transition: 'background-color 200ms ease',
                        }}
                      >
                        <InlineStack gap="300" blockAlign="center">
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path 
                              d={openSections.content ? "M5 7.5L10 12.5L15 7.5" : "M7.5 5L12.5 10L7.5 15"}
                              stroke="#3b82f6" 
                              strokeWidth="2" 
                              strokeLinecap="round" 
                              strokeLinejoin="round"
                            />
                          </svg>
                          <BlockStack gap="100">
                            <Text as="h3" variant="headingMd" fontWeight="bold">
                              ✏️ Content
                            </Text>
                            <Text as="p" variant="bodySm" tone="subdued">
                              Update product titles and descriptions in bulk
                            </Text>
                          </BlockStack>
                        </InlineStack>
                      </div>
                      <Collapsible id="content-collapsible" open={openSections.content} transition={{ duration: '200ms', timingFunction: 'ease' }}>
                        <div style={{ padding: '20px', backgroundColor: '#eff6ff' }}>
                          <BlockStack gap="300">
                            <BlockStack gap="200">
                              <Text as="p" variant="bodyMd" fontWeight="semibold">
                                Titles - What you can do:
                              </Text>
                              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                <li><strong>Add prefix</strong> - Put text at the start (e.g., "NEW - " before all titles)</li>
                                <li><strong>Add suffix</strong> - Put text at the end (e.g., " - Limited Edition")</li>
                                <li><strong>Find & Replace</strong> - Change specific words (e.g., "2024" → "2025")</li>
                              </ul>

                              <Text as="p" variant="bodyMd" fontWeight="semibold">
                                Descriptions - What you can do:
                              </Text>
                              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                <li><strong>Set all</strong> - Replace all descriptions with the same text (great for similar products)</li>
                                <li><strong>Add prefix</strong> - Add text before existing descriptions</li>
                                <li><strong>Add suffix</strong> - Add text after existing descriptions</li>
                                <li><strong>Find & Replace</strong> - Update specific words in all descriptions</li>
                              </ul>
                            </BlockStack>

                            <div style={{
                              backgroundColor: 'white',
                              padding: '12px',
                              borderRadius: '8px',
                              border: '1px solid #dbeafe',
                            }}>
                              <Text as="p" variant="bodySm">
                                <strong>Example:</strong> Rebranding? Select all products → Content → Titles → Find "Old Brand" Replace with "New Brand" → Apply to 500 products instantly!
                              </Text>
                            </div>

                            {/* Video placeholder */}
                            <div style={{
                              backgroundColor: 'white',
                              padding: '16px',
                              borderRadius: '8px',
                              border: '1px solid #dbeafe',
                            }}>
                              <Text as="p" variant="bodyMd" fontWeight="semibold" alignment="center">
                                📺 Watch How to Bulk Edit Content
                              </Text>
                              <div style={{
                                marginTop: '12px',
                                position: 'relative',
                                paddingBottom: '56.25%',
                                height: 0,
                                overflow: 'hidden',
                                maxWidth: '100%',
                                backgroundColor: '#f3f4f6',
                                borderRadius: '8px',
                              }}>
                                <iframe
                                  style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    border: 'none',
                                    borderRadius: '8px',
                                  }}
                                  src="https://www.youtube.com/embed/YOUR_VIDEO_ID_HERE"
                                  title="Bulk Content Tutorial"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              </div>
                            </div>
                          </BlockStack>
                        </div>
                      </Collapsible>
                    </div>

                    {/* Inventory */}
                    <div style={{ 
                      border: '2px solid #a855f7',
                      borderRadius: '12px',
                      overflow: 'hidden',
                    }}>
                      <div 
                        onClick={() => toggleSection('inventory')}
                        style={{ 
                          cursor: 'pointer',
                          padding: '16px',
                          backgroundColor: openSections.inventory ? '#faf5ff' : 'white',
                          transition: 'background-color 200ms ease',
                        }}
                      >
                        <InlineStack gap="300" blockAlign="center">
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path 
                              d={openSections.inventory ? "M5 7.5L10 12.5L15 7.5" : "M7.5 5L12.5 10L7.5 15"}
                              stroke="#a855f7" 
                              strokeWidth="2" 
                              strokeLinecap="round" 
                              strokeLinejoin="round"
                            />
                          </svg>
                          <BlockStack gap="100">
                            <Text as="h3" variant="headingMd" fontWeight="bold">
                              📦 Inventory
                            </Text>
                            <Text as="p" variant="bodySm" tone="subdued">
                              Update stock levels, SKUs, and inventory settings
                            </Text>
                          </BlockStack>
                        </InlineStack>
                      </div>
                      <Collapsible id="inventory-collapsible" open={openSections.inventory} transition={{ duration: '200ms', timingFunction: 'ease' }}>
                        <div style={{ padding: '20px', backgroundColor: '#faf5ff' }}>
                          <BlockStack gap="300">
                            <BlockStack gap="200">
                              <Text as="p" variant="bodyMd" fontWeight="semibold">
                                What you can do:
                              </Text>
                              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                <li><strong>Set to exact number</strong> - Set all variants to the same stock level (e.g., all to 100)</li>
                                <li><strong>Add inventory</strong> - Increase stock by a number (e.g., add 50 to current levels)</li>
                                <li><strong>Remove inventory</strong> - Decrease stock by a number (e.g., reduce all by 10)</li>
                                <li><strong>Allow overselling</strong> - Let customers buy when out of stock</li>
                              </ul>
                            </BlockStack>

                            <div style={{
                              backgroundColor: 'white',
                              padding: '12px',
                              borderRadius: '8px',
                              border: '1px solid #f3e8ff',
                            }}>
                              <Text as="p" variant="bodySm">
                                <strong>Example:</strong> Just received shipment? Select products → Inventory → Add 100 → Apply. All stock levels increase by 100 instantly!
                              </Text>
                            </div>

                            {/* Video placeholder */}
                            <div style={{
                              backgroundColor: 'white',
                              padding: '16px',
                              borderRadius: '8px',
                              border: '1px solid #f3e8ff',
                            }}>
                              <Text as="p" variant="bodyMd" fontWeight="semibold" alignment="center">
                                📺 Watch How to Bulk Update Inventory
                              </Text>
                              <div style={{
                                marginTop: '12px',
                                position: 'relative',
                                paddingBottom: '56.25%',
                                height: 0,
                                overflow: 'hidden',
                                maxWidth: '100%',
                                backgroundColor: '#f3f4f6',
                                borderRadius: '8px',
                              }}>
                                <iframe
                                  style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    border: 'none',
                                    borderRadius: '8px',
                                  }}
                                  src="https://www.youtube.com/embed/YOUR_VIDEO_ID_HERE"
                                  title="Bulk Inventory Tutorial"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              </div>
                            </div>
                          </BlockStack>
                        </div>
                      </Collapsible>
                    </div>
                  </BlockStack>

                  {/* Pro Tips */}
                  <div style={{ 
                    backgroundColor: '#f0f9ff', 
                    padding: '16px', 
                    borderRadius: '8px',
                    borderLeft: `4px solid ${brandColor}`,
                  }}>
                    <BlockStack gap="200">
                      <Text as="p" variant="bodyMd" fontWeight="bold">
                        💡 Pro Tips for Success:
                      </Text>
                      <ul style={{ margin: 0, paddingLeft: '20px' }}>
                        <li>Always double-check your selection count before applying changes</li>
                        <li>Start with a small test group if you're trying something new</li>
                        <li>Use filters to target specific products (e.g., only "Out of Stock" items)</li>
                        <li>Changes are instant - there's no undo, so review carefully!</li>
                      </ul>
                    </BlockStack>
                  </div>
                </BlockStack>
              </div>
            </Collapsible>
          </div>

          {/* Forecasting Section */}
          <div style={{ 
            borderLeft: `4px solid ${brandColor}`, 
            paddingLeft: '16px',
            backgroundColor: 'transparent',
            transition: 'background-color 0.2s ease',
          }}>
            <div
              onClick={() => toggleSection('forecasting')}
              style={{
                cursor: 'pointer',
                padding: '12px 0',
              }}
            >
              <InlineStack gap="300" blockAlign="center">
                <div style={{ minWidth: '20px', display: 'flex', alignItems: 'center' }}>
                  {openSections.forecasting ? (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M5 12.5L10 7.5L15 12.5" stroke={brandColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M5 7.5L10 12.5L15 7.5" stroke={brandColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <InlineStack gap="200" blockAlign="center" wrap={false}>
                  <Text as="span" variant="headingMd" fontWeight="semibold">
                    Forecasting
                  </Text>
                  <Text as="span" variant="bodySm" tone="subdued">
                    - AI-powered inventory and revenue predictions
                  </Text>
                </InlineStack>
              </InlineStack>
            </div>
            
            <Collapsible
              open={openSections.forecasting}
              id="forecasting-collapsible"
              transition={{ duration: '200ms', timingFunction: 'ease-in-out' }}
            >
              <div style={{ paddingTop: '16px', paddingBottom: '16px' }}>
                <BlockStack gap="300">
                  <Text as="p" variant="bodyMd">
                    <strong style={{ color: brandColor }}>Forecasting</strong> shows you which products need restocking and when. Simple as that!
                  </Text>
                  
                  <BlockStack gap="200">
                    <Text as="p" variant="bodyMd" fontWeight="semibold">
                      How It Works:
                    </Text>
                    
                    <div style={{ paddingLeft: '12px' }}>
                      <Text as="p" variant="bodyMd">
                        <strong>1. Click "Forecasting" in the top navigation</strong>
                      </Text>
                      <div style={{ marginBottom: '12px' }}>
                        <Text as="p" variant="bodySm" tone="subdued">
                          You'll see a table with all your products organized into 3 tabs:<br/>
                          • <strong>Out of Stock</strong> - Products with 0 inventory (restock ASAP!)<br/>
                          • <strong>Slow Moving</strong> - Products not selling well<br/>
                          • <strong>Active Inventory</strong> - Products that are selling and in stock
                        </Text>
                      </div>

                      <Text as="p" variant="bodyMd">
                        <strong>2. Look at the table columns</strong>
                      </Text>
                      <div style={{ marginBottom: '12px' }}>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Each product shows:<br/>
                          • <strong>Current Stock</strong> - How many you have right now<br/>
                          • <strong>Daily Demand</strong> - Average units sold per day<br/>
                          • <strong>Days Left</strong> - How many days until you run out<br/>
                          • <strong>Velocity</strong> - Fast/Medium/Slow (how quickly it sells)
                        </Text>
                      </div>

                      <Text as="p" variant="bodyMd">
                        <strong>3. Click the down arrow (▼) to expand any product</strong>
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        You'll see detailed information in two sections:<br/>
                        <br/>
                        <strong>Left side - Inventory & Money:</strong><br/>
                        • SKU, current stock, days of supply left<br/>
                        • Suggested reorder quantity (tells you exactly how many to buy!)<br/>
                        • Revenue from last 60 days, units sold, profit margin<br/>
                        <br/>
                        <strong>Right side - Sales Trends:</strong><br/>
                        • Daily/Weekly/Monthly/Yearly order averages<br/>
                        • Peak day sales (your best day)<br/>
                        • Trend indicator (Growing ↗, Steady →, or Declining ↘)<br/>
                        • Stock coverage status (Excellent/Good/Adequate/Needs Attention)
                      </Text>
                    </div>
                  </BlockStack>

                  <div style={{ 
                    backgroundColor: '#fff7ed', 
                    padding: '12px', 
                    borderRadius: '8px',
                    borderLeft: `3px solid ${brandColor}`,
                  }}>
                    <Text as="p" variant="bodyMd">
                      <strong>Quick Action:</strong> See "7 days left" in red? Click the expand arrow → Check "Suggested Reorder Qty: 50 units" → Order exactly 50 units from your supplier. Done!
                    </Text>
                  </div>
                </BlockStack>
              </div>
            </Collapsible>
          </div>

          {/* Automation Section */}
          <div style={{ 
            borderLeft: `4px solid ${brandColor}`, 
            paddingLeft: '16px',
            backgroundColor: 'transparent',
            transition: 'background-color 0.2s ease',
          }}>
            <div
              onClick={() => toggleSection('automation')}
              style={{
                cursor: 'pointer',
                padding: '12px 0',
              }}
            >
              <InlineStack gap="300" blockAlign="center">
                <div style={{ minWidth: '20px', display: 'flex', alignItems: 'center' }}>
                  {openSections.automation ? (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M5 12.5L10 7.5L15 12.5" stroke={brandColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M5 7.5L10 12.5L15 7.5" stroke={brandColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <InlineStack gap="200" blockAlign="center" wrap={false}>
                  <Text as="span" variant="headingMd" fontWeight="semibold">
                    Automation
                  </Text>
                  <Text as="span" variant="bodySm" tone="subdued">
                    - Auto-organize products with rules
                  </Text>
                </InlineStack>
              </InlineStack>
            </div>
            
            <Collapsible
              open={openSections.automation}
              id="automation-collapsible"
              transition={{ duration: '200ms', timingFunction: 'ease-in-out' }}
            >
              <div style={{ paddingTop: '16px', paddingBottom: '16px' }}>
                <BlockStack gap="300">
                  <Text as="p" variant="bodyMd">
                    <strong style={{ color: brandColor }}>Automation</strong> lets you create rules that automatically organize your products. Set it once, and let Spector do the work!
                  </Text>
                  
                  <BlockStack gap="200">
                    <Text as="p" variant="bodyMd" fontWeight="semibold">
                      Two Types of Rules:
                    </Text>
                    
                    <div style={{ paddingLeft: '12px' }}>
                      <Text as="p" variant="bodyMd">
                        <strong>1. Collection Rules</strong>
                      </Text>
                      <div style={{ marginBottom: '12px' }}>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Automatically add products to collections based on conditions:<br/>
                          • Title contains "Summer" → Add to "Summer Collection"<br/>
                          • Price greater than $100 → Add to "Premium Products"<br/>
                          • Inventory less than 10 → Add to "Low Stock Alert"
                        </Text>
                      </div>

                      <Text as="p" variant="bodyMd">
                        <strong>2. Tag Rules</strong>
                      </Text>
                      <div style={{ marginBottom: '12px' }}>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Automatically tag products when they match your criteria:<br/>
                          • Vendor equals "Nike" → Add tag "branded"<br/>
                          • Product type contains "shirt" → Add tag "apparel"<br/>
                          • Status equals "active" → Add tag "in-store"
                        </Text>
                      </div>
                    </div>
                  </BlockStack>

                  <BlockStack gap="200">
                    <Text as="p" variant="bodyMd" fontWeight="semibold">
                      How to Create a Rule:
                    </Text>
                    
                    <div style={{ paddingLeft: '12px' }}>
                      <Text as="p" variant="bodySm" tone="subdued">
                        1. Go to "Automation" tab<br/>
                        2. Choose "Collections" or "Tags" sub-tab<br/>
                        3. Click "Create Rule"<br/>
                        4. Name your rule (e.g., "Tag Sale Items")<br/>
                        5. Set condition (e.g., Title contains "sale")<br/>
                        6. Set action (e.g., Add tag "on-sale")<br/>
                        7. Click "Preview Matches" to see which products match<br/>
                        8. Click "Create Rule" to save and run
                      </Text>
                    </div>
                  </BlockStack>

                  <div style={{ 
                    backgroundColor: '#fff7ed', 
                    padding: '12px', 
                    borderRadius: '8px',
                    borderLeft: `3px solid ${brandColor}`,
                  }}>
                    <Text as="p" variant="bodyMd">
                      <strong>Pro Tip:</strong> Rules run automatically! When you add new products that match your conditions, they'll be organized automatically.
                    </Text>
                  </div>
                </BlockStack>
              </div>
            </Collapsible>
          </div>
        </BlockStack>
      </Card>

      {/* Legal & Policies Card */}
      <Card>
        <BlockStack gap="400">
          <BlockStack gap="200">
            <Text as="h2" variant="headingLg">
              Legal & Policies
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Important information about using Spector
            </Text>
          </BlockStack>
          
          <BlockStack gap="300">
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px' 
            }}>
              <a 
                href="https://aquarionlabs.com/spector-privacy-policy/" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  color: brandColor, 
                  textDecoration: 'none',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                📄 Privacy Policy
                <span style={{ fontSize: '12px', color: '#666' }}>↗</span>
              </a>
              
              <a 
                href="https://aquarionlabs.com/spector-terms-of-service/" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  color: brandColor, 
                  textDecoration: 'none',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                📋 Terms of Service
                <span style={{ fontSize: '12px', color: '#666' }}>↗</span>
              </a>
            </div>
          </BlockStack>

          <div style={{ 
            backgroundColor: '#f6f6f7', 
            padding: '16px', 
            borderRadius: '8px',
            marginTop: '8px'
          }}>
            <BlockStack gap="200">
              <Text as="p" variant="bodyMd" fontWeight="semibold">
                ⚠️ Disclaimer
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Spector is provided "as is" without warranty of any kind. We are not responsible for any data loss, 
                incorrect product updates, pricing errors, or any other issues that may arise from using this application. 
                Always review changes before applying bulk operations and maintain your own backups. 
                By using Spector, you agree to our Terms of Service and acknowledge that you use the app at your own risk.
              </Text>
            </BlockStack>
          </div>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
