import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Upload as UploadIcon, CheckCircle2, AlertCircle } from "lucide-react";
import { UploadFile, ExtractDataFromUploadedFile } from "@/api/integrations";

export default function LabUpload({ onApply }) {
  const [file, setFile] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [extracted, setExtracted] = React.useState(null);

  const labSchema = {
    type: "object",
    properties: {
      lipid_profile: { type: "object", properties: { ldl: { type: "number" }, hdl: { type: "number" }, total_cholesterol: { type: "number" }, triglycerides: { type: "number" } } },
      glucose: { type: "object", properties: { fasting_glucose: { type: "number" }, hba1c: { type: "number" } } },
      creatinine: { type: "number" },
      crp: { type: "number" }
    }
  };

  const toNumber = (val) => {
    if (val === null || val === undefined || val === "") return undefined;
    const cleaned = String(val).replace(/[^\d.\-]/g, "");
    const num = Number(cleaned);
    return isNaN(num) ? undefined : num;
  };

  const pickFirstNumber = (obj, keys) => {
    for (const k of keys) {
      const v = obj?.[k];
      const num = toNumber(v);
      if (num !== undefined) return num;
    }
    return undefined;
  };

  const normalizeLabs = (data) => {
    const rows = Array.isArray(data) ? data : [data || {}];
    const merged = rows.reduce((acc, row) => ({ ...acc, ...row }), {});
    const lower = {};
    Object.keys(merged).forEach((k) => (lower[k.toLowerCase()] = merged[k]));
    const labObj = {
      lipid_profile: {
        ldl: pickFirstNumber(lower, ["ldl", "ldl-c", "ldl cholesterol"]),
        hdl: pickFirstNumber(lower, ["hdl", "hdl-c", "hdl cholesterol"]),
        total_cholesterol: pickFirstNumber(lower, ["total_cholesterol", "total cholesterol", "cholesterol", "chol"]),
        triglycerides: pickFirstNumber(lower, ["triglycerides", "tg"])
      },
      glucose: {
        fasting_glucose: pickFirstNumber(lower, ["fasting_glucose", "fasting glucose", "fbg"]),
        hba1c: pickFirstNumber(lower, ["hba1c", "a1c"])
      },
      creatinine: pickFirstNumber(lower, ["creatinine", "serum_creatinine", "serum creatinine"]),
      crp: pickFirstNumber(lower, ["crp", "c-reactive protein"])
    };
    if (Object.values(labObj.lipid_profile).every(v => v === undefined)) delete labObj.lipid_profile;
    if (Object.values(labObj.glucose).every(v => v === undefined)) delete labObj.glucose;
    if (labObj.creatinine === undefined) delete labObj.creatinine;
    if (labObj.crp === undefined) delete labObj.crp;
    return labObj;
  };

  const autoExtract = async (f) => {
    setIsLoading(true);
    setError(null);
    setExtracted(null);
    try {
      const { file_url } = await UploadFile({ file: f });
      const res = await ExtractDataFromUploadedFile({ file_url, json_schema: labSchema });
      if (res?.status === "success" && res.output) {
        const normalized = normalizeLabs(res.output);
        setExtracted(normalized);
      } else {
        throw new Error(res?.details || "Failed to extract lab values. Try another file or enter manually.");
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      setError("File must be under 10MB.");
      return;
    }
    setFile(f);
    await autoExtract(f); // auto extract on select; no separate button
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <UploadIcon className="w-5 h-5 text-gray-600" />
          <div>
            <p className="font-medium text-gray-900">Upload lab report</p>
            <p className="text-sm text-gray-500">CSV, PDF, PNG, JPG up to 10MB</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Input type="file" accept=".csv,application/pdf,image/png,image/jpeg" onChange={handleFileChange} />
          {/* Extract button removed as requested */}
        </div>
        {isLoading && <p className="text-sm text-gray-500 mt-2">Processing upload…</p>}
        {error && (
          <div className="mt-3 flex items-center text-red-600 text-sm gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {extracted && (
        <div className="p-4 bg-gray-50 border rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <p className="font-medium text-gray-900">Extracted values</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {"lipid_profile" in extracted && (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-700">Lipid Profile</p>
                <ul className="text-sm text-gray-700">
                  {"ldl" in extracted.lipid_profile && <li>LDL: {extracted.lipid_profile.ldl}</li>}
                  {"hdl" in extracted.lipid_profile && <li>HDL: {extracted.lipid_profile.hdl}</li>}
                  {"total_cholesterol" in extracted.lipid_profile && <li>Total Chol: {extracted.lipid_profile.total_cholesterol}</li>}
                  {"triglycerides" in extracted.lipid_profile && <li>Triglycerides: {extracted.lipid_profile.triglycerides}</li>}
                </ul>
              </div>
            )}
            {"glucose" in extracted && (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-700">Glucose</p>
                <ul className="text-sm text-gray-700">
                  {"fasting_glucose" in extracted.glucose && <li>Fasting: {extracted.glucose.fasting_glucose}</li>}
                  {"hba1c" in extracted.glucose && <li>HbA1c: {extracted.glucose.hba1c}</li>}
                </ul>
              </div>
            )}
            {("creatinine" in extracted || "crp" in extracted) && (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-700">Other</p>
                <ul className="text-sm text-gray-700">
                  {"creatinine" in extracted && <li>Creatinine: {extracted.creatinine}</li>}
                  {"crp" in extracted && <li>CRP: {extracted.crp}</li>}
                </ul>
              </div>
            )}
          </div>
          <div className="mt-3 flex justify-end">
            <Button onClick={() => extracted && onApply && onApply(extracted)} className="bg-green-600 hover:bg-green-700">
              Apply to Form
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}