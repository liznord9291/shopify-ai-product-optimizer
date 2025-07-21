import React from "react";

interface ProductEditorProps {
  product: {
    title: string;
    description: string;
    tags: string[];
    productType: string;
    vendor: string;
    metafields: Array<{ key: string; value: string }>;
  };
}

export default function ProductEditor({ product }: ProductEditorProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <label>
        Title:
        <input name="title" defaultValue={product.title} style={{ width: "100%" }} />
      </label>
      <label>
        Description:
        <textarea name="description" defaultValue={product.description} style={{ width: "100%", minHeight: 80 }} />
      </label>
      <label>
        Tags (comma separated):
        <input name="tags" defaultValue={product.tags.join(", ")} style={{ width: "100%" }} />
      </label>
      <label>
        Product Type:
        <input name="productType" defaultValue={product.productType} style={{ width: "100%" }} />
      </label>
      <label>
        Vendor:
        <input name="vendor" defaultValue={product.vendor} style={{ width: "100%" }} />
      </label>
      <label>
        Metafields (JSON):
        <textarea name="metafields" defaultValue={JSON.stringify(product.metafields, null, 2)} style={{ width: "100%", minHeight: 60 }} />
      </label>
    </div>
  );
} 