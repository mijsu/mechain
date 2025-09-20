import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, Heart, AlertTriangle, Eye } from "lucide-react";
import { format } from "date-fns";

function getRiskMeta(riskLevel) {
  const level = (riskLevel || "unknown").toLowerCase();
  if (level === "low") return { color: "bg-green-100 text-green-800", emoji: "🟢", label: "Low" };
  if (level === "moderate") return { color: "bg-yellow-100 text-yellow-800", emoji: "🔶", label: "Moderate" };
  if (level === "high") return { color: "bg-orange-100 text-orange-800", emoji: "🟠", label: "High" };
  if (level === "critical") return { color: "bg-red-100 text-red-800", emoji: "🔴", label: "Critical" };
  return { color: "bg-gray-100 text-gray-800", emoji: "⚪", label: "Unknown" };
}
function inferType(diagnosis) {
  const hasDocs = Array.isArray(diagnosis.medical_images) && diagnosis.medical_images.length > 0;
  return hasDocs ? "Medical Document Analysis" : "Risk Assessment";
}

export default function DiagnosisCard({ diagnosis, onView, onToggleFollowUp }) {
  const type = inferType(diagnosis);
  const dateStr = diagnosis.created_date ? format(new Date(diagnosis.created_date), "MMMM d, yyyy") : "—";
  const riskLevel = diagnosis?.ai_prediction?.risk_level || "unknown";
  const riskMeta = getRiskMeta(riskLevel);
  const severityLabel = riskMeta.label;
  const summary = type === "Risk Assessment"
    ? "Cardiovascular risk evaluation"
    : "Reviewed medical documents for potential cardiovascular risks";
  const isFollowUp = diagnosis.status === "follow_up_required";

  return (
    <Card className="border border-gray-200/70 hover:shadow-md transition-all">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 text-gray-700">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-sm">Diagnosis Date:</span>
            <span className="font-medium">{dateStr}</span>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1 bg-blue-50 text-blue-800 border-blue-200">
            {type === "Risk Assessment" ? <Heart className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
            {type}
          </Badge>
        </div>

        <div className="mt-3">
          <div className="text-sm text-gray-600">Assessment Summary:</div>
          <div className="font-medium text-gray-900">
            {summary}{riskLevel && riskLevel !== "unknown" ? ` (${riskMeta.label})` : ""}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-600">Severity:</span>
          <Badge className={`${riskMeta.color}`}>{severityLabel}</Badge>
          <span className="text-sm text-gray-600 ml-3">Risk Level:</span>
          <Badge variant="outline" className="flex items-center gap-1">
            <span aria-hidden="true">{riskMeta.emoji}</span>
            {severityLabel}
          </Badge>
        </div>

        {Array.isArray(diagnosis.symptoms) && diagnosis.symptoms.length > 0 && (
          <div className="mt-3 text-sm text-gray-600">
            <span className="text-gray-500">Symptoms: </span>
            <span className="text-gray-800">
              {diagnosis.symptoms.slice(0, 2).map(s => s.symptom).join(", ")}
              {diagnosis.symptoms.length > 2 && ` +${diagnosis.symptoms.length - 2} more`}
            </span>
          </div>
        )}

        <div className="mt-4 flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => onView?.(diagnosis)} className="gap-2">
            <Eye className="w-4 h-4" /> View Details
          </Button>
          <Button
            size="sm"
            variant={isFollowUp ? "default" : "secondary"}
            onClick={() => onToggleFollowUp?.(diagnosis)}
            className={`gap-2 ${isFollowUp ? "bg-amber-600 hover:bg-amber-700" : ""}`}
          >
            <AlertTriangle className="w-4 h-4" />
            {isFollowUp ? "Mark as Completed" : "Follow-up Needed"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}