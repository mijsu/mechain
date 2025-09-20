import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, subDays } from 'date-fns';
import { TrendingUp, Users, Activity, AlertTriangle } from 'lucide-react';

export default function DoctorAnalyticsChart({ diagnoses, patients }) {
  // Process diagnosis trend data
  const processData = () => {
    const dataByDay = {};

    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const day = format(subDays(new Date(), i), 'MMM d');
      dataByDay[day] = 0;
    }

    // Populate with diagnosis counts
    diagnoses.forEach((d) => {
      const day = format(new Date(d.created_date), 'MMM d');
      if (day in dataByDay) {
        dataByDay[day]++;
      }
    });

    return Object.entries(dataByDay).map(([name, count]) => ({ name, diagnoses: count }));
  };

  // Process risk level distribution
  const processRiskData = () => {
    const riskCounts = { low: 0, moderate: 0, high: 0, critical: 0 };

    diagnoses.forEach((d) => {
      const riskLevel = d.ai_prediction?.risk_level;
      if (riskLevel && riskCounts.hasOwnProperty(riskLevel)) {
        riskCounts[riskLevel]++;
      }
    });

    return Object.entries(riskCounts).map(([name, value]) => ({ name, value }));
  };

  const chartData = processData();
  const riskData = processRiskData();

  const COLORS = {
    low: '#10b981',
    moderate: '#f59e0b',
    high: '#f97316',
    critical: '#ef4444'
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Diagnosis Trend Chart */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Diagnosis Trends (Last 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <AreaChart
                data={chartData}
                margin={{
                  top: 10, right: 30, left: 0, bottom: 0
                }}>

                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="diagnoses" stroke="#3b82f6" fill="#bfdbfe" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Risk Level Distribution */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Risk Level Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={riskData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value">

                  {riskData.map((entry, index) =>
                  <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                  )}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legend */}
          <div className="flex justify-center gap-4 mt-4">
            {riskData.map(({ name, value }) =>
            <div key={name} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full"

              style={{ backgroundColor: COLORS[name] }}>
              </div>
                <span className="text-gray-600 text-base capitalize">{name}: {value}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>);

}