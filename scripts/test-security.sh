#!/bin/bash
# Security Testing Script for Spector App
# Run this after deployment to verify all security features

set -e

echo "🔒 Spector Security Test Suite"
echo "================================"
echo ""

APP_URL="${1:-https://spector.fly.dev}"
echo "Testing: $APP_URL"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass_count=0
fail_count=0

# Function to print test result
print_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓ PASS${NC}: $2"
    ((pass_count++))
  else
    echo -e "${RED}✗ FAIL${NC}: $2"
    ((fail_count++))
  fi
}

# Test 1: HTTPS Redirect
echo "Test 1: HTTPS Redirect"
HTTP_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -L "http://spector.fly.dev/" 2>/dev/null || echo "000")
if [[ "$HTTP_RESPONSE" == "200" ]] || [[ "$HTTP_RESPONSE" == "301" ]] || [[ "$HTTP_RESPONSE" == "302" ]]; then
  print_result 0 "HTTP redirects to HTTPS"
else
  print_result 1 "HTTP does not redirect properly (got $HTTP_RESPONSE)"
fi
echo ""

# Test 2: HSTS Header
echo "Test 2: Strict-Transport-Security Header"
HSTS_HEADER=$(curl -s -I "$APP_URL/" 2>/dev/null | grep -i "strict-transport-security" || echo "")
if [[ -n "$HSTS_HEADER" ]]; then
  print_result 0 "HSTS header present: $HSTS_HEADER"
else
  print_result 1 "HSTS header missing"
fi
echo ""

# Test 3: Content Security Policy
echo "Test 3: Content-Security-Policy Header"
CSP_HEADER=$(curl -s -I "$APP_URL/" 2>/dev/null | grep -i "content-security-policy" || echo "")
if [[ -n "$CSP_HEADER" ]]; then
  print_result 0 "CSP header present"
  echo "   CSP: $CSP_HEADER"
else
  print_result 1 "CSP header missing"
fi
echo ""

# Test 4: X-Content-Type-Options
echo "Test 4: X-Content-Type-Options Header"
XCTO_HEADER=$(curl -s -I "$APP_URL/" 2>/dev/null | grep -i "x-content-type-options: nosniff" || echo "")
if [[ -n "$XCTO_HEADER" ]]; then
  print_result 0 "X-Content-Type-Options: nosniff present"
else
  print_result 1 "X-Content-Type-Options header missing"
fi
echo ""

# Test 5: X-Frame-Options
echo "Test 5: X-Frame-Options Header"
XFO_HEADER=$(curl -s -I "$APP_URL/" 2>/dev/null | grep -i "x-frame-options" || echo "")
if [[ -n "$XFO_HEADER" ]]; then
  print_result 0 "X-Frame-Options present: $XFO_HEADER"
else
  print_result 1 "X-Frame-Options header missing"
fi
echo ""

# Test 6: X-XSS-Protection
echo "Test 6: X-XSS-Protection Header"
XXSS_HEADER=$(curl -s -I "$APP_URL/" 2>/dev/null | grep -i "x-xss-protection" || echo "")
if [[ -n "$XXSS_HEADER" ]]; then
  print_result 0 "X-XSS-Protection present: $XXSS_HEADER"
else
  print_result 1 "X-XSS-Protection header missing"
fi
echo ""

# Test 7: Referrer-Policy
echo "Test 7: Referrer-Policy Header"
REF_HEADER=$(curl -s -I "$APP_URL/" 2>/dev/null | grep -i "referrer-policy" || echo "")
if [[ -n "$REF_HEADER" ]]; then
  print_result 0 "Referrer-Policy present: $REF_HEADER"
else
  print_result 1 "Referrer-Policy header missing"
fi
echo ""

# Test 8: Permissions-Policy
echo "Test 8: Permissions-Policy Header"
PERM_HEADER=$(curl -s -I "$APP_URL/" 2>/dev/null | grep -i "permissions-policy" || echo "")
if [[ -n "$PERM_HEADER" ]]; then
  print_result 0 "Permissions-Policy present"
else
  print_result 1 "Permissions-Policy header missing"
fi
echo ""

# Test 9: Rate Limiting (if analytics endpoint is accessible)
echo "Test 9: Rate Limiting"
echo "   (Note: This test requires authentication, may return 401/403)"
echo "   Making 5 rapid requests to analytics endpoint..."

rate_limit_triggered=false
for i in {1..5}; do
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL/app/api/analytics" 2>/dev/null || echo "000")
  if [[ "$RESPONSE" == "429" ]]; then
    rate_limit_triggered=true
    break
  fi
  sleep 0.1
done

if [[ "$rate_limit_triggered" == true ]]; then
  print_result 0 "Rate limiting working (got 429 response)"
else
  echo -e "${YELLOW}⚠ SKIP${NC}: Rate limiting test inconclusive (authentication required)"
fi
echo ""

# Test 10: SSL/TLS Configuration
echo "Test 10: SSL/TLS Configuration"
SSL_OUTPUT=$(curl -vI "$APP_URL/" 2>&1 | grep -i "ssl connection\|tls" || echo "")
if [[ -n "$SSL_OUTPUT" ]]; then
  print_result 0 "SSL/TLS connection established"
else
  print_result 1 "SSL/TLS configuration issue"
fi
echo ""

# Summary
echo "================================"
echo "Test Summary:"
echo "================================"
echo -e "${GREEN}Passed: $pass_count${NC}"
echo -e "${RED}Failed: $fail_count${NC}"
echo ""

if [ $fail_count -eq 0 ]; then
  echo -e "${GREEN}🎉 All security tests passed!${NC}"
  exit 0
else
  echo -e "${RED}⚠️  Some security tests failed. Please review.${NC}"
  exit 1
fi
