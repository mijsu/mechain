
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export default function DoctorStatsCards({ title, value, icon: Icon, bgColor, subtitle, trend }) {
  return (
    <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
      <div className={`h-1 ${bgColor}`}></div>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-gray-600 text-lg font-medium tracking-tight">{title}</CardTitle>
        <div className={`p-3 rounded-lg ${bgColor} bg-opacity-20`}>
          <Icon className={`w-6 h-6 ${bgColor.replace('bg-', 'text-')}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-gray-900">{value}</div>
        {subtitle &&
          <p className="text-gray-500 mt-1 text-base">{subtitle}</p>
        }
        {trend &&
          <div className="flex items-center mt-2 text-sm">
            <TrendingUp className="w-4 h-4 mr-1 text-green-500" />
            <span className="text-green-500 font-medium">{trend}</span>
          </div>
        }
      </CardContent>
    </Card>
  );
}
