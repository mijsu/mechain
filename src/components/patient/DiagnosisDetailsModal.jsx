import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import RiskGauge from "@/components/diagnosis/RiskGauge";
import { MLModel } from "@/api/entities";
import { Brain, Activity, Beaker, AlertTriangle, Gauge, FileText, Stethoscope } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, RadarChart, PolarGrid, PolarAngleAxis, Radar } from "recharts";

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

function computeBreakdown(diag) {
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
}

function triageInfo(level) {
  if (level === 'critical') return { color: 'bg-red-100 text-red-800', text: 'Critical – Immediate referral required', Icon: AlertTriangle };
  if (level === 'high') return { color: 'bg-orange-100 text-orange-800', text: 'High – Urgent cardiology consult', Icon: AlertTriangle };
  if (level === 'moderate') return { color: 'bg-yellow-100 text-yellow-800', text: 'Moderate – Specialist consultation recommended', Icon: Activity };
  return { color: 'bg-green-100 text-green-800', text: 'Stable – Routine monitoring & follow-up', Icon: Gauge };
}

export default function DiagnosisDetailsModal({ open, onOpenChange, diagnosis }) {
  const ai = diagnosis?.ai_prediction;
  const radarData = diagnosis ? computeBreakdown(diagnosis).map(b => ({ factor: b.key, Contribution: b.pct })) : [];
  const barData = diagnosis ? computeBreakdown(diagnosis).map(b => ({ name: b.key, pct: b.pct })) : [];
  const aiChartData = ai ? [
    { name: 'Risk Score', value: ai.risk_score || 0, fill: '#f97316' },
    { name: 'Confidence', value: ai.confidence || 0, fill: '#3b82f6' }
  ] : [];

  const [modelStats, setModelStats] = React.useState({ sensitivity: null, specificity: null });
  React.useEffect(() => {
    (async () => {
      try {
        const models = await MLModel.filter({ is_active: true, model_type: "heart_disease" });
        if (models.length > 0) {
          const m = models[0];
          const sens = m.performance_metrics?.recall ? Number((m.performance_metrics.recall * 100).toFixed(1)) : null;
          const spec = m.performance_metrics?.specificity ? Number((m.performance_metrics.specificity * 100).toFixed(1)) : null;
          setModelStats({ sensitivity: sens, specificity: spec });
        }
      } catch (e) {}
    })();
  }, []);

  const t = triageInfo(ai?.risk_level);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Diagnosis Details
          </DialogTitle>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto pr-4 space-y-6">
          {/* AI Analysis */}
          {ai && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Brain className="w-5 h-5 text-purple-600" />
                  AI Clinical Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <RiskBadge riskLevel={ai.risk_level} />
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Risk Score:</span>
                    <span className="font-semibold text-gray-900">{ai.risk_score ?? 0}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">AI Confidence:</span>
                    <span className="font-semibold text-blue-700">{ai.confidence ?? 0}%</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-6">
                  <RiskGauge score={ai.risk_score} />
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

                <div className={`mt-2 p-3 rounded-md border ${t.color} flex items-center gap-2`}>
                  <t.Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{t.text}</span>
                </div>

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
                    <p className="text-xl font-bold">{ai.confidence ?? 'N/A'}%</p>
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

                {/* Predicted conditions and recommendations */}
                {ai.predicted_conditions?.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Predicted Conditions</h4>
                    <div className="space-y-1">
                      {ai.predicted_conditions.map((c, i) => (
                        <div key={i} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                          <span>{typeof c === 'string' ? c : c.condition}</span>
                          <Badge variant="outline" className="text-xs capitalize">{typeof c === 'object' ? c.severity : ''}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {ai.recommendations && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    <div className="p-3 rounded border">
                      <h4 className="font-semibold mb-2">Lifestyle Advice</h4>
                      <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                        {(ai.recommendations.lifestyle || []).map((x, i) => <li key={i}>{x}</li>)}
                      </ul>
                    </div>
                    <div className="p-3 rounded border">
                      <h4 className="font-semibold mb-2">Next Clinical Steps</h4>
                      <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                        {(ai.recommendations.referrals || []).map((x, i) => <li key={i}>{x}</li>)}
                        {ai.recommendations.follow_up && <li>{ai.recommendations.follow_up}</li>}
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Symptoms & Vitals */}
          {(diagnosis?.symptoms?.length || diagnosis?.vital_signs) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Stethoscope className="w-5 h-5 text-green-600" />
                  Symptoms & Vitals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Symptoms:</h4>
                    <div className="space-y-2">
                      {(diagnosis.symptoms || []).map((s, i) => (
                        <div key={i} className="p-2 bg-gray-50 rounded text-sm">
                          <div className="font-medium">{s.symptom}</div>
                          <div className="text-gray-600">Severity: {s.severity} | Duration: {s.duration}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {diagnosis.vital_signs && (
                    <div>
                      <h4 className="font-semibold mb-2">Vital Signs:</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(diagnosis.vital_signs).filter(([, v]) => v !== null && v !== undefined && v !== "").map(([k, v]) => (
                          <div key={k} className="flex justify-between"><span className="capitalize">{k.replace(/_/g,' ')}</span><span className="font-medium">{v}</span></div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Doctor's notes / Treatment */}
          {(diagnosis?.diagnosis_notes || diagnosis?.treatment_plan) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Doctor’s Notes & Plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {diagnosis?.diagnosis_notes && (
                  <div>
                    <h4 className="font-semibold mb-1">Clinical Diagnosis:</h4>
                    <p className="text-gray-700 whitespace-pre-wrap text-sm">{diagnosis.diagnosis_notes}</p>
                  </div>
                )}
                {diagnosis?.treatment_plan && (
                  <div>
                    <h4 className="font-semibold mb-1">Treatment Plan:</h4>
                    <p className="text-gray-700 whitespace-pre-wrap text-sm">{diagnosis.treatment_plan}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}