import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PatientNote } from "@/api/entities";
import { User } from "@/api/entities";
import { formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download } from "lucide-react";

export default function PatientNotes({ patientId }) {
  const [notes, setNotes] = React.useState([]);
  const [content, setContent] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [me, setMe] = React.useState(null);

  const [showImageModal, setShowImageModal] = React.useState(false);
  const [currentImageUrl, setCurrentImageUrl] = React.useState("");

  const load = React.useCallback(async () => {
    const meUser = await User.me();
    setMe(meUser);
    const list = await PatientNote.filter({ patient_id: patientId }, "-created_date", 100);
    setNotes(list);
  }, [patientId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const addNote = async () => {
    if (!content.trim() || !me) return;
    setLoading(true);
    await PatientNote.create({
      patient_id: patientId,
      author_id: me.id,
      content,
      visibility: "private"
    });
    setContent("");
    await load();
    setLoading(false);
  };

  const handleImageClick = (url) => {
    setCurrentImageUrl(url);
    setShowImageModal(true);
  };

  const handleDownloadImage = () => {
    if (currentImageUrl) {
      const link = document.createElement("a");
      link.href = currentImageUrl;
      const fileName = currentImageUrl.substring(currentImageUrl.lastIndexOf("/") + 1) || "download";
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const isImageUrl = (url) => {
    if (typeof url !== "string" || !url.startsWith("http")) return false;
    return /\.(jpeg|jpg|gif|png|webp|bmp|svg)(\?.*)?$/i.test(url);
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle>Notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <Textarea
            placeholder="Add a quick note..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 min-h-[80px]"
          />
          <div className="flex items-start gap-4">
            <Button onClick={addNote} disabled={loading} className="px-6 py-3">
              {loading ? "Saving..." : "Add"}
            </Button>
          </div>
        </div>

        <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
          {notes.map((n) => (
            <div key={n.id} className="p-4 border rounded-lg bg-white">
              <div className="text-sm text-gray-500 flex justify-between">
                <span />
                <span>{formatDistanceToNow(new Date(n.created_date), { addSuffix: true })}</span>
              </div>

              {isImageUrl(n.content) ? (
                <div className="mt-2 cursor-pointer" onClick={() => handleImageClick(n.content)}>
                  <img
                    src={n.content}
                    alt="Note attachment"
                    className="max-w-full h-auto rounded-md shadow-sm border border-gray-200"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      const fallback = e.currentTarget.nextElementSibling;
                      if (fallback) fallback.classList.remove("hidden");
                    }}
                  />
                  <div className="hidden text-sm text-red-500 mt-1">
                    Image failed to load.{" "}
                    <a href={n.content} target="_blank" rel="noopener noreferrer" className="underline">
                      View original link
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-base text-gray-800 mt-2 whitespace-pre-wrap">{n.content}</div>
              )}
            </div>
          ))}
          {notes.length === 0 && (
            <div className="text-base text-gray-500 text-center py-4">No notes yet.</div>
          )}
        </div>
      </CardContent>

      <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
          </DialogHeader>
          <img
            src={currentImageUrl}
            alt="Preview"
            className="w-full h-auto object-contain max-h-[70vh] block"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const fallback = e.currentTarget.nextElementSibling;
              if (fallback) fallback.classList.remove("hidden");
            }}
          />
          <div className="hidden p-4 text-center text-red-500">
            Failed to load image.{" "}
            <a href={currentImageUrl} target="_blank" rel="noopener noreferrer" className="underline">
              Try opening in new tab
            </a>
          </div>
          <div className="p-4 flex justify-end bg-gray-50 border-t border-gray-200">
            <Button onClick={handleDownloadImage} className="gap-2">
              <Download className="h-4 w-4" /> Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}