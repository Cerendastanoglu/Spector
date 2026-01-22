import { json } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

interface AutomationCondition {
  field: string;
  operator: string;
  value: string;
}

interface AutomationRule {
  id: string;
  name: string;
  type: 'collection' | 'tag';
  enabled: boolean;
  conditions: AutomationCondition[];
  action: {
    type: 'add_tag' | 'remove_tag' | 'add_to_collection' | 'remove_from_collection';
    value: string;
  };
}

// Helper to build GraphQL query filter from conditions
function buildQueryFromConditions(conditions: AutomationCondition[]): string {
  const queryParts: string[] = [];
  
  for (const cond of conditions) {
    switch (cond.field) {
      case 'title':
        if (cond.operator === 'contains') {
          // Shopify doesn't support leading wildcards, use plain search for contains
          queryParts.push(`title:${cond.value}*`);
        } else if (cond.operator === 'equals') {
          queryParts.push(`title:"${cond.value}"`);
        }
        break;
      case 'product_type':
        queryParts.push(`product_type:"${cond.value}"`);
        break;
      case 'vendor':
        queryParts.push(`vendor:"${cond.value}"`);
        break;
      case 'tags':
        if (cond.operator === 'contains') {
          queryParts.push(`tag:${cond.value}`);
        } else if (cond.operator === 'not_contains') {
          queryParts.push(`-tag:${cond.value}`);
        }
        break;
      case 'inventory':
        if (cond.operator === 'less_than') {
          queryParts.push(`inventory_total:<${cond.value}`);
        } else if (cond.operator === 'greater_than') {
          queryParts.push(`inventory_total:>${cond.value}`);
        }
        break;
      case 'price':
        if (cond.operator === 'less_than') {
          queryParts.push(`price:<${cond.value}`);
        } else if (cond.operator === 'greater_than') {
          queryParts.push(`price:>${cond.value}`);
        }
        break;
      case 'status':
        queryParts.push(`status:${cond.value}`);
        break;
    }
  }
  
  return queryParts.join(' AND ');
}

// Build query from a single condition (for preview)
function buildQueryFromSingleCondition(condition: AutomationCondition): string {
  const { field, operator, value } = condition;
  
  switch (field) {
    case 'title':
      if (operator === 'contains') {
        return `title:${value}*`;
      } else if (operator === 'equals') {
        return `title:"${value}"`;
      } else if (operator === 'starts_with') {
        return `title:${value}*`;
      }
      return `title:${value}*`;
    case 'product_type':
      return `product_type:"${value}"`;
    case 'vendor':
      return `vendor:"${value}"`;
    case 'tags':
      if (operator === 'contains') {
        return `tag:${value}`;
      } else if (operator === 'not_contains') {
        return `-tag:${value}`;
      }
      return `tag:${value}`;
    case 'inventory':
      if (operator === 'less_than') {
        return `inventory_total:<${value}`;
      } else if (operator === 'greater_than') {
        return `inventory_total:>${value}`;
      }
      return '';
    case 'price':
      if (operator === 'less_than') {
        return `price:<${value}`;
      } else if (operator === 'greater_than') {
        return `price:>${value}`;
      }
      return '';
    case 'status':
      return `status:${value}`;
    default:
      return '';
  }
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.json();
  const { action: actionType } = formData as { action: string };

  // Preview action - test conditions against real products
  if (actionType === 'preview') {
    const { condition } = formData as { condition: AutomationCondition };
    
    try {
      const query = buildQueryFromSingleCondition(condition);
      console.log('[Automation Preview] Query:', query);
      
      const productsResponse = await admin.graphql(`
        query GetProducts($query: String!) {
          products(first: 50, query: $query) {
            edges {
              node {
                id
                title
              }
            }
          }
        }
      `, {
        variables: { query: query || '' }
      });
      
      const productsData = await productsResponse.json();
      const products = productsData.data?.products?.edges?.map((e: any) => ({
        id: e.node.id,
        title: e.node.title
      })) || [];
      
      console.log('[Automation Preview] Found', products.length, 'products');
      
      return json({
        success: true,
        count: products.length,
        products
      });
    } catch (error) {
      console.error('[Automation Preview] Error:', error);
      return json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to preview products'
      }, { status: 500 });
    }
  }

  // Quick action - direct add/remove without a rule
  if (actionType === 'quickAction') {
    const { actionType: quickType, value, productIds } = formData as { 
      actionType: 'add_collection' | 'remove_collection' | 'add_tag' | 'remove_tag';
      value: string;
      productIds: string[];
    };
    
    console.log('[Quick Action] Type:', quickType, 'Value:', value, 'Products:', productIds.length);
    
    try {
      let updatedCount = 0;
      
      if (quickType === 'add_tag' || quickType === 'remove_tag') {
        for (const productId of productIds) {
          // Get current tags
          const productResponse = await admin.graphql(`
            query GetProduct($id: ID!) {
              product(id: $id) {
                id
                tags
              }
            }
          `, { variables: { id: productId } });
          
          const productData = await productResponse.json();
          const currentTags = productData.data?.product?.tags || [];
          
          let newTags: string[];
          if (quickType === 'add_tag') {
            if (currentTags.includes(value)) continue;
            newTags = [...currentTags, value];
          } else {
            if (!currentTags.includes(value)) continue;
            newTags = currentTags.filter((t: string) => t !== value);
          }
          
          await admin.graphql(`
            mutation UpdateProductTags($input: ProductInput!) {
              productUpdate(input: $input) {
                product { id tags }
                userErrors { field message }
              }
            }
          `, {
            variables: { input: { id: productId, tags: newTags } }
          });
          updatedCount++;
        }
      } else if (quickType === 'add_collection' || quickType === 'remove_collection') {
        // Find the collection
        const collectionsResponse = await admin.graphql(`
          query FindCollection($query: String!) {
            collections(first: 1, query: $query) {
              edges { node { id title } }
            }
          }
        `, { variables: { query: `title:"${value}"` } });
        
        const collectionsData = await collectionsResponse.json();
        let collectionId = collectionsData.data?.collections?.edges?.[0]?.node?.id;
        
        if (!collectionId && quickType === 'add_collection') {
          // Create collection
          const createResponse = await admin.graphql(`
            mutation CreateCollection($input: CollectionInput!) {
              collectionCreate(input: $input) {
                collection { id }
                userErrors { field message }
              }
            }
          `, { variables: { input: { title: value } } });
          
          const createData = await createResponse.json();
          collectionId = createData.data?.collectionCreate?.collection?.id;
        }
        
        if (!collectionId) {
          return json({ success: false, error: 'Collection not found' });
        }
        
        if (quickType === 'add_collection') {
          await admin.graphql(`
            mutation collectionAddProductsV2($id: ID!, $productIds: [ID!]!) {
              collectionAddProductsV2(id: $id, productIds: $productIds) {
                job { id done }
                userErrors { field message }
              }
            }
          `, { variables: { id: collectionId, productIds } });
        } else {
          await admin.graphql(`
            mutation collectionRemoveProducts($id: ID!, $productIds: [ID!]!) {
              collectionRemoveProducts(id: $id, productIds: $productIds) {
                job { id done }
                userErrors { field message }
              }
            }
          `, { variables: { id: collectionId, productIds } });
        }
        updatedCount = productIds.length;
      }
      
      return json({
        success: true,
        message: `Successfully updated ${updatedCount} products`,
        updatedCount
      });
    } catch (error) {
      console.error('[Quick Action] Error:', error);
      return json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to perform action'
      }, { status: 500 });
    }
  }

  const { rule } = formData as { rule: AutomationRule };

  if (actionType === 'run') {
    try {
      // Build query from rule conditions
      const query = buildQueryFromConditions(rule.conditions);
      console.log('[Automation] Running rule:', rule.name);
      console.log('[Automation] Query string:', query);
      
      // Fetch matching products
      const productsResponse = await admin.graphql(`
        query GetProducts($query: String!) {
          products(first: 100, query: $query) {
            edges {
              node {
                id
                title
                tags
              }
            }
          }
        }
      `, {
        variables: { query: query || '' }
      });
      
      const productsData = await productsResponse.json();
      console.log('[Automation] Products response:', JSON.stringify(productsData, null, 2));
      const products = productsData.data?.products?.edges || [];
      
      if (products.length === 0) {
        return json({ 
          success: true, 
          message: 'No products matched the conditions',
          matchCount: 0 
        });
      }

      let updatedCount = 0;
      const errors: string[] = [];

      // Apply action to each matching product
      if (rule.action.type === 'add_tag' || rule.action.type === 'remove_tag') {
        for (const { node: product } of products) {
          const currentTags = product.tags || [];
          let newTags: string[];
          
          if (rule.action.type === 'add_tag') {
            if (currentTags.includes(rule.action.value)) {
              continue; // Tag already exists
            }
            newTags = [...currentTags, rule.action.value];
          } else {
            if (!currentTags.includes(rule.action.value)) {
              continue; // Tag doesn't exist
            }
            newTags = currentTags.filter((t: string) => t !== rule.action.value);
          }

          try {
            await admin.graphql(`
              mutation UpdateProductTags($input: ProductInput!) {
                productUpdate(input: $input) {
                  product {
                    id
                    tags
                  }
                  userErrors {
                    field
                    message
                  }
                }
              }
            `, {
              variables: {
                input: {
                  id: product.id,
                  tags: newTags
                }
              }
            });
            updatedCount++;
          } catch (err) {
            errors.push(`Failed to update ${product.title}`);
          }
        }
      } else if (rule.action.type === 'add_to_collection') {
        // First, find or create the collection
        const collectionsResponse = await admin.graphql(`
          query FindCollection($query: String!) {
            collections(first: 1, query: $query) {
              edges {
                node {
                  id
                  title
                }
              }
            }
          }
        `, {
          variables: { query: `title:"${rule.action.value}"` }
        });
        
        const collectionsData = await collectionsResponse.json();
        console.log('[Automation] Collections search result:', JSON.stringify(collectionsData, null, 2));
        let collectionId = collectionsData.data?.collections?.edges?.[0]?.node?.id;
        
        if (!collectionId) {
          // Create the collection as a manual collection
          console.log('[Automation] Creating new collection:', rule.action.value);
          const createResponse = await admin.graphql(`
            mutation CreateCollection($input: CollectionInput!) {
              collectionCreate(input: $input) {
                collection {
                  id
                  title
                }
                userErrors {
                  field
                  message
                }
              }
            }
          `, {
            variables: {
              input: {
                title: rule.action.value,
                descriptionHtml: `Auto-generated collection by Spector automation rule: ${rule.name}`
              }
            }
          });
          
          const createData = await createResponse.json();
          console.log('[Automation] Collection create result:', JSON.stringify(createData, null, 2));
          
          if (createData.data?.collectionCreate?.userErrors?.length > 0) {
            return json({ 
              success: false, 
              error: `Failed to create collection: ${createData.data.collectionCreate.userErrors[0].message}`,
              matchCount: products.length 
            });
          }
          
          collectionId = createData.data?.collectionCreate?.collection?.id;
          
          if (!collectionId) {
            return json({ 
              success: false, 
              error: 'Failed to create collection',
              matchCount: products.length 
            });
          }
        }

        // Add products to collection one by one using collectionAddProductsV2
        console.log('[Automation] Adding', products.length, 'products to collection:', collectionId);
        const productIds = products.map(({ node }: { node: { id: string } }) => node.id);
        
        try {
          const addResponse = await admin.graphql(`
            mutation collectionAddProductsV2($id: ID!, $productIds: [ID!]!) {
              collectionAddProductsV2(id: $id, productIds: $productIds) {
                job {
                  id
                  done
                }
                userErrors {
                  field
                  message
                }
              }
            }
          `, {
            variables: {
              id: collectionId,
              productIds
            }
          });
          
          const addData = await addResponse.json();
          console.log('[Automation] Add products result:', JSON.stringify(addData, null, 2));
          
          if (addData.data?.collectionAddProductsV2?.userErrors?.length > 0) {
            return json({ 
              success: false, 
              error: `Failed to add products: ${addData.data.collectionAddProductsV2.userErrors[0].message}`,
              matchCount: products.length 
            });
          }
          
          updatedCount = products.length;
        } catch (err) {
          console.error('[Automation] Error adding products:', err);
          return json({ 
            success: false, 
            error: 'Failed to add products to collection: ' + (err instanceof Error ? err.message : 'Unknown error'),
            matchCount: products.length 
          });
        }
      }

      return json({ 
        success: true, 
        message: `Successfully updated ${updatedCount} products`,
        matchCount: products.length,
        updatedCount
      });

    } catch (error) {
      console.error('Automation error:', error);
      return json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to run automation' 
      }, { status: 500 });
    }
  }

  // Handle schedule running
  if (actionType === 'runSchedule') {
    const { schedule } = formData as { schedule: {
      id: string;
      name: string;
      productId: string;
      productTitle: string;
      scheduleType: string;
      dailyQuantity?: number;
      preorderLimit?: number;
    }};
    
    console.log('🔵 Running schedule:', schedule.name, 'for product:', schedule.productTitle, 'ID:', schedule.productId);
    
    try {
      // Use the stored product ID to get the product directly
      const productId = schedule.productId;
      
      // Get the product with its variants
      const productResponse = await admin.graphql(`
        query GetProduct($id: ID!) {
          product(id: $id) {
            id
            title
            variants(first: 10) {
              edges {
                node {
                  id
                  inventoryItem {
                    id
                  }
                }
              }
            }
          }
        }
      `, {
        variables: { id: productId }
      });
      
      const productData = await productResponse.json();
      console.log('🔵 Product lookup result:', JSON.stringify(productData, null, 2));
      
      const product = productData.data?.product;
      
      if (!product) {
        return json({ 
          success: false, 
          error: `Product "${schedule.productTitle}" not found (ID: ${productId})` 
        });
      }

      // Get the inventory item ID from the first variant
      const inventoryItemId = product.variants?.edges?.[0]?.node?.inventoryItem?.id;
      
      if (!inventoryItemId) {
        return json({ 
          success: false, 
          error: 'Could not find inventory item for product' 
        });
      }
      
      console.log('🔵 Found inventory item:', inventoryItemId);

      // Get the location ID
      const locationsResponse = await admin.graphql(`
        query GetLocations {
          locations(first: 1) {
            edges {
              node {
                id
                name
              }
            }
          }
        }
      `);
      
      const locationsData = await locationsResponse.json();
      const locationId = locationsData.data?.locations?.edges?.[0]?.node?.id;
      const locationName = locationsData.data?.locations?.edges?.[0]?.node?.name;
      
      console.log('🔵 Using location:', locationName, locationId);
      
      if (!locationId) {
        return json({ 
          success: false, 
          error: 'No inventory location found' 
        });
      }

      // Set the inventory quantity based on schedule type
      let quantity: number;
      if (schedule.scheduleType === 'daily_reset' || schedule.scheduleType === 'recurring') {
        quantity = schedule.dailyQuantity || 10;
      } else if (schedule.scheduleType === 'preorder') {
        quantity = schedule.preorderLimit || 50;
      } else {
        quantity = schedule.dailyQuantity || 10;
      }
      
      console.log('🔵 Setting inventory quantity to:', quantity);
      
      const setQuantityResponse = await admin.graphql(`
        mutation SetInventoryQuantity($input: InventorySetQuantitiesInput!) {
          inventorySetQuantities(input: $input) {
            inventoryAdjustmentGroup {
              createdAt
              reason
            }
            userErrors {
              field
              message
            }
          }
        }
      `, {
        variables: {
          input: {
            name: "available",
            reason: `Spector automation: ${schedule.name}`,
            quantities: [{
              inventoryItemId,
              locationId,
              quantity
            }]
          }
        }
      });
      
      const setQuantityData = await setQuantityResponse.json();
      console.log('🔵 Inventory update result:', JSON.stringify(setQuantityData, null, 2));
      
      if (setQuantityData.data?.inventorySetQuantities?.userErrors?.length > 0) {
        return json({ 
          success: false, 
          error: setQuantityData.data.inventorySetQuantities.userErrors[0].message 
        });
      }

      return json({ 
        success: true, 
        message: `Set "${product.title}" inventory to ${quantity} units`
      });

    } catch (error) {
      console.error('Schedule error:', error);
      return json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to run schedule' 
      }, { status: 500 });
    }
  }

  // Handle product search for scheduling
  if (actionType === 'searchProducts') {
    const { query } = formData as { query: string };
    
    try {
      const productsResponse = await admin.graphql(`
        query SearchProducts($query: String!) {
          products(first: 10, query: $query) {
            edges {
              node {
                id
                title
                handle
                featuredImage {
                  url
                }
                variants(first: 1) {
                  edges {
                    node {
                      inventoryQuantity
                    }
                  }
                }
              }
            }
          }
        }
      `, {
        variables: { query: query ? `title:*${query}*` : '' }
      });
      
      const productsData = await productsResponse.json();
      const products = productsData.data?.products?.edges?.map(({ node }: any) => ({
        id: node.id,
        title: node.title,
        handle: node.handle,
        image: node.featuredImage?.url,
        currentStock: node.variants?.edges?.[0]?.node?.inventoryQuantity || 0
      })) || [];
      
      return json({ success: true, products });
    } catch (error) {
      return json({ success: false, error: 'Failed to search products' }, { status: 500 });
    }
  }

  return json({ error: 'Invalid action' }, { status: 400 });
};
