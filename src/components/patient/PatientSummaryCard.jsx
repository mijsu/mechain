import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, User, Droplet, Shield, UserCircle } from "lucide-react";

export default function PatientSummaryCard({ patient }) {
  const meds = Array.isArray(patient.current_medications) ? patient.current_medications : [];
  const allergies = Array.isArray(patient.allergies) ? patient.allergies : [];

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle>Patient Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
            {patient.profile_picture_url ? (
              <img src={patient.profile_picture_url} alt={patient.full_name} className="w-full h-full object-cover" />
            ) : (
              <UserCircle className="w-10 h-10 text-gray-400" />
            )}
          </div>
          <div>
            <div className="text-lg font-semibold">{patient.full_name}</div>
            <div className="text-sm text-gray-600">{patient.age} • {patient.gender}</div>
          </div>
        </div>

        <div className="text-sm text-gray-700">
          <div className="text-gray-500 mb-1">Medical History Summary</div>
          <div className="whitespace-pre-wrap">{patient.medical_history_summary || "—"}</div>
        </div>

        <div>
          <div className="text-sm text-gray-500 mb-1">Allergies</div>
          <div className="flex flex-wrap gap-2">
            {allergies.length ? allergies.map((a, i) => <Badge key={i} variant="secondary">{a}</Badge>) : <span className="text-sm text-gray-600">No known allergies</span>}
          </div>
        </div>

        <div>
          <div className="text-sm text-gray-500 mb-1">Current Medications</div>
          <div className="space-y-1">
            {meds.length ? meds.map((m, i) => (
              <div key={i} className="text-sm text-gray-800">
                {m.medication_name} {m.dosage ? `— ${m.dosage}` : ""} {m.frequency ? `(${m.frequency})` : ""}
              </div>
            )) : <span className="text-sm text-gray-600">None recorded</span>}
          </div>
        </div>

        <div className="text-sm text-gray-700 space-y-1">
          <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-500" /> {patient.phone || "—"}</div>
          <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-gray-500" /> Emergency: {patient.emergency_contact || "—"}</div>
          <div className="flex items-center gap-2"><Droplet className="w-4 h-4 text-gray-500" /> Blood Type: {patient.blood_type || "—"}</div>
        </div>
      </CardContent>
    </Card>
  );
}