
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MLModel } from "@/api/entities";
import { Brain, TrendingUp, Target, Zap } from "lucide-react";

export default function AIInsights({ diagnoses }) {
  const [activeModel, setActiveModel] = useState(null);

  useEffect(() => {
    const fetchActiveModel = async () => {
      // In a real application, consider adding error handling and loading states
      try {
        const models = await MLModel.filter({ is_active: true, model_type: "heart_disease" });
        if (models.length > 0) {
          setActiveModel(models[0]);
        } else {
          // Handle case where no active model is found
          console.warn("No active ML model found for heart_disease.");
        }
      } catch (error) {
        console.error("Failed to fetch active ML model:", error);
      }
    };
    fetchActiveModel();
  }, []);

  const aiStats = {
    totalPredictions: diagnoses.length,
    avgConfidence: diagnoses.length > 0 ? diagnoses.reduce((acc, d) => acc + (d.ai_prediction?.confidence || 0), 0) / diagnoses.length : 0,
    commonConditions: {}
  };

  // Normalize and count common predicted conditions
  const increment = (name) => {
    if (!name) return;
    const key = String(name).trim().toLowerCase();
    if (!key) return;
    aiStats.commonConditions[key] = (aiStats.commonConditions[key] || 0) + 1;
  };

  // Analyze common predicted conditions
  diagnoses.forEach((diagnosis) => {
    const pcs = diagnosis.ai_prediction?.predicted_conditions || [];
    pcs.forEach((entry) => {
      if (!entry) return;
      if (typeof entry === "string") {
        increment(entry);
      } else if (typeof entry === "object") {
        // Support both {condition: "name"} and plain objects
        increment(entry.condition || entry.name || entry.label);
      }
    });
  });

  const topConditions = Object.entries(aiStats.commonConditions)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  const formatCondition = (key) =>
    key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (ch) => ch.toUpperCase());

  const insights = [
    {
      title: "Model Accuracy",
      value: activeModel ? `${activeModel.accuracy}%` : "N/A",
      icon: Target,
      color: "text-green-600",
      bg: "bg-green-50"
    },
    {
      title: "Avg Confidence",
      value: `${aiStats.avgConfidence.toFixed(1)}%`,
      icon: Brain,
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    {
      title: "F1 Score",
      value: activeModel ? `${(activeModel.performance_metrics?.f1_score * 100).toFixed(1)}%` : "N/A",
      icon: Zap,
      color: "text-purple-600",
      bg: "bg-purple-50"
    }
  ];

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Brain className="w-6 h-6 text-purple-600" />
          AI Model Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-4">
            {insights.map((insight, index) => (
              <div key={index} className={`p-4 rounded-lg ${insight.bg}`}>
                <div className="flex items-center justify-center mb-2">
                  <insight.icon className={`w-6 h-6 ${insight.color}`} />
                </div>
                <p className="text-center text-lg font-medium">{insight.title}</p>
                <p className={`text-center text-xl font-bold ${insight.color}`}>{insight.value}</p>
              </div>
            ))}
          </div>

          {/* Common Conditions */}
          {topConditions.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Most Detected Conditions
              </h4>
              <div className="space-y-2">
                {topConditions.map(([key, count], index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-base font-medium text-gray-700">
                      {formatCondition(key)}
                    </span>
                    <Badge variant="outline" className="text-blue-600 border-blue-200">
                      {count} {count === 1 ? 'case' : 'cases'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Performance Indicator */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-gray-900 text-lg font-medium">Model Status</span>
            </div>
            <p className="text-gray-600 text-base">AI model is performing optimally with high accuracy and confidence levels</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
