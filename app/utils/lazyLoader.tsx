/**
 * Lazy component loader for bundle size optimization
 * Components are loaded only when their tabs are expanded/clicked
 * Maintains exact same UI and functionality while reducing initial bundle size
 */

import { lazy, Suspense } from 'react';
import { Spinner, Card, Box } from '@shopify/polaris';

// Lazy load heavy components only when needed with progressive loading
const LazyProductManagementSkeleton = lazy(() => 
  import('../components/ProductManagementSkeleton').then(module => ({ 
    default: module.ProductManagementSkeleton 
  }))
);

const LazyProductManagement = lazy(() => 
  import('../components/ProductManagement').then(module => ({ 
    default: module.ProductManagement 
  }))
);

const LazyDashboard = lazy(() => 
  import('../components/Dashboard').then(module => ({ 
    default: module.Dashboard 
  }))
);

/**
 * Enhanced loading fallback component with better UX
 */
const ComponentLoader = ({ componentName }: { componentName?: string }) => (
  <Card>
    <Box paddingBlock="600" paddingInline="600">
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '300px',
        gap: '16px'
      }}>
        <Spinner size="large" />
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
            Loading {componentName || 'component'}...
          </p>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#999' }}>
            This may take a moment for the first load
          </p>
        </div>
      </div>
    </Box>
  </Card>
);

/**
 * Generic lazy component wrapper
 */
// interface LazyComponentProps {
//   children: React.ReactNode;
// }

// const LazyWrapper = ({ children }: LazyComponentProps) => (
//   <Suspense fallback={<ComponentLoader />}>
//     {children}
//   </Suspense>
// );

/**
 * Optimized lazy-loaded components with enhanced loading states
 * These will only load when the user interacts with their respective tabs
 */
export const OptimizedComponents = {
  ProductManagement: (props: any) => (
    <Suspense fallback={<ComponentLoader componentName="Product Management" />}>
      <LazyProductManagement {...props} />
    </Suspense>
  ),

  ProductManagementFast: (props: any) => (
    <Suspense fallback={<ComponentLoader componentName="Product Management Preview" />}>
      <LazyProductManagementSkeleton {...props} />
    </Suspense>
  ),
  
  Dashboard: (props: any) => (
    <Suspense fallback={<ComponentLoader componentName="Dashboard" />}>
      <LazyDashboard {...props} />
    </Suspense>
  ),
};

/**
 * Hook for preloading components on hover/focus
 * Improves perceived performance while keeping bundle small
 */
export const useComponentPreloader = () => {
  const preloadComponent = (componentName: keyof typeof OptimizedComponents) => {
    switch (componentName) {
      case 'ProductManagement':
        import('../components/ProductManagement');
        break;
      case 'Dashboard':
        import('../components/Dashboard');
        break;
    }
  };

  return { preloadComponent };
};
