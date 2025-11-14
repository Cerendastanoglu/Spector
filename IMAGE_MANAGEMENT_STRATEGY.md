# Image Management Strategy for Bulk Product Editor

## Problem Statement
We need to allow bulk image operations (add/remove/replace) for products, but:
- Cannot upload files directly to Shopify Admin file manager via GraphQL
- Images must be accessible via URL for Shopify to fetch them
- Need user-friendly upload experience

## Recommended Solution: Shopify Staged Uploads

### How It Works:
1. **User selects image** → File chosen in browser
2. **Request staged upload** → Get temporary Shopify URL
3. **Upload file** → POST file to Shopify's staging URL
4. **Create file in Shopify** → File becomes permanent, gets URL
5. **Attach to products** → Use URL in productCreateMedia/productUpdateMedia

### Implementation Steps:

#### Step 1: Request Staged Upload Target
```graphql
mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
  stagedUploadsCreate(input: $input) {
    stagedTargets {
      url
      resourceUrl
      parameters {
        name
        value
      }
    }
    userErrors {
      field
      message
    }
  }
}
```

#### Step 2: Upload File to Staged URL
```typescript
const formData = new FormData();
stagedTarget.parameters.forEach(param => {
  formData.append(param.name, param.value);
});
formData.append('file', fileBlob);

await fetch(stagedTarget.url, {
  method: 'POST',
  body: formData
});
```

#### Step 3: Create Permanent File
```graphql
mutation fileCreate($files: [FileCreateInput!]!) {
  fileCreate(files: $files) {
    files {
      ... on MediaImage {
        id
        image {
          url
        }
      }
    }
    userErrors {
      field
      message
    }
  }
}
```

#### Step 4: Attach to Products
```graphql
mutation productCreateMedia($media: [CreateMediaInput!]!, $productId: ID!) {
  productCreateMedia(media: $media, productId: $productId) {
    media {
      ... on MediaImage {
        id
        image {
          url
        }
      }
    }
    product {
      id
    }
    mediaUserErrors {
      field
      message
    }
  }
}
```

### Bulk Operations

#### Add Image to Multiple Products
1. Upload image once (Steps 1-3)
2. Get final Shopify file URL
3. Loop through products, attach same URL to each
4. Use `productCreateMedia` for each product

#### Remove Images
```graphql
mutation productDeleteMedia($mediaIds: [ID!]!, $productId: ID!) {
  productDeleteMedia(mediaIds: $mediaIds, productId: $productId) {
    deletedMediaIds
    product {
      id
    }
    mediaUserErrors {
      field
      message
    }
  }
}
```

#### Replace Featured Image
1. Upload new image (if needed)
2. Get all current media for product
3. Delete old featured image
4. Add new image
5. Reorder if needed using `productReorderMedia`

## UI/UX Design

### Upload Interface
```
┌─────────────────────────────────────┐
│ Bulk Image Management               │
├─────────────────────────────────────┤
│ ○ Add Image to Products             │
│   [Choose File] image.jpg           │
│   Position: ○ Featured ○ Additional │
│                                      │
│ ○ Remove Images                      │
│   ○ Remove Featured Image            │
│   ○ Remove All Images                │
│   ○ Remove Images at Position: [__] │
│                                      │
│ ○ From URL                           │
│   [Enter image URL...]              │
│                                      │
│ [Apply to X products]               │
└─────────────────────────────────────┘
```

### Progress Feedback
```
Uploading image to Shopify...  ████████░░ 80%
Adding to products...          ██████████ 100%
✓ Successfully updated 25 products
⚠ Failed: 2 products (invalid image format)
```

## Limitations & Considerations

### File Size
- Shopify max: 20 MB per image
- Recommended: Under 2 MB for web performance
- Show validation before upload

### File Types
- Supported: JPG, PNG, GIF, WebP
- Validate client-side before upload

### Rate Limiting
- Shopify API has rate limits
- For bulk operations, add delay between requests
- Show progress to user

### Error Handling
```typescript
try {
  // Upload flow
} catch (error) {
  if (error.message.includes('rate limit')) {
    // Retry with exponential backoff
  } else if (error.message.includes('file size')) {
    // Show file size error
  } else if (error.message.includes('invalid format')) {
    // Show format error
  }
}
```

## Alternative: URL Input Fallback

For users who already have hosted images:
```
┌─────────────────────────────────────┐
│ Or use an existing image URL:       │
│ [https://example.com/image.jpg]     │
│ [Preview] [Apply to Products]       │
└─────────────────────────────────────┘
```

## Code Structure

```
app/
  routes/
    app.api.images.tsx         # Image upload/management API
  components/
    ProductManagement/
      BulkImageManager.tsx     # Image upload UI component
  utils/
    shopifyImageUpload.ts      # Staged upload helper
    imageValidator.ts          # Client-side validation
```

## Next Steps

1. ✅ Document strategy (this file)
2. Create image upload API endpoint
3. Build staged upload helper
4. Create UI component for image selection
5. Implement bulk image attachment
6. Add remove/replace functionality
7. Test with various file sizes/types
8. Add comprehensive error handling

## Resources
- [Shopify Files API](https://shopify.dev/docs/api/admin-graphql/latest/mutations/fileCreate)
- [Staged Uploads](https://shopify.dev/docs/api/admin-graphql/latest/mutations/stagedUploadsCreate)
- [Product Media](https://shopify.dev/docs/api/admin-graphql/latest/mutations/productCreateMedia)
