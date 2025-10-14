import { Page, Layout, Text, Banner } from "@shopify/polaris";

export default function ActivityPage() {
  return (
    <Page title="Recent Activity">
      <Layout>
        <Layout.Section>
          <Banner
            title="Feature Temporarily Disabled"
            tone="info"
          >
            <p>This feature has been removed.</p>
          </Banner>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
