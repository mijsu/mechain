import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UploadFile } from "@/api/integrations";
import { PatientFile } from "@/api/entities";
import { FileText, Image as ImageIcon, Eye, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function PatientFiles({ patientId }) {
  const [files, setFiles] = React.useState([]);
  const [uploading, setUploading] = React.useState(false);
  const [newFile, setNewFile] = React.useState(null);
  const [fileType, setFileType] = React.useState("");
  const [description, setDescription] = React.useState("");

  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewFile, setPreviewFile] = React.useState(null);

  const load = React.useCallback(async () => {
    const list = await PatientFile.filter({ patient_id: patientId }, "-created_date", 100);
    setFiles(list);
  }, [patientId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleUpload = async () => {
    if (!newFile) return;
    setUploading(true);
    const { file_url } = await UploadFile({ file: newFile });
    await PatientFile.create({
      patient_id: patientId,
      file_url,
      file_type: fileType || "document",
      description: description || ""
    });
    setNewFile(null);
    setFileType("");
    setDescription("");
    setUploading(false);
    load();
  };

  const isImage = (url = "") => /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(url);
  const isPdf = (url = "") => /\.pdf$/i.test(url);

  const openPreview = (f) => {
    setPreviewFile(f);
    setPreviewOpen(true);
  };

  const downloadCurrent = () => {
    if (!previewFile?.file_url) return;
    const a = document.createElement("a");
    a.href = previewFile.file_url;
    a.download = (previewFile.description || previewFile.file_type || "file");
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle>Test Results & Imaging</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input type="file" onChange={(e) => setNewFile(e.target.files?.[0] || null)} />
          <Input placeholder="e.g., lab, ECG, X-ray" value={fileType} onChange={(e) => setFileType(e.target.value)} />
          <Input placeholder="Short description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Button onClick={handleUpload} disabled={uploading || !newFile}>
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </div>

        <div className="space-y-2 max-h-[260px] overflow-y-auto pr-2">
          {files.map(f => (
            <button
              key={f.id}
              onClick={() => openPreview(f)}
              className="w-full p-3 border rounded-lg bg-white flex items-center justify-between text-left hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <div>
                  <div className="text-sm font-medium">{f.file_type || "document"}</div>
                  <div className="text-xs text-gray-500">{f.description || f.file_url}</div>
                </div>
              </div>
              <span className="text-sm text-blue-600 inline-flex items-center gap-1">
                Preview <Eye className="w-3 h-3" />
              </span>
            </button>
          ))}
          {files.length === 0 && <div className="text-sm text-gray-500 text-center py-4">No files uploaded yet.</div>}
        </div>
      </CardContent>

      {/* Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              {previewFile?.file_type || "Preview"}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-auto">
            {previewFile?.file_url ? (
              isImage(previewFile.file_url) ? (
                <img
                  src={previewFile.file_url}
                  alt={previewFile?.description || "Preview"}
                  className="max-h-[68vh] w-auto mx-auto rounded"
                />
              ) : isPdf(previewFile.file_url) ? (
                <iframe
                  src={previewFile.file_url}
                  title="Document"
                  className="w-full h-[68vh] rounded"
                />
              ) : (
                <div className="p-4 text-sm text-gray-600">
                  This file cannot be previewed. You can download it instead.
                </div>
              )
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
            {previewFile?.file_url && (
              <Button onClick={downloadCurrent} className="gap-2">
                <Download className="w-4 h-4" /> Download
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}