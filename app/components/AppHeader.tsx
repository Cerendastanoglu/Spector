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
      <Tooltip content="Settings">
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
        Settings
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
      <div 
        className="logo-container"
        style={{
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
        }}
      >
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
      
      {/* Clean App Branding - Theme-aware - Hidden on mobile */}
      <div className="header-branding">
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
      </div>
    </InlineStack>
  );

  // Mobile-friendly compact navigation (shorter text)
  const mobileNavigationMarkup = (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'nowrap', flexShrink: 0 }}>
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
          size="slim"
        >
          Home
        </Button>
      </div>
      
      {/* Product Management with Badge */}
      <div style={{ display: 'flex', gap: '3px', alignItems: 'center', flexShrink: 0 }}>
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
            size="slim"
          >
            Products
          </Button>
        </div>
        
        {/* Brand color badge */}
        {outOfStockCount > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #FF204E, #A0153E)',
            borderRadius: '10px',
            padding: '2px 6px',
            minWidth: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(255, 32, 78, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.8)'
          }}>
            <Text as="span" variant="bodySm" fontWeight="bold">
              <span style={{ 
                color: 'white',
                textShadow: '0 1px 1px rgba(0, 0, 0, 0.2)',
                fontSize: '10px'
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
          size="slim"
        >
          Forecast
        </Button>
      </div>

    </div>
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
          Forecast
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
        <div className="header-box">
          <Box padding="500">
            <style dangerouslySetInnerHTML={{
              __html: `
                /* Reduce header padding on mobile/tablet only */
                @media (max-width: 1008px) {
                  .header-box > div {
                    padding: 10px !important;
                  }
                }
              `
            }} />
            {/* Mobile Layout */}
          <div style={{ display: 'block' }} className="mobile-header">
            <style dangerouslySetInnerHTML={{
              __html: `
                /* Desktop shows desktop-header, mobile shows mobile-header */
                @media (min-width: 1009px) {
                  .mobile-header { display: none !important; }
                  .desktop-header { display: block !important; }
                  .header-branding { display: block !important; }
                }
                @media (max-width: 1008px) {
                  .mobile-header { display: flex !important; }
                  .desktop-header { display: none !important; }
                  .header-branding { display: none !important; }
                }
                
                /* Mobile/Tablet: Everything on ONE line - NO SCROLL */
                @media (max-width: 1008px) {
                  .mobile-header {
                    flex-direction: row !important;
                    align-items: center !important;
                    justify-content: space-between !important;
                    gap: 4px !important;
                    flex-wrap: nowrap !important;
                    overflow: visible !important;
                  }
                  
                  .logo-container {
                    flex-shrink: 0 !important;
                  }
                  
                  .logo-container img,
                  .logo-container > div {
                    width: 35px !important;
                    height: 35px !important;
                  }
                  
                  .mobile-nav-section {
                    display: flex !important;
                    align-items: center !important;
                    gap: 3px !important;
                    flex-shrink: 0 !important;
                    overflow: visible !important;
                  }
                  
                  .mobile-nav-section > div {
                    display: flex !important;
                    gap: 3px !important;
                    flex-wrap: nowrap !important;
                  }
                  
                  .mobile-actions {
                    display: flex !important;
                    gap: 4px !important;
                    align-items: center !important;
                    flex-shrink: 0 !important;
                  }
                  
                  /* Ultra-compact buttons for mobile/tablet */
                  .nav-button-active,
                  .nav-button-inactive {
                    flex-shrink: 0 !important;
                    pointer-events: auto !important;
                  }
                  
                  .nav-button-active button,
                  .nav-button-inactive button {
                    font-size: 10px !important;
                    padding: 5px 8px !important;
                    min-height: 34px !important;
                    white-space: nowrap !important;
                    font-weight: 600 !important;
                    pointer-events: auto !important;
                    touch-action: manipulation !important;
                    cursor: pointer !important;
                  }
                  
                  .nav-button-active button span,
                  .nav-button-inactive button span {
                    font-size: 10px !important;
                    pointer-events: none !important;
                  }
                  
                  /* Smaller icon buttons for help/settings */
                  .mobile-actions button {
                    padding: 6px !important;
                    min-height: 34px !important;
                    pointer-events: auto !important;
                    touch-action: manipulation !important;
                    cursor: pointer !important;
                  }
                  
                  .mobile-actions button svg {
                    width: 16px !important;
                    height: 16px !important;
                  }
                }
                
                /* Slightly bigger for larger phones/small tablets */
                @media (min-width: 480px) and (max-width: 1008px) {
                  .nav-button-active button,
                  .nav-button-inactive button {
                    font-size: 11px !important;
                    padding: 5px 9px !important;
                    min-height: 36px !important;
                  }
                  
                  .nav-button-active button span,
                  .nav-button-inactive button span {
                    font-size: 11px !important;
                  }
                  
                  .logo-container img,
                  .logo-container > div {
                    width: 38px !important;
                    height: 38px !important;
                  }
                  
                  .mobile-actions button {
                    min-height: 36px !important;
                    padding: 7px !important;
                  }
                }
              `
            }} />
            
            {/* Mobile/Tablet: Single line layout - NO SCROLL */}
            <div className="logo-container">
              {logoMarkup}
            </div>
            
            <div className="mobile-nav-section">
              {mobileNavigationMarkup}
            </div>
            
            <div className="mobile-actions">
              {helpButton}
              {mobileSettingsButton}
            </div>
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
      </div>
    </>
  );
}
