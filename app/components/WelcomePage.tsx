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

        @keyframes timelinePulse {
          0% { top: 0%; opacity: 1; }
          25% { opacity: 0.7; }
          50% { top: 50%; opacity: 1; }
          75% { opacity: 0.7; }
          100% { top: 100%; opacity: 0; }
        }

        .timeline-card:hover {
          transform: translateY(-8px) !important;
          box-shadow: 0 30px 60px rgba(255, 32, 78, 0.15) !important;
        }
      `}</style>
      
      <Page>
        <div style={{ background: 'transparent', minHeight: '100vh' }}>
          <BlockStack gap="0">
            {/* Hero Welcome Section - Clean & Minimal */}
            <div style={{
              padding: '60px 40px',
              position: 'relative',
              zIndex: 1,
              margin: '20px 40px 40px 40px',
              borderRadius: '16px',
              background: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.3)'
            }}>
              <BlockStack gap="500" align="center">
                <BlockStack gap="300" align="center">
                  <Text as="h1" variant="headingXl" alignment="center">
                    <span style={{ 
                      fontFamily: 'Orbitron, monospace', 
                      fontWeight: '700',
                      background: 'linear-gradient(135deg, #FF204E, #A0153E)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      fontSize: '2.5rem',
                      letterSpacing: '1px'
                    }}>
                      Welcome To SPECTOR
                    </span>
                  </Text>
                  <Text as="p" variant="bodyLg" alignment="center">
                    <span style={{ 
                      color: '#64748b',
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: '400',
                      fontSize: '1.1rem'
                    }}>
                      Next-Generation Inventory Intelligence
                    </span>
                  </Text>
                </BlockStack>
                
                <Button
                  variant="primary"
                  size="large"
                  onClick={() => onNavigate("dashboard")}
                >
                  Launch Dashboard
                </Button>
              </BlockStack>
            </div>

            {/* Vertical Timeline Roadmap */}
            <div style={{ padding: '40px', position: 'relative' }}>
              <div style={{ 
                textAlign: 'center', 
                marginBottom: '60px' 
              }}>
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
                    Track our journey of continuous innovation
                  </span>
                </Text>
              </div>
              
              {/* Vertical Timeline */}
              <div style={{ 
                position: 'relative',
                maxWidth: '800px',
                margin: '0 auto'
              }}>
                {/* Central Timeline Line */}
                <div style={{
                  position: 'absolute',
                  left: '50%',
                  top: '0',
                  bottom: '0',
                  width: '4px',
                  background: 'linear-gradient(180deg, #FF204E 0%, #A0153E 50%, #5D0E41 100%)',
                  transform: 'translateX(-50%)',
                  borderRadius: '2px',
                  boxShadow: '0 0 20px rgba(255, 32, 78, 0.3)'
                }} />
                
                {/* Animated Pulse Moving Along Timeline */}
                <div style={{
                  position: 'absolute',
                  left: '50%',
                  top: '0',
                  width: '12px',
                  height: '12px',
                  background: 'radial-gradient(circle, #FF204E, #A0153E)',
                  borderRadius: '50%',
                  transform: 'translateX(-50%)',
                  animation: 'timelinePulse 8s ease-in-out infinite',
                  boxShadow: '0 0 30px rgba(255, 32, 78, 0.6)',
                  zIndex: 10
                }} />
                
                {/* Timeline Items */}
                {timelineData.map((period, index) => (
                  <div 
                    key={index}
                    style={{
                      position: 'relative',
                      marginBottom: '80px',
                      display: 'flex',
                      alignItems: 'center',
                      minHeight: '120px'
                    }}
                  >
                    {/* Timeline Node */}
                    <div style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '24px',
                      height: '24px',
                      background: period.status === 'current' ? 'linear-gradient(45deg, #10b981, #059669)' :
                                period.status === 'upcoming' ? 'linear-gradient(45deg, #6366f1, #4f46e5)' :
                                'linear-gradient(45deg, #64748b, #475569)',
                      borderRadius: '50%',
                      border: '4px solid white',
                      boxShadow: period.status === 'current' ? '0 0 25px rgba(16, 185, 129, 0.5)' :
                               period.status === 'upcoming' ? '0 0 25px rgba(99, 102, 241, 0.5)' :
                               '0 0 25px rgba(100, 116, 139, 0.3)',
                      zIndex: 5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      color: 'white',
                      fontWeight: 'bold'
                    }}>
                      {period.status === 'current' ? '✓' :
                       period.status === 'upcoming' ? '○' : '◯'}
                    </div>
                    
                    {/* Content Card - Alternating Left/Right */}
                    <div style={{
                      width: '45%',
                      [index % 2 === 0 ? 'marginRight' : 'marginLeft']: 'auto',
                      [index % 2 === 0 ? 'marginLeft' : 'marginRight']: '55%'
                    }}>
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(15px)',
                        borderRadius: '20px',
                        padding: '32px',
                        border: period.status === 'current' ? '2px solid rgba(16, 185, 129, 0.3)' :
                               period.status === 'upcoming' ? '2px solid rgba(99, 102, 241, 0.3)' :
                               '2px solid rgba(100, 116, 139, 0.2)',
                        boxShadow: period.status === 'current' ? '0 20px 40px rgba(16, 185, 129, 0.1)' :
                                 period.status === 'upcoming' ? '0 20px 40px rgba(99, 102, 241, 0.1)' :
                                 '0 20px 40px rgba(100, 116, 139, 0.08)',
                        position: 'relative',
                        transform: 'translateY(0)',
                        transition: 'all 0.3s ease'
                      }}
                      className="timeline-card"
                      >
                        {/* Connection Line to Timeline */}
                        <div style={{
                          position: 'absolute',
                          top: '50%',
                          [index % 2 === 0 ? 'right' : 'left']: '-32px',
                          width: '32px',
                          height: '2px',
                          background: period.status === 'current' ? 'linear-gradient(90deg, #10b981, #059669)' :
                                    period.status === 'upcoming' ? 'linear-gradient(90deg, #6366f1, #4f46e5)' :
                                    'linear-gradient(90deg, #64748b, #475569)',
                          transform: 'translateY(-50%)'
                        }} />
                        
                        <BlockStack gap="400">
                          {/* Date & Status */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            flexWrap: 'wrap'
                          }}>
                            <div style={{
                              padding: '8px 16px',
                              background: period.status === 'current' ? 'rgba(16, 185, 129, 0.1)' :
                                        period.status === 'upcoming' ? 'rgba(99, 102, 241, 0.1)' :
                                        'rgba(100, 116, 139, 0.1)',
                              borderRadius: '20px',
                              border: period.status === 'current' ? '1px solid rgba(16, 185, 129, 0.3)' :
                                     period.status === 'upcoming' ? '1px solid rgba(99, 102, 241, 0.3)' :
                                     '1px solid rgba(100, 116, 139, 0.2)'
                            }}>
                              <Text as="span" variant="bodyMd">
                                <span style={{ 
                                  color: period.status === 'current' ? '#059669' :
                                        period.status === 'upcoming' ? '#4338ca' :
                                        '#475569',
                                  fontWeight: '600',
                                  fontFamily: 'Inter, sans-serif'
                                }}>
                                  {period.date}
                                </span>
                              </Text>
                            </div>
                            
                            <div style={{
                              padding: '6px 12px',
                              borderRadius: '12px',
                              background: period.status === 'current' ? '#10b981' :
                                        period.status === 'upcoming' ? '#6366f1' :
                                        '#64748b',
                              fontSize: '11px',
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
                          
                          {/* Title */}
                          <Text as="h3" variant="headingLg">
                            <span style={{
                              fontFamily: 'Orbitron, monospace',
                              fontWeight: '600',
                              color: period.status === 'current' ? '#0f172a' :
                                    period.status === 'upcoming' ? '#1e1b4b' :
                                    '#475569'
                            }}>
                              {period.title}
                            </span>
                          </Text>
                          
                          {/* Features */}
                          <BlockStack gap="200">
                            {period.items.map((item, itemIndex) => (
                              <div key={itemIndex} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '8px 0'
                              }}>
                                <div style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  background: item.status === 'completed' ? '#10b981' : 
                                            item.status === 'in-progress' ? '#f59e0b' :
                                            item.status === 'planned' ? '#6366f1' : '#64748b',
                                  flexShrink: 0
                                }} />
                                <Text as="p" variant="bodyMd">
                                  <span style={{
                                    color: item.status === 'completed' ? '#059669' : 
                                          item.status === 'in-progress' ? '#d97706' :
                                          item.status === 'planned' ? '#4338ca' : '#475569',
                                    fontWeight: item.status === 'completed' ? '500' : '400',
                                    fontFamily: 'Inter, sans-serif'
                                  }}>
                                    {item.feature}
                                  </span>
                                </Text>
                              </div>
                            ))}
                          </BlockStack>
                        </BlockStack>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
