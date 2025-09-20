
import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { Patient } from "@/api/entities";
import { Diagnosis } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Heart, 
  Users, 
  Upload, 
  Activity, 
  TrendingUp,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Plus
} from "lucide-react";
// Custom Components
import DoctorStatsCards from "../components/doctor/DoctorStatsCards";
import RecentDiagnoses from "../components/doctor/RecentDiagnoses";
import PatientSummary from "../components/doctor/PatientSummary";
import AIInsights from "../components/doctor/AIInsights";
import DoctorAnalyticsChart from "../components/doctor/DoctorAnalyticsChart";

export default function DoctorDashboard() {
  const [user, setUser] = useState(null);
  const [patients, setPatients] = useState([]);
  const [diagnoses, setDiagnoses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);

      // Load only patients and diagnoses for this doctor
      const [patientsList, diagnosesList] = await Promise.all([
        Patient.filter({ assigned_doctor_id: currentUser.id }, '-created_date', 50),
        Diagnosis.filter({ doctor_id: currentUser.id }, '-created_date', 50)
      ]);
      
      setPatients(patientsList);
      setDiagnoses(diagnosesList);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
    setIsLoading(false);
  };

  const stats = {
    totalPatients: patients.length,
    todayDiagnoses: diagnoses.filter(d => {
      const today = new Date().toDateString();
      return new Date(d.created_date).toDateString() === today;
    }).length,
    pendingDiagnoses: diagnoses.filter(d => d.status === 'pending').length,
    highRiskPatients: diagnoses.filter(d => d.ai_prediction?.risk_level === 'high' || d.ai_prediction?.risk_level === 'critical').length
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, Dr. {user?.display_name || user?.full_name}
          </h1>
          <p className="text-gray-600 mt-1 text-lg">
            {user?.department ? `${user.department} Department` : 'Your patient care dashboard'}
          </p>
        </div>
        <div className="flex gap-3">
          <Link to={createPageUrl("NewDiagnosis")}>
            <Button className="bg-blue-600 hover:bg-blue-700 [&_svg]:size-5">
              <Plus className="w-5 h-5 mr-2" />
              New Diagnosis
            </Button>
          </Link>
          <Link to={createPageUrl("ImageAnalysis")}>
            <Button variant="outline" className="[&_svg]:size-5">
              <Upload className="w-5 h-5 mr-2" />
              Analyze Images
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DoctorStatsCards
          title="Total Patients"
          value={stats.totalPatients}
          icon={Users}
          bgColor="bg-blue-500"
          subtitle="Under your care"
        />
        <DoctorStatsCards
          title="Today's Diagnoses"
          value={stats.todayDiagnoses}
          icon={Activity}
          bgColor="bg-green-500"
          subtitle="Completed today"
        />
        <DoctorStatsCards
          title="Pending Reviews"
          value={stats.pendingDiagnoses}
          icon={Calendar}
          bgColor="bg-orange-500"
          subtitle="Awaiting action"
        />
        <DoctorStatsCards
          title="High Risk Alerts"
          value={stats.highRiskPatients}
          icon={AlertTriangle}
          bgColor="bg-red-500"
          subtitle="Require attention"
        />
      </div>

      {/* Analytics Chart Section */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Analytics Overview</h2>
        <DoctorAnalyticsChart diagnoses={diagnoses} patients={patients} />
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <RecentDiagnoses diagnoses={diagnoses} />
          <AIInsights diagnoses={diagnoses} />
        </div>
        
        <div className="space-y-6">
          <PatientSummary patients={patients} diagnoses={diagnoses} />
          
          {/* Quick Actions */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to={createPageUrl("NewDiagnosis")} className="block">
                <Button variant="outline" className="w-full justify-start text-base [&_svg]:size-5">
                  <Heart className="w-5 h-5 mr-2" />
                  Start New Diagnosis
                </Button>
              </Link>
              <Link to={createPageUrl("PatientRecords")} className="block">
                <Button variant="outline" className="w-full justify-start text-base [&_svg]:size-5">
                  <Users className="w-5 h-5 mr-2" />
                  View Patient Records
                </Button>
              </Link>
              <Link to={createPageUrl("ImageAnalysis")} className="block">
                <Button variant="outline" className="w-full justify-start text-base [&_svg]:size-5">
                  <Upload className="w-5 h-5 mr-2" />
                  Upload Medical Images
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
