// Shopify product service stubs

import { authenticate } from "../shopify.server";

// Utility to get an authenticated GraphQL client for the current session
export async function getShopifyGraphQLClient(request: Request) {
  const { admin } = await authenticate.admin(request);
  return async function shopifyGraphQLRequest(query: string, variables?: any) {
    return admin.graphql(query, { variables });
  };
}

export async function getProductById(request: Request, productId: string) {
  const shopifyGraphQLRequest = await getShopifyGraphQLClient(request);
  const query = `
    query getProduct($id: ID!) {
      product(id: $id) {
        id
        title
        description: descriptionHtml
        tags
        productType
        vendor
        metafields(first: 10) {
          edges {
            node {
              key
              value
            }
          }
        }
      }
    }
  `;
  const variables = { id: productId.startsWith("gid://") ? productId : `gid://shopify/Product/${productId}` };
  const response = await shopifyGraphQLRequest(query, variables);
  const responseJson = await response.json();
  const product = responseJson.data.product;
  return {
    title: product.title,
    description: product.description,
    tags: product.tags,
    productType: product.productType,
    vendor: product.vendor,
    metafields: product.metafields.edges.map((edge: any) => ({
      key: edge.node.key,
      value: edge.node.value
    }))
  };
}

export async function updateProductById(request: Request, productId: string, updatedProduct: any) {
  const shopifyGraphQLRequest = await getShopifyGraphQLClient(request);
  const mutation = `
    mutation updateProduct($input: ProductInput!) {
      productUpdate(input: $input) {
        product {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `;
  const input: any = {
    id: productId.startsWith("gid://") ? productId : `gid://shopify/Product/${productId}`,
    title: updatedProduct.title,
    descriptionHtml: updatedProduct.description,
    tags: updatedProduct.tags,
    productType: updatedProduct.productType,
    vendor: updatedProduct.vendor,
  };
  const response = await shopifyGraphQLRequest(mutation, { input });
  const responseJson = await response.json();
  if (responseJson.data.productUpdate.userErrors.length > 0) {
    throw new Error(responseJson.data.productUpdate.userErrors.map((e: any) => e.message).join(", "));
  }
  return true;
} 