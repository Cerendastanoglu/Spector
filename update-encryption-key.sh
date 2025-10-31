#!/bin/bash
# Security Update Script - Update .env with secure values
# Run this script to update your encryption key safely

echo "🔐 Security Update Script for Spector App"
echo "=========================================="
echo ""

# Generate new encryption key
NEW_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

echo "✅ Generated secure encryption key (64 hex characters)"
echo ""
echo "🔑 Your new ENCRYPTION_KEY:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$NEW_KEY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "   Please create .env from .env.example first"
    exit 1
fi

# Backup current .env
echo "💾 Creating backup of current .env..."
cp .env .env.backup
echo "✅ Backup created: .env.backup"
echo ""

# Update encryption key
echo "📝 Updating ENCRYPTION_KEY in .env..."
if grep -q "^ENCRYPTION_KEY=" .env; then
    # Replace existing key
    sed -i.tmp "s|^ENCRYPTION_KEY=.*|ENCRYPTION_KEY=$NEW_KEY|" .env
    rm .env.tmp 2>/dev/null
    echo "✅ ENCRYPTION_KEY updated successfully"
else
    # Add new key
    echo "ENCRYPTION_KEY=$NEW_KEY" >> .env
    echo "✅ ENCRYPTION_KEY added to .env"
fi

echo ""
echo "🎉 Security update complete!"
echo ""
echo "📋 Next Steps:"
echo "1. ✅ New encryption key has been set"
echo "2. ⚠️  Verify your app still works: shopify app dev"
echo "3. 🔄 Consider rotating Shopify API secret (see SECURITY_FIX_API_KEYS.md)"
echo "4. 🔄 Consider rotating Resend API key (optional)"
echo ""
echo "🔒 Security Notes:"
echo "   - Your old .env is backed up as .env.backup"
echo "   - New encryption key is cryptographically secure (256-bit)"
echo "   - For production, generate a DIFFERENT key using the same command"
echo "   - Never commit .env to git!"
echo ""
echo "📖 For more details, see: SECURITY_FIX_API_KEYS.md"
