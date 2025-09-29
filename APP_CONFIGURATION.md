# Spector App Configuration Guide

This document contains the configuration information for the Spector app that should be set up in the Shopify Partner Dashboard.

## App Information (Partner Dashboard Settings)

### Basic Information
- **App Name**: Spector
- **App Handle**: spector
- **Support Email**: hello@spector-app.com
- **Privacy Policy URL**: https://spector-app.com/privacy
- **Support URL**: https://spector-app.com/support

### App Description
Spector is your intelligent inventory management companion for Shopify stores. Get real-time insights into your product performance, inventory health, and make data-driven decisions to optimize your business.

## Pricing Configuration (Partner Dashboard)

### Current Plan: Spector Limited Plan
- **Price**: $14.99 USD/month
- **Free Trial**: 3 days
- **Type**: Introductory pricing for early adopters

### Plan Features
- Basic inventory tracking
- Product analytics dashboard
- Bulk product operations
- Email notifications
- Performance monitoring
- Inventory forecasting (AI-powered)
- Low stock alerts
- Profit margin analysis

### Plan Description
```
Limited features plan - Perfect for getting started with inventory management. 

This is an introductory price for early adopters as we're a new app. New features and enhanced plans will be added in future updates with more advanced functionality.

Get started with intelligent inventory management today!
```

## Future Plans (Roadmap)
- **Pro Plan**: Enhanced features with advanced analytics
- **Enterprise Plan**: Custom integrations and priority support
- **Additional Features**: 
  - Advanced forecasting algorithms
  - Multi-location inventory management
  - Custom reporting
  - API access
  - Priority customer support

## Access Scopes Required
- `read_products`: Read product information
- `write_products`: Update product details
- `read_orders`: Access order data for analytics
- `write_orders`: Update order information if needed

## Webhooks
- `app/uninstalled`: Handle app uninstallation
- `app/scopes_update`: Handle scope changes

## Notes for Partner Dashboard Setup
1. Set up the pricing plan in the "App pricing" section
2. Configure app information in the "App setup" section
3. Upload app screenshots and marketing materials
4. Set up the app listing description
5. Configure webhook endpoints
6. Set up OAuth redirect URLs
7. Request app review when ready for public listing

## App Store Listing Keywords
- inventory management
- stock tracking
- analytics
- forecasting
- shopify inventory
- stock alerts
- inventory optimization
- product analytics