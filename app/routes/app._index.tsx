import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useSubmit, useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  Text,
  Select,
  Banner,
  List,
  InlineStack,
  Tag,
  ProgressBar,
  Badge,
  TextField,
  Modal,
  FormLayout,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { analyzeLLMDiscoverability } from "../services/llm-analysis.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  // Fetch products from the store
  const response = await admin.graphql(
    `#graphql
      query {
        products(first: 10) {
          nodes {
            id
            title
            description
            handle
            tags
            vendor
            productType
          }
        }
      }`
  );

  const responseJson = await response.json();
  return json({ products: responseJson.data.products.nodes });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("actionType") as string;
  
  if (actionType === "analyze") {
    const productId = formData.get("productId") as string;

    // Fetch full product details
    const response = await admin.graphql(
      `#graphql
        query getProduct($id: ID!) {
          product(id: $id) {
              id
              title
            description
              handle
            tags
            vendor
            productType
            metafields(first: 10) {
              nodes {
                key
                value
              }
            }
          }
        }`,
      {
        variables: {
          id: productId,
        },
      }
    );

    const responseJson = await response.json();
    const product = responseJson.data.product;

    // Analyze product content for LLM discoverability
    const analysis = await analyzeLLMDiscoverability({
      title: product.title,
      description: product.description || "",
      tags: product.tags,
      vendor: product.vendor,
      productType: product.productType,
      metafields: product.metafields.nodes,
    }, {
      shopDomain: session.shop, // Pass shop domain for potential Judge.me API calls
      productId: product.id,
      session: session, // Pass session for rate limiting
      // judgeMeApiToken: process.env.JUDGE_ME_API_TOKEN // Uncomment when merchants have Judge.me API token
    });

    console.log('Analysis result:', JSON.stringify(analysis, null, 2));

    // Check if rate limited
    if (analysis.rateLimited) {
      return json({ 
        error: "Rate limit exceeded. Please wait before analyzing more products.",
        analysis: null,
        product,
        actionType: "analyze"
      }, { status: 429 });
    }

    return json({ analysis, product, actionType: "analyze" });
  }
  
  if (actionType === "bulkAnalyze") {
    console.log('🚀 Starting bulk analysis...');
    
    // Fetch all products from the store
    const response = await admin.graphql(
      `#graphql
        query getAllProducts {
          products(first: 250) {
            nodes {
              id
              title
              description
              handle
              tags
              vendor
              productType
              metafields(first: 10) {
                nodes {
                  key
                  value
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }`
    );

    const responseJson = await response.json();
    const products = responseJson.data.products.nodes;
    
    console.log(`📊 Analyzing ${products.length} products...`);
    
    // Analyze each product
    const bulkResults = [];
    let totalScore = 0;
    let lowScoreCount = 0;
    
    for (const product of products) {
      try {
        const analysis = await analyzeLLMDiscoverability({
          title: product.title,
          description: product.description || "",
          tags: product.tags,
          vendor: product.vendor,
          productType: product.productType,
          metafields: product.metafields.nodes,
        }, {
          shopDomain: session.shop, // Pass shop domain for potential Judge.me API calls
          productId: product.id,
          // judgeMeApiToken: process.env.JUDGE_ME_API_TOKEN // Uncomment when merchants have Judge.me API token
        });
        
        const productResult = {
          id: product.id,
          title: product.title,
          handle: product.handle,
          discoveryScore: analysis.scores.discoveryPotential,
          scores: analysis.scores,
          needsImprovement: analysis.scores.discoveryPotential < 60,
          topGap: analysis.contentGaps?.[0] || "No specific gaps identified",
          topSuggestion: analysis.llmOptimizations?.[0]?.suggestions?.[0] || "No specific suggestions available"
        };
        
        bulkResults.push(productResult);
        totalScore += analysis.scores.discoveryPotential;
        
        if (analysis.scores.discoveryPotential < 60) {
          lowScoreCount++;
        }
        
        console.log(`✅ Analyzed: ${product.title} - Score: ${analysis.scores.discoveryPotential}%`);
      } catch (error) {
        console.error(`❌ Failed to analyze ${product.title}:`, error);
        // Add failed analysis result
        bulkResults.push({
          id: product.id,
          title: product.title,
          handle: product.handle,
          discoveryScore: 0,
          scores: null,
          needsImprovement: true,
          topGap: "Analysis failed",
          topSuggestion: "Please analyze this product individually",
          error: true
        });
      }
    }
    
    // Calculate store metrics
    const averageScore = products.length > 0 ? Math.round(totalScore / products.length) : 0;
    const highPerformers = bulkResults.filter(r => r.discoveryScore >= 80).length;
    const mediumPerformers = bulkResults.filter(r => r.discoveryScore >= 60 && r.discoveryScore < 80).length;
    
    // Sort results by score (lowest first to prioritize fixes)
    bulkResults.sort((a, b) => a.discoveryScore - b.discoveryScore);
    
    const storeMetrics = {
      totalProducts: products.length,
      averageScore,
      lowScoreCount,
      highPerformers,
      mediumPerformers,
      topPriorityFixes: bulkResults.filter(r => r.needsImprovement).slice(0, 5)
    };
    
    console.log('📈 Bulk analysis complete:', storeMetrics);
    
    return json({ 
      actionType: "bulkAnalyze",
      bulkResults,
      storeMetrics,
      success: true,
      message: `Analyzed ${products.length} products. Average score: ${averageScore}%`
    });
  }
  
  if (actionType === "update") {
    const productId = formData.get("productId") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const tags = formData.get("tags") as string;
    const productType = formData.get("productType") as string;
    const vendor = formData.get("vendor") as string;

    // Update product in Shopify
    const updateResponse = await admin.graphql(
      `#graphql
        mutation updateProduct($input: ProductInput!) {
          productUpdate(input: $input) {
            product {
              id
              title
              description
              tags
              vendor
              productType
            }
            userErrors {
              field
              message
            }
          }
        }`,
      {
        variables: {
          input: {
            id: productId,
            title,
            description,
            tags: tags.split(',').map(tag => tag.trim()),
            productType,
            vendor,
          },
        },
      }
    );

    const updateResponseJson = await updateResponse.json();
    const updatedProduct = updateResponseJson.data.productUpdate.product;

    // Re-analyze with updated content
    const analysis = await analyzeLLMDiscoverability({
      title: updatedProduct.title,
      description: updatedProduct.description || "",
      tags: updatedProduct.tags,
      vendor: updatedProduct.vendor,
      productType: updatedProduct.productType,
      metafields: [], // Keep existing metafields for now
    }, {
      shopDomain: session.shop, // Pass shop domain for potential Judge.me API calls
      productId: updatedProduct.id,
      // judgeMeApiToken: process.env.JUDGE_ME_API_TOKEN // Uncomment when merchants have Judge.me API token
    });

    return json({ 
      analysis, 
      product: updatedProduct, 
      actionType: "update",
      success: true,
      message: "Product updated successfully!"
    });
  }

  return json({ error: "Invalid action type" });
};

export default function Index() {
  const { products } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  
  // State for editing mode
  const [isEditing, setIsEditing] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: '',
    productType: '',
    vendor: ''
  });
  const [bulkAnalysisResults, setBulkAnalysisResults] = useState<any[]>([]);
  const [isAnalyzingBulk, setIsAnalyzingBulk] = useState(false);
  const [storeMetrics, setStoreMetrics] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'individual' | 'bulk'>('individual');

  // Handle bulk analysis results
  if (actionData && 'actionType' in actionData && actionData.actionType === "bulkAnalyze" && 'bulkResults' in actionData && actionData.bulkResults) {
    if (bulkAnalysisResults.length === 0) { // Only update if we don't already have results
      setBulkAnalysisResults(actionData.bulkResults);
      if ('storeMetrics' in actionData) {
        setStoreMetrics(actionData.storeMetrics);
      }
      setIsAnalyzingBulk(false);
      setViewMode('bulk'); // Switch to bulk view when results are ready
    }
  }

  // Clear bulk results when analyzing individual product for cleaner UI
  if (actionData && 'actionType' in actionData && actionData.actionType === "analyze" && bulkAnalysisResults.length > 0) {
    setBulkAnalysisResults([]);
    setStoreMetrics(null);
    setViewMode('individual'); // Switch back to individual view
  }

  const handleProductSelect = (productId: string) => {
    if (productId) {
      const formData = new FormData();
      formData.append("actionType", "analyze");
      formData.append("productId", productId);
      submit(formData, { method: "POST" });
    }
  };

  const handleBulkAnalysis = () => {
    const formData = new FormData();
    formData.append("actionType", "bulkAnalyze");
    setIsAnalyzingBulk(true);
    setBulkAnalysisResults([]); // Clear previous results
    setStoreMetrics(null);
    submit(formData, { method: "POST" });
  };

  const handleEditProduct = () => {
    if (actionData && 'product' in actionData && actionData.product) {
      setEditingProduct(actionData.product);
      setFormData({
        title: actionData.product.title || '',
        description: actionData.product.description || '',
        tags: Array.isArray(actionData.product.tags) ? actionData.product.tags.join(', ') : '',
        productType: actionData.product.productType || '',
        vendor: actionData.product.vendor || ''
      });
      setIsEditing(true);
    }
  };

  const handleSaveProduct = () => {
    if (editingProduct) {
      const submitData = new FormData();
      submitData.append("actionType", "update");
      submitData.append("productId", editingProduct.id);
      submitData.append("title", formData.title);
      submitData.append("description", formData.description);
      submitData.append("tags", formData.tags);
      submitData.append("productType", formData.productType);
      submitData.append("vendor", formData.vendor);
      
      submit(submitData, { method: "POST" });
      setIsEditing(false);
    }
  };

  const renderScoreTag = (score: number) => {
    return <Tag>{score}%</Tag>;
  };

  // Type guard to check if actionData has analysis
  const hasAnalysis = actionData && 'analysis' in actionData && actionData.analysis;

  // Prepare options for the Select component
  const productOptions = [
    { label: 'Select a product to analyze...', value: '' },
    ...products.map((product: any) => ({
      label: product.title,
      value: product.id,
    }))
  ];

  return (
    <Page title="LLM Discovery Score">
      <BlockStack gap="500">
        {actionData && 'success' in actionData && Boolean(actionData.success) && (
          <Banner tone="success">
            {(actionData as any).message || "Product updated successfully!"}
          </Banner>
        )}
        
        {actionData && 'actionType' in actionData && actionData.actionType === "bulkAnalyze" && 'success' in actionData && actionData.success && (
          <Banner tone="success">
            🎉 Bulk analysis complete! {(actionData as any).message}
          </Banner>
        )}
        
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Analyze Product Content for LLM Discovery
                </Text>
                <Banner tone="info">
                  Select a product to analyze its content for LLM-powered shopping recommendations
                </Banner>
                <InlineStack gap="300" align="space-between">
                  <Select
                    label="Choose a product"
                    options={productOptions}
                    value={selectedProductId}
                    onChange={(value) => {
                      setSelectedProductId(value);
                      handleProductSelect(value);
                    }}
                  />
                  <InlineStack gap="200">
                    {(bulkAnalysisResults.length > 0 || storeMetrics) && (
                      <Button 
                        onClick={() => setViewMode(viewMode === 'individual' ? 'bulk' : 'individual')}
                        variant="secondary"
                        size="large"
                      >
                        {viewMode === 'individual' ? '📊 View Bulk Results' : '🔍 Individual Analysis'}
                      </Button>
                    )}
                    <Button 
                      onClick={handleBulkAnalysis}
                      loading={isAnalyzingBulk}
                      variant="secondary"
                      size="large"
                    >
                      {isAnalyzingBulk ? 'Analyzing Store...' : 'Analyze All Products'}
                    </Button>
                  </InlineStack>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Store Overview Dashboard */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  🏪 Store LLM Discoverability Overview
                </Text>
                <InlineStack gap="400" wrap>
                  <div style={{ minWidth: '200px' }}>
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingSm" tone="subdued">
                        Products Analyzed
                      </Text>
                      <Text as="p" variant="headingLg">
                        {storeMetrics ? storeMetrics.totalProducts : products.length}
                      </Text>
                    </BlockStack>
                  </div>
                  <div style={{ minWidth: '200px' }}>
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingSm" tone="subdued">
                        Average Discovery Score
                      </Text>
                      <Text as="p" variant="headingLg">
                        {storeMetrics ? (
                          <>
                            {storeMetrics.averageScore}%
                            <Text as="span" variant="bodySm" tone={storeMetrics.averageScore >= 70 ? "success" : storeMetrics.averageScore >= 50 ? "subdued" : "critical"}>
                              {storeMetrics.averageScore >= 70 ? " Excellent" : storeMetrics.averageScore >= 50 ? " Good" : " Needs Work"}
                            </Text>
                          </>
                        ) : (
                          <>--% <Text as="span" variant="bodySm" tone="subdued">(Run bulk analysis)</Text></>
                        )}
                      </Text>
                    </BlockStack>
                  </div>
                  <div style={{ minWidth: '200px' }}>
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingSm" tone="subdued">
                        Priority Fixes Needed
                      </Text>
                      <Text as="p" variant="headingLg">
                        {storeMetrics ? (
                          <>
                            {storeMetrics.lowScoreCount}
                            <Text as="span" variant="bodySm" tone="subdued"> products &lt; 60%</Text>
                          </>
                        ) : (
                          <>-- <Text as="span" variant="bodySm" tone="subdued">(Run bulk analysis)</Text></>
                        )}
                      </Text>
                    </BlockStack>
                  </div>
                </InlineStack>
                
                {storeMetrics && (
                  <InlineStack gap="400" wrap>
                    <div style={{ minWidth: '150px' }}>
                      <BlockStack gap="200">
                        <Text as="h3" variant="headingSm" tone="subdued">
                          High Performers
                        </Text>
                        <Text as="p" variant="headingMd" tone="success">
                          {storeMetrics.highPerformers} products ≥ 80%
                        </Text>
                      </BlockStack>
                    </div>
                    <div style={{ minWidth: '150px' }}>
                      <BlockStack gap="200">
                        <Text as="h3" variant="headingSm" tone="subdued">
                          Medium Performers
                        </Text>
                        <Text as="p" variant="headingMd" tone="subdued">
                          {storeMetrics.mediumPerformers} products 60-79%
                        </Text>
                      </BlockStack>
                    </div>
                  </InlineStack>
                )}
                
                <Banner tone={storeMetrics ? (storeMetrics.averageScore >= 70 ? "success" : storeMetrics.averageScore >= 50 ? "info" : "critical") : "info"}>
                  💡 <strong>Pro Tip:</strong> Products with scores below 60% may struggle to be recommended by AI shopping assistants. Focus on improving these first for maximum impact.
                </Banner>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Quick Wins Section */}
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  ⚡ Quick Wins for Your Store
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  These simple optimizations can improve LLM discoverability across multiple products:
                </Text>
                
                <InlineStack gap="300" wrap>
                  <div style={{ flex: '1 1 45%', minWidth: '300px' }}>
                    <Card background="bg-surface-secondary">
                      <BlockStack gap="200">
                        <InlineStack align="space-between">
                          <Text as="h3" variant="headingSm">
                            🎯 Add "Perfect for" statements to descriptions
                          </Text>
                          <Badge tone="success">High Impact</Badge>
                        </InlineStack>
                        <Text as="p" variant="bodyMd">
                          Example: "Perfect for beginners learning to snowboard" or "Ideal for outdoor winter adventures"
                        </Text>
                      </BlockStack>
                    </Card>
                  </div>

                  <div style={{ flex: '1 1 45%', minWidth: '300px' }}>
                    <Card background="bg-surface-secondary">
                      <BlockStack gap="200">
                        <InlineStack align="space-between">
                          <Text as="h3" variant="headingSm">
                            🏷️ Use specific, searchable product types
                          </Text>
                          <Badge tone="attention">Medium Impact</Badge>
                        </InlineStack>
                        <Text as="p" variant="bodyMd">
                          Instead of "Accessory", use "Winter Sports Equipment" or "Snowboard Gear"
                        </Text>
                      </BlockStack>
                    </Card>
                  </div>

                  <div style={{ flex: '1 1 45%', minWidth: '300px' }}>
                    <Card background="bg-surface-secondary">
                      <BlockStack gap="200">
                        <InlineStack align="space-between">
                          <Text as="h3" variant="headingSm">
                            📏 Include key specifications in descriptions
                          </Text>
                          <Badge tone="info">Easy Fix</Badge>
                        </InlineStack>
                        <Text as="p" variant="bodyMd">
                          Add dimensions, weight, materials, or skill level requirements where relevant
                        </Text>
                      </BlockStack>
                    </Card>
                  </div>

                  <div style={{ flex: '1 1 45%', minWidth: '300px' }}>
                    <Card background="bg-surface-secondary">
                      <BlockStack gap="200">
                        <InlineStack align="space-between">
                          <Text as="h3" variant="headingSm">
                            ❓ Answer common customer questions
                          </Text>
                          <Badge tone="success">High Impact</Badge>
                        </InlineStack>
                        <Text as="p" variant="bodyMd">
                          Include phrases like "This solves..." or "You'll love this if..." to match user queries
                        </Text>
                      </BlockStack>
                    </Card>
                  </div>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Helpful guidance banner when in bulk view */}
          {viewMode === 'bulk' && bulkAnalysisResults.length > 0 && (
            <Layout.Section>
              <Banner tone="info">
                💡 <strong>Tip:</strong> Click "View Details" on any product below or switch to "🔍 Individual Analysis" to get detailed recommendations and copy-paste ready improvements.
              </Banner>
            </Layout.Section>
          )}

          {/* Bulk Analysis Results */}
          {bulkAnalysisResults.length > 0 && viewMode === 'bulk' && (
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    📊 Bulk Analysis Results
                  </Text>
                  
                  {storeMetrics && storeMetrics.topPriorityFixes.length > 0 && (
                    <BlockStack gap="300">
                      <Text as="h3" variant="headingSm">
                        🚨 Top Priority Fixes (Lowest Scores)
                      </Text>
                      <BlockStack gap="200">
                        {storeMetrics.topPriorityFixes.map((product: any, index: number) => (
                          <Card key={product.id} background="bg-surface-secondary">
                            <BlockStack gap="200">
                              <InlineStack align="space-between">
                                <BlockStack gap="100">
                                  <Text as="h4" variant="headingSm">
                                    {product.title}
                                  </Text>
                                  <Text as="p" variant="bodyMd" tone="subdued">
                                    Top Gap: {product.topGap}
                                  </Text>
                                </BlockStack>
                                <Badge tone={product.error ? "critical" : product.discoveryScore < 40 ? "critical" : "attention"}>
                                  {product.error ? "Error" : `${product.discoveryScore}%`}
                                </Badge>
                              </InlineStack>
                              <Text as="p" variant="bodySm">
                                💡 {product.topSuggestion}
                              </Text>
                              <Button 
                                size="slim" 
                                onClick={() => {
                                  setSelectedProductId(product.id);
                                  setViewMode('individual');
                                  handleProductSelect(product.id);
                                }}
                              >
                                View Details
                              </Button>
                            </BlockStack>
                          </Card>
                        ))}
                      </BlockStack>
                    </BlockStack>
                  )}
                  
                  <BlockStack gap="300">
                    <InlineStack align="space-between">
                      <Text as="h3" variant="headingSm">
                        All Products ({bulkAnalysisResults.length})
                      </Text>
                      <Button 
                        size="slim" 
                        variant="secondary"
                        onClick={() => {
                          setBulkAnalysisResults([]);
                          setStoreMetrics(null);
                        }}
                      >
                        Clear Results
                      </Button>
                    </InlineStack>
                    
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      <BlockStack gap="200">
                        {bulkAnalysisResults.map((product: any, index: number) => (
                          <Card key={product.id} background={product.needsImprovement ? "bg-surface-critical" : "bg-surface-success"}>
                            <InlineStack align="space-between">
                              <BlockStack gap="100">
                                <Text as="h4" variant="headingSm">
                                  {product.title}
                                </Text>
                                <Text as="p" variant="bodySm" tone="subdued">
                                  {product.error ? "Analysis failed" : product.topGap}
                                </Text>
                              </BlockStack>
                              <InlineStack gap="200" align="end">
                                <Badge tone={product.error ? "critical" : product.discoveryScore >= 80 ? "success" : product.discoveryScore >= 60 ? "attention" : "critical"}>
                                  {product.error ? "Error" : `${product.discoveryScore}%`}
                                </Badge>
                                <Button 
                                  size="slim" 
                                  onClick={() => {
                                    setSelectedProductId(product.id);
                                    setViewMode('individual');
                                    handleProductSelect(product.id);
                                  }}
                                >
                                  View Details
                                </Button>
                              </InlineStack>
                            </InlineStack>
                          </Card>
                        ))}
                      </BlockStack>
                    </div>
                  </BlockStack>
                </BlockStack>
              </Card>
            </Layout.Section>
          )}

          {hasAnalysis && viewMode === 'individual' && (
            <Layout.Section>
              <BlockStack gap="400">
                {/* Selected Product Header */}
                <Card>
                  <BlockStack gap="300">
                    <InlineStack align="space-between">
                      <BlockStack gap="100">
                        <Text as="h2" variant="headingLg">
                          {actionData.product?.title || 'Selected Product'}
                        </Text>
                        <InlineStack gap="200">
                          {actionData.product?.productType && (
                            <Badge tone="info">{actionData.product.productType}</Badge>
                          )}
                          {actionData.product?.vendor && (
                            <Badge tone="attention">{actionData.product.vendor}</Badge>
                          )}
                          {actionData.product?.tags && Array.isArray(actionData.product.tags) && actionData.product.tags.length > 0 && (
                            <Badge tone="success">{`${actionData.product.tags.length} tags`}</Badge>
                          )}
                        </InlineStack>
                      </BlockStack>
                      <Button onClick={handleEditProduct} variant="primary" size="large">
                        Edit Product
                      </Button>
                    </InlineStack>
                    {actionData.product?.description && (
                      <Text as="p" variant="bodyMd" tone="subdued">
                        {actionData.product.description.length > 200 
                          ? `${actionData.product.description.substring(0, 200)}...` 
                          : actionData.product.description
                        }
                      </Text>
                    )}
                  </BlockStack>
                </Card>

                <Card>
                  <BlockStack gap="400">
                    <InlineStack align="space-between">
                      <Text as="h3" variant="headingMd">
                        LLM Discovery Score Analysis
                      </Text>
                      {(actionData.analysis as any).cacheStatus && (
                        <Badge 
                          tone={(actionData.analysis as any).cacheStatus === 'cached' ? 'info' : 'success'}
                        >
                          {(actionData.analysis as any).cacheStatus === 'cached' ? '🎯 Cached Result' : '🔄 Fresh Analysis'}
                        </Badge>
                      )}
                    </InlineStack>
                    {actionData.analysis.scores ? (
                      <>
                        <InlineStack gap="300" align="space-between">
                          <Text as="span" variant="headingSm">
                            Overall Discovery Potential
                          </Text>
                          {renderScoreTag(actionData.analysis.scores.discoveryPotential)}
                        </InlineStack>
                        <ProgressBar
                          progress={actionData.analysis.scores.discoveryPotential}
                          size="small"
                          tone={
                            actionData.analysis.scores.discoveryPotential >= 80
                              ? "success"
                              : actionData.analysis.scores.discoveryPotential >= 60
                              ? "highlight"
                              : "critical"
                          }
                        />
                        
                        <BlockStack gap="300">
                          <Text as="h4" variant="headingSm">
                            Score Breakdown
                          </Text>
                          <InlineStack gap="300" wrap>
                            <Tag>Semantic Clarity: {actionData.analysis.scores.semanticClarity}%</Tag>
                            <Tag>Intent Matching: {actionData.analysis.scores.intentMatching}%</Tag>
                            <Tag>Feature-Benefit: {actionData.analysis.scores.featureBenefitStructure}%</Tag>
                            <Tag>Natural Language: {actionData.analysis.scores.naturalLanguage}%</Tag>
                            <Tag>Structured Info: {actionData.analysis.scores.structuredInfo}%</Tag>
                        </InlineStack>
                        </BlockStack>
                      </>
                    ) : (
                      <Banner tone="warning">
                        Analysis data is incomplete. Please try selecting the product again.
                      </Banner>
                    )}

                    <BlockStack gap="300">
                      <Text as="h4" variant="headingSm">
                        Content Strengths
                      </Text>
                      <List type="bullet">
                        {actionData.analysis.contentStrengths?.map((strength: string, index: number) => (
                          <List.Item key={index}>{strength}</List.Item>
                        )) || <List.Item>No strengths data available</List.Item>}
                      </List>
                    </BlockStack>

                    <BlockStack gap="300">
                      <Text as="h4" variant="headingSm">
                        Discovery Gaps
                      </Text>
                      <List type="bullet">
                        {actionData.analysis.contentGaps?.map((gap: string, index: number) => (
                          <List.Item key={index}>{gap}</List.Item>
                        )) || <List.Item>No gaps data available</List.Item>}
                      </List>
                    </BlockStack>
                  </BlockStack>
                </Card>

                <Card>
                  <BlockStack gap="400">
                    <Text as="h3" variant="headingMd">
                      Optimization Recommendations
                    </Text>
                    {actionData.analysis.llmOptimizations?.map((opt: { category: string; score: number; suggestions: string[] }, index: number) => (
                      <BlockStack key={index} gap="200">
                        <InlineStack align="space-between">
                          <Text as="h4" variant="headingSm">
                            {opt.category}
                          </Text>
                          {renderScoreTag(opt.score)}
                        </InlineStack>
                        <List type="bullet">
                          {opt.suggestions.map((suggestion: string, idx: number) => (
                            <List.Item key={idx}>{suggestion}</List.Item>
                          ))}
                        </List>
                      </BlockStack>
                    )) || <Text as="p">No optimization recommendations available</Text>}
                </BlockStack>
              </Card>

              <Card>
                  <BlockStack gap="400">
                    <Text as="h3" variant="headingMd">
                      Content Improvement Guide
                    </Text>
                    {actionData.analysis.improvedContent ? (
                      <>
                        <BlockStack gap="300">
                          <Text as="h4" variant="headingSm">
                            Title Optimization
                          </Text>
                          <List type="bullet">
                            {actionData.analysis.improvedContent.suggestions?.map((suggestion: string, index: number) => (
                              <List.Item key={index}>{suggestion}</List.Item>
                            )) || <List.Item>No title suggestions available</List.Item>}
                          </List>
                        </BlockStack>
                        <BlockStack gap="300">
                          <Text as="h4" variant="headingSm">
                            Description Enhancement
                        </Text>
                          <List type="bullet">
                            {actionData.analysis.improvedContent.descriptionSuggestions?.map(
                              (suggestion: string, index: number) => (
                                <List.Item key={index}>{suggestion}</List.Item>
                              )
                            ) || <List.Item>No description suggestions available</List.Item>}
                      </List>
                        </BlockStack>
                      </>
                    ) : (
                      <Text as="p">No content improvement suggestions available</Text>
                    )}
                </BlockStack>
              </Card>

              {/* New Copy-Paste Ready Improvements Section */}
              {actionData.analysis.improvedContent?.specificEnhancements && (
                <Card>
                  <BlockStack gap="400">
                    <Text as="h3" variant="headingMd">
                      📋 Copy-Paste Ready Improvements
                    </Text>
                    <Banner tone="success">
                      🎯 <strong>Ready to Use:</strong> Copy these optimized suggestions directly into your product fields
                    </Banner>

                    {/* Copy-Paste Title */}
                    {actionData.analysis.improvedContent.specificEnhancements?.copyPasteTitle && (
                      <BlockStack gap="200">
                        <Text as="h4" variant="headingSm">
                          📝 Optimized Title
                        </Text>
                        <Card background="bg-surface-secondary">
                          <BlockStack gap="200">
                            <Text as="p" variant="bodyMd" fontWeight="medium">
                              {actionData.analysis.improvedContent.specificEnhancements.copyPasteTitle}
                            </Text>
                            <Button 
                              size="micro" 
                              onClick={() => navigator.clipboard.writeText(actionData.analysis.improvedContent.specificEnhancements?.copyPasteTitle || '')}
                            >
                              📋 Copy Title
                            </Button>
                          </BlockStack>
                        </Card>
                      </BlockStack>
                    )}

                    {/* Copy-Paste Description Sentences */}
                    {actionData.analysis.improvedContent.specificEnhancements?.copyPasteDescriptionSentences?.length > 0 && (
                      <BlockStack gap="200">
                        <Text as="h4" variant="headingSm">
                          📄 Description Enhancements
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Add these sentences to your product description:
                        </Text>
                        {actionData.analysis.improvedContent.specificEnhancements.copyPasteDescriptionSentences.map((sentence: string, index: number) => (
                          <Card key={index} background="bg-surface-secondary">
                            <BlockStack gap="200">
                              <Text as="p" variant="bodyMd">
                                {sentence}
                              </Text>
                              <Button 
                                size="micro" 
                                onClick={() => navigator.clipboard.writeText(sentence)}
                              >
                                📋 Copy Sentence
                              </Button>
                            </BlockStack>
                          </Card>
                        ))}
                      </BlockStack>
                    )}

                    {/* Suggested Tags */}
                    {actionData.analysis.improvedContent.specificEnhancements?.suggestedTags?.length > 0 && (
                      <BlockStack gap="200">
                        <Text as="h4" variant="headingSm">
                          🏷️ Optimized Tags
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Replace or add these searchable tags:
                        </Text>
                        <Card background="bg-surface-secondary">
                          <BlockStack gap="200">
                            <InlineStack gap="200" wrap>
                              {actionData.analysis.improvedContent.specificEnhancements.suggestedTags.map((tag: string, index: number) => (
                                <Tag key={index}>{tag}</Tag>
                              ))}
                            </InlineStack>
                            <Button 
                              size="micro" 
                              onClick={() => navigator.clipboard.writeText(actionData.analysis.improvedContent.specificEnhancements?.suggestedTags?.join(', ') || '')}
                            >
                              📋 Copy All Tags
                            </Button>
                          </BlockStack>
                        </Card>
                      </BlockStack>
                    )}

                    {/* Feature-Benefit Pairs */}
                    {actionData.analysis.improvedContent.specificEnhancements?.featureBenefitPairs?.length > 0 && (
                      <BlockStack gap="200">
                        <Text as="h4" variant="headingSm">
                          ⚡ Feature-Benefit Pairs
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Use these to connect features with customer benefits:
                        </Text>
                        {actionData.analysis.improvedContent.specificEnhancements.featureBenefitPairs.map((pair: {feature: string; benefit: string}, index: number) => (
                          <Card key={index} background="bg-surface-secondary">
                            <BlockStack gap="200">
                              <Text as="p" variant="bodyMd">
                                <strong>Feature:</strong> {pair.feature}
                              </Text>
                              <Text as="p" variant="bodyMd">
                                <strong>Benefit:</strong> {pair.benefit}
                              </Text>
                              <Button 
                                size="micro" 
                                onClick={() => navigator.clipboard.writeText(`${pair.feature} - ${pair.benefit}`)}
                              >
                                📋 Copy Pair
                              </Button>
                            </BlockStack>
                          </Card>
                        ))}
                      </BlockStack>
                    )}

                    {/* Specifications */}
                    {actionData.analysis.improvedContent.specificEnhancements?.specifications?.length > 0 && (
                      <BlockStack gap="200">
                        <Text as="h4" variant="headingSm">
                          📏 Key Specifications
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Add these specifications to your description:
                        </Text>
                        <Card background="bg-surface-secondary">
                          <BlockStack gap="200">
                            <List type="bullet">
                              {actionData.analysis.improvedContent.specificEnhancements.specifications.map((spec: string, index: number) => (
                                <List.Item key={index}>{spec}</List.Item>
                              ))}
                            </List>
                            <Button 
                              size="micro" 
                              onClick={() => navigator.clipboard.writeText(actionData.analysis.improvedContent.specificEnhancements?.specifications?.join('\n• ') || '')}
                            >
                              📋 Copy All Specs
                            </Button>
                          </BlockStack>
                        </Card>
                      </BlockStack>
                    )}
                  </BlockStack>
                </Card>
              )}

              {/* Review-Enhanced Recommendations Section */}
              {actionData.analysis.reviewEnhancedRecommendations && (
                <Card>
                  <BlockStack gap="400">
                    <Text as="h3" variant="headingMd">
                      🌟 Customer Review Insights
                    </Text>
                    
                    {/* Check if this is just setup guidance or actual review data */}
                    {actionData.analysis.reviewEnhancedRecommendations.customerLanguageSuggestions?.[0]?.includes("Install Judge.me") ? (
                      <Banner tone="info">
                        <BlockStack gap="200">
                          <Text as="p" variant="bodyMd" fontWeight="medium">
                            🚀 Unlock Enhanced Recommendations with Customer Reviews
                          </Text>
                          <Text as="p" variant="bodyMd">
                            Install Judge.me or another review app to get personalized suggestions based on actual customer feedback and language.
                          </Text>
                        </BlockStack>
                      </Banner>
                    ) : (
                      <Banner tone="success">
                        <Text as="p" variant="bodyMd" fontWeight="medium">
                          ✨ These recommendations are enhanced with real customer review data
                        </Text>
                      </Banner>
                    )}

                    {/* Customer Language Suggestions */}
                    {actionData.analysis.reviewEnhancedRecommendations.customerLanguageSuggestions?.length > 0 && (
                      <BlockStack gap="200">
                        <Text as="h4" variant="headingSm">
                          💬 Customer Language to Include
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Use these phrases that your customers actually use in reviews:
                        </Text>
                        <List type="bullet">
                          {actionData.analysis.reviewEnhancedRecommendations.customerLanguageSuggestions.map((suggestion: string, index: number) => (
                            <List.Item key={index}>{suggestion}</List.Item>
                          ))}
                        </List>
                      </BlockStack>
                    )}

                    {/* Addressed Concerns */}
                    {actionData.analysis.reviewEnhancedRecommendations.addressedConcerns?.length > 0 && (
                      <BlockStack gap="200">
                        <Text as="h4" variant="headingSm">
                          ⚠️ Address These Customer Concerns
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Common issues mentioned in negative reviews to proactively address:
                        </Text>
                        <List type="bullet">
                          {actionData.analysis.reviewEnhancedRecommendations.addressedConcerns.map((concern: string, index: number) => (
                            <List.Item key={index}>{concern}</List.Item>
                          ))}
                        </List>
                      </BlockStack>
                    )}

                    {/* Highlighted Benefits */}
                    {actionData.analysis.reviewEnhancedRecommendations.highlightedBenefits?.length > 0 && (
                      <BlockStack gap="200">
                        <Text as="h4" variant="headingSm">
                          ⭐ Customer-Praised Benefits to Highlight
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Benefits frequently mentioned in positive reviews:
                        </Text>
                        <List type="bullet">
                          {actionData.analysis.reviewEnhancedRecommendations.highlightedBenefits.map((benefit: string, index: number) => (
                            <List.Item key={index}>{benefit}</List.Item>
                          ))}
                        </List>
                      </BlockStack>
                    )}

                    {/* Missing Keywords */}
                    {actionData.analysis.reviewEnhancedRecommendations.missingKeywords?.length > 0 && (
                      <BlockStack gap="200">
                        <Text as="h4" variant="headingSm">
                          🔍 Missing Keywords from Customer Reviews
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Important terms customers use that aren't in your product content:
                        </Text>
                        <InlineStack gap="200" wrap>
                          {actionData.analysis.reviewEnhancedRecommendations.missingKeywords.map((keyword: string, index: number) => (
                            <Tag key={index}>{keyword}</Tag>
                          ))}
                        </InlineStack>
                      </BlockStack>
                    )}

                    {/* Social Proof Suggestions */}
                    {actionData.analysis.reviewEnhancedRecommendations.socialProofSuggestions?.length > 0 && (
                      <BlockStack gap="200">
                        <Text as="h4" variant="headingSm">
                          🎯 Social Proof Optimization
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Ways to better leverage your review data:
                        </Text>
                        <List type="bullet">
                          {actionData.analysis.reviewEnhancedRecommendations.socialProofSuggestions.map((suggestion: string, index: number) => (
                            <List.Item key={index}>{suggestion}</List.Item>
                          ))}
                        </List>
                      </BlockStack>
                    )}
                  </BlockStack>
                </Card>
              )}
            </BlockStack>
          </Layout.Section>
          )}
        </Layout>
      </BlockStack>

      {/* Edit Product Modal */}
      <Modal
        open={isEditing}
        onClose={() => setIsEditing(false)}
        title="Edit Product for Better LLM Discovery"
        primaryAction={{
          content: 'Save Changes',
          onAction: handleSaveProduct,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setIsEditing(false),
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Banner tone="info">
              💡 <strong>Optimization Tips:</strong> Use the suggestions below to improve your LLM discovery score
            </Banner>
            
            <FormLayout>
              <TextField
                label="Product Title"
                value={formData.title}
                onChange={(value) => setFormData({ ...formData, title: value })}
                helpText="Include key benefits and who it's for (e.g., 'Professional Snowboard for Advanced Riders')"
                autoComplete="off"
              />
              
              <BlockStack gap="200">
                <TextField
                  label="Product Description"
                  value={formData.description}
                  onChange={(value) => setFormData({ ...formData, description: value })}
                  multiline={6}
                  helpText="Start with the problem it solves, then explain features and benefits"
                  autoComplete="off"
                />
                
                <Card background="bg-surface-secondary">
                  <BlockStack gap="200">
                    <Text as="h4" variant="headingSm">
                      💬 AI Description Template
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Try this structure: "[Problem it solves] + [Key features] + [Who it's perfect for] + [Expected outcomes]"
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      <strong>Example:</strong> "Struggling with icy slopes? This advanced snowboard features reinforced edges and flexible core technology, perfect for experienced riders who want maximum control on challenging terrain. You'll confidently tackle any mountain condition."
                    </Text>
                  </BlockStack>
                </Card>
              </BlockStack>
              
              <TextField
                label="Tags"
                value={formData.tags}
                onChange={(value) => setFormData({ ...formData, tags: value })}
                helpText="Include skill levels, use cases, and searchable terms (e.g., 'beginner-friendly, winter sports, outdoor gear')"
                autoComplete="off"
              />
              
              <TextField
                label="Product Type"
                value={formData.productType}
                onChange={(value) => setFormData({ ...formData, productType: value })}
                helpText="Be specific and searchable (e.g., 'Winter Sports Equipment' instead of 'Accessory')"
                autoComplete="off"
              />
              
              <TextField
                label="Vendor"
                value={formData.vendor}
                onChange={(value) => setFormData({ ...formData, vendor: value })}
                helpText="Brand or manufacturer name"
                autoComplete="off"
              />
            </FormLayout>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
