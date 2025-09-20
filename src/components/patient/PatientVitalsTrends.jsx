import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { format } from "date-fns";

export default function PatientVitalsTrends({ diagnoses }) {
  const data = (diagnoses || []).map((d) => ({
    date: d.created_date ? format(new Date(d.created_date), "MMM d") : "",
    systolic: Number(d?.vital_signs?.systolic_bp) || null,
    diastolic: Number(d?.vital_signs?.diastolic_bp) || null,
    heart_rate: Number(d?.vital_signs?.heart_rate) || null
  }));

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle>Vitals Trend</CardTitle>
      </CardHeader>
      <CardContent style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="systolic" stroke="#ef4444" name="Systolic BP" />
            <Line type="monotone" dataKey="diastolic" stroke="#3b82f6" name="Diastolic BP" />
            <Line type="monotone" dataKey="heart_rate" stroke="#10b981" name="Heart Rate" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}