import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Card, BlockStack, Text, Layout } from "@shopify/polaris";
import fs from "fs/promises";
import path from "path";

export const loader = async (_: LoaderFunctionArgs) => {
  try {
    // Read the privacy policy markdown file
    const privacyPolicyPath = path.join(process.cwd(), 'PRIVACY_POLICY.md');
    const privacyPolicyContent = await fs.readFile(privacyPolicyPath, 'utf-8');
    
    return json({
      privacyPolicy: privacyPolicyContent,
      lastUpdated: "October 6, 2025"
    });
  } catch (error) {
    console.error('Error loading privacy policy:', error);
    return json({
      privacyPolicy: "Privacy policy temporarily unavailable. Please contact support@spectorapp.com",
      lastUpdated: new Date().toDateString()
    });
  }
};

export default function PrivacyPolicy() {
  const { privacyPolicy, lastUpdated } = useLoaderData<typeof loader>();

  // Convert markdown to basic HTML-like structure for display
  const formatContent = (content: string) => {
    return content
      .split('\n')
      .map((line, index) => {
        if (line.startsWith('# ')) {
          return (
            <Text key={index} variant="headingLg" as="h1">
              {line.replace('# ', '')}
            </Text>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <Text key={index} variant="headingMd" as="h2">
              {line.replace('## ', '')}
            </Text>
          );
        }
        if (line.startsWith('### ')) {
          return (
            <Text key={index} variant="headingSm" as="h3">
              {line.replace('### ', '')}
            </Text>
          );
        }
        if (line.trim() === '') {
          return <div key={index} style={{ height: '8px' }} />;
        }
        if (line.startsWith('- ')) {
          return (
            <Text key={index} variant="bodyMd" as="p" tone="subdued">
              • {line.replace('- ', '')}
            </Text>
          );
        }
        if (line.startsWith('**') && line.endsWith('**')) {
          return (
            <Text key={index} variant="bodyMd" fontWeight="bold" as="p">
              {line.replace(/\*\*/g, '')}
            </Text>
          );
        }
        return (
          <Text key={index} variant="bodyMd" as="p">
            {line}
          </Text>
        );
      });
  };

  return (
    <Page
      title="Privacy Policy"
      subtitle={`Last updated: ${lastUpdated}`}
      backAction={{
        content: 'Back to App',
        url: '/'
      }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              {formatContent(privacyPolicy)}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}