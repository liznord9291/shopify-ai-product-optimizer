import React from "react";

interface LLMAnalysisPanelProps {
  analysis: {
    scores: Record<string, number>;
    contentStrengths: string[];
    contentGaps: string[];
    llmOptimizations: Array<{
      category: string;
      score: number;
      suggestions: string[];
    }>;
    improvedContent: {
      title: string;
      suggestions: string[];
      description: string;
      descriptionSuggestions: string[];
    };
  };
}

export default function LLMAnalysisPanel({ analysis }: LLMAnalysisPanelProps) {
  return (
    <div style={{ border: "1px solid #ccc", borderRadius: 8, padding: 16 }}>
      <h3>LLM Analysis Scores</h3>
      <ul>
        {Object.entries(analysis.scores).map(([key, value]) => (
          <li key={key}><strong>{key}:</strong> {value}</li>
        ))}
      </ul>
      <h4>Strengths</h4>
      <ul>
        {analysis.contentStrengths.map((s, i) => <li key={i}>{s}</li>)}
      </ul>
      <h4>Gaps</h4>
      <ul>
        {analysis.contentGaps.map((g, i) => <li key={i}>{g}</li>)}
      </ul>
      <h4>Optimizations</h4>
      {analysis.llmOptimizations.map((opt, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <strong>{opt.category} (Score: {opt.score}):</strong>
          <ul>
            {opt.suggestions.map((s, j) => <li key={j}>{s}</li>)}
          </ul>
        </div>
      ))}
      <h4>Improved Content Suggestions</h4>
      <div>
        <strong>Title Suggestions:</strong>
        <ul>{analysis.improvedContent.suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul>
        <strong>Description Suggestions:</strong>
        <ul>{analysis.improvedContent.descriptionSuggestions.map((s, i) => <li key={i}>{s}</li>)}</ul>
      </div>
    </div>
  );
} 