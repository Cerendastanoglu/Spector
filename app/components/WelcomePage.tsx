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
  Modal,
} from "@shopify/polaris";
import {
  ClockIcon,
  CalendarIcon,
  StarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@shopify/polaris-icons";

interface WelcomePageProps {
  onNavigate: (tab: string) => void;
}

export function WelcomePage({ onNavigate }: WelcomePageProps) {
  const [showTimeline, setShowTimeline] = useState(false);
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const timelineData = [
    {
      date: "December 2025",
      title: "AI & Automation",
      items: [
        { feature: "AI-powered forecasting", status: "research" },
        { feature: "Automated reordering", status: "research" },
        { feature: "Smart recommendations", status: "research" }
      ],
      status: "future",
      color: "#f59e0b"
    },
    {
      date: "November 2025",
      title: "Enterprise Integration",
      items: [
        { feature: "API integrations", status: "planned" },
        { feature: "Multi-store management", status: "planned" },
        { feature: "Advanced filters", status: "planned" }
      ],
      status: "upcoming", 
      color: "#8b5cf6"
    },
    {
      date: "October 2025",
      title: "Advanced Operations", 
      items: [
        { feature: "Advanced reporting features", status: "planned" },
        { feature: "Bulk operations support", status: "planned" },
        { feature: "Custom notification rules", status: "planned" }
      ],
      status: "upcoming",
      color: "#3b82f6"
    },
    {
      date: "September 2025",
      title: "Q3 Performance Boost",
      items: [
        { feature: "Enhanced dashboard analytics", status: "completed" },
        { feature: "Mobile app improvements", status: "completed" },
        { feature: "Performance optimizations", status: "in-progress" }
      ],
      status: "current",
      color: "#10b981"
    }
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % Math.ceil(timelineData.length / 3));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + Math.ceil(timelineData.length / 3)) % Math.ceil(timelineData.length / 3));
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Inter:wght@300;400;500;600&display=swap');
        
        .hero-glow {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .hero-glow::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255, 32, 78, 0.05) 0%, transparent 70%);
          animation: pulse 4s ease-in-out infinite;
        }
        
        .hero-glow::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(45deg, transparent 0%, rgba(160, 21, 62, 0.03) 25%, transparent 50%, rgba(255, 32, 78, 0.03) 75%, transparent 100%);
          animation: shift 6s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
        
        @keyframes shift {
          0%, 100% { transform: translateX(-2px) translateY(-2px); }
          50% { transform: translateX(2px) translateY(2px); }
        }
        
        .timeline-item {
          position: relative;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .timeline-item:hover {
          transform: translateY(-4px);
        }
        
        .futuristic-card {
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s ease;
        }
        
        .futuristic-card:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 32, 78, 0.3);
          box-shadow: 0 20px 40px rgba(255, 32, 78, 0.1);
        }
        
        .collapsible-roadmap {
          background: transparent;
          backdrop-filter: none;
          border: none;
          border-radius: 20px;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }
        
        .collapsible-roadmap::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(45deg, 
            rgba(255, 32, 78, 0.03) 0%, 
            transparent 25%, 
            rgba(160, 21, 62, 0.03) 50%, 
            transparent 75%, 
            rgba(93, 14, 65, 0.03) 100%);
          border-radius: 20px;
          animation: shimmer 3s ease-in-out infinite;
          z-index: 0;
        }
        
        .collapsible-roadmap:hover {
          transform: translateY(-2px);
        }
        
        .collapsible-roadmap:hover::before {
          background: linear-gradient(45deg, 
            rgba(255, 32, 78, 0.08) 0%, 
            transparent 25%, 
            rgba(160, 21, 62, 0.08) 50%, 
            transparent 75%, 
            rgba(93, 14, 65, 0.08) 100%);
        }
        
        @keyframes shimmer {
          0%, 100% { 
            background-position: -200% 0;
            opacity: 0.3;
          }
          50% { 
            background-position: 200% 0;
            opacity: 0.8;
          }
        }
        
        @keyframes helpHighlight {
          0%, 100% { 
            transform: scale(1);
            box-shadow: 0 4px 20px rgba(0,0,0,0.15), 0 2px 8px rgba(255, 32, 78, 0.2);
          }
          25% { 
            transform: scale(1.3);
            box-shadow: 0 8px 40px rgba(255, 32, 78, 0.4), 0 4px 16px rgba(255, 32, 78, 0.6);
          }
          50% { 
            transform: scale(1.2);
            box-shadow: 0 6px 30px rgba(255, 32, 78, 0.5), 0 3px 12px rgba(255, 32, 78, 0.7);
          }
          75% { 
            transform: scale(1.15);
            box-shadow: 0 6px 25px rgba(255, 32, 78, 0.3), 0 3px 10px rgba(255, 32, 78, 0.5);
          }
        }

        .timeline-slider {
          overflow: hidden;
          position: relative;
        }

        .timeline-slides {
          display: flex;
          transition: transform 0.5s ease-in-out;
        }

        .timeline-slide {
          min-width: 100%;
          display: flex;
          gap: 24px;
          justify-content: center;
          align-items: stretch;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      
      <Page>
        <div style={{ background: 'transparent', minHeight: '100vh' }}>
          <BlockStack gap="0">
            {/* Hero Welcome Section - Futuristic */}
            <div className="hero-glow" style={{
              padding: '100px 40px',
              position: 'relative',
              zIndex: 1,
              margin: '40px',
              borderRadius: '24px'
            }}>
              <div style={{ position: 'relative', zIndex: 2 }}>
                <BlockStack gap="800" align="center">
                  <BlockStack gap="400" align="center">
                    <Text as="h1" variant="heading2xl" alignment="center">
                      <span style={{ 
                        fontFamily: 'Orbitron, monospace', 
                        fontWeight: '900',
                        background: 'linear-gradient(135deg, #FF204E, #A0153E, #5D0E41)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontSize: '3.5rem',
                        letterSpacing: '2px'
                      }}>
                        Welcome To SPECTOR
                      </span>
                    </Text>
                    <Text as="p" variant="headingLg" alignment="center">
                      <span style={{ 
                        color: '#64748b',
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: '300',
                        letterSpacing: '1px'
                      }}>
                        Next-Generation Inventory Intelligence
                      </span>
                    </Text>
                  </BlockStack>
                  
                  <Box maxWidth="700px">
                    <Text as="p" variant="bodyLg" alignment="center">
                      <span style={{ 
                        color: '#475569',
                        lineHeight: '1.8',
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: '400'
                      }}>
                        Harness the power of AI-driven analytics and real-time intelligence to transform your inventory management into a competitive advantage.
                      </span>
                    </Text>
                  </Box>
                  
                  <InlineStack gap="400" align="center">
                    <Button
                      variant="primary"
                      size="large"
                      onClick={() => onNavigate("dashboard")}
                    >
                      Launch Dashboard
                    </Button>
                  </InlineStack>
                </BlockStack>
              </div>
            </div>

            {/* Futuristic Collapsible Roadmap */}
            <div style={{ padding: '40px' }}>
              <div 
                className="collapsible-roadmap"
                style={{
                  padding: '40px',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onClick={() => setShowRoadmap(!showRoadmap)}
              >
                {/* Ambient glow effect */}
                <div style={{
                  position: 'absolute',
                  top: '-50%',
                  left: '-50%',
                  width: '200%',
                  height: '200%',
                  background: 'radial-gradient(circle, rgba(255, 32, 78, 0.05) 0%, transparent 70%)',
                  animation: 'pulse 4s ease-in-out infinite',
                  pointerEvents: 'none'
                }} />
                
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="300">
                      <Text as="h2" variant="headingXl">
                        <span style={{
                          fontFamily: 'Orbitron, monospace',
                          fontWeight: '700',
                          background: 'linear-gradient(135deg, #FF204E, #A0153E)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          letterSpacing: '1px'
                        }}>
                          Development Roadmap
                        </span>
                      </Text>
                      <Text as="p" variant="bodyLg" tone="subdued">
                        <span style={{ fontFamily: 'Inter, sans-serif' }}>
                          Track our journey of continuous innovation and upcoming features
                        </span>
                      </Text>
                    </BlockStack>
                    
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 24px',
                      background: 'rgba(255, 32, 78, 0.1)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 32, 78, 0.2)',
                      transition: 'all 0.3s ease'
                    }}>
                      <Icon source={CalendarIcon} tone="base" />
                      <Text as="span" variant="bodyMd">
                        <span style={{ 
                          color: '#A0153E',
                          fontFamily: 'Inter, sans-serif',
                          fontWeight: '500'
                        }}>
                          {showRoadmap ? 'Hide Timeline' : 'View Timeline'}
                        </span>
                      </Text>
                      <div style={{
                        transform: showRoadmap ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.3s ease',
                        color: '#A0153E'
                      }}>
                        ▼
                      </div>
                    </div>
                  </InlineStack>
                </div>
              </div>
              
              {/* Collapsible Timeline Content with Slider */}
              {showRoadmap && (
                <div style={{
                  margin: '24px 0',
                  padding: '40px',
                  background: 'rgba(255, 255, 255, 0.98)',
                  backdropFilter: 'blur(20px)',
                  borderRadius: '20px',
                  border: '1px solid rgba(255, 32, 78, 0.1)',
                  position: 'relative',
                  animation: 'fadeIn 0.4s ease-out'
                }}>
                  {/* Timeline Slider Controls */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '30px'
                  }}>
                    <Button
                      onClick={prevSlide}
                      variant="tertiary"
                      size="large"
                      disabled={currentSlide === 0}
                      icon={ChevronLeftIcon}
                    />
                    
                    <div style={{ 
                      display: 'flex', 
                      gap: '8px',
                      alignItems: 'center'
                    }}>
                      {Array.from({ length: Math.ceil(timelineData.length / 3) }).map((_, index) => (
                        <div
                          key={index}
                          style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: index === currentSlide ? '#FF204E' : 'rgba(255, 32, 78, 0.3)',
                            transition: 'all 0.3s ease',
                            cursor: 'pointer'
                          }}
                          onClick={() => setCurrentSlide(index)}
                        />
                      ))}
                    </div>
                    
                    <Button
                      onClick={nextSlide}
                      variant="tertiary"
                      size="large"
                      disabled={currentSlide === Math.ceil(timelineData.length / 3) - 1}
                      icon={ChevronRightIcon}
                    />
                  </div>

                  {/* Timeline Slider */}
                  <div className="timeline-slider">
                    <div 
                      className="timeline-slides"
                      style={{
                        transform: `translateX(-${currentSlide * 100}%)`
                      }}
                    >
                      {Array.from({ length: Math.ceil(timelineData.length / 3) }).map((_, slideIndex) => (
                        <div key={slideIndex} className="timeline-slide">
                          {timelineData
                            .slice(slideIndex * 3, slideIndex * 3 + 3)
                            .map((period, index) => (
                              <div 
                                key={index} 
                                className="timeline-item" 
                                style={{
                                  flex: '1',
                                  maxWidth: '320px',
                                  position: 'relative'
                                }}
                              >
                                <div style={{
                                  background: period.status === 'current' ? 'rgba(16, 185, 129, 0.05)' :
                                            period.status === 'upcoming' ? 'rgba(107, 114, 128, 0.08)' :
                                            'rgba(107, 114, 128, 0.15)',
                                  backdropFilter: 'blur(10px)',
                                  borderRadius: '16px',
                                  border: period.status === 'current' ? '2px solid rgba(16, 185, 129, 0.3)' :
                                         period.status === 'upcoming' ? '2px solid rgba(107, 114, 128, 0.2)' :
                                         '2px solid rgba(107, 114, 128, 0.15)',
                                  position: 'relative',
                                  overflow: 'hidden',
                                  transition: 'all 0.3s ease',
                                  height: '100%'
                                }}>
                                  {/* Status overlay effect */}
                                  {period.status === 'current' && (
                                    <div style={{
                                      position: 'absolute',
                                      top: 0,
                                      left: 0,
                                      right: 0,
                                      height: '4px',
                                      background: 'linear-gradient(90deg, #10b981, #059669)',
                                      animation: 'pulse 2s ease-in-out infinite'
                                    }} />
                                  )}
                                  
                                  <Box padding="500">
                                    <BlockStack gap="400">
                                      <BlockStack gap="300">
                                        <div style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '12px',
                                          flexWrap: 'wrap'
                                        }}>
                                          <div style={{
                                            display: 'inline-block',
                                            padding: '6px 14px',
                                            background: period.status === 'current' ? 'rgba(16, 185, 129, 0.15)' :
                                                      period.status === 'upcoming' ? 'rgba(107, 114, 128, 0.15)' :
                                                      'rgba(107, 114, 128, 0.25)',
                                            borderRadius: '20px',
                                            border: period.status === 'current' ? '1px solid rgba(16, 185, 129, 0.3)' :
                                                   period.status === 'upcoming' ? '1px solid rgba(107, 114, 128, 0.3)' :
                                                   '1px solid rgba(107, 114, 128, 0.2)'
                                          }}>
                                            <Text as="span" variant="bodySm">
                                              <span style={{ 
                                                color: period.status === 'current' ? '#059669' :
                                                      period.status === 'upcoming' ? '#4b5563' :
                                                      '#6b7280',
                                                fontWeight: '600',
                                                fontSize: '12px'
                                              }}>
                                                {period.date}
                                              </span>
                                            </Text>
                                          </div>
                                          
                                          {/* Status badge */}
                                          <div style={{
                                            padding: '4px 10px',
                                            borderRadius: '12px',
                                            background: period.status === 'current' ? '#10b981' :
                                                      period.status === 'upcoming' ? '#6b7280' :
                                                      '#9ca3af',
                                            fontSize: '10px',
                                            color: 'white',
                                            fontWeight: 'bold',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px'
                                          }}>
                                            {period.status === 'current' ? '✓ RELEASED' :
                                             period.status === 'upcoming' ? '⏳ PLANNED' :
                                             '🔬 FUTURE'}
                                          </div>
                                        </div>
                                        
                                        <Text as="h3" variant="headingMd">
                                          <span style={{
                                            fontFamily: 'Orbitron, monospace',
                                            fontWeight: '600',
                                            color: period.status === 'current' ? '#0f172a' :
                                                  period.status === 'upcoming' ? '#374151' :
                                                  '#6b7280'
                                          }}>
                                            {period.title}
                                          </span>
                                        </Text>
                                      </BlockStack>

                                      <BlockStack gap="300">
                                        {period.items.map((item, itemIndex) => (
                                          <div key={itemIndex} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '16px',
                                            padding: '12px 16px',
                                            background: item.status === 'completed' ? 'rgba(16, 185, 129, 0.08)' : 
                                                      item.status === 'in-progress' ? 'rgba(245, 158, 11, 0.08)' :
                                                      item.status === 'planned' ? 'rgba(107, 114, 128, 0.08)' :
                                                      'rgba(107, 114, 128, 0.05)',
                                            borderRadius: '12px',
                                            border: item.status === 'completed' ? '1px solid rgba(16, 185, 129, 0.2)' :
                                                  item.status === 'in-progress' ? '1px solid rgba(245, 158, 11, 0.2)' :
                                                  item.status === 'planned' ? '1px solid rgba(107, 114, 128, 0.15)' :
                                                  '1px solid rgba(107, 114, 128, 0.1)',
                                            transition: 'all 0.2s ease'
                                          }}>
                                            <div style={{
                                              width: '12px',
                                              height: '12px',
                                              borderRadius: '3px',
                                              background: item.status === 'completed' ? '#10b981' : 
                                                        item.status === 'in-progress' ? '#f59e0b' :
                                                        item.status === 'planned' ? '#6b7280' : '#9ca3af',
                                              flexShrink: 0,
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              fontSize: '8px',
                                              color: 'white',
                                              fontWeight: 'bold'
                                            }}>
                                              {item.status === 'completed' ? '✓' :
                                               item.status === 'in-progress' ? '◐' :
                                               item.status === 'planned' ? '○' : '◯'}
                                            </div>
                                            <Text as="p" variant="bodyMd">
                                              <span style={{
                                                color: item.status === 'completed' ? '#059669' : 
                                                      item.status === 'in-progress' ? '#d97706' :
                                                      item.status === 'planned' ? '#4b5563' : '#6b7280',
                                                fontWeight: item.status === 'completed' ? '600' : '400'
                                              }}>
                                                {item.feature}
                                              </span>
                                            </Text>
                                          </div>
                                        ))}
                                      </BlockStack>
                                    </BlockStack>
                                  </Box>
                                </div>
                              </div>
                            ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Help Sections - Modern Futuristic Design */}
            <div style={{ padding: '40px 40px 80px 40px' }}>
              <BlockStack gap="600">
                <Text as="h2" variant="heading2xl" alignment="center">
                  <span style={{ 
                    fontFamily: 'Orbitron, monospace',
                    fontWeight: '700',
                    background: 'linear-gradient(135deg, #FF204E, #A0153E, #5D0E41)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '1px'
                  }}>
                    Get Started
                  </span>
                </Text>

                <div style={{
                  display: 'flex',
                  gap: '32px',
                  maxWidth: '500px',
                  margin: '0 auto',
                  justifyContent: 'center'
                }}>
                  {/* Need Help Card */}
                  <div className="futuristic-card" style={{
                    flex: '1',
                    borderRadius: '20px',
                    padding: '40px',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {/* Ambient glow effect */}
                    <div style={{
                      position: 'absolute',
                      top: '-50%',
                      left: '-50%',
                      width: '200%',
                      height: '200%',
                      background: 'radial-gradient(circle, rgba(255, 32, 78, 0.08) 0%, transparent 70%)',
                      animation: 'pulse 3s ease-in-out infinite',
                      pointerEvents: 'none'
                    }} />
                    
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      <BlockStack gap="500">
                        <div style={{
                          width: '80px',
                          height: '80px',
                          background: 'linear-gradient(135deg, #FF204E, #A0153E)',
                          borderRadius: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 20px 40px rgba(255, 32, 78, 0.3)',
                          margin: '0 auto'
                        }}>
                          <Icon source={ClockIcon} tone="base" />
                        </div>
                        
                        <BlockStack gap="300" align="center">
                          <Text as="h3" variant="headingLg" alignment="center">
                            <span style={{
                              fontFamily: 'Orbitron, monospace',
                              fontWeight: '600',
                              background: 'linear-gradient(135deg, #FF204E, #A0153E)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent'
                            }}>
                              Need Guidance?
                            </span>
                          </Text>
                          <Text as="p" variant="bodyLg" alignment="center" tone="subdued">
                            <span style={{ 
                              fontFamily: 'Inter, sans-serif',
                              lineHeight: '1.7'
                            }}>
                              Access comprehensive guides, interactive tutorials, and expert best practices to master inventory management.
                            </span>
                          </Text>
                        </BlockStack>
                        
                        <Button 
                          variant="primary"
                          size="large"
                          fullWidth
                          onClick={() => {
                            // Highlight the floating help button without navigation
                            const helpButton = document.querySelector('[data-help-button]') as HTMLElement;
                            if (helpButton) {
                              helpButton.style.animation = 'helpHighlight 2s ease-in-out';
                              setTimeout(() => {
                                helpButton.style.animation = '';
                              }, 2000);
                            }
                          }}
                        >
                          Start Learning
                        </Button>
                      </BlockStack>
                    </div>
                  </div>
                </div>
              </BlockStack>
            </div>
          </BlockStack>
        </div>
      </Page>
    </>
  );
}
