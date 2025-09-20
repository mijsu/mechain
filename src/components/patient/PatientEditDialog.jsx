import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadFile } from "@/api/integrations";
import { Patient } from "@/api/entities";
import { Plus, Trash2, Loader2, Upload } from "lucide-react";

export default function PatientEditDialog({ open, onOpenChange, patient, onSaved }) {
  const [data, setData] = React.useState(patient || {});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setData(patient || {});
  }, [patient]);

  const updateField = (k, v) => setData(prev => ({ ...prev, [k]: v }));

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { file_url } = await UploadFile({ file });
    updateField("profile_picture_url", file_url);
  };

  const ensureArray = (x) => Array.isArray(x) ? x : (x ? [x] : []);
  const removeFromArray = (arr, idx) => arr.filter((_, i) => i !== idx);

  const addMedication = () => {
    const arr = ensureArray(data.current_medications);
    updateField("current_medications", [...arr, { medication_name: "", dosage: "", frequency: "" }]);
  };

  const updateMedication = (idx, k, v) => {
    const arr = ensureArray(data.current_medications);
    arr[idx] = { ...arr[idx], [k]: v };
    updateField("current_medications", [...arr]);
  };

  const removeMedication = (idx) => {
    const arr = ensureArray(data.current_medications);
    updateField("current_medications", removeFromArray(arr, idx));
  };

  const addAllergy = () => {
    updateField("allergies", [...(data.allergies || []), ""]);
  };

  const updateAllergy = (idx, v) => {
    const arr = ensureArray(data.allergies);
    arr[idx] = v;
    updateField("allergies", [...arr]);
  };

  const removeAllergy = (idx) => {
    const arr = ensureArray(data.allergies);
    updateField("allergies", removeFromArray(arr, idx));
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      full_name: data.full_name,
      age: Number(data.age),
      gender: data.gender,
      blood_type: data.blood_type || "",
      phone: data.phone || "",
      emergency_contact: data.emergency_contact || "",
      medical_history_summary: data.medical_history_summary || "",
      allergies: ensureArray(data.allergies).filter(Boolean),
      current_medications: ensureArray(data.current_medications).filter(m => m && m.medication_name)
    };
    await Patient.update(patient.id, payload);
    setSaving(false);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Patient</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100">
              {data.profile_picture_url ? (
                <img src={data.profile_picture_url} alt="avatar" className="w-full h-full object-cover" />
              ) : null}
            </div>
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Upload Avatar</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </label>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Full Name</Label>
              <Input value={data.full_name || ""} onChange={e => updateField("full_name", e.target.value)} />
            </div>
            <div>
              <Label>Age</Label>
              <Input type="number" value={data.age || ""} onChange={e => updateField("age", e.target.value)} />
            </div>
            <div>
              <Label>Gender</Label>
              <Select value={data.gender || ""} onValueChange={(v) => updateField("gender", v)}>
                <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Blood Type</Label>
              <Input value={data.blood_type || ""} onChange={e => updateField("blood_type", e.target.value)} placeholder="e.g., O+" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={data.phone || ""} onChange={e => updateField("phone", e.target.value)} />
            </div>
            <div>
              <Label>Emergency Contact</Label>
              <Input value={data.emergency_contact || ""} onChange={e => updateField("emergency_contact", e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Medical History Summary</Label>
            <textarea
              className="w-full border rounded-md p-2 mt-1"
              rows={4}
              value={data.medical_history_summary || ""}
              onChange={(e) => updateField("medical_history_summary", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Current Medications</Label>
              <Button size="sm" variant="outline" onClick={addMedication}><Plus className="w-4 h-4 mr-1" />Add</Button>
            </div>
            <div className="space-y-2">
              {(data.current_medications || []).map((m, idx) => (
                <div key={idx} className="grid md:grid-cols-3 gap-2 items-center">
                  <Input placeholder="Name" value={m.medication_name || ""} onChange={e => updateMedication(idx, "medication_name", e.target.value)} />
                  <Input placeholder="Dosage" value={m.dosage || ""} onChange={e => updateMedication(idx, "dosage", e.target.value)} />
                  <div className="flex gap-2">
                    <Input placeholder="Frequency" value={m.frequency || ""} onChange={e => updateMedication(idx, "frequency", e.target.value)} />
                    <Button variant="ghost" size="icon" onClick={() => removeMedication(idx)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Allergies</Label>
              <Button size="sm" variant="outline" onClick={addAllergy}><Plus className="w-4 h-4 mr-1" />Add</Button>
            </div>
            <div className="space-y-2">
              {(data.allergies || []).map((a, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input placeholder="Allergy" value={a || ""} onChange={e => updateAllergy(idx, e.target.value)} />
                  <Button variant="ghost" size="icon" onClick={() => removeAllergy(idx)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}