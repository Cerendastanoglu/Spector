# Spector - Advanced Product Monitoring

## Overview

Spector is an advanced Shopify app for monitoring product inventory and managing out-of-stock situations. Built with Remix, Polaris, and GraphQL, it provides merchants with real-time insights into their product inventory status.

## Features

### 🎯 Current Features

- **Smart Header Navigation**: Clean, modern header with logo, navigation tabs, and settings
- **Dashboard**: Overview of inventory statistics and quick actions
- **Out of Stock Products**: Automatic detection and display of products with zero inventory
- **Real-time Data**: Live inventory tracking using Shopify GraphQL Admin API
- **Responsive Design**: Mobile-friendly interface using Shopify Polaris components

### 🏗️ Navigation Structure

- **Dashboard**: Main overview with statistics and quick actions
- **Out of Stock Products**: Automatically loads when app opens, shows products needing restocking
- **Analytics**: Planned - Inventory trends and analytics
- **Reports**: Planned - Comprehensive inventory reports
- **Settings**: Planned - App configuration and preferences

### 🔧 Technical Stack

- **Frontend**: React with Remix framework
- **UI Components**: Shopify Polaris design system
- **API**: Shopify GraphQL Admin API
- **Database**: SQLite with Prisma ORM
- **Authentication**: Shopify App authentication

## Component Architecture

### AppHeader
- Dynamic navigation with tab switching
- Settings dropdown with quick access
- Out-of-stock product count badge
- Professional branding with logo and tagline

### Dashboard
- Inventory statistics overview
- Quick action buttons
- Recent activity feed
- Integration with other app sections

### OutOfStockProducts
- Automatic data fetching on app load
- Product table with thumbnails and details
- Direct links to Shopify admin
- Restock action buttons

## Development

### Prerequisites
- Node.js 18+ or 20+
- Shopify CLI
- Shopify Partner account
- Development store

### Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Access the app**:
   - The CLI will provide a preview URL
   - Install the app in your development store
   - Navigate through the different sections using the header tabs

### Project Structure

```
app/
├── components/           # Reusable UI components
│   ├── AppHeader.tsx    # Main navigation header
│   ├── Dashboard.tsx    # Dashboard overview
│   └── OutOfStockProducts.tsx  # OOS product management
├── routes/
│   ├── app._index.tsx   # Main app page
│   └── app.api.products.tsx  # API endpoint for product data
└── shopify.server.ts    # Shopify authentication setup
```

## API Endpoints

### `/app/api/products`
- **POST** with `action: "fetch-out-of-stock"` - Retrieves products with zero inventory
- **POST** with `action: "fetch-low-stock"` - Retrieves products with low inventory (1-10 units)
- **POST** with `action: "get-stats"` - Returns inventory statistics

## Future Enhancements

### Planned Features
- **Low Stock Alerts**: Configurable thresholds for low inventory warnings
- **Automated Restocking**: Integration with suppliers for automatic reordering
- **Inventory Analytics**: Detailed charts and trends
- **Custom Reports**: Exportable inventory reports
- **Notification System**: Email and in-app notifications for inventory events
- **Multi-location Support**: Inventory tracking across multiple store locations

### Technical Improvements
- **Real-time Updates**: WebSocket integration for live inventory updates
- **Bulk Actions**: Mass update capabilities for product inventory
- **Advanced Filtering**: Complex search and filter options
- **Performance Optimization**: Caching and pagination for large inventories

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team or create an issue in the repository.

---

Built with ❤️ using Shopify's modern app development stack.
