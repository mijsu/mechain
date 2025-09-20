
import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { MLModel } from "@/api/entities";
import { Diagnosis } from "@/api/entities";
import { SystemSetting } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Users,
  Brain,
  Activity,
  Shield,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus
} from
"lucide-react";

import AdminStatsCards from "../components/admin/AdminStatsCards";
import DiagnosesTrendChart from "../components/admin/DiagnosesTrendChart";
import RecentActivity from "../components/admin/RecentActivity";
import ModelPerformance from "../components/admin/ModelPerformance";

export default function AdminDashboard() {
  const [doctors, setDoctors] = useState([]);
  const [models, setModels] = useState([]);
  const [diagnoses, setDiagnoses] = useState([]);
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [doctorsList, modelsList, diagnosesList, settingsList] = await Promise.all([
        User.filter({ role: 'user' }),
        MLModel.list('-created_date', 10),
        Diagnosis.list('-created_date', 50),
        SystemSetting.list()]
      );

      setDoctors(doctorsList);
      setModels(modelsList);
      setDiagnoses(diagnosesList);
      setSettings(settingsList.length > 0 ? settingsList[0] : null);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
    setIsLoading(false);
  };

  const isApiMode = settings?.active_model_type === 'api';
  const customActiveModels = models.filter((m) => m.is_active);

  let activeModelsCount = customActiveModels.length;
  // If in API mode and no custom model is active, the default one is in use.
  if (isApiMode && customActiveModels.length === 0) {
    activeModelsCount = 1;
  }

  const systemHealth = activeModelsCount > 0 ? 100 : 0;

  const stats = {
    totalDoctors: doctors.length,
    activeDoctors: doctors.filter((d) => d.status === 'active' || d.status === undefined).length,
    totalModels: models.length,
    activeModels: activeModelsCount,
    totalDiagnoses: diagnoses.length,
    todayDiagnoses: diagnoses.filter((d) => {
      const today = new Date().toDateString();
      return new Date(d.created_date).toDateString() === today;
    }).length,
    systemHealth: systemHealth.toFixed(1)
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) =>
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            )}
          </div>
        </div>
      </div>);

  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1 text-lg">System overview and management</p>
        </div>
        <div className="flex gap-3">
          <Link to={createPageUrl("ManageDoctors")}>
            <Button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-base font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0 text-primary-foreground h-10 px-4 py-2 bg-blue-600 hover:bg-blue-700">
              <Plus className="w-5 h-5 mr-2" />
              Add Doctor
            </Button>
          </Link>
          <Link to={createPageUrl("MLModels")}>
            <Button variant="outline" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-base font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
              <Brain className="w-5 h-5 mr-2" />
              Manage Models
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AdminStatsCards
          title="Total Doctors"
          value={stats.totalDoctors}
          icon={Users}
          bgColor="bg-blue-500"
          subtitle={`${stats.activeDoctors} active`} />

        <AdminStatsCards
          title="ML Models"
          value={stats.totalModels}
          icon={Brain}
          bgColor="bg-purple-500"
          subtitle={`${stats.activeModels} active`} />

        <AdminStatsCards
          title="Total Diagnoses"
          value={stats.totalDiagnoses}
          icon={Activity}
          bgColor="bg-green-500"
          subtitle={`${stats.todayDiagnoses} today`} />

        <AdminStatsCards
          title="System Health"
          value={`${stats.systemHealth}%`}
          icon={Shield}
          bgColor="bg-indigo-500"
          subtitle="Model Availability" />

      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <DiagnosesTrendChart diagnoses={diagnoses} />
          <ModelPerformance models={models} isApiMode={isApiMode} settings={settings} />
        </div>

        <div className="space-y-6">
          <RecentActivity diagnoses={diagnoses.slice(0, 10)} doctors={doctors} />

          {/* Quick Actions */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold tracking-tight">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to={createPageUrl("ManageDoctors")} className="block">
                <Button variant="outline" className="inline-flex items-center gap-2 whitespace-nowrap rounded-md text-base font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full justify-start">
                  <Users className="w-5 h-5 mr-2" />
                  Manage Doctor Accounts
                </Button>
              </Link>
              <Link to={createPageUrl("MLModels")} className="block">
                <Button variant="outline" className="inline-flex items-center gap-2 whitespace-nowrap rounded-md text-base font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full justify-start">
                  <Brain className="w-5 h-5 mr-2" />
                  Upload New Model
                </Button>
              </Link>
              <Link to={createPageUrl("SystemLogs")} className="block">
                <Button variant="outline" className="inline-flex items-center gap-2 whitespace-nowrap rounded-md text-base font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full justify-start">
                  <Shield className="w-5 h-5 mr-2" />
                  View System Logs
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>);

}
