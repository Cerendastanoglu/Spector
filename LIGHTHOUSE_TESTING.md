# Lighthouse Performance Testing

## Quick Test

Run Lighthouse to test your app's performance:

```bash
npm run lighthouse:test
```

This will:
1. Open your app in Chrome
2. Run performance, accessibility, and SEO tests
3. Save results to `lighthouse-results/` folder
4. Show your scores

## Commands Available

- `npm run lighthouse:before` - Test before making changes
- `npm run lighthouse:after` - Test after making changes  
- `npm run lighthouse:compare` - Compare before/after results

## What Gets Tested

- **Performance**: Load time, responsiveness
- **Accessibility**: Screen reader support, contrast
- **Best Practices**: Security, modern standards
- **SEO**: Meta tags, mobile-friendly

## Good Scores

- 90-100: Excellent ✅
- 50-89: Needs improvement ⚠️
- 0-49: Poor ❌

## Tips to Improve

1. Optimize images (use WebP format)
2. Minimize JavaScript bundles
3. Use lazy loading for heavy components
4. Add proper meta tags for SEO
