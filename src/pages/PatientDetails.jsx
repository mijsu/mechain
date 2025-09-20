import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Patient } from "@/api/entities";
import { Diagnosis } from "@/api/entities";
import { PatientNote } from "@/api/entities";
import { PatientFile } from "@/api/entities";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, ArrowLeft } from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import DiagnosisCard from "@/components/patient/DiagnosisCard";
import DiagnosisDetailsModal from "@/components/patient/DiagnosisDetailsModal";
import PatientSummaryCard from "@/components/patient/PatientSummaryCard";
import PatientEditDialog from "@/components/patient/PatientEditDialog";
import PatientVitalsTrends from "@/components/patient/PatientVitalsTrends";
import PatientFiles from "@/components/patient/PatientFiles";
import PatientNotes from "@/components/patient/PatientNotes";

export default function PatientDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("id");

  const [patient, setPatient] = useState(null);
  const [diagnoses, setDiagnoses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [severity, setSeverity] = useState("all");
  const [loading, setLoading] = useState(true);

  const [viewDiag, setViewDiag] = useState(null);
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const p = await Patient.get(id);
    const dList = await Diagnosis.filter({ patient_id: id }, "-created_date", 200);
    setPatient(p);
    setDiagnoses(dList);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return diagnoses.filter((d) => {
      const risk = d?.ai_prediction?.risk_level || "unknown";
      const inSeverity = severity === "all" || risk === severity;
      const inSearch =
        !searchTerm ||
        (d.diagnosis_notes || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.treatment_plan || "").toLowerCase().includes(searchTerm.toLowerCase());
      return inSeverity && inSearch;
    });
  }, [diagnoses, severity, searchTerm]);

  const toggleFollowUp = async (diag) => {
    const newStatus = diag.status === "follow_up_required" ? "completed" : "follow_up_required";
    await Diagnosis.update(diag.id, { status: newStatus });
    load();
  };

  if (!id) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Link to={createPageUrl("PatientRecords")}>
          <Button variant="outline" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <Card>
          <CardContent className="p-6">Missing patient id.</CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="h-80 bg-gray-100 rounded animate-pulse" />
          <div className="md:col-span-3 h-96 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Card>
          <CardContent className="p-6">Patient not found.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={createPageUrl("PatientRecords")}>
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Records
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            Patient Profile: <span className="text-blue-700">{patient.full_name}</span>
          </h1>
        </div>
        <Button onClick={() => setEditOpen(true)}>Edit Patient</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sticky Summary */}
        <div className="md:col-span-1">
          <div className="md:sticky md:top-20">
            <PatientSummaryCard patient={patient} />
          </div>
        </div>

        <div className="md:col-span-3 space-y-6">
          <Tabs defaultValue="timeline" className="w-full">
            <TabsList className="grid grid-cols-3 md:w-[480px]">
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="vitals">Vitals</TabsTrigger>
              <TabsTrigger value="files-notes">Files & Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline">
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    <span>Diagnosis Timeline</span>
                    <div className="flex gap-2">
                      <div className="relative">
                        <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                          className="pl-9 w-64"
                          placeholder="Search diagnoses..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <div>
                        <select
                          className="h-9 rounded-md border border-gray-300 px-3 text-sm"
                          value={severity}
                          onChange={(e) => setSeverity(e.target.value)}
                        >
                          <option value="all">All Severities</option>
                          <option value="low">Low</option>
                          <option value="moderate">Moderate</option>
                          <option value="high">High</option>
                          <option value="critical">Critical</option>
                        </select>
                      </div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[65vh] overflow-y-auto pr-2 space-y-3">
                    {filtered.map((d) => (
                      <DiagnosisCard
                        key={d.id}
                        diagnosis={d}
                        onView={(diag) => setViewDiag(diag)}
                        onToggleFollowUp={toggleFollowUp}
                      />
                    ))}
                    {filtered.length === 0 && (
                      <div className="text-center text-gray-500 py-10">No diagnoses found.</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="vitals">
              <PatientVitalsTrends diagnoses={diagnoses} />
            </TabsContent>

            <TabsContent value="files-notes">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PatientFiles patientId={patient.id} />
                <PatientNotes patientId={patient.id} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <PatientEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        patient={patient}
        onSaved={() => {
          setEditOpen(false);
          load();
        }}
      />

      <DiagnosisDetailsModal open={!!viewDiag} diagnosis={viewDiag} onOpenChange={(v) => !v && setViewDiag(null)} />
    </div>
  );
}