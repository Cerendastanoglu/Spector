# Spector - Shopify Product Intelligence App

Spector is a comprehensive Shopify app that provides product analytics, inventory forecasting, and bulk product management capabilities.

## Features

- **Product Analytics**: Track product performance, sales metrics, and trends
- **Inventory Forecasting**: Predict stock needs and prevent stockouts
- **Bulk Product Management**: Edit multiple products at once (prices, inventory, tags, collections, content)
- **Performance Dashboard**: Real-time insights and metrics
- **Subscription Billing**: Integrated billing through Shopify

## Tech Stack

- **Framework**: Remix (React-based)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Hosting**: Google Cloud Run
- **Queue**: BullMQ with Redis
- **Email**: Resend

## Local Development

### Prerequisites

1. Node.js 18 or higher
2. Shopify Partner Account
3. Development store for testing

### Setup

1. Install dependencies:
```bash
npm install
```

2. Set up your environment variables:
```bash
cp .env.example .env
# Fill in your values in .env
```

3. Set up the database:
```bash
npx prisma migrate deploy
npx prisma generate
```

4. Run the development server:
```bash
npm run dev
```

## Production Deployment

The app is deployed to Google Cloud Run. See deployment documentation for details.

### Environment Variables Required

- `SHOPIFY_API_KEY`: Your Shopify app's Client ID
- `SHOPIFY_API_SECRET`: Your Shopify app's Client Secret  
- `SHOPIFY_APP_URL`: Your deployed app URL
- `DATABASE_URL`: PostgreSQL connection string
- `SCOPES`: Shopify API scopes
- `ENCRYPTION_KEY`: For encrypting sensitive data

## Project Structure

```
app/
├── components/        # React components
├── routes/           # Remix routes and API endpoints
├── services/         # Business logic
├── utils/            # Helper functions
└── shopify.server.ts # Shopify app configuration

prisma/
└── schema.prisma     # Database schema

public/               # Static assets
```

## Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run deploy` - Deploy to Shopify
- `npx prisma migrate dev` - Create database migration
- `npm run lint` - Run linter

## Support

For issues or questions, contact the development team.

---

Built with ❤️ for Shopify merchants