import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, Calendar, Weight, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ProgressPhoto {
  id: string;
  date: string;
  weight: number | null;
  photo_url: string;
  signed_url?: string;
}

export function ProgressGallery({ userId }: { userId: string }) {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhoto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPhotos();
  }, [userId]);

  const loadPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from("progress")
        .select("id, date, weight, photo_url")
        .eq("user_id", userId)
        .not("photo_url", "is", null)
        .order("date", { ascending: false });

      if (error) throw error;

      // Create signed URLs for each photo
      const photosWithSignedUrls = await Promise.all(
        (data || []).map(async (photo) => {
          const { data: signedData, error: signedError } = await supabase.storage
            .from("progress-photos")
            .createSignedUrl(photo.photo_url, 3600); // 1 hour expiration

          if (signedError) {
            if (import.meta.env.DEV) {
              console.error("Error creating signed URL:", signedError);
            }
            return { ...photo, signed_url: "" };
          }

          return { ...photo, signed_url: signedData.signedUrl };
        })
      );

      setPhotos(photosWithSignedUrls);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error loading photos:", error);
      }
      toast({
        title: "Chyba",
        description: "Nepodarilo sa načítať fotky",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };


  const deletePhoto = async (photo: ProgressPhoto) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("progress-photos")
        .remove([photo.photo_url]);

      if (storageError) throw storageError;

      // Update database record
      const { error: dbError } = await supabase
        .from("progress")
        .update({ photo_url: null })
        .eq("id", photo.id);

      if (dbError) throw dbError;

      toast({
        title: "Úspech",
        description: "Fotka bola vymazaná",
      });

      setSelectedPhoto(null);
      loadPhotos();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error deleting photo:", error);
      }
      toast({
        title: "Chyba",
        description: "Nepodarilo sa vymazať fotku",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fotogaléria pokroku</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Načítavam...</div>
        </CardContent>
      </Card>
    );
  }

  if (photos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fotogaléria pokroku</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Zatiaľ nemáte žiadne fotky. Pridajte prvú fotku pri zaznamenaní váhy!
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Fotogaléria pokroku ({photos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="relative group cursor-pointer rounded-lg overflow-hidden border hover:border-primary transition-colors"
                onClick={() => setSelectedPhoto(photo)}
              >
                <img
                  src={photo.signed_url || ""}
                  alt={`Progress ${format(new Date(photo.date), "dd.MM.yyyy")}`}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-2">
                  <Calendar className="h-4 w-4 mb-1" />
                  <div className="text-sm font-medium">{format(new Date(photo.date), "dd.MM.yyyy")}</div>
                  {photo.weight && (
                    <div className="flex items-center gap-1 text-sm mt-1">
                      <Weight className="h-3 w-3" />
                      {photo.weight} kg
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {photos.length >= 2 && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Porovnanie Before/After</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Prvá fotka</p>
                  <img
                    src={photos[photos.length - 1].signed_url || ""}
                    alt="Before"
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  <p className="text-sm mt-2">
                    {format(new Date(photos[photos.length - 1].date), "dd.MM.yyyy")}
                    {photos[photos.length - 1].weight && ` - ${photos[photos.length - 1].weight} kg`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Najnovšia fotka</p>
                  <img
                    src={photos[0].signed_url || ""}
                    alt="After"
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  <p className="text-sm mt-2">
                    {format(new Date(photos[0].date), "dd.MM.yyyy")}
                    {photos[0].weight && ` - ${photos[0].weight} kg`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detail fotky</DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <div className="space-y-4">
              <img
                src={selectedPhoto.signed_url || ""}
                alt="Progress detail"
                className="w-full rounded-lg"
              />
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(selectedPhoto.date), "dd.MM.yyyy")}
                  </div>
                  {selectedPhoto.weight && (
                    <div className="flex items-center gap-2 text-sm mt-2">
                      <Weight className="h-4 w-4" />
                      {selectedPhoto.weight} kg
                    </div>
                  )}
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deletePhoto(selectedPhoto)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Vymazať
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
