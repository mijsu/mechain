
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, AlertTriangle } from "lucide-react";

export default function PatientSummary({ patients, diagnoses }) {
  const riskDistribution = diagnoses.reduce((acc, diagnosis) => {
    const risk = diagnosis.ai_prediction?.risk_level || 'unknown';
    acc[risk] = (acc[risk] || 0) + 1;
    return acc;
  }, {});

  const riskData = [
  { level: 'critical', count: riskDistribution.critical || 0, color: 'bg-red-500', textColor: 'text-red-600' },
  { level: 'high', count: riskDistribution.high || 0, color: 'bg-orange-500', textColor: 'text-orange-600' },
  { level: 'moderate', count: riskDistribution.moderate || 0, color: 'bg-yellow-500', textColor: 'text-yellow-600' },
  { level: 'low', count: riskDistribution.low || 0, color: 'bg-green-500', textColor: 'text-green-600' }];


  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Users className="w-6 h-6 text-blue-600" />
          Patient Risk Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-3xl font-bold text-blue-600">{patients.length}</p>
              <p className="text-blue-800 text-base">Total Patients</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <p className="text-3xl font-bold text-purple-600">{diagnoses.length}</p>
              <p className="text-purple-800 text-base">Total Diagnoses</p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-gray-900 text-lg font-medium flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Risk Level Distribution
            </h4>
            {riskData.map((risk) =>
            <div key={risk.level} className="flex items-center justify-between p-2 rounded-lg border">
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${risk.color}`}></div>
                  <span className="text-gray-700 text-base font-medium capitalize">
                    {risk.level} Risk
                  </span>
                </div>
                <Badge variant="outline" className={risk.textColor}>
                  {risk.count}
                </Badge>
              </div>
            )}
          </div>

          {(riskDistribution.critical > 0 || riskDistribution.high > 0) &&
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="font-medium text-red-900">High Priority Alert</span>
              </div>
              <p className="text-sm text-red-700">
                {(riskDistribution.critical || 0) + (riskDistribution.high || 0)} patients require immediate attention
              </p>
            </div>
          }
        </div>
      </CardContent>
    </Card>
  );
}
