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
          queryParts.push(`title:*${cond.value}*`);
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

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.json();
  const { action: actionType, rule } = formData as { action: string; rule: AutomationRule };

  if (actionType === 'run') {
    try {
      // Build query from rule conditions
      const query = buildQueryFromConditions(rule.conditions);
      
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
          query FindCollection($title: String!) {
            collections(first: 1, query: $title) {
              edges {
                node {
                  id
                  title
                }
              }
            }
          }
        `, {
          variables: { title: `title:"${rule.action.value}"` }
        });
        
        const collectionsData = await collectionsResponse.json();
        let collectionId = collectionsData.data?.collections?.edges?.[0]?.node?.id;
        
        if (!collectionId) {
          // Create the collection
          const createResponse = await admin.graphql(`
            mutation CreateCollection($input: CollectionInput!) {
              collectionCreate(input: $input) {
                collection {
                  id
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
          collectionId = createData.data?.collectionCreate?.collection?.id;
          
          if (!collectionId) {
            return json({ 
              success: false, 
              error: 'Failed to create collection',
              matchCount: products.length 
            });
          }
        }

        // Add products to collection
        const productIds = products.map(({ node }: { node: { id: string } }) => node.id);
        
        try {
          await admin.graphql(`
            mutation AddProductsToCollection($id: ID!, $productIds: [ID!]!) {
              collectionAddProducts(id: $id, productIds: $productIds) {
                collection {
                  id
                  productsCount
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
          updatedCount = products.length;
        } catch (err) {
          return json({ 
            success: false, 
            error: 'Failed to add products to collection',
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
    
    try {
      // First find the product by title
      const productsResponse = await admin.graphql(`
        query FindProduct($query: String!) {
          products(first: 1, query: $query) {
            edges {
              node {
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
          }
        }
      `, {
        variables: { query: `title:${schedule.productTitle}` }
      });
      
      const productsData = await productsResponse.json();
      const product = productsData.data?.products?.edges?.[0]?.node;
      
      if (!product) {
        return json({ 
          success: false, 
          error: `Product "${schedule.productTitle}" not found` 
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
      
      if (!locationId) {
        return json({ 
          success: false, 
          error: 'No inventory location found' 
        });
      }

      // Set the inventory quantity
      const quantity = schedule.scheduleType === 'daily_reset' 
        ? schedule.dailyQuantity || 10
        : schedule.preorderLimit || 50;
      
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
      
      if (setQuantityData.data?.inventorySetQuantities?.userErrors?.length > 0) {
        return json({ 
          success: false, 
          error: setQuantityData.data.inventorySetQuantities.userErrors[0].message 
        });
      }

      return json({ 
        success: true, 
        message: `Set ${product.title} inventory to ${quantity} units`
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
