
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Patient } from "@/api/entities";
import { Diagnosis } from "@/api/entities";
import { User } from "@/api/entities";
import { TrainingExample } from "@/api/entities";
import { Notification } from "@/api/entities";
import { MLModel } from "@/api/entities"; // New import
import { getAIAnalysis } from "@/components/utils/inference";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Heart, UserPlus, Stethoscope, Brain, FileText, Check, Plus, Trash2, Loader2, ArrowLeft, AlertTriangle, ShieldCheck, Pill, BookOpen, Activity, Thermometer, HeartPulse, Wind, Gauge, Ruler, Users, ClipboardList, FlaskConical, Download, Beaker, Users as UsersIcon } from "lucide-react"; // Consolidated and new icons
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid } from "recharts"; // New import
import { createPageUrl } from "@/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import RiskGauge from "@/components/diagnosis/RiskGauge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LabUpload from "@/components/diagnosis/LabUpload";
import { generatePatientSummaryPdf } from "@/api/functions"; // New import

// Add this helper right after imports
function normalizePatientHistory(p = {}) {
  const arr = (p.medical_history || []).map((s) => String(s || '').toLowerCase());
  const summary = String(p.medical_history_summary || '').toLowerCase();

  const hasAny = (...keywords) => {
    return keywords.some((kw) => {
      const k = kw.toLowerCase();
      return arr.some((a) => a.includes(k)) || summary.includes(k);
    });
  };

  const norm = {
    family_history_heart_disease:
      p.family_history_heart_disease ??
      hasAny('family history of heart disease', 'family history of cvd', 'family history of cad', 'family history', 'father heart', 'mother heart', 'sibling heart', 'coronary'),
    has_hypertension:
      p.has_hypertension ?? hasAny('hypertension', 'htn', 'high blood pressure'),
    has_diabetes:
      p.has_diabetes ?? hasAny('diabetes', 'dm', 'type 2 diabetes', 'type ii diabetes', 'type 1 diabetes'),
    has_dyslipidemia:
      p.has_dyslipidemia ?? hasAny('dyslipidemia', 'hyperlipidemia', 'high cholesterol', 'hypercholesterolemia', 'hypertriglyceridemia'),
    chronic_kidney_disease:
      p.chronic_kidney_disease ?? hasAny('chronic kidney disease', 'ckd', 'kidney disease', 'renal failure')
  };

  // Previous CVD events
  let events = Array.isArray(p.previous_cardiovascular_events) ? p.previous_cardiovascular_events : [];
  if (events.length === 0) {
    const candidates = [
      { key: 'MI', kws: ['mi', 'myocardial infarction', 'heart attack'] },
      { key: 'Stroke', kws: ['stroke', 'cva', 'cerebrovascular accident'] },
      { key: 'Arrhythmia', kws: ['arrhythmia', 'afib', 'atrial fibrillation'] },
      { key: 'TIA', kws: ['tia', 'transient ischemic attack'] },
      { key: 'Angina', kws: ['angina'] },
      { key: 'CHF', kws: ['chf', 'congestive heart failure'] },
      { key: 'CAD', kws: ['cad', 'coronary artery disease'] },
      { key: 'PCI', kws: ['pci', 'percutaneous coronary intervention', 'stent'] },
      { key: 'CABG', kws: ['cabg', 'coronary artery bypass graft'] }
    ];
    events = candidates
      .filter(({ kws }) => hasAny(...kws))
      .map(({ key }) => key);
  }

  return { ...norm, previous_cardiovascular_events: events };
}

const aiPredictionSchema = {
  type: "object",
  properties: {
    risk_level: { type: "string", enum: ["low", "moderate", "high", "critical"] },
    risk_score: { type: "number", description: "A precise numeric risk score from 0 to 100." },
    confidence: { type: "number", description: "Confidence score for the overall assessment, from 0 to 100." },
    predicted_conditions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          condition: { type: "string" },
          severity: { type: "string", enum: ["low", "moderate", "high"] }
        },
        required: ["condition", "severity"]
      }
    },
    recommendations: {
      type: "object",
      properties: {
        lifestyle: { type: "array", items: { type: "string" } },
        medications: { type: "array", items: { type: "string" } },
        follow_up: { type: "string" },
        referrals: { type: "array", items: { type: "string" } }
      }
    },
    urgent_warning_signs: { type: "array", items: { type: "string" } },
    guideline_references: { type: "array", items: { type: "string" } },
    decision_support_flags: { type: "array", items: { type: "string" } }
  },
  required: ["risk_level", "risk_score", "confidence", "predicted_conditions", "recommendations"],
};

// --- Step 1: Patient Selection ---
const PatientStep = React.memo(({ patients, diagnosisData, setDiagnosisData, onNewPatient }) => (
  <>
    <CardHeader>
      <CardTitle className="flex items-center gap-3">
        <Heart className="w-6 h-6 text-blue-600" />
        Select Patient
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="patient-select">Choose an existing patient</Label>
        <Select 
          value={diagnosisData.patient_id} 
          onValueChange={(value) => setDiagnosisData(prev => ({ ...prev, patient_id: value }))}
        >
          <SelectTrigger id="patient-select">
            <SelectValue placeholder="Select a patient..." />
          </SelectTrigger>
          <SelectContent>
            {patients.map(patient => (
              <SelectItem key={patient.id} value={patient.id}>
                {patient.full_name} (ID: {patient.patient_id})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-muted-foreground">Or</span>
        </div>
      </div>
      <Button variant="outline" className="w-full" onClick={onNewPatient}>
        <UserPlus className="w-4 h-4 mr-2" />
        Register New Patient
      </Button>
    </CardContent>
  </>
));

// --- Step 2: Clinical Data & Risk Factors ---
const SymptomsStep = React.memo(({ diagnosisData, setDiagnosisData, selectedPatient, onRefreshPatient }) => {
  const handleSymptomChange = useCallback((index, field, value) => {
    setDiagnosisData(prev => {
      const newSymptoms = JSON.parse(JSON.stringify(prev.symptoms));
      newSymptoms[index][field] = value;
      return { ...prev, symptoms: newSymptoms };
    });
  }, [setDiagnosisData]);

  const addSymptom = useCallback(() => {
    setDiagnosisData(prev => ({
      ...prev,
      symptoms: [...(prev.symptoms || []), { id: Date.now(), symptom: "", severity: "mild", duration: "", associated_factors: [] }]
    }));
  }, [setDiagnosisData]);

  const removeSymptom = useCallback((index) => {
    setDiagnosisData(prev => ({
      ...prev,
      symptoms: prev.symptoms.filter((_, i) => i !== index)
    }));
  }, [setDiagnosisData]);

  const handleFactorChange = useCallback((symptomIndex, factor, checked) => {
    setDiagnosisData(prev => {
      const newSymptoms = JSON.parse(JSON.stringify(prev.symptoms));
      const currentFactors = newSymptoms[symptomIndex].associated_factors || [];
      if (checked) {
        newSymptoms[symptomIndex].associated_factors = [...currentFactors, factor];
      } else {
        newSymptoms[symptomIndex].associated_factors = currentFactors.filter(f => f !== factor);
      }
      return { ...prev, symptoms: newSymptoms };
    });
  }, [setDiagnosisData]);
  
  const handleVitalChange = useCallback((field, value) => {
    setDiagnosisData(prev => ({
      ...prev,
      vital_signs: { ...prev.vital_signs, [field]: value }
    }));
  }, [setDiagnosisData]);
  
  const handleClinicalNotesChange = useCallback((value) => {
    setDiagnosisData(prev => ({
      ...prev,
      clinical_observations: value
    }));
  }, [setDiagnosisData]);

  const [showLifestyle, setShowLifestyle] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showLabs, setShowLabs] = useState(false);

  // Trigger a fresh DB fetch of the patient's record whenever Medical History is expanded
  React.useEffect(() => {
    if (showHistory && diagnosisData.patient_id && onRefreshPatient) {
      onRefreshPatient();
    }
  }, [showHistory, diagnosisData.patient_id, onRefreshPatient]);

  const record = React.useMemo(() => selectedPatient?._normalizedHistory || null, [selectedPatient]);

  const handleLifestyleChange = useCallback((field, value) => {
    setDiagnosisData(prev => ({
      ...prev,
      lifestyle: { ...(prev.lifestyle || {}), [field]: value }
    }));
  }, [setDiagnosisData]);

  const handleHistoryChange = useCallback((field, value) => {
    setDiagnosisData(prev => ({
      ...prev,
      medical_history_flags: { ...(prev.medical_history_flags || {}), [field]: value }
    }));
  }, [setDiagnosisData]);

  const handleLabChange = useCallback((path, value) => {
    setDiagnosisData(prev => {
      const labs = { ...(prev.lab_results || {}) };
      
      // Ensure nested objects exist for lipid_profile and glucose
      if (path.startsWith("lipid_profile.") && !labs.lipid_profile) labs.lipid_profile = {};
      if (path.startsWith("glucose.") && !labs.glucose) labs.glucose = {};

      const newLabs = JSON.parse(JSON.stringify(labs));
      const [group, key] = path.split(".");

      if (key) { // Nested property like "lipid_profile.ldl"
        if (!newLabs[group]) newLabs[group] = {};
        newLabs[group][key] = value === "" ? "" : Number(value);
      } else { // Direct property like "creatinine"
        newLabs[group] = value === "" ? "" : Number(value);
      }
      return { ...prev, lab_results: newLabs };
    });
  }, [setDiagnosisData]);

  const handleMeasureChange = useCallback((field, value) => {
    setDiagnosisData(prev => ({
      ...prev,
      additional_measurements: { ...(prev.additional_measurements || {}), [field]: value === "" ? "" : Number(value) }
    }));
  }, [setDiagnosisData]);

  const calculatedBMI = useMemo(() => {
    const weight = parseFloat(diagnosisData.vital_signs?.weight_kg);
    const height = parseFloat(diagnosisData.vital_signs?.height_cm);
    if (weight > 0 && height > 0) {
      const heightInMeters = height / 100;
      return (weight / (heightInMeters * heightInMeters)).toFixed(2);
    }
    return null;
  }, [diagnosisData.vital_signs?.weight_kg, diagnosisData.vital_signs?.height_cm]);

  const associatedFactorsOptions = ["Exertion", "Rest", "Stress", "After Meals"];
  
  return (
    <>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Stethoscope className="w-6 h-6 text-blue-600" />
          Record Symptoms, Vitals & Observations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Patient & Demographics quick view */}
        <Card className="p-5 border-0 shadow bg-gradient-to-br from-white to-gray-50">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold">Patient & Demographics</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-base text-gray-700">
            <div><span className="text-gray-500">Name:</span> {selectedPatient?.full_name || '—'}</div>
            <div><span className="text-gray-500">Age:</span> {selectedPatient?.age ?? '—'}</div>
            <div className="capitalize"><span className="text-gray-500">Sex:</span> {selectedPatient?.gender || '—'}</div>
            <div><span className="text-gray-500">ID:</span> {selectedPatient?.patient_id || '—'}</div>
          </div>
        </Card>

        {/* Patient Symptoms Card */}
        <Card className="p-6 border-0 shadow-md bg-gray-50/50">
          <CardTitle className="text-lg mb-4">Patient Symptoms</CardTitle>
          <div className="space-y-4">
            {(diagnosisData.symptoms || []).map((symptom, index) => (
              <div key={symptom.id || index} className="p-4 border rounded-lg bg-white space-y-4">
                <div className="flex gap-4 items-start">
                  <Input 
                    placeholder="Describe symptom (e.g., Chest pain)" 
                    value={symptom.symptom} 
                    onChange={(e) => handleSymptomChange(index, 'symptom', e.target.value)}
                    className="flex-1"
                  />
                  <Select 
                    value={symptom.severity} 
                    onValueChange={(value) => handleSymptomChange(index, 'severity', value)}
                  >
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mild">Mild</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="severe">Severe</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input 
                    placeholder="Duration" 
                    value={symptom.duration} 
                    onChange={(e) => handleSymptomChange(index, 'duration', e.target.value)}
                    className="w-40"
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeSymptom(index)}
                    disabled={diagnosisData.symptoms.length === 1}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
                <div>
                  <Label className="text-sm font-medium">Associated Factors</Label>
                  <div className="flex gap-4 pt-2">
                    {associatedFactorsOptions.map(factor => (
                      <div key={factor} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`factor-${index}-${factor}`} 
                          checked={(symptom.associated_factors || []).includes(factor)}
                          onCheckedChange={(checked) => handleFactorChange(index, factor, checked)}
                        />
                        <Label htmlFor={`factor-${index}-${factor}`} className="text-sm font-normal">{factor}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={addSymptom} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Another Symptom
            </Button>
          </div>
        </Card>

        {/* Vital Signs Card */}
        <Card className="p-6 border-0 shadow-md bg-gray-50/50">
          <CardTitle className="text-lg mb-4">Vital Signs</CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <VitalInput icon={HeartPulse} label="Systolic BP (mmHg)" id="systolic_bp" value={diagnosisData.vital_signs.systolic_bp} onChange={(e) => handleVitalChange('systolic_bp', e.target.value)} placeholder="e.g., 120" helpText="Normal: 90-120" />
            <VitalInput icon={HeartPulse} label="Diastolic BP (mmHg)" id="diastolic_bp" value={diagnosisData.vital_signs.diastolic_bp} onChange={(e) => handleVitalChange('diastolic_bp', e.target.value)} placeholder="e.g., 80" helpText="Normal: 60-80" />
            <VitalInput icon={Heart} label="Heart Rate (bpm)" id="hr" value={diagnosisData.vital_signs.heart_rate} onChange={(e) => handleVitalChange('heart_rate', e.target.value)} placeholder="e.g., 72" helpText="Normal: 60-100" />
            <VitalInput icon={Thermometer} label="Temperature (°C)" id="temp" value={diagnosisData.vital_signs.temperature} onChange={(e) => handleVitalChange('temperature', e.target.value)} placeholder="e.g., 37.0" helpText="Normal: 36.1-37.2" />
            <VitalInput icon={Gauge} label="Oxygen Saturation (%)" id="oxygen" value={diagnosisData.vital_signs.oxygen_saturation} onChange={(e) => handleVitalChange('oxygen_saturation', e.target.value)} placeholder="e.g., 98" helpText="Normal: 95-100" />
            <VitalInput icon={Wind} label="Respiratory Rate (breaths/min)" id="resp_rate" value={diagnosisData.vital_signs.respiratory_rate} onChange={(e) => handleVitalChange('respiratory_rate', e.target.value)} placeholder="e.g., 16" helpText="Normal: 12-20" />
            <VitalInput icon={Ruler} label="Weight (kg)" id="weight" value={diagnosisData.vital_signs.weight_kg} onChange={(e) => handleVitalChange('weight_kg', e.target.value)} placeholder="e.g., 70" />
            <VitalInput icon={Ruler} label="Height (cm)" id="height" value={diagnosisData.vital_signs.height_cm} onChange={(e) => handleVitalChange('height_cm', e.target.value)} placeholder="e.g., 175" />
            <div>
              <Label>BMI</Label>
              <Input value={calculatedBMI || 'N/A'} readOnly className="mt-2 bg-gray-100" />
              <p className="text-xs text-gray-500 mt-1">Auto-calculated</p>
            </div>
          </div>
        </Card>

        {/* Risk Factors & Lifestyle (Collapsible) */}
        <Card className="p-5 border-0 shadow bg-gradient-to-br from-white to-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-600" />
              <h3 className="text-lg font-semibold">Risk Factors & Lifestyle</h3>
            </div>
            <Button variant="ghost" onClick={() => setShowLifestyle(s => !s)}>{showLifestyle ? 'Hide' : 'Show'}</Button>
          </div>
          {showLifestyle && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <div>
                <Label>Smoking Status</Label>
                <Select
                  value={diagnosisData.lifestyle?.lifestyle_smoking_status || ""}
                  onValueChange={(v) => handleLifestyleChange("lifestyle_smoking_status", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never</SelectItem>
                    <SelectItem value="former">Former</SelectItem>
                    <SelectItem value="current">Current</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Alcohol Consumption</Label>
                <Select
                  value={diagnosisData.lifestyle?.alcohol_consumption || ""}
                  onValueChange={(v) => handleLifestyleChange("alcohol_consumption", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="heavy">Heavy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Physical Activity</Label>
                <Select
                  value={diagnosisData.lifestyle?.physical_activity_level || ""}
                  onValueChange={(v) => handleLifestyleChange("physical_activity_level", v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Diet Habits</Label>
                <Input
                  placeholder="e.g., Mediterranean, high-salt..."
                  value={diagnosisData.lifestyle?.diet_habits || ""}
                  onChange={(e) => handleLifestyleChange("diet_habits", e.target.value)}
                />
              </div>
            </div>
          )}
        </Card>

        {/* Medical History (Collapsible) */}
        <Card className="p-5 border-0 shadow bg-gradient-to-br from-white to-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Medical History</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onRefreshPatient} disabled={!diagnosisData.patient_id}>
                Refresh from record
              </Button>
              <Button variant="ghost" onClick={() => setShowHistory(s => !s)}>{showHistory ? 'Hide' : 'Show'}</Button>
            </div>
          </div>
          {showHistory && (
            <>
              <p className="text-sm text-gray-500 mt-2">
                Optional: values are auto-loaded live from the patient’s record. Update only if there are changes.
              </p>
              {/* Retrieved medical record snapshot (normalized live view) */}
              <div className="mt-3 p-3 rounded-md border bg-white">
                <p className="text-sm font-medium text-gray-700 mb-2">From patient record</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                  <div>Family history of heart disease: <span className="font-medium">{record?.family_history_heart_disease ? 'Yes' : 'No'}</span></div>
                  <div>Hypertension: <span className="font-medium">{record?.has_hypertension ? 'Yes' : 'No'}</span></div>
                  <div>Diabetes: <span className="font-medium">{record?.has_diabetes ? 'Yes' : 'No'}</span></div>
                  <div>Dyslipidemia: <span className="font-medium">{record?.has_dyslipidemia ? 'Yes' : 'No'}</span></div>
                  <div>Chronic kidney disease: <span className="font-medium">{record?.chronic_kidney_disease ? 'Yes' : 'No'}</span></div>
                  <div className="md:col-span-3">
                    Previous cardiovascular events:{" "}
                    <span className="font-medium">
                      {(selectedPatient?.previous_cardiovascular_events && selectedPatient.previous_cardiovascular_events.length > 0
                        ? selectedPatient.previous_cardiovascular_events
                        : (record?.previous_cardiovascular_events || [])
                      ).join(", ") || 'None recorded'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Editable toggles (optional) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                {[
                  ["family_history_heart_disease", "Family history of heart disease"],
                  ["has_hypertension", "Hypertension"],
                  ["has_diabetes", "Diabetes"],
                  ["has_dyslipidemia", "Dyslipidemia"],
                  ["chronic_kidney_disease", "Chronic kidney disease"]
                ].map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2">
                    <Checkbox
                      id={`mh-${key}`}
                      checked={Boolean(diagnosisData.medical_history_flags?.[key])}
                      onCheckedChange={(v) => handleHistoryChange(key, Boolean(v))}
                    />
                    <Label htmlFor={`mh-${key}`}>{label}</Label>
                  </div>
                ))}
                <div className="md:col-span-3">
                  <Label>Previous cardiovascular events</Label>
                  <Input
                    placeholder="e.g., MI (2019), stroke (2021), arrhythmia"
                    value={(diagnosisData.medical_history_flags?.previous_cardiovascular_events || []).join(", ")}
                    onChange={(e) =>
                      handleHistoryChange(
                        "previous_cardiovascular_events",
                        e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                      )
                    }
                  />
                </div>
              </div>
            </>
          )}
        </Card>

        {/* Labs & Additional Measurements (Collapsible) */}
        <Card className="p-5 border-0 shadow bg-gradient-to-br from-white to-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold">Lab Results & Additional Measurements</h3>
            </div>
            <Button variant="ghost" onClick={() => setShowLabs(s => !s)}>{showLabs ? 'Hide' : 'Show'}</Button>
          </div>
          {showLabs && (
            <Tabs defaultValue="manual" className="mt-4">
              <TabsList className="grid grid-cols-2 w-full md:w-auto">
                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                <TabsTrigger value="upload">Upload</TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>LDL (mg/dL)</Label>
                    <Input type="number" placeholder="e.g., 130" value={diagnosisData.lab_results?.lipid_profile?.ldl || ""} onChange={(e) => handleLabChange("lipid_profile.ldl", e.target.value)} />
                  </div>
                  <div>
                    <Label>HDL (mg/dL)</Label>
                    <Input type="number" placeholder="e.g., 50" value={diagnosisData.lab_results?.lipid_profile?.hdl || ""} onChange={(e) => handleLabChange("lipid_profile.hdl", e.target.value)} />
                  </div>
                  <div>
                    <Label>Total Cholesterol (mg/dL)</Label>
                    <Input type="number" placeholder="e.g., 200" value={diagnosisData.lab_results?.lipid_profile?.total_cholesterol || ""} onChange={(e) => handleLabChange("lipid_profile.total_cholesterol", e.target.value)} />
                  </div>
                  <div>
                    <Label>Triglycerides (mg/dL)</Label>
                    <Input type="number" placeholder="e.g., 150" value={diagnosisData.lab_results?.lipid_profile?.triglycerides || ""} onChange={(e) => handleLabChange("lipid_profile.triglycerides", e.target.value)} />
                  </div>
                  <div>
                    <Label>Fasting Glucose (mg/dL)</Label>
                    <Input type="number" placeholder="e.g., 95" value={diagnosisData.lab_results?.glucose?.fasting_glucose || ""} onChange={(e) => handleLabChange("glucose.fasting_glucose", e.target.value)} />
                  </div>
                  <div>
                    <Label>HbA1c (%)</Label>
                    <Input type="number" placeholder="e.g., 5.6" value={diagnosisData.lab_results?.glucose?.hba1c || ""} onChange={(e) => handleLabChange("glucose.hba1c", e.target.value)} />
                  </div>
                  <div>
                    <Label>Creatinine (mg/dL)</Label>
                    <Input type="number" placeholder="e.g., 1.0" value={diagnosisData.lab_results?.creatinine || ""} onChange={(e) => handleLabChange("creatinine", e.target.value)} />
                  </div>
                  <div>
                    <Label>C-Reactive Protein (CRP) (mg/L)</Label>
                    <Input type="number" placeholder="e.g., 3.0" value={diagnosisData.lab_results?.crp || ""} onChange={(e) => handleLabChange("crp", e.target.value)} />
                  </div>
                  <div>
                    <Label>Waist Circumference (cm)</Label>
                    <Input type="number" placeholder="e.g., 88" value={diagnosisData.additional_measurements?.waist_circumference || ""} onChange={(e) => handleMeasureChange("waist_circumference", e.target.value)} />
                  </div>
                  <div className="md:col-span-3">
                    <Label>ECG Readings</Label>
                    <Textarea rows={3} placeholder="e.g., Normal sinus rhythm, occasional PVCs" value={diagnosisData.additional_measurements?.ecg_readings || ""} onChange={(e) => setDiagnosisData(prev => ({ ...prev, additional_measurements: { ...(prev.additional_measurements || {}), ecg_readings: e.target.value } }))} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="upload" className="mt-4">
                <LabUpload
                  onApply={(labs) => {
                    setDiagnosisData(prev => ({
                      ...prev,
                      lab_results: {
                        ...(prev.lab_results || {}),
                        ...(labs.lipid_profile ? { lipid_profile: { ...(prev.lab_results?.lipid_profile || {}), ...labs.lipid_profile } } : {}),
                        ...(labs.glucose ? { glucose: { ...(prev.lab_results?.glucose || {}), ...labs.glucose } } : {}),
                        ...(labs.creatinine !== undefined ? { creatinine: labs.creatinine } : {}),
                        ...(labs.crp !== undefined ? { crp: labs.crp } : {})
                      }
                    }));
                  }}
                />
              </TabsContent>
            </Tabs>
          )}
        </Card>

        {/* Clinical Observations Card */}
        <Card className="p-6 border-0 shadow-md bg-gray-50/50">
          <CardTitle className="text-lg mb-4">Clinical Observations</CardTitle>
          <Textarea 
            placeholder="Enter any initial clinical observations, notes, or context here..." 
            rows={4}
            value={diagnosisData.clinical_observations || ''}
            onChange={(e) => handleClinicalNotesChange(e.target.value)}
          />
        </Card>
      </CardContent>
    </>
  );
});

const VitalInput = ({ icon: Icon, label, id, value, onChange, placeholder, helpText }) => (
  <div className="space-y-2">
    <Label htmlFor={id} className="flex items-center gap-2 text-sm font-medium">
      <Icon className="w-4 h-4 text-gray-600" />
      {label}
    </Label>
    <Input 
      id={id} 
      type="number"
      value={value || ''} 
      onChange={onChange} 
      placeholder={placeholder}
    />
    {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
  </div>
);

// --- Step 3: Review & Finalize ---
const FinalizeStep = React.memo(({ diagnosisData, setDiagnosisData }) => {
  const { ai_prediction: ai, vital_signs: vitals } = diagnosisData;

  const [modelStats, setModelStats] = React.useState({ sensitivity: null, specificity: null });
  const [whatIf, setWhatIf] = React.useState(null);

  // Fetch active model metrics once
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
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const getRiskClasses = (riskLevel) => {
    switch (riskLevel) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-red-500 text-white';
      case 'moderate': return 'bg-yellow-400 text-black';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  // Compute risk factor breakdown (heuristic)
  const breakdown = React.useMemo(() => {
    const labs = diagnosisData.lab_results || {};
    const lipid = labs.lipid_profile || {};
    const glucose = labs.glucose || {};
    const medFlags = diagnosisData.medical_history_flags || {};
    const lifestyle = diagnosisData.lifestyle || {};
    const bmi = (() => {
      const w = Number(vitals?.weight_kg);
      const h = Number(vitals?.height_cm);
      if (w > 0 && h > 0) {
        const m = h / 100;
        return w / (m * m);
      }
      return null;
    })();

    let factors = [
      { key: 'BP', value: (Number(vitals?.systolic_bp) >= 140 || Number(vitals?.diastolic_bp) >= 90) ? 18 : 6 },
      { key: 'LDL', value: Number(lipid.ldl) >= 160 ? 18 : Number(lipid.ldl) >= 130 ? 12 : 5 },
      { key: 'HDL', value: Number(lipid.hdl) > 0 ? (Number(lipid.hdl) < 40 ? 10 : 4) : 6 },
      { key: 'Glucose/DM', value: medFlags.has_diabetes || Number(glucose.hba1c) >= 6.5 ? 16 : 6 },
      { key: 'Smoking', value: lifestyle.lifestyle_smoking_status === 'current' ? 14 : lifestyle.lifestyle_smoking_status === 'former' ? 8 : 4 },
      { key: 'Family Hx', value: medFlags.family_history_heart_disease ? 10 : 5 },
      { key: 'CKD', value: medFlags.chronic_kidney_disease ? 8 : 3 },
      { key: 'BMI', value: bmi && bmi >= 30 ? 12 : bmi && bmi >= 25 ? 8 : 4 }
    ];

    const sum = factors.reduce((a, b) => a + b.value, 0);
    return factors.map(f => ({ ...f, pct: Math.round((f.value / sum) * 100) }));
  }, [diagnosisData, vitals]);

  const radarData = breakdown.map(b => ({ factor: b.key, Contribution: b.pct }));
  const barData = breakdown.map(b => ({ name: b.key, pct: b.pct }));

  // Projections & What-if
  const baseline = Number(ai?.risk_score || 0);
  const projection = React.useMemo(() => {
    // simple projection curve
    const fiveYear = Math.max(0, Math.min(100, Math.round(baseline * 0.9)));
    const tenYear = Math.max(0, Math.min(100, Math.round(baseline * 1.1)));
    return { fiveYear, tenYear };
  }, [baseline]);

  const simulate = (type) => {
    if (type === 'ldl20') {
      const reduced = Math.max(0, baseline - 8);
      setWhatIf({ label: "LDL reduced by 20%", from: baseline, to: reduced });
    } else if (type === 'smokingStop') {
      const reduced = Math.max(0, baseline - 10);
      setWhatIf({ label: "Smoking stopped", from: baseline, to: reduced });
    } else if (type === 'bpControl') {
      const reduced = Math.max(0, baseline - 6);
      setWhatIf({ label: "BP controlled to <130/80", from: baseline, to: reduced });
    }
  };

  const triage = React.useMemo(() => {
    const level = ai?.risk_level || 'low';
    if (level === 'critical') return { color: 'bg-red-100 text-red-800', icon: AlertTriangle, text: 'Critical – Immediate referral required' };
    if (level === 'high') return { color: 'bg-orange-100 text-orange-800', icon: AlertTriangle, text: 'High – Urgent cardiology consult' };
    if (level === 'moderate') return { color: 'bg-yellow-100 text-yellow-800', icon: Activity, text: 'Moderate – Specialist consultation recommended' };
    return { color: 'bg-green-100 text-green-800', icon: Gauge, text: 'Stable – Routine monitoring & follow-up' };
  }, [ai?.risk_level]);

  const [feedbackMatch, setFeedbackMatch] = React.useState(null);
  const [feedbackNote, setFeedbackNote] = React.useState("");

  const handleFeedback = (match) => {
    setFeedbackMatch(match);
    setDiagnosisData(prev => ({ ...prev, ai_feedback_match: match }));
  };

  const handleNote = (e) => {
    const val = e.target.value;
    setFeedbackNote(val);
    setDiagnosisData(prev => ({ ...prev, ai_feedback_note: val }));
  };

  if (!ai) {
    return (
      <div className="p-8 text-center">
        <p>AI analysis has not been run yet.</p>
      </div>
    );
  }

  return (
    <>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-blue-600" />
          Review & Finalize Diagnosis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Top-level AI Assessment */}
        <Card className="p-6 border-0 shadow-md bg-gray-50/50">
          <CardTitle className="text-lg mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-700" />
            AI Clinical Assessment
          </CardTitle>
          {/* Keep only Risk Level + AI Confidence tiles; Risk Score is shown via gauge below */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center">
            <div className={`p-4 rounded-lg ${getRiskClasses(ai.risk_level)}`}>
              <p className="text-sm font-medium opacity-80">Risk Level</p>
              <p className="text-3xl font-bold">{ai.risk_level}</p>
            </div>
            <div className="p-4 rounded-lg bg-purple-100">
              <p className="text-sm font-medium text-purple-800">AI Confidence</p>
              <p className="text-3xl font-bold text-purple-900">{ai.confidence}%</p>
            </div>
          </div>
          {/* Visual gauge for risk score */}
          <div className="mt-6 flex justify-center">
            <RiskGauge score={ai.risk_score} />
          </div>
        </Card>

        {/* New: Triage Indicator */}
        <div className={`mt-4 p-4 rounded-lg border ${triage.color} flex items-center gap-2`}>
          <triage.icon className="w-5 h-5" />
          <span className="font-medium">{triage.text}</span>
        </div>

        {/* Urgent Warnings */}
        <RecommendationSection 
          icon={AlertTriangle}
          title="Urgent Warning Signs"
          items={ai.urgent_warning_signs}
          itemClassName="text-red-700 font-medium"
        />

        {/* New: Risk Factor Breakdown (Explainability) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="p-4 rounded-lg bg-white border shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Beaker className="w-5 h-5 text-purple-600" />
              <h4 className="font-semibold">Risk Factor Breakdown</h4>
            </div>
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="factor" />
                  <Radar dataKey="Contribution" stroke="#6366f1" fill="#6366f1" fillOpacity={0.35} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-white border shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold">Factor Contributions</h4>
            </div>
            <div style={{ width: '100%', height: 260 }}>
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

        {/* New: AI Confidence & Sensitivity/Specificity */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-blue-900">
            <p className="text-sm">AI Confidence</p>
            <p className="text-2xl font-bold">{ai.confidence ?? 'N/A'}%</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg border border-green-200 text-green-900">
            <p className="text-sm">Sensitivity (Recall)</p>
            <p className="text-2xl font-bold">{modelStats.sensitivity ?? 'N/A'}%</p>
          </div>
          <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200 text-indigo-900">
            <p className="text-sm">Specificity</p>
            <p className="text-2xl font-bold">{modelStats.specificity ?? 'N/A'}%</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 -mt-2">
          Note: N/A means the active model doesn’t have these metrics configured in ML Models. Add recall/specificity there to populate these.
        </p>

        {/* New: Projections & What-if */}
        <div className="mt-6 p-4 rounded-lg bg-gray-50 border">
          <h4 className="font-semibold mb-3">Personalized Risk Projection</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-white rounded-md border">
              <p className="text-sm text-gray-600">Baseline (current)</p>
              <p className="text-2xl font-bold text-gray-900">{baseline}%</p>
            </div>
            <div className="p-3 bg-white rounded-md border">
              <p className="text-sm text-gray-600">5-year Estimate</p>
              <p className="text-2xl font-bold text-gray-900">{projection.fiveYear}%</p>
            </div>
            <div className="p-3 bg-white rounded-md border">
              <p className="text-sm text-gray-600">10-year Estimate</p>
              <p className="text-2xl font-bold text-gray-900">{projection.tenYear}%</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <Button variant="outline" onClick={() => simulate('ldl20')}>What-if: Reduce LDL by 20%</Button>
            <Button variant="outline" onClick={() => simulate('smokingStop')}>What-if: Stop Smoking</Button>
            <Button variant="outline" onClick={() => simulate('bpControl')}>What-if: Control BP</Button>
          </div>
          {whatIf && (
            <div className="mt-3 p-3 bg-white border rounded-md">
              <p className="text-sm text-gray-700">
                {whatIf.label}: Risk changes from <span className="font-semibold">{whatIf.from}%</span> to <span className="font-semibold">{whatIf.to}%</span>
              </p>
            </div>
          )}
        </div>

        {/* New: Decision support enhancements */}
        <div className="mt-6 p-4 rounded-lg bg-white border">
          <h4 className="font-semibold mb-2">Decision Support Checks</h4>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
            <li>Drug interaction check: review suggested medications for interactions with current meds.</li>
            <li>Contraindication alert: statin use requires caution in active liver disease; assess LFTs before initiating.</li>
            <li>Link recommendations to hospital programs (e.g., cardiac rehab, smoking cessation).</li>
          </ul>
        </div>

        {/* Accordion for details */}
        <Accordion type="multiple" className="w-full" defaultValue={['conditions', 'recommendations']}>
          {/* Predicted Conditions */}
          <AccordionItem value="conditions">
            <AccordionTrigger className="text-base font-semibold">Predicted Conditions</AccordionTrigger>
            <AccordionContent className="space-y-2">
              {ai.predicted_conditions?.map((c, i) => (
                <div key={i} className="flex justify-between items-center p-2 bg-gray-100 rounded">
                  <span>{c.condition}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRiskClasses(c.severity)}`}>
                    {c.severity}
                  </span>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>

          {/* AI Recommendations */}
          <AccordionItem value="recommendations">
            <AccordionTrigger className="text-base font-semibold">AI-Generated Recommendations</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <RecommendationSection icon={Activity} title="Lifestyle" items={ai.recommendations?.lifestyle} />
              <RecommendationSection icon={Pill} title="Medication Classes" items={ai.recommendations?.medications} />
              <RecommendationSection icon={UserPlus} title="Referrals" items={ai.recommendations?.referrals} />
              {ai.recommendations?.follow_up && (
                <InfoItem icon={BookOpen} label="Follow-up Plan" value={ai.recommendations.follow_up} />
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Decision Support & Guidelines */}
          <AccordionItem value="support">
            <AccordionTrigger className="text-base font-semibold">Decision Support</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <RecommendationSection icon={ShieldCheck} title="Flags for Doctor" items={ai.decision_support_flags} itemClassName="text-blue-700"/>
              <RecommendationSection icon={BookOpen} title="Guideline References" items={ai.guideline_references} itemClassName="text-gray-600"/>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        
        {/* Final Doctor's Notes */}
        <Card className="p-6 border-0 shadow-md bg-gray-50/50">
          <CardTitle className="text-lg mb-4">Doctor's Final Diagnosis & Plan</CardTitle>
          <div>
            <Label htmlFor="diagnosis_notes">Diagnosis Notes</Label>
            <Textarea 
              id="diagnosis_notes"
              placeholder="Confirm or override AI diagnosis here. Add your clinical reasoning." 
              rows={4}
              value={diagnosisData.diagnosis_notes}
              onChange={(e) => setDiagnosisData(prev => ({...prev, diagnosis_notes: e.target.value}))}
            />
          </div>
          <div className="mt-4">
            <Label htmlFor="treatment_plan">Treatment Plan</Label>
            <Textarea 
              id="treatment_plan"
              placeholder="Specify medications, dosages, and follow-up actions."
              rows={4}
              value={diagnosisData.treatment_plan}
              onChange={(e) => setDiagnosisData(prev => ({...prev, treatment_plan: e.target.value}))}
            />
            <p className="text-xs text-gray-500 mt-1">AI suggested plan has been pre-filled. Please review and modify.</p>
          </div>
        </Card>

        {/* New: AI feedback loop */}
        <div className="mt-6 p-4 rounded-lg bg-gray-50 border">
          <h4 className="font-semibold mb-2">AI Learning Feedback</h4>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Did the AI prediction match your impression?</span>
            <Button size="sm" variant={feedbackMatch === true ? "default" : "outline"} onClick={() => handleFeedback(true)}>Yes</Button>
            <Button size="sm" variant={feedbackMatch === false ? "default" : "outline"} onClick={() => handleFeedback(false)}>No</Button>
          </div>
          <div className="mt-3">
            <Label htmlFor="ai_fb_note" className="text-sm">Optional note</Label>
            <Textarea id="ai_fb_note" rows={3} value={feedbackNote} onChange={handleNote} placeholder="Add context to help improve future predictions..." />
          </div>
        </div>

        {/* Export Patient Summary */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="outline" onClick={async () => {
            // Works even before save: send snapshot with essentials
            const payload = diagnosisData.id ? { diagnosis_id: diagnosisData.id } : {
              snapshot: {
                patient_id: diagnosisData.patient_id,
                ai_prediction: diagnosisData.ai_prediction,
                follow_up: diagnosisData.ai_prediction?.recommendations?.follow_up, // Use AI prediction for follow-up if unsaved
                treatment_plan: diagnosisData.treatment_plan, // Use current treatment plan
                diagnosis_notes: diagnosisData.diagnosis_notes, // Use current diagnosis notes
                patient_demographics: {
                  full_name: diagnosisData.selectedPatient?.full_name,
                  age: diagnosisData.selectedPatient?.age,
                  gender: diagnosisData.selectedPatient?.gender
                },
                // Include any other relevant data from diagnosisData for PDF generation if unsaved
                vital_signs: diagnosisData.vital_signs,
                symptoms: diagnosisData.symptoms,
                clinical_observations: diagnosisData.clinical_observations,
                lifestyle: diagnosisData.lifestyle,
                medical_history_flags: diagnosisData.medical_history_flags,
                lab_results: diagnosisData.lab_results,
                additional_measurements: diagnosisData.additional_measurements,
              }
            };
            const { data } = await generatePatientSummaryPdf(payload);
            const blob = new Blob([data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'patient_summary.pdf';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
          }}>
            <Download className="w-4 h-4 mr-2" />
            Generate Patient Summary PDF
          </Button>
        </div>
      </CardContent>
    </>
  );
});


const RecommendationSection = ({ icon: Icon, title, items, itemClassName = 'text-gray-700' }) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      {title && <h4 className="font-medium flex items-center gap-2 mb-2">{Icon && <Icon className="w-4 h-4"/>}{title}</h4>}
      <ul className="list-disc list-inside space-y-1 text-sm">
        {items.map((item, index) => <li key={index} className={itemClassName}>{item}</li>)}
      </ul>
    </div>
  );
};

const InfoItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg">
    <Icon className="w-4 h-4 text-blue-500" />
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium text-gray-800">{value}</p>
    </div>
  </div>
);


// --- Main Page Component ---
export default function NewDiagnosis() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [patients, setPatients] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [diagnosisData, setDiagnosisData] = useState({
    patient_id: "",
    doctor_id: "",
    symptoms: [{ id: Date.now(), symptom: "", severity: "mild", duration: "", associated_factors: [] }],
    vital_signs: { systolic_bp: "", diastolic_bp: "", heart_rate: "", temperature: "", oxygen_saturation: "", respiratory_rate: "", weight_kg: "", height_cm: "" },
    clinical_observations: "",
    lifestyle: {},
    medical_history_flags: {},
    lab_results: {},
    additional_measurements: {},
    ai_prediction: null,
    diagnosis_notes: "",
    treatment_plan: "",
    blockchain_hash: "",
    ai_feedback_match: null, // New field for AI feedback
    ai_feedback_note: "" // New field for AI feedback note
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({
    patient_id: "",
    full_name: "",
    age: "",
    gender: "",
    blood_type: "",
    phone: "",
    emergency_contact: ""
  });

  // New state variables for the professional modal
  const [showNoModelModal, setShowNoModelModal] = useState(false);
  const [noModelMessage, setNoModelMessage] = useState("");
  const [saveForTraining, setSaveForTraining] = useState(true);

  // New state variables for patient data sync and validation
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [missingFields, setMissingFields] = useState([]);

  // Helper to assemble features for training example
  const buildTrainingFeatures = useCallback(() => {
    return {
      vital_signs: diagnosisData.vital_signs,
      symptoms: (diagnosisData.symptoms || []).map(s => ({
        symptom: s.symptom,
        severity: s.severity,
        duration: s.duration,
        associated_factors: s.associated_factors || []
      })),
      clinical_observations: diagnosisData.clinical_observations || '',
      lifestyle: diagnosisData.lifestyle || {},
      medical_history_flags: diagnosisData.medical_history_flags || {},
      lab_results: diagnosisData.lab_results || {},
      additional_measurements: diagnosisData.additional_measurements || {}
    };
  }, [
    diagnosisData.vital_signs, 
    diagnosisData.symptoms, 
    diagnosisData.clinical_observations,
    diagnosisData.lifestyle,
    diagnosisData.medical_history_flags,
    diagnosisData.lab_results,
    diagnosisData.additional_measurements
  ]);
  
  useEffect(() => {
     const loadData = async () => {
      try {
        const user = await User.me();
        setCurrentUser(user);
        
        // Load only patients assigned to the current doctor
        const patientsList = await Patient.filter({ assigned_doctor_id: user.id });
        setPatients(patientsList);
        
        setDiagnosisData(prev => ({ ...prev, doctor_id: user.id }));
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  // Centralized re-fetch of the selected patient's record (live from DB)
  const refreshSelectedPatient = useCallback(async () => {
    if (!diagnosisData.patient_id) return;
    try {
      const p = await Patient.get(diagnosisData.patient_id);
      const normalized = normalizePatientHistory(p);
      setSelectedPatient({ ...p, _normalizedHistory: normalized });

      // Pre-fill lifestyle/history/labs/measurements when available (use normalized fallbacks)
      setDiagnosisData(prev => ({
        ...prev,
        lifestyle: {
          lifestyle_smoking_status: p.lifestyle_smoking_status || prev.lifestyle?.lifestyle_smoking_status || "",
          alcohol_consumption: p.alcohol_consumption || prev.lifestyle?.alcohol_consumption || "",
          physical_activity_level: p.physical_activity_level || prev.lifestyle?.physical_activity_level || "",
          diet_habits: p.diet_habits || prev.lifestyle?.diet_habits || ""
        },
        medical_history_flags: {
          family_history_heart_disease:
            (p.family_history_heart_disease ?? normalized.family_history_heart_disease ?? prev.medical_history_flags?.family_history_heart_disease ?? false),
          has_hypertension:
            (p.has_hypertension ?? normalized.has_hypertension ?? prev.medical_history_flags?.has_hypertension ?? false),
          has_diabetes:
            (p.has_diabetes ?? normalized.has_diabetes ?? prev.medical_history_flags?.has_diabetes ?? false),
          has_dyslipidemia:
            (p.has_dyslipidemia ?? normalized.has_dyslipidemia ?? prev.medical_history_flags?.has_dyslipidemia ?? false),
          previous_cardiovascular_events:
            (p.previous_cardiovascular_events?.length ? p.previous_cardiovascular_events : (normalized.previous_cardiovascular_events || prev.medical_history_flags?.previous_cardiovascular_events || [])),
          chronic_kidney_disease:
            (p.chronic_kidney_disease ?? normalized.chronic_kidney_disease ?? prev.medical_history_flags?.chronic_kidney_disease ?? false)
        },
        lab_results: p.lab_results || prev.lab_results,
        additional_measurements: p.additional_measurements || prev.additional_measurements
      }));
    } catch (e) {
      console.error("Failed to fetch selected patient:", e);
    }
  }, [diagnosisData.patient_id, setDiagnosisData]);

  // Fetch full patient record when selection changes and pre-fill data
  useEffect(() => {
    const fetchSelected = async () => {
      if (!diagnosisData.patient_id) return;
      await refreshSelectedPatient();
    };
    fetchSelected();
  }, [diagnosisData.patient_id, refreshSelectedPatient]);

  const generateBlockchainHash = (data) => `0x${(new Date().getTime() + JSON.stringify(data).length).toString(16)}a${Math.random().toString(36).substr(2, 8)}`;

  const generatePatientId = () => {
     const prefix = "P";
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 3).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  };

  const handleCreatePatient = async () => {
     if (!newPatient.full_name || !newPatient.age || !newPatient.gender) {
      // Use the modal for this alert too for consistency
      setNoModelMessage("Please fill in all required patient fields (Full Name, Age, Gender).");
      setShowNoModelModal(true);
      return;
    }

    setIsProcessing(true);
    try {
      const patientData = {
        ...newPatient,
        patient_id: newPatient.patient_id || generatePatientId(),
        age: parseInt(newPatient.age),
        assigned_doctor_id: currentUser.id,
        blockchain_hash: `0x${Date.now().toString(16)}${Math.random().toString(36).substr(2, 8)}`
      };

      const createdPatient = await Patient.create(patientData);
      setDiagnosisData(prev => ({ ...prev, patient_id: createdPatient.id }));
      setIsNewPatientModalOpen(false);
      
      // Reload patients list for the current doctor
      const updatedPatients = await Patient.filter({ assigned_doctor_id: currentUser.id });
      setPatients(updatedPatients);
      
      // Reset form
      setNewPatient({
        patient_id: "",
        full_name: "",
        age: "",
        gender: "",
        blood_type: "",
        phone: "",
        emergency_contact: ""
      });
    } catch (error) {
      console.error("Error creating patient:", error);
      setNoModelMessage("Error creating patient. Please try again.");
      setShowNoModelModal(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const requiredCheck = (p, data) => {
    const req = [];
    if (!p?.age) req.push("Patient age");
    if (!p?.gender) req.push("Patient sex");
    if (!data.vital_signs?.systolic_bp) req.push("Systolic BP");
    if (!data.vital_signs?.diastolic_bp) req.push("Diastolic BP");
    if (!data.vital_signs?.heart_rate) req.push("Heart Rate");
    if (!data.vital_signs?.weight_kg) req.push("Weight");
    if (!data.vital_signs?.height_cm) req.push("Height");
    const hasSymptom = (data.symptoms || []).some(s => String(s.symptom || "").trim().length > 0);
    if (!hasSymptom) req.push("At least one symptom");
    return req;
  };

  const buildStructuredInput = (p, data) => ({
    patient: {
      id: p?.id,
      patient_id: p?.patient_id,
      age: p?.age,
      gender: p?.gender,
      lifestyle: {
        smoking: data.lifestyle?.lifestyle_smoking_status || p?.lifestyle_smoking_status,
        alcohol: data.lifestyle?.alcohol_consumption || p?.alcohol_consumption,
        activity: data.lifestyle?.physical_activity_level || p?.physical_activity_level,
        diet: data.lifestyle?.diet_habits || p?.diet_habits
      },
      history: data.medical_history_flags || {
        family_history_heart_disease: p?.family_history_heart_disease,
        has_hypertension: p?.has_hypertension,
        has_diabetes: p?.has_diabetes,
        has_dyslipidemia: p?.has_dyslipidemia,
        previous_cardiovascular_events: p?.previous_cardiovascular_events,
        chronic_kidney_disease: p?.chronic_kidney_disease
      }
    },
    vital_signs: data.vital_signs,
    symptoms: (data.symptoms || []).map(s => ({
      symptom: s.symptom, severity: s.severity, duration: s.duration, associated_factors: s.associated_factors || []
    })),
    clinical_observations: data.clinical_observations,
    lab_results: data.lab_results || p?.lab_results,
    additional_measurements: data.additional_measurements || p?.additional_measurements
  });

  const handleRunAI = async () => {
    setIsProcessing(true);
    try {
      // Always re-fetch patient to sync latest data
      const p = await Patient.get(diagnosisData.patient_id);
      setSelectedPatient(p);

      // Validate required data
      const req = requiredCheck(p, diagnosisData);
      if (req.length > 0) {
        setMissingFields(req);
        setShowValidationModal(true);
        setIsProcessing(false);
        return;
      }

      const structured = buildStructuredInput(p, diagnosisData);

      // Build prompt with structured context
      const symptomsText = structured.symptoms.map(s => `${s.symptom} (severity: ${s.severity}, duration: ${s.duration}, factors: ${s.associated_factors.join(", ") || "none"})`).join("; ") || "None reported";
      const vit = structured.vital_signs || {};
      const vitalsText = `Blood Pressure: ${vit.systolic_bp || "?"}/${vit.diastolic_bp || "?"}; Heart Rate: ${vit.heart_rate || "?"}; Temp: ${vit.temperature || "?"}°C; SpO2: ${vit.oxygen_saturation || "?"}%; RR: ${vit.respiratory_rate || "?"}; Weight: ${vit.weight_kg || "?"}kg; Height: ${vit.height_cm || "?"}cm`;
      const lifestyleText = `Smoking: ${structured.patient.lifestyle.smoking || "unknown"}; Alcohol: ${structured.patient.lifestyle.alcohol || "unknown"}; Activity: ${structured.patient.lifestyle.activity || "unknown"}; Diet: ${structured.patient.lifestyle.diet || "unknown"}`;
      const history = structured.patient.history || {};
      const historyText = [
        history.family_history_heart_disease ? "Family history of CVD" : null,
        history.has_hypertension ? "Hypertension" : null,
        history.has_diabetes ? "Diabetes" : null,
        history.has_dyslipidemia ? "Dyslipidemia" : null,
        history.chronic_kidney_disease ? "CKD" : null,
        (history.previous_cardiovascular_events || []).length ? `Prev events: ${(history.previous_cardiovascular_events || []).join(", ")}` : null
      ].filter(Boolean).join("; ") || "None reported";
      const labs = structured.lab_results || {};
      const labsText = `Labs: LDL ${labs.lipid_profile?.ldl ?? "?"}, HDL ${labs.lipid_profile?.hdl ?? "?"}, Total Chol ${labs.lipid_profile?.total_cholesterol ?? "?"}, TG ${labs.lipid_profile?.triglycerides ?? "?"}, FBG ${labs.glucose?.fasting_glucose ?? "?"}, HbA1c ${labs.glucose?.hba1c ?? "?"}, Cr ${labs.creatinine ?? "?"}, CRP ${labs.crp ?? "?"}`;
      const addMeas = structured.additional_measurements || {};
      const addText = `Waist Circumference ${addMeas.waist_circumference ?? "?"} cm${addMeas.ecg_readings ? `; ECG: ${addMeas.ecg_readings}` : ""}`;

      const prompt = `As a professional clinical decision support AI, analyze this patient's up-to-date data for cardiovascular risk and return JSON per schema.
Patient: age ${structured.patient.age}, sex ${structured.patient.gender}.
Lifestyle: ${lifestyleText}.
History: ${historyText}.
Vitals: ${vitalsText}.
Symptoms: ${symptomsText}.
Clinical observations: ${structured.clinical_observations || "None"}.
${labsText}.
${addText}.
Provide a comprehensive, guideline-aligned assessment (ACC/AHA, ESC).`;

      const result = await getAIAnalysis(prompt, aiPredictionSchema, structured, 'heart_disease');
      
      // Check if no model is active
      if (result.no_model_active) {
        setNoModelMessage(result.message);
        setShowNoModelModal(true);
        setIsProcessing(false);
        return;
      }
      
      // Pre-populate treatment plan with AI suggestions
      const suggestedPlan = result.recommendations?.medications?.join('\n') || '';
      
      setDiagnosisData(prev => ({ 
        ...prev, 
        ai_prediction: result,
        diagnosis_notes: result.summary_notes || '',
        treatment_plan: suggestedPlan
      }));
      setStep(3);
    } catch (error) {
      console.error("AI Analysis failed:", error);
      setNoModelMessage("AI analysis failed. Please try again or proceed manually. Error: " + error.message);
      setShowNoModelModal(true);
    }
    setIsProcessing(false);
  };
  
  const handleSaveDiagnosis = async () => {
     setIsProcessing(true);
    try {
      const blockchainHash = generateBlockchainHash(diagnosisData);
      const diagnosisToSave = { ...diagnosisData, blockchain_hash: blockchainHash, status: "completed" };
      const created = await Diagnosis.create(diagnosisToSave); // Store the created diagnosis for its ID
      
      // NEW: optionally save a training example for future offline retraining
      if (saveForTraining && created?.id) {
        const labelRisk = diagnosisData.ai_prediction?.risk_level || "moderate";
        const labelConds = (diagnosisData.ai_prediction?.predicted_conditions || [])
          .map(c => typeof c === "string" ? c : c.condition)
          .filter(Boolean); // Filter out any empty strings or nulls

        await TrainingExample.create({
          patient_id: diagnosisData.patient_id,
          doctor_id: diagnosisData.doctor_id,
          source_diagnosis_id: created.id,
          features: buildTrainingFeatures(),
          label_risk_level: labelRisk,
          label_conditions: labelConds,
          ai_feedback_match: diagnosisData.ai_feedback_match, // Save AI feedback
          ai_feedback_note: diagnosisData.ai_feedback_note // Save AI feedback note
        });
      }

      // Send notifications
      const patient = patients.find(p => p.id === diagnosisData.patient_id);
      const patientName = patient?.full_name || "patient";
      const risk = diagnosisData.ai_prediction?.risk_level;

      // To the doctor (self)
      await Notification.create({
        title: "Diagnosis saved",
        message: `Diagnosis for ${patientName} saved successfully.`,
        type: "success",
        audience: "user",
        recipient_user_id: currentUser.id,
        link_url: "PatientRecords"
      });

      // To admins if high/critical risk
      if (risk === "high" || risk === "critical") {
        await Notification.create({
          title: "High-risk diagnosis",
          message: `High/critical risk case recorded for ${patientName} (${risk}).`,
          type: "alert",
          audience: "admin",
          link_url: "AdminDashboard",
          metadata: { diagnosis_id: created.id, patient_id: diagnosisData.patient_id, risk }
        });
      }

      // Inform other tabs to refresh notification list
      try {
        const bc = new BroadcastChannel("notifications");
        bc.postMessage("refresh");
        bc.close();
      } catch (error) {
          console.warn("BroadcastChannel not supported or failed:", error);
      }


      // Show success modal instead of banner
      setShowSuccessModal(true);
      
      // Auto-redirect after 4 seconds
      setTimeout(() => {
        navigate(createPageUrl("DoctorDashboard"));
      }, 4000);
    } catch (error) {
      console.error("Error saving diagnosis:", error);
      setNoModelMessage("Error saving diagnosis. Please try again.");
      setShowNoModelModal(true);
    }
    setIsProcessing(false);
  };
  
  const STEPS = [
    { number: 1, label: "Patient", icon: Heart },
    { number: 2, label: "Symptoms & Vitals", icon: Stethoscope },
    { number: 3, label: "Review & Save", icon: FileText },
  ];

  return (
    <>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl("DoctorDashboard"))}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">New Diagnosis Workflow</h1>
            <p className="text-gray-600">AI-powered heart disease risk assessment</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Vertical Stepper */}
          <div className="md:col-span-1">
            <ol className="space-y-4">
              {STEPS.map((s) => (
                <li key={s.number} className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${step >= s.number ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-400'}`}>
                    {step > s.number ? <Check className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Step {s.number}</p>
                    <p className="font-medium text-gray-800">{s.label}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Form Content */}
          <div className="md:col-span-3">
            <Card className="shadow-lg border-0">
              {step === 1 && (
                <PatientStep 
                  patients={patients} 
                  diagnosisData={diagnosisData} 
                  setDiagnosisData={setDiagnosisData} 
                  onNewPatient={() => setIsNewPatientModalOpen(true)}
                />
              )}
              {step === 2 && (
                <SymptomsStep diagnosisData={diagnosisData} setDiagnosisData={setDiagnosisData} selectedPatient={selectedPatient} onRefreshPatient={refreshSelectedPatient} />
              )}
              {step === 3 && (
                <FinalizeStep
                  diagnosisData={diagnosisData}
                  setDiagnosisData={setDiagnosisData}
                />
              )}

              <CardFooter className="hidden md:flex justify-between border-t pt-6">
                <Button variant="outline" onClick={() => setStep(s => Math.max(1, s-1))} disabled={step === 1}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                
                {step === 1 && <Button onClick={() => setStep(2)} disabled={!diagnosisData.patient_id}>Next: Symptoms</Button>}
                {step === 2 && (
                  <Button onClick={handleRunAI} disabled={isProcessing}>
                    {isProcessing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</> : <><Brain className="w-4 h-4 mr-2" />Run AI Analysis</>}
                  </Button>
                )}
                {step === 3 && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 mr-4">
                      <Checkbox
                        id="saveForTraining"
                        checked={saveForTraining}
                        onCheckedChange={(v) => setSaveForTraining(Boolean(v))}
                      />
                      <Label htmlFor="saveForTraining" className="text-sm text-gray-700">
                        Use this case to improve the model
                      </Label>
                    </div>
                    <Button onClick={handleSaveDiagnosis} disabled={isProcessing} className="bg-green-600 hover:bg-green-700">
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Save Diagnosis
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>

      {/* Sticky mobile action bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-3 flex justify-between">
        <Button variant="outline" onClick={() => setStep(s => Math.max(1, s-1))} disabled={step === 1}>Back</Button>
        {step === 1 && <Button onClick={() => setStep(2)} disabled={!diagnosisData.patient_id}>Next</Button>}
        {step === 2 && (
          <Button onClick={handleRunAI} disabled={isProcessing} className="bg-blue-600 hover:bg-blue-700">
            {isProcessing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</> : <>Run AI Assessment</>}
          </Button>
        )}
        {step === 3 && (
          <Button onClick={handleSaveDiagnosis} disabled={isProcessing} className="bg-green-600 hover:bg-green-700">
            {isProcessing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <>Save</>}
          </Button>
        )}
      </div>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Check className="w-5 h-5" />
              Diagnosis Saved Successfully
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700 mb-4">
              The diagnosis has been successfully saved to the patient's medical record and secured on the blockchain.
            </p>
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-800">
                <strong>Redirecting:</strong> You will be redirected to the dashboard in a few seconds...
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Professional No Model Modal */}
      <Dialog open={showNoModelModal} onOpenChange={setShowNoModelModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              Heart Disease Analysis Model Required
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700 mb-4">{noModelMessage}</p>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Next Steps:</strong> Please go to ML Model Management and activate a heart disease or symptom analysis model to perform AI analysis.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowNoModelModal(false)} className="w-full">
              Understood
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Validation Modal for required fields */}
      <Dialog open={showValidationModal} onOpenChange={setShowValidationModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Missing Required Information
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-gray-700">Please complete the following before running AI assessment:</p>
            <ul className="list-disc list-inside text-gray-800">
              {missingFields.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowValidationModal(false)} className="w-full">OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Patient Modal */}
      <Dialog open={isNewPatientModalOpen} onOpenChange={setIsNewPatientModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Register New Patient</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="patient_id">Patient ID (Auto-generated if left blank)</Label>
                <Input 
                  id="patient_id" 
                  placeholder={generatePatientId()} // Show example ID
                  value={newPatient.patient_id} 
                  onChange={(e) => setNewPatient({...newPatient, patient_id: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name <span className="text-red-500">*</span></Label>
                <Input 
                  id="full_name" 
                  value={newPatient.full_name} 
                  onChange={(e) => setNewPatient({...newPatient, full_name: e.target.value})} 
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age">Age <span className="text-red-500">*</span></Label>
                <Input 
                  id="age" 
                  type="number" 
                  value={newPatient.age} 
                  onChange={(e) => setNewPatient({...newPatient, age: e.target.value})} 
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender <span className="text-red-500">*</span></Label>
                <Select 
                  value={newPatient.gender} 
                  onValueChange={(value) => setNewPatient({...newPatient, gender: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="blood_type">Blood Type</Label>
                <Select 
                  value={newPatient.blood_type} 
                  onValueChange={(value) => setNewPatient({...newPatient, blood_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select blood type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input 
                  id="phone" 
                  value={newPatient.phone} 
                  onChange={(e) => setNewPatient({...newPatient, phone: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency_contact">Emergency Contact</Label>
                <Input 
                  id="emergency_contact" 
                  value={newPatient.emergency_contact} 
                  onChange={(e) => setNewPatient({...newPatient, emergency_contact: e.target.value})} 
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewPatientModalOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleCreatePatient} disabled={isProcessing}>
              {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : "Create Patient"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
