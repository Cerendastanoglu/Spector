import { logger } from "~/utils/logger";
import { useState, useEffect } from 'react';
import { 
  Card, 
  Page, 
  Layout, 
  Button, 
  TextField, 
  Select, 
  ButtonGroup,
  Badge,
  Text,
  BlockStack,
  InlineStack,
  ProgressBar,
  Divider,
  List
} from '@shopify/polaris';

interface Provider {
  id: string;
  name: string;
  type: string[];
  healthy: boolean;
}

interface IntelRequest {
  type: 'competitor_analysis' | 'keyword_research' | 'market_analysis' | 'pricing_intelligence';
  target: string;
  providers: string[];
  options?: Record<string, any>;
}

interface StreamChunk {
  type: 'progress' | 'result' | 'error' | 'complete';
  data?: any;
  progress?: {
    completed: number;
    total: number;
    message: string;
  };
  providerId?: string;
  error?: {
    message: string;
    code: string;
  };
}

export function IntelligenceDashboard() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [request, setRequest] = useState<IntelRequest>({
    type: 'competitor_analysis',
    target: '',
    providers: []
  });
  const [results, setResults] = useState<any>(null);
  const [streamChunks, setStreamChunks] = useState<StreamChunk[]>([]);
  const [progress, setProgress] = useState<{ completed: number; total: number; message: string } | null>(null);

  // Load available providers
  useEffect(() => {
    fetch('/app/api/intelligence?action=health')
      .then(res => res.json())
      .then(data => {
        setProviders(data.providers || []);
        // Auto-select healthy providers
        const healthyProviders = data.providers?.filter((p: Provider) => p.healthy).map((p: Provider) => p.id) || [];
        setRequest(prev => ({ ...prev, providers: healthyProviders.slice(0, 2) }));
      })
      .catch((error) => logger.error('Failed to fetch intelligence providers:', error));
  }, []);

  const handleSubmit = async () => {
    if (!request.target.trim() || request.providers.length === 0) {
      return;
    }

    setLoading(true);
    setResults(null);
    setStreamChunks([]);
    setProgress(null);

    try {
      // Try streaming first
      const response = await fetch('/app/api/intelligence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          action: 'intelligence',
          request
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Check if we got a streaming response
      const contentType = response.headers.get('Content-Type');
      
      if (contentType?.includes('text/event-stream')) {
        // Handle streaming response
        await handleStreamingResponse(response);
      } else {
        // Handle regular JSON response
        const result = await response.json();
        setResults(result);
      }
    } catch (error) {
      logger.error('Intelligence request failed:', error);
      setStreamChunks(prev => [...prev, {
        type: 'error',
        error: {
          message: error instanceof Error ? error.message : 'Request failed',
          code: 'REQUEST_ERROR'
        }
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleStreamingResponse = async (response: Response) => {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) return;

    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              setStreamChunks(prev => [...prev, data]);
              
              if (data.type === 'progress' && data.progress) {
                setProgress(data.progress);
              } else if (data.type === 'complete') {
                setResults(data.result);
                setProgress(null);
              }
            } catch (e) {
              logger.warn('Failed to parse stream chunk:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  };

  const requestTypeOptions = [
    { label: 'Competitor Analysis', value: 'competitor_analysis' },
    { label: 'Keyword Research', value: 'keyword_research' },
    { label: 'Market Analysis', value: 'market_analysis' },
    { label: 'Pricing Intelligence', value: 'pricing_intelligence' }
  ];

  return (
    <Page
      title="On-Demand Intelligence"
      subtitle="Real-time competitive research using your API keys"
      primaryAction={{
        content: 'Run Intelligence Query',
        onAction: handleSubmit,
        loading,
        disabled: !request.target.trim() || request.providers.length === 0
      }}
    >
      <Layout>
        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">Query Configuration</Text>
              
              <Select
                label="Intelligence Type"
                options={requestTypeOptions}
                value={request.type}
                onChange={(value) => setRequest(prev => ({ 
                  ...prev, 
                  type: value as IntelRequest['type'] 
                }))}
              />

              <TextField
                label="Target"
                value={request.target}
                onChange={(value) => setRequest(prev => ({ ...prev, target: value }))}
                placeholder="example.com or 'product name'"
                helpText="Enter a domain, product name, or keyword to analyze"
                autoComplete="off"
              />

              <div>
                <Text as="p" variant="bodyMd" fontWeight="semibold">Providers</Text>
                <div style={{ marginTop: '8px' }}>
                  <ButtonGroup>
                    {providers.slice(0, 4).map(provider => (
                      <Button
                        key={provider.id}
                        pressed={request.providers.includes(provider.id)}
                        disabled={!provider.healthy}
                        onClick={() => {
                          const isSelected = request.providers.includes(provider.id);
                          setRequest(prev => ({
                            ...prev,
                            providers: isSelected 
                              ? prev.providers.filter(id => id !== provider.id)
                              : [...prev.providers, provider.id]
                          }));
                        }}
                        size="slim"
                      >
                        {provider.name}
                      </Button>
                    ))}
                  </ButtonGroup>
                </div>
              </div>

              {providers.length > 0 && (
                <div>
                  <Text as="p" variant="bodyMd" fontWeight="semibold">Provider Status</Text>
                  <List>
                    {providers.map(provider => (
                      <List.Item key={provider.id}>
                        <InlineStack gap="200" align="space-between">
                          <Text as="span" variant="bodyMd">{provider.name}</Text>
                          <Badge>
                            {provider.healthy ? 'Healthy' : 'Offline'}
                          </Badge>
                        </InlineStack>
                      </List.Item>
                    ))}
                  </List>
                </div>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">Results</Text>

              {progress && (
                <div>
                  <Text as="p" variant="bodyMd">{progress.message}</Text>
                  <ProgressBar 
                    progress={(progress.completed / progress.total) * 100} 
                    size="small"
                  />
                  <Text as="p" variant="bodySm">
                    {progress.completed} of {progress.total} providers completed
                  </Text>
                </div>
              )}

              {streamChunks.length > 0 && (
                <div>
                  <Text as="p" variant="bodyMd" fontWeight="semibold">Live Stream</Text>
                  <div style={{ 
                    maxHeight: '300px', 
                    overflow: 'auto', 
                    border: '1px solid #e0e0e0', 
                    padding: '12px',
                    borderRadius: '4px',
                    backgroundColor: '#f9f9f9',
                    fontFamily: 'monospace',
                    fontSize: '12px'
                  }}>
                    {streamChunks.map((chunk, i) => (
                      <div key={i} style={{ marginBottom: '4px' }}>
                        <Badge>{chunk.type}</Badge>
                        {chunk.providerId && ` [${chunk.providerId}]`}
                        {chunk.progress && ` - ${chunk.progress.message}`}
                        {chunk.error && ` - ${chunk.error.message}`}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results && (
                <div>
                  <Divider />
                  <Text as="p" variant="bodyMd" fontWeight="semibold">Final Results</Text>
                  <div style={{ 
                    padding: '12px', 
                    backgroundColor: '#f0f8ff', 
                    borderRadius: '4px',
                    border: '1px solid #b0d4ff' 
                  }}>
                    <pre style={{ 
                      margin: 0, 
                      whiteSpace: 'pre-wrap', 
                      fontSize: '12px',
                      fontFamily: 'monospace'
                    }}>
                      {JSON.stringify(results, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {!loading && !results && streamChunks.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <Text as="p" variant="bodyMd">
                    Configure your query above and click "Run Intelligence Query" to start
                  </Text>
                </div>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}