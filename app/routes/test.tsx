import React from 'react';
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export const loader = async () => {
  return json({
    message: "Test route working!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown'
  });
};

export default function Test() {
  const data = useLoaderData<typeof loader>();

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      maxWidth: '600px',
      margin: '50px auto'
    }}>
      <h1 style={{ color: '#008060' }}>🧪 Test Route</h1>
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#d4edda', 
        border: '1px solid #c3e6cb',
        borderRadius: '8px'
      }}>
        <h2>✅ Success!</h2>
        <p><strong>Message:</strong> {data.message}</p>
        <p><strong>Timestamp:</strong> {data.timestamp}</p>
        <p><strong>Environment:</strong> {data.environment}</p>
      </div>
      <div style={{ 
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#fff3cd',
        border: '1px solid #ffeaa7',
        borderRadius: '8px'
      }}>
        <h3>🔍 Diagnosis</h3>
        <p>If you can see this page, then:</p>
        <ul>
          <li>✅ The Render deployment is working</li>
          <li>✅ The basic app infrastructure is functional</li>
          <li>❌ The issue is specifically with the Shopify authentication in the /app route</li>
        </ul>
      </div>
    </div>
  );
}
