import {
  Text,
  Button,
  Icon,
  InlineStack,
  Box,
  Tooltip,
  BlockStack,
} from "@shopify/polaris";
import {
  SettingsIcon,
  QuestionCircleIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  SunIcon,
  MoonIcon,
} from "@shopify/polaris-icons";
import { useTheme } from "../contexts/ThemeContext";

interface AppHeaderProps {
  onTabChange: (tab: string) => void;
  activeTab: string;
  outOfStockCount?: number;
  hasNotifications?: boolean;
  onPreloadComponent?: (componentName: string) => void;
}

export function AppHeader({ onTabChange, activeTab, outOfStockCount = 0, hasNotifications = false, onPreloadComponent }: AppHeaderProps) {
  const { theme, toggleTheme } = useTheme();

  // Theme toggle button
  const themeToggleButton = (
    <Tooltip content={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
      <button
        className="theme-toggle-button"
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        <Icon source={theme === 'light' ? MoonIcon : SunIcon} />
      </button>
    </Tooltip>
  );

  // Mobile-friendly settings button - icon only
  const mobileSettingsButton = (
    <div className={activeTab === "settings" ? "nav-button-active" : "nav-button-inactive"} style={{
      background: activeTab === "settings" ? 'white' : 'transparent',
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
      background: activeTab === "settings" ? 'white' : 'transparent',
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

  // Mobile-friendly secondary menu
  const mobileSecondaryMenu = (
    <InlineStack gap="200">
      {themeToggleButton}
      {mobileSettingsButton}
    </InlineStack>
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
      onClick={() => onTabChange("welcome")}
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
      
      {/* Clean App Branding - Smaller Size */}
      <BlockStack gap="050">
        <Text as="h1" variant="headingLg">
          <span style={{ 
            background: 'linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontWeight: 'bold',
            fontFamily: 'inherit' // Easy to change font family later
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
            color: '#666',
            fontWeight: 'medium',
            fontFamily: 'inherit' // Easy to change font family later
          }}>
            Advanced Product Monitoring
          </span>
        </Text>
      </BlockStack>
    </InlineStack>
  );

  const navigationMarkup = (
    <InlineStack gap="200" align="center">
      {/* Dashboard Button */}
      <div className={activeTab === "dashboard" ? "nav-button-active" : "nav-button-inactive"} style={{
        background: activeTab === "dashboard" ? 'white' : 'transparent',
        borderRadius: '12px',
        padding: '2px',
        border: activeTab === "dashboard" ? '2px solid #FF204E' : '1px solid transparent',
        boxShadow: activeTab === "dashboard" ? '0 2px 8px rgba(255, 32, 78, 0.3)' : 'none'
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
      <InlineStack gap="100" align="center">
        <div className={activeTab === "out-of-stock" ? "nav-button-active" : "nav-button-inactive"} style={{
          background: activeTab === "out-of-stock" ? 'white' : 'transparent',
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
      </InlineStack>
      
      {/* Notifications Button */}
      <div className={activeTab === "notifications" ? "nav-button-active" : "nav-button-inactive"} style={{
        background: activeTab === "notifications" ? 'white' : 'transparent',
        borderRadius: '12px',
        padding: '2px',
        border: activeTab === "notifications" ? '2px solid #FF204E' : '1px solid transparent',
        boxShadow: activeTab === "notifications" ? '0 2px 8px rgba(255, 32, 78, 0.3)' : 'none',
        position: 'relative'
      }}>
        <Button
          onClick={() => onTabChange("notifications")}
          variant="tertiary"
          icon={hasNotifications ? CheckCircleIcon : AlertTriangleIcon}
          size="medium"
        >
          Notification Settings
        </Button>
      </div>
    </InlineStack>
  );

  return (
    <>
      {/* Add CSS animations to document head */}
      <style dangerouslySetInnerHTML={{
        __html: `
          /* Button styling */
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
            color: #666 !important;
            font-weight: medium !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          }
          
          .nav-button-inactive button span {
            color: #666 !important;
            font-weight: medium !important;
          }
          
          .nav-button-inactive button svg {
            fill: #666 !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          }
          
          .nav-button-inactive button:hover {
            background: rgba(255, 32, 78, 0.1) !important;
            transform: translateY(-1px) !important;
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
        background: 'linear-gradient(135deg, #fdf2f5 0%, #fef7f9 50%, #fdf2f5 100%)',
        borderBottom: '1px solid #e0e0e0',
        borderRadius: '0 0 24px 24px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 2px 8px rgba(255, 32, 78, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 6px 30px rgba(0,0,0,0.12), 0 4px 12px rgba(255, 32, 78, 0.15)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08), 0 2px 8px rgba(255, 32, 78, 0.1)';
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
              `
            }} />
            
            {/* Mobile: Logo and Settings on top row */}
            <InlineStack align="space-between" blockAlign="center">
              {logoMarkup}
              {mobileSecondaryMenu}
            </InlineStack>
            
            {/* Mobile: Navigation on second row */}
            <Box paddingBlockStart="400">
              <div style={{
                background: 'rgba(255, 255, 255, 0.8)',
                borderRadius: '12px',
                padding: '12px 16px',
                border: '1px solid rgba(255, 32, 78, 0.2)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08), 0 2px 8px rgba(255, 32, 78, 0.1)',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                justifyContent: 'center'
              }}>
                {navigationMarkup}
              </div>
            </Box>
          </div>

          {/* Desktop Layout */}
          <div style={{ display: 'none' }} className="desktop-header">
            <InlineStack align="space-between" blockAlign="center">
              <InlineStack gap="600" align="center">
                {logoMarkup}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.8)',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  border: '1px solid rgba(255, 32, 78, 0.2)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  backdropFilter: 'blur(10px)'
                }}>
                  <InlineStack gap="100" align="center">
                    {navigationMarkup}
                    {desktopSettingsButton}
                  </InlineStack>
                </div>
              </InlineStack>
              
              {/* Empty space - cleaner look */}
              <div></div>
            </InlineStack>
          </div>
        </Box>
      </div>
      
      {/* Floating Help Guide */}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 1000,
        background: 'linear-gradient(135deg, #fdf2f5 0%, #fef7f9 100%)',
        borderRadius: '50%',
        width: '56px',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15), 0 2px 8px rgba(255, 32, 78, 0.2)',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        border: '2px solid rgba(255, 32, 78, 0.3)'
      }}
      onClick={() => onTabChange("help")}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.1)';
        e.currentTarget.style.boxShadow = '0 6px 30px rgba(0,0,0,0.2), 0 4px 12px rgba(255, 32, 78, 0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15), 0 2px 8px rgba(255, 32, 78, 0.2)';
      }}>
        <Icon source={QuestionCircleIcon} tone="base" />
      </div>
    </>
  );
}
