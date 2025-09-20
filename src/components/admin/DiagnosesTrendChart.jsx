import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';

export default function DiagnosesTrendChart({ diagnoses }) {
  const processData = () => {
    const dataByDay = {};

    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const day = format(subDays(new Date(), i), 'MMM d');
      dataByDay[day] = 0;
    }

    // Populate with diagnosis counts
    diagnoses.forEach(d => {
      const day = format(new Date(d.created_date), 'MMM d');
      if (day in dataByDay) {
        dataByDay[day]++;
      }
    });

    return Object.entries(dataByDay).map(([name, count]) => ({ name, diagnoses: count }));
  };

  const chartData = processData();

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle>Diagnosis Trends (Last 7 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <AreaChart
              data={chartData}
              margin={{
                top: 10, right: 30, left: 0, bottom: 0,
              }}
            >
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
  );
}