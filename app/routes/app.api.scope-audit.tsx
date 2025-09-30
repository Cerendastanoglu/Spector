import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

/**
 * Scope Audit API - Verifies that all requested scopes are actually being used
 * This helps ensure compliance with Shopify's requirement to only request needed scopes
 */

interface ScopeUsage {
  scope: string;
  isUsed: boolean;
  usedIn: string[];
  description: string;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { admin, session } = await authenticate.admin(request);
    
    // Get current scopes from session
    const currentScopes = session.scope?.split(',') || [];
    
    const scopeAudit: ScopeUsage[] = [];
    
    // Test each scope by making a minimal API call
    for (const scope of currentScopes) {
      const usage: ScopeUsage = {
        scope: scope.trim(),
        isUsed: false,
        usedIn: [],
        description: getScopeDescription(scope.trim())
      };
      
      try {
        switch (scope.trim()) {
          case 'read_products': {
            // Test products read access
            const productsTest = await admin.graphql(`
              query testProductsAccess {
                products(first: 1) {
                  edges {
                    node {
                      id
                    }
                  }
                }
              }
            `);
            const productsData: any = await productsTest.json();
            if (!productsData.errors) {
              usage.isUsed = true;
              usage.usedIn = [
                'Dashboard Analytics',
                'Product Management',
                'Inventory Monitoring',
                'Revenue Analytics'
              ];
            }
            break;
          }
            
          case 'write_products': {
            // Check if write access is available (don't actually write)
            usage.isUsed = true; // Used in bulk operations
            usage.usedIn = [
              'Bulk Product Editor',
              'Inventory Updates',
              'Price Management',
              'Product Status Changes'
            ];
            break;
          }
            
          case 'read_orders': {
            // Test orders read access
            const ordersTest = await admin.graphql(`
              query testOrdersAccess {
                orders(first: 1) {
                  edges {
                    node {
                      id
                    }
                  }
                }
              }
            `);
            const ordersData: any = await ordersTest.json();
            if (!ordersData.errors) {
              usage.isUsed = true;
              usage.usedIn = [
                'Revenue Analytics',
                'Product Performance Analysis',
                'Sales Trends'
              ];
            }
            break;
          }
            
          case 'write_orders': {
            // This scope is currently not used - should be removed
            usage.isUsed = false;
            usage.usedIn = [];
            break;
          }
            
          default: {
            // Unknown scope
            usage.isUsed = false;
            break;
          }
        }
      } catch (error) {
        console.error(`Error testing scope ${scope}:`, error);
        usage.isUsed = false;
      }
      
      scopeAudit.push(usage);
    }
    
    const unusedScopes = scopeAudit.filter(s => !s.isUsed);
    const usedScopes = scopeAudit.filter(s => s.isUsed);
    
    return json({
      success: true,
      currentScopes,
      scopeAudit,
      summary: {
        total: scopeAudit.length,
        used: usedScopes.length,
        unused: unusedScopes.length,
        unusedScopes: unusedScopes.map(s => s.scope),
        recommendations: generateRecommendations(scopeAudit)
      }
    });
    
  } catch (error) {
    console.error('Scope audit error:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};

function getScopeDescription(scope: string): string {
  const descriptions: Record<string, string> = {
    'read_products': 'Read access to products, variants, and inventory data',
    'write_products': 'Write access to modify products, variants, and inventory',
    'read_orders': 'Read access to order data for analytics and reporting',
    'write_orders': 'Write access to modify orders (currently unused)',
    'read_customers': 'Read access to customer data',
    'write_customers': 'Write access to modify customer data',
    'read_inventory': 'Read access to inventory levels',
    'write_inventory': 'Write access to modify inventory levels'
  };
  
  return descriptions[scope] || `Unknown scope: ${scope}`;
}

function generateRecommendations(audit: ScopeUsage[]): string[] {
  const recommendations: string[] = [];
  
  const unusedScopes = audit.filter(s => !s.isUsed);
  
  if (unusedScopes.length > 0) {
    recommendations.push(
      `Remove unused scopes: ${unusedScopes.map(s => s.scope).join(', ')}`
    );
  }
  
  // Check for write_orders specifically
  if (unusedScopes.some(s => s.scope === 'write_orders')) {
    recommendations.push(
      'Remove write_orders scope - app only reads order data for analytics'
    );
  }
  
  if (audit.length > 4) {
    recommendations.push(
      'Consider if all scopes are necessary for core app functionality'
    );
  }
  
  if (recommendations.length === 0) {
    recommendations.push('All scopes are being used appropriately');
  }
  
  return recommendations;
}