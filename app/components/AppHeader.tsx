import {
  Text,
  Button,
  InlineStack,
  Box,
  Tooltip,
  BlockStack,
} from "@shopify/polaris";
import {
  SettingsIcon,
  QuestionCircleIcon,
} from "@shopify/polaris-icons";
import { useTheme } from "../contexts/ThemeContext";

interface AppHeaderProps {
  onTabChange: (tab: string) => void;
  activeTab: string;
  outOfStockCount?: number;
  onPreloadComponent?: (componentName: string) => void;
}

export function AppHeader({ onTabChange, activeTab, outOfStockCount = 0, onPreloadComponent }: AppHeaderProps) {
  const { theme } = useTheme();



  // Mobile-friendly settings button - icon only
  const mobileSettingsButton = (
    <div className={activeTab === "settings" ? "nav-button-active" : "nav-button-inactive"} style={{
      background: activeTab === "settings" 
        ? (theme === 'dark' ? 'rgba(60, 60, 60, 0.8)' : 'white')
        : 'transparent',
      borderRadius: '12px',
      padding: '2px',
      border: activeTab === "settings" ? '2px solid #FF204E' : '1px solid transparent',
      boxShadow: activeTab === "settings" ? '0 2px 8px rgba(255, 32, 78, 0.3)' : 'none',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    }}>
      <Tooltip content="App Configuration">
        <Button 
          onClick={() => onTabChange("settings")}
          icon={SettingsIcon} 
          variant="tertiary"
          size="medium"
        />
      </Tooltip>
    </div>
  );

  // Desktop settings button with text
  const desktopSettingsButton = (
    <div className={activeTab === "settings" ? "nav-button-active" : "nav-button-inactive"} style={{
      background: activeTab === "settings" 
        ? (theme === 'dark' ? 'rgba(60, 60, 60, 0.8)' : 'white')
        : 'transparent',
      borderRadius: '12px',
      padding: '2px',
      border: activeTab === "settings" ? '2px solid #FF204E' : '1px solid transparent',
      boxShadow: activeTab === "settings" ? '0 2px 8px rgba(255, 32, 78, 0.3)' : 'none',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    }}>
      <Button 
        onClick={() => onTabChange("settings")}
        icon={SettingsIcon} 
        variant="tertiary"
        size="medium"
      >
        App Configuration
      </Button>
    </div>
  );

  // Help button - appears in pink header background
  const helpButton = (
    <Tooltip content="Help & Documentation">
      <Button 
        onClick={() => onTabChange("help")}
        icon={QuestionCircleIcon} 
        variant="tertiary"
        size="medium"
      />
    </Tooltip>
  );

  const logoMarkup = (
    <InlineStack gap="400" align="center">
      {/* Simple Logo Container - Clean and Transparent */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer'
      }}
      onClick={() => onTabChange("dashboard")}
      onMouseEnter={(e) => {
        e.currentTarget.style.animation = 'logoHover 0.6s ease-in-out';
        e.currentTarget.style.transform = 'scale(1.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.animation = 'none';
        e.currentTarget.style.transform = 'scale(1)';
      }}>
        <img 
          src="/assets/logo.png" 
          alt="Spector Logo" 
          style={{ 
            width: '80px', 
            height: '80px', 
            objectFit: 'contain',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.1))'
          }}
          onError={(e) => {
            // Fallback to placeholder if logo doesn't load
            e.currentTarget.style.display = 'none';
            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
            if (fallback) {
              fallback.style.display = 'flex';
            }
          }}
        />
        <div style={{
          width: '80px',
          height: '80px',
          background: 'linear-gradient(135deg, #FF204E, #A0153E)',
          borderRadius: '12px',
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '32px',
          fontWeight: 'bold',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 4px 12px rgba(255, 32, 78, 0.3)'
        }}>
          S
        </div>
      </div>
      
      {/* Clean App Branding - Theme-aware */}
      <BlockStack gap="050">
        <Text as="h1" variant="headingLg">
          <span style={{ 
            background: theme === 'dark' 
              ? 'linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%)'
              : 'linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontWeight: '700',
            fontFamily: '"All Round Gothic Bold", "Outfit", "Inter", system-ui, sans-serif'
          }}>
            Spector
          </span>
          <span style={{
            marginLeft: '6px',
            color: '#FF204E',
            fontSize: '0.6em',
            fontWeight: 'normal',
            verticalAlign: 'super'
          }}>
            ✦
          </span>
        </Text>
        <Text as="p" variant="bodyXs">
          <span style={{
            color: theme === 'dark' ? '#b0b0b0' : '#666',
            fontWeight: 'medium',
            fontFamily: 'inherit' // Easy to change font family later
          }}>
            Product Management Suite
          </span>
        </Text>
      </BlockStack>
    </InlineStack>
  );

  const navigationMarkup = (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'nowrap' }}>
      {/* Dashboard Button */}
      <div className={activeTab === "dashboard" ? "nav-button-active" : "nav-button-inactive"} style={{
        background: activeTab === "dashboard" 
          ? (theme === 'dark' ? 'rgba(60, 60, 60, 0.8)' : 'white')
          : 'transparent',
        borderRadius: '12px',
        padding: '2px',
        border: activeTab === "dashboard" ? '2px solid #FF204E' : '1px solid transparent',
        boxShadow: activeTab === "dashboard" ? '0 2px 8px rgba(255, 32, 78, 0.3)' : 'none',
        flexShrink: 0
      }}>
        <Button
          onClick={() => onTabChange("dashboard")}
          onMouseEnter={() => onPreloadComponent?.('Dashboard')}
          variant="tertiary"
          size="medium"
        >
          Dashboard
        </Button>
      </div>
      
      {/* Product Management with Badge */}
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
        <div className={activeTab === "out-of-stock" ? "nav-button-active" : "nav-button-inactive"} style={{
          background: activeTab === "out-of-stock" 
            ? (theme === 'dark' ? 'rgba(60, 60, 60, 0.8)' : 'white')
            : 'transparent',
          borderRadius: '12px',
          padding: '2px',
          border: activeTab === "out-of-stock" ? '2px solid #FF204E' : '1px solid transparent',
          boxShadow: activeTab === "out-of-stock" ? '0 2px 8px rgba(255, 32, 78, 0.3)' : 'none'
        }}>
          <Button
            onClick={() => onTabChange("out-of-stock")}
            onMouseEnter={() => onPreloadComponent?.('ProductManagement')}
            variant="tertiary"
            size="medium"
          >
            Product Management
          </Button>
        </div>
        
        {/* Brand color badge */}
        {outOfStockCount > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #FF204E, #A0153E)',
            borderRadius: '12px',
            padding: '4px 8px',
            minWidth: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(255, 32, 78, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.8)'
          }}>
            <Text as="span" variant="bodySm" fontWeight="bold">
              <span style={{ 
                color: 'white',
                textShadow: '0 1px 1px rgba(0, 0, 0, 0.2)'
              }}>
                {outOfStockCount}
              </span>
            </Text>
          </div>
        )}
      </div>
      
      {/* Forecasting Button */}
      <div className={activeTab === "forecasting" ? "nav-button-active" : "nav-button-inactive"} style={{
        background: activeTab === "forecasting" 
          ? (theme === 'dark' ? 'rgba(60, 60, 60, 0.8)' : 'white')
          : 'transparent',
        borderRadius: '12px',
        padding: '2px',
        border: activeTab === "forecasting" ? '2px solid #FF204E' : '1px solid transparent',
        boxShadow: activeTab === "forecasting" ? '0 2px 8px rgba(255, 32, 78, 0.3)' : 'none',
        flexShrink: 0
      }}>
        <Button
          onClick={() => onTabChange("forecasting")}
          onMouseEnter={() => onPreloadComponent?.('Forecasting')}
          variant="tertiary"
          size="medium"
        >
          Forecasting
        </Button>
      </div>

    </div>
  );

  return (
    <>
      {/* Add CSS animations to document head */}
      <style dangerouslySetInnerHTML={{
        __html: `
          /* Button styling - Theme aware */
          .nav-button-active button {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            color: #A0153E !important;
            font-weight: bold !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          }
          
          .nav-button-active button span {
            color: #A0153E !important;
            font-weight: bold !important;
          }
          
          .nav-button-active button svg {
            fill: #A0153E !important;
          }
          
          .nav-button-inactive button {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            color: ${theme === 'dark' ? '#b0b0b0' : '#666'} !important;
            font-weight: medium !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          }
          
          .nav-button-inactive button span {
            color: ${theme === 'dark' ? '#b0b0b0' : '#666'} !important;
            font-weight: medium !important;
          }
          
          .nav-button-inactive button svg {
            fill: ${theme === 'dark' ? '#b0b0b0' : '#666'} !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          }
          
          .nav-button-inactive button:hover {
            background: rgba(255, 32, 78, 0.1) !important;
            transform: translateY(-1px) !important;
          }
          
          .nav-button-inactive button:hover span {
            color: #A0153E !important;
          }
          
          .nav-button-inactive button:hover svg {
            fill: #A0153E !important;
          }
          
          .nav-button-active button:hover {
            background: rgba(255, 32, 78, 0.05) !important;
            transform: translateY(-1px) !important;
          }
          
          /* Header floating animation */
          @keyframes headerFloat {
            0%, 100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-2px);
            }
          }
          
          /* Logo gentle hover animation */
          @keyframes logoHover {
            0%, 100% {
              transform: scale(1) rotate(0deg);
            }
            50% {
              transform: scale(1.05) rotate(1deg);
            }
          }
          
          /* Subtle background animation */
          @keyframes backgroundShimmer {
            0%, 100% {
              background-position: 0% 50%;
            }
            50% {
              background-position: 100% 50%;
            }
          }
        `
      }} />
      
      <div className="app-header" style={{
        background: theme === 'dark'
          ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)'
          : 'linear-gradient(135deg, #fdf2f5 0%, #fef7f9 50%, #fdf2f5 100%)',
        borderBottom: theme === 'dark' ? '1px solid #404040' : '1px solid #e0e0e0',
        borderRadius: '0 0 24px 24px',
        boxShadow: theme === 'dark'
          ? '0 4px 20px rgba(0,0,0,0.3), 0 2px 8px rgba(255, 32, 78, 0.2)'
          : '0 4px 20px rgba(0,0,0,0.08), 0 2px 8px rgba(255, 32, 78, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = theme === 'dark'
          ? '0 6px 30px rgba(0,0,0,0.4), 0 4px 12px rgba(255, 32, 78, 0.25)'
          : '0 6px 30px rgba(0,0,0,0.12), 0 4px 12px rgba(255, 32, 78, 0.15)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = theme === 'dark'
          ? '0 4px 20px rgba(0,0,0,0.3), 0 2px 8px rgba(255, 32, 78, 0.2)'
          : '0 4px 20px rgba(0,0,0,0.08), 0 2px 8px rgba(255, 32, 78, 0.1)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}>
        <Box padding="500" position="relative">
          {/* Mobile Layout */}
          <div style={{ display: 'block' }} className="mobile-header">
            <style dangerouslySetInnerHTML={{
              __html: `
                @media (min-width: 768px) {
                  .mobile-header { display: none !important; }
                  .desktop-header { display: block !important; }
                }
                @media (max-width: 767px) {
                  .mobile-header { display: block !important; }
                  .desktop-header { display: none !important; }
                }
                
                /* Mobile navigation scrolling */
                @media (max-width: 767px) {
                  .mobile-nav-container {
                    overflow-x: auto !important;
                    -webkit-overflow-scrolling: touch !important;
                    scrollbar-width: none !important;
                    -ms-overflow-style: none !important;
                  }
                  .mobile-nav-container::-webkit-scrollbar {
                    display: none !important;
                  }
                }
              `
            }} />
            
            {/* Mobile: Logo, Help, and Settings on top row */}
            <InlineStack align="space-between" blockAlign="center">
              {logoMarkup}
              <InlineStack gap="300">
                {helpButton}
                {mobileSettingsButton}
              </InlineStack>
            </InlineStack>
            
            {/* Mobile: Navigation on second row */}
            <Box paddingBlockStart="400">
              <div className="mobile-nav-container" style={{
                background: theme === 'dark'
                  ? 'rgba(42, 42, 42, 0.9)'
                  : 'rgba(255, 255, 255, 0.8)',
                borderRadius: '12px',
                padding: '8px 12px',
                border: theme === 'dark'
                  ? '1px solid rgba(255, 32, 78, 0.3)'
                  : '1px solid rgba(255, 32, 78, 0.2)',
                boxShadow: theme === 'dark'
                  ? '0 4px 12px rgba(0,0,0,0.3), 0 2px 8px rgba(255, 32, 78, 0.2)'
                  : '0 4px 12px rgba(0,0,0,0.08), 0 2px 8px rgba(255, 32, 78, 0.1)',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                gap: '6px',
                overflowX: 'auto',
                alignItems: 'center',
                justifyContent: 'flex-start'
              }}>
                {navigationMarkup}
              </div>
            </Box>
          </div>

          {/* Desktop Layout */}
          <div style={{ display: 'none' }} className="desktop-header">
            <InlineStack align="space-between" blockAlign="center">
              <InlineStack gap="400" align="center">
                {logoMarkup}
              </InlineStack>
              
              {/* Navigation moved to center-right with more spacing */}
              <InlineStack gap="300" align="center">
                <div style={{
                  background: theme === 'dark'
                    ? 'rgba(42, 42, 42, 0.9)'
                    : 'rgba(255, 255, 255, 0.8)',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  border: theme === 'dark'
                    ? '1px solid rgba(255, 32, 78, 0.3)'
                    : '1px solid rgba(255, 32, 78, 0.2)',
                  boxShadow: theme === 'dark'
                    ? '0 2px 8px rgba(0,0,0,0.2)'
                    : '0 2px 8px rgba(0,0,0,0.06)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  {navigationMarkup}
                  {desktopSettingsButton}
                </div>
                {/* Help button outside white section, in pink header */}
                {helpButton}
              </InlineStack>
            </InlineStack>
          </div>
        </Box>
      </div>
    </>
  );
}
