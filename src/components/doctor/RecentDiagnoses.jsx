
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { Heart, Eye, AlertTriangle, CheckCircle, Clock, Brain, Stethoscope, FileText, Camera, Beaker, Activity, Gauge } from "lucide-react";
import RiskGauge from "@/components/diagnosis/RiskGauge";
import { MLModel } from "@/api/entities";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar } from "recharts";

const RiskBadge = ({ riskLevel }) => {
  const riskStyles = {
    low: "bg-green-100 text-green-800 border-green-200",
    moderate: "bg-yellow-100 text-yellow-800 border-yellow-200",
    high: "bg-orange-100 text-orange-800 border-orange-200",
    critical: "bg-red-100 text-red-800 border-red-200",
    unknown: "bg-gray-100 text-gray-800 border-gray-200"
  };
  const style = riskStyles[riskLevel?.toLowerCase()] || riskStyles.unknown;
  return <Badge className={`capitalize ${style} text-sm px-2.5 py-1`}>{riskLevel || 'Unknown'}</Badge>;
};

export default function RecentDiagnoses({ diagnoses }) {
  const [selectedDiagnosis, setSelectedDiagnosis] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'follow_up_required':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const handleViewDetails = (diagnosis) => {
    setSelectedDiagnosis(diagnosis);
    setIsDetailModalOpen(true);
  };

  const formatTimeForPhilippines = (timestamp) => {
    try {
      // Create a date object, assuming the timestamp from DB is UTC.
      // Appending 'Z' tells the Date constructor to parse it as UTC.
      const eventTime = new Date(timestamp + 'Z');
      const now = new Date(); // This is in user's local time

      // getTime() returns UTC milliseconds since epoch for both, so the difference is timezone-agnostic.
      const diffInMs = now.getTime() - eventTime.getTime();
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

      if (diffInMinutes < 2) {
        return 'just now';
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes} minutes ago`;
      } else if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
      } else {
        return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
      }
    } catch (error) {
      return 'recently';
    }
  };

  // Helper: compute risk factor contributions similar to FinalizeStep
  const computeBreakdown = (diag) => {
    const ai = diag?.ai_prediction || {};
    const vitals = diag?.vital_signs || {};
    const labs = diag?.lab_results || {};
    const lipid = labs.lipid_profile || {};
    const glucose = labs.glucose || {};
    const med = diag?.medical_history_flags || {};

    const weight = Number(vitals?.weight_kg);
    const height = Number(vitals?.height_cm);
    let bmi = null;
    if (weight > 0 && height > 0) {
      const m = height / 100;
      bmi = weight / (m * m);
    }

    let factors = [
      { key: 'BP', value: (Number(vitals?.systolic_bp) >= 140 || Number(vitals?.diastolic_bp) >= 90) ? 18 : 6 },
      { key: 'LDL', value: Number(lipid.ldl) >= 160 ? 18 : Number(lipid.ldl) >= 130 ? 12 : 5 },
      { key: 'HDL', value: Number(lipid.hdl) > 0 ? (Number(lipid.hdl) < 40 ? 10 : 4) : 6 },
      { key: 'Glucose/DM', value: med.has_diabetes || Number(glucose.hba1c) >= 6.5 ? 16 : 6 },
      { key: 'Smoking', value: (diag?.lifestyle?.lifestyle_smoking_status === 'current') ? 14 : (diag?.lifestyle?.lifestyle_smoking_status === 'former' ? 8 : 4) },
      { key: 'Family Hx', value: med.family_history_heart_disease ? 10 : 5 },
      { key: 'CKD', value: med.chronic_kidney_disease ? 8 : 3 },
      { key: 'BMI', value: bmi && bmi >= 30 ? 12 : bmi && bmi >= 25 ? 8 : 4 }
    ];
    const sum = factors.reduce((a, b) => a + b.value, 0) || 1;
    return factors.map(f => ({ ...f, pct: Math.round((f.value / sum) * 100) }));
  };

  // Model metrics state for Sensitivity/Specificity
  const [modelStats, setModelStats] = useState({ sensitivity: null, specificity: null });
  useEffect(() => {
    (async () => {
      try {
        const models = await MLModel.filter({ is_active: true, model_type: "heart_disease" });
        if (models.length > 0) {
          const m = models[0];
          const sens = m.performance_metrics?.recall ? Number((m.performance_metrics.recall * 100).toFixed(1)) : null;
          const spec = m.performance_metrics?.specificity ? Number((m.performance_metrics.specificity * 100).toFixed(1)) : null;
          setModelStats({ sensitivity: sens, specificity: spec });
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const triageInfo = (riskLevel) => {
    if (riskLevel === 'critical') return { color: 'bg-red-100 text-red-800', text: 'Critical – Immediate referral required', Icon: AlertTriangle };
    if (riskLevel === 'high') return { color: 'bg-orange-100 text-orange-800', text: 'High – Urgent cardiology consult', Icon: AlertTriangle };
    if (riskLevel === 'moderate') return { color: 'bg-yellow-100 text-yellow-800', text: 'Moderate – Specialist consultation recommended', Icon: Activity };
    return { color: 'bg-green-100 text-green-800', text: 'Stable – Routine monitoring & follow-up', Icon: Gauge };
  };

  // Build chart data when a diagnosis is selected
  const radarData = selectedDiagnosis ? computeBreakdown(selectedDiagnosis).map(b => ({ factor: b.key, Contribution: b.pct })) : [];
  const barData = selectedDiagnosis ? computeBreakdown(selectedDiagnosis).map(b => ({ name: b.key, pct: b.pct })) : [];

  const aiChartData = selectedDiagnosis?.ai_prediction ? [
    { name: 'Risk Score', value: selectedDiagnosis.ai_prediction.risk_score || 0, fill: '#f97316' },
    { name: 'Confidence', value: selectedDiagnosis.ai_prediction.confidence || 0, fill: '#3b82f6' }
  ] : [];

  return (
    <>
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Heart className="w-6 h-6 text-red-500" />
            Recent Diagnoses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {diagnoses.length === 0 ?
              <div className="text-center py-8 text-lg">
                <Heart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No diagnoses yet</p>
                <p className="text-gray-400 text-base">Your recent patient diagnoses will appear here</p>
              </div> :

              <div className="max-h-80 overflow-y-auto pr-2 space-y-4">
                {diagnoses.slice(0, 10).map((diagnosis) =>
                  <div key={diagnosis.id} className="p-4 border rounded-lg hover:shadow-md transition-all duration-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(diagnosis.status)}
                        <span className="font-medium text-gray-900 text-base">
                          Patient ID: {diagnosis.patient_id.slice(-8)}...
                        </span>
                      </div>
                      {diagnosis.ai_prediction?.risk_level &&
                        <RiskBadge riskLevel={diagnosis.ai_prediction.risk_level} />
                      }
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base text-gray-600">Symptoms:</span>
                        <span className="text-base text-gray-900">
                          {diagnosis.symptoms?.slice(0, 2).map((s) => s.symptom).join(', ')}
                          {diagnosis.symptoms?.length > 2 && ` +${diagnosis.symptoms.length - 2} more`}
                        </span>
                      </div>

                      {diagnosis.ai_prediction?.confidence &&
                        <div className="flex items-center gap-2">
                          <span className="text-base text-gray-600">AI Confidence:</span>
                          <span className="text-base font-medium text-blue-600">
                            {diagnosis.ai_prediction.confidence}%
                          </span>
                        </div>
                      }

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-sm text-gray-500">
                          {formatTimeForPhilippines(diagnosis.created_date)}
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => handleViewDetails(diagnosis)} className="bg-blue-50 px-3 text-base font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground h-9 rounded-md">
                          <Eye className="w-5 h-5 mr-1" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            }
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Diagnosis Details Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              Diagnosis Details: {selectedDiagnosis && new Date(selectedDiagnosis.created_date).toLocaleString('en-US', { timeZone: 'Asia/Manila', dateStyle: 'full' })}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto pr-4 space-y-6">
            {/* AI Assessment header with triage and gauge */}
            {selectedDiagnosis?.ai_prediction && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Brain className="text-blue-500 w-5 h-5" />
                    AI Clinical Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <RiskBadge riskLevel={selectedDiagnosis.ai_prediction.risk_level} />
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Risk Score:</span>
                      <span className="font-semibold text-gray-900">{selectedDiagnosis.ai_prediction.risk_score ?? 0}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">AI Confidence:</span>
                      <span className="font-semibold text-blue-700">{selectedDiagnosis.ai_prediction.confidence ?? 0}%</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-6">
                    <RiskGauge score={selectedDiagnosis.ai_prediction.risk_score} />
                    <div className="flex-1 min-w-[260px] h-52">
                      <h4 className="font-semibold mb-2">AI Confidence Metrics</h4>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={aiChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis domain={[0, 100]} />
                          <RechartsTooltip formatter={(value) => [`${value}%`, 'Score']} />
                          <Bar dataKey="value" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Triage banner */}
                  {(() => {
                    const t = triageInfo(selectedDiagnosis.ai_prediction.risk_level);
                    const Icon = t.Icon;
                    return (
                      <div className={`mt-2 p-3 rounded-md border ${t.color} flex items-center gap-2`}>
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{t.text}</span>
                      </div>
                    );
                  })()}

                  {/* Risk factor breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="p-3 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <Beaker className="w-4 h-4 text-purple-600" />
                        <h4 className="font-semibold">Risk Factor Breakdown</h4>
                      </div>
                      <div className="w-full h-56">
                        <ResponsiveContainer>
                          <RadarChart data={radarData}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="factor" />
                            <Radar dataKey="Contribution" stroke="#6366f1" fill="#6366f1" fillOpacity={0.35} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-blue-600" />
                        <h4 className="font-semibold">Factor Contributions</h4>
                      </div>
                      <div className="w-full h-56">
                        <ResponsiveContainer>
                          <BarChart data={barData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis domain={[0, 100]} />
                            <RechartsTooltip />
                            <Bar dataKey="pct" fill="#3b82f6" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Confidence, Sensitivity, Specificity */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                    <div className="p-3 bg-blue-50 rounded border border-blue-200 text-blue-900">
                      <p className="text-xs">AI Confidence</p>
                      <p className="text-xl font-bold">{selectedDiagnosis.ai_prediction.confidence ?? 'N/A'}%</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded border border-green-200 text-green-900">
                      <p className="text-xs">Sensitivity (Recall)</p>
                      <p className="text-xl font-bold">{modelStats.sensitivity ?? 'N/A'}%</p>
                    </div>
                    <div className="p-3 bg-indigo-50 rounded border border-indigo-200 text-indigo-900">
                      <p className="text-xs">Specificity</p>
                      <p className="text-xl font-bold">{modelStats.specificity ?? 'N/A'}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedDiagnosis?.symptoms &&
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg"><Stethoscope className="text-green-500 w-5 h-5" />Symptoms & Vitals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Symptoms:</h4>
                      <div className="space-y-2">
                        {selectedDiagnosis.symptoms.map((symptom, i) =>
                          <div key={i} className="p-2 bg-gray-50 rounded text-sm">
                            <div className="font-medium">{symptom.symptom}</div>
                            <div className="text-gray-600">Severity: {symptom.severity} | Duration: {symptom.duration}</div>
                          </div>
                        )}
                      </div>
                    </div>
                    {selectedDiagnosis.vital_signs &&
                      <div>
                        <h4 className="font-semibold mb-2">Vital Signs:</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {Object.entries(selectedDiagnosis.vital_signs).filter(([_, value]) => value).map(([key, value]) =>
                            <div key={key} className="flex justify-between">
                              <span className="capitalize">{key.replace('_', ' ')}:</span>
                              <span className="font-medium">{value}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    }
                  </div>
                </CardContent>
              </Card>
            }

            {selectedDiagnosis?.diagnosis_notes &&
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg"><FileText className="text-purple-500 w-5 h-5" />Doctor's Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Clinical Diagnosis:</h4>
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedDiagnosis.diagnosis_notes}</p>
                    </div>
                    {selectedDiagnosis.treatment_plan &&
                      <div>
                        <h4 className="font-semibold mb-2">Treatment Plan:</h4>
                        <p className="text-gray-700 whitespace-pre-wrap">{selectedDiagnosis.treatment_plan}</p>
                      </div>
                    }
                  </div>
                </CardContent>
              </Card>
            }

            {selectedDiagnosis?.medical_images && selectedDiagnosis.medical_images.length > 0 &&
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg"><Camera className="text-indigo-500 w-5 h-5" />Medical Images</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedDiagnosis.medical_images.map((image, i) =>
                      <div key={i} className="border rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{image.image_type}</Badge>
                        </div>
                        <img src={image.image_url} alt={`Medical ${image.image_type}`} className="w-full h-32 object-cover rounded" />
                        {image.analysis_notes &&
                          <p className="text-sm text-gray-600 mt-2">{image.analysis_notes}</p>
                        }
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            }
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
