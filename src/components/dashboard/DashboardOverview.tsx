import { FormEvent, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UtensilsCrossed, Scale, TrendingDown, Calendar, Camera, Flame, Target, TrendingUp, Clock, Activity, Weight, Trash2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from "date-fns";
interface UserProfile {
  name: string;
  age: number;
  height: number;
  weight: number;
  goal: string;
  activity: string;
  allergies: string[];
  preferences: string[];
  dislikes?: string[];
  favorite_foods?: string[];
  health_issues?: string;
  gender?: 'male' | 'female';
  goal_weight?: number;
}
interface ProgressEntry {
  id: string;
  date: string;
  weight: number;
  created_at: string;
}
interface ProgressPhoto {
  id: string;
  date: string;
  weight: number | null;
  photo_url: string;
  signed_url?: string;
}
interface DashboardOverviewProps {
  profile: UserProfile;
  userId: string;
  progressData: ProgressEntry[];
  onWeightAdded: () => void;
}
export function DashboardOverview({
  profile,
  userId,
  progressData,
  onWeightAdded
}: DashboardOverviewProps) {
  const {
    toast
  } = useToast();
  const [newWeight, setNewWeight] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhoto | null>(null);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(true);

  // Load progress photos
  useEffect(() => {
    loadPhotos();
  }, [userId]);
  const loadPhotos = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("progress").select("id, date, weight, photo_url").eq("user_id", userId).not("photo_url", "is", null).order("date", {
        ascending: false
      });
      if (error) throw error;

      // Create signed URLs for each photo
      const photosWithSignedUrls = await Promise.all((data || []).map(async photo => {
        const {
          data: signedData,
          error: signedError
        } = await supabase.storage.from("progress-photos").createSignedUrl(photo.photo_url, 3600); // 1 hour expiration

        if (signedError) {
          if (import.meta.env.DEV) {
            console.error("Error creating signed URL:", signedError);
          }
          return {
            ...photo,
            signed_url: ""
          };
        }
        return {
          ...photo,
          signed_url: signedData.signedUrl
        };
      }));
      setPhotos(photosWithSignedUrls);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error loading photos:", error);
      }
      toast({
        title: "Chyba",
        description: "Nepodarilo sa načítať fotky",
        variant: "destructive"
      });
    } finally {
      setIsLoadingPhotos(false);
    }
  };
  const deletePhoto = async (photo: ProgressPhoto) => {
    try {
      // Delete from storage
      const {
        error: storageError
      } = await supabase.storage.from("progress-photos").remove([photo.photo_url]);
      if (storageError) throw storageError;

      // Update database record
      const {
        error: dbError
      } = await supabase.from("progress").update({
        photo_url: null
      }).eq("id", photo.id);
      if (dbError) throw dbError;
      toast({
        title: "Úspech",
        description: "Fotka bola vymazaná"
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
        variant: "destructive"
      });
    }
  };

  // CalorieTracker functions
  const calculateBMR = (): number => {
    if (!profile?.gender || !profile?.weight || !profile?.height || !profile?.age) return 0;
    if (profile.gender === 'male') {
      return 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5;
    } else {
      return 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161;
    }
  };
  const calculateTDEE = (bmr: number): number => {
    if (!profile?.activity) return bmr;
    const activityMultipliers: Record<string, number> = {
      'sedavy': 1.2,
      'mierny': 1.375,
      'aktivny': 1.55,
      'velmi': 1.725
    };
    return Math.round(bmr * (activityMultipliers[profile.activity] || 1.2));
  };
  const calculateTargetCalories = (tdee: number): number => {
    if (!profile?.goal) return tdee;
    const goalAdjustments: Record<string, number> = {
      'hubnutie': -500,
      'udrzat': 0,
      'udrzanie': 0,
      'nabrat': 500,
      'zdravie': 0
    };
    return Math.round(tdee + (goalAdjustments[profile.goal] || 0));
  };
  const calculateTimeToGoal = (dailyDeficit: number): {
    weeks: number;
    months: number;
  } | null => {
    if (!profile?.goal_weight || !profile?.weight || profile.goal_weight === profile.weight || dailyDeficit === 0) return null;
    const remainingWeight = Math.abs(profile.weight - profile.goal_weight);
    const weeklyWeightChange = Math.abs(dailyDeficit * 7 / 7700);
    const weeks = Math.ceil(remainingWeight / weeklyWeightChange);
    const months = Math.round(weeks / 4.33);
    return {
      weeks,
      months
    };
  };
  const calculateProgress = (): number => {
    if (!profile?.goal_weight || !profile?.weight || profile.goal_weight === profile.weight) return 0;

    // Determine starting weight based on goal
    let startWeight = profile.weight;
    if (profile.goal === 'hubnutie' && profile.goal_weight < profile.weight) {
      startWeight = profile.weight + Math.abs(profile.weight - profile.goal_weight);
    } else if (profile.goal === 'nabrat' && profile.goal_weight > profile.weight) {
      startWeight = profile.weight;
    }
    const totalChange = Math.abs(startWeight - profile.goal_weight);
    const currentChange = Math.abs(startWeight - profile.weight);
    return Math.min(100, Math.round(currentChange / totalChange * 100));
  };
  const getDeficitColor = (dailyDeficit: number) => {
    if (dailyDeficit > 0) return "text-orange-500";
    if (dailyDeficit < 0) return "text-green-500";
    return "text-blue-500";
  };
  const getDeficitIcon = (dailyDeficit: number) => {
    if (dailyDeficit > 0) return <TrendingDown className="h-5 w-5" />;
    if (dailyDeficit < 0) return <TrendingUp className="h-5 w-5" />;
    return <Activity className="h-5 w-5" />;
  };
  const getDeficitLabel = (dailyDeficit: number) => {
    if (dailyDeficit > 0) return "Deficit";
    if (dailyDeficit < 0) return "Surplus";
    return "Udržanie";
  };
  const bmr = calculateBMR();
  const tdee = calculateTDEE(bmr);
  const targetCalories = calculateTargetCalories(tdee);
  const dailyDeficit = tdee - targetCalories;
  const timeToGoal = calculateTimeToGoal(dailyDeficit);
  const progress = calculateProgress();
  const getCurrentWeight = () => {
    if (progressData.length > 0) {
      return progressData[progressData.length - 1].weight;
    }
    return profile?.weight || 0;
  };
  const getGoalWeight = () => {
    if (!profile) return 0;
    // Use goal_weight from database if available, otherwise calculate as fallback
    if (profile.goal_weight) return profile.goal_weight;
    return profile.goal === "hubnutie" ? profile.weight * 0.9 : profile.weight * 1.1;
  };
  const getRemainingWeight = () => {
    const current = getCurrentWeight();
    const goal = getGoalWeight();
    return Math.abs(current - goal);
  };
  const getRecommendedMenuSize = () => {
    if (!profile) return "M";
    const currentWeight = getCurrentWeight();
    const {
      goal,
      activity
    } = profile;
    let baseCalories = currentWeight * 30;
    if (activity === "velmi") baseCalories *= 1.3;else if (activity === "aktivny") baseCalories *= 1.2;else if (activity === "mierny") baseCalories *= 1.1;
    if (goal === "hubnutie") baseCalories *= 0.85;else if (goal === "nabrat") baseCalories *= 1.15;
    if (baseCalories < 1500) return "S";
    if (baseCalories < 2000) return "M";
    if (baseCalories < 2500) return "L";
    if (baseCalories < 3000) return "XL";
    return "XXL";
  };
  const getChartData = () => {
    return progressData.map(entry => ({
      date: new Date(entry.date).toLocaleDateString("sk-SK", {
        day: "numeric",
        month: "numeric"
      }),
      weight: entry.weight
    }));
  };
  const handleAddWeight = async (e: FormEvent) => {
    e.preventDefault();
    if (!newWeight || !profile) return;
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      let photoUrl = null;
      if (photoFile) {
        const formData = new FormData();
        formData.append('file', photoFile);
        const {
          data: uploadData,
          error: uploadError
        } = await supabase.functions.invoke('upload-progress-photo', {
          body: formData
        });
        if (uploadError || !uploadData?.success) {
          throw new Error(uploadData?.error || 'Nepodarilo sa nahrať fotografiu');
        }
        photoUrl = uploadData.fileName;
      }
      const {
        error
      } = await supabase.from("progress").insert({
        user_id: user.id,
        weight: parseFloat(newWeight),
        date: new Date().toISOString().split("T")[0],
        photo_url: photoUrl
      });
      if (error) throw error;
      const {
        error: profileError
      } = await supabase.from("user_profiles").update({
        weight: parseFloat(newWeight)
      }).eq("user_id", user.id);
      if (profileError) {
        if (import.meta.env.DEV) {
          console.error("Chyba pri aktualizácii profilu:", profileError);
        }
      }
      onWeightAdded();
      const newRecommendation = getRecommendedMenuSize();
      toast({
        title: "Úspech",
        description: `Váha bola úspešne pridaná! Vaše odporúčanie na menu: ${newRecommendation}`
      });
      setNewWeight("");
      setPhotoFile(null);
      loadPhotos(); // Reload photos after adding new one
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error.message || "Nepodarilo sa pridať váhu. Skúste to prosím znova.",
        variant: "destructive"
      });
    }
  };
  return <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-6 w-6" />
            Dashboard Prehľad
          </CardTitle>
          <CardDescription>
            Kompletný prehľad vášho pokroku a cieľov
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Compact Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-center space-y-1">
              <UtensilsCrossed className="h-4 w-4 mx-auto text-muted-foreground" />
              <div className="text-2xl font-bold text-primary">{getRecommendedMenuSize()}</div>
              <div className="text-xs text-muted-foreground">Odporúčané menu</div>
            </div>
            <div className="text-center space-y-1">
              <Scale className="h-4 w-4 mx-auto text-muted-foreground" />
              <div className="text-2xl font-bold">{getCurrentWeight().toFixed(1)} kg</div>
              <div className="text-xs text-muted-foreground">Aktuálna váha</div>
            </div>
            <div className="text-center space-y-1">
              <TrendingDown className="h-4 w-4 mx-auto text-muted-foreground" />
              <div className="text-2xl font-bold">{getGoalWeight().toFixed(1)} kg</div>
              <div className="text-xs text-muted-foreground">Cieľová váha</div>
            </div>
            <div className="text-center space-y-1">
              <Calendar className="h-4 w-4 mx-auto text-muted-foreground" />
              <div className="text-2xl font-bold text-orange-500">{getRemainingWeight().toFixed(1)} kg</div>
              <div className="text-xs text-muted-foreground">Zostáva</div>
            </div>
          </div>

          <Separator />

          {/* Calorie Plan - Horizontal Layout */}
          {profile?.gender && bmr > 0 && <div>
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Flame className="h-5 w-5 text-primary" />
                Kalorický plán
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <Activity className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                  <div className="text-sm text-muted-foreground">BMR</div>
                  <div className="text-xl font-bold">{Math.round(bmr)}</div>
                  <div className="text-xs text-muted-foreground">kcal/deň</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <Flame className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                  <div className="text-sm text-muted-foreground">TDEE</div>
                  
                  <div className="text-xs text-muted-foreground">kcal/deň</div>
                </div>
                <div className="text-center p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <Target className="h-4 w-4 mx-auto text-primary mb-1" />
                  <div className="text-sm text-primary">Cieľ</div>
                  <div className="text-xl font-bold text-primary">{targetCalories}</div>
                  <div className="text-xs text-muted-foreground">kcal/deň</div>
                </div>
                <div className={`text-center p-3 rounded-lg border ${getDeficitColor(dailyDeficit)} bg-muted/30`}>
                  <div className="h-4 w-4 mx-auto mb-1">{getDeficitIcon(dailyDeficit)}</div>
                  <div className="text-sm">{getDeficitLabel(dailyDeficit)}</div>
                  <div className="text-xl font-bold">
                    {dailyDeficit > 0 ? '-' : dailyDeficit < 0 ? '+' : ''}
                    {Math.abs(dailyDeficit)}
                  </div>
                  <div className="text-xs">kcal/deň</div>
                </div>
              </div>

              {/* Time to Goal + Progress */}
              {timeToGoal && profile?.goal_weight && <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Odhadovaný čas dosiahnutia cieľa</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-primary">{timeToGoal.months}</span>
                      <span className="text-sm text-muted-foreground">
                        {timeToGoal.months === 1 ? 'mesiac' : timeToGoal.months < 5 ? 'mesiace' : 'mesiacov'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progres k cieľu</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{profile.weight} kg</span>
                      <span className="font-medium text-primary">{profile.goal_weight} kg</span>
                    </div>
                  </div>

                  <p className="text-sm text-center">
                    {progress < 10 && "🚀 Začíname! Každý krok sa počíta"}
                    {progress >= 10 && progress < 30 && "💪 Výborne! Držíte správny smer"}
                    {progress >= 30 && progress < 60 && "🎯 Skvelý progres! Pokračujte ďalej"}
                    {progress >= 60 && progress < 90 && "🔥 Fantastické! Blížite sa k cieľu"}
                    {progress >= 90 && "🏆 Už takmer tam! Finálne úsilie"}
                  </p>
                </div>}
            </div>}

          <Separator />

          {/* Progress Chart and Add Weight - Side by Side on Desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
            {/* Progress Chart */}
            <div>
              <h3 className="font-semibold text-lg mb-4">Graf pokroku</h3>
              {getChartData().length > 0 ? <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={getChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={['auto', 'auto']} />
                    <Tooltip />
                    <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} dot={{
                  fill: 'hsl(var(--primary))',
                  r: 4
                }} />
                  </LineChart>
                </ResponsiveContainer> : <div className="h-[300px] flex items-center justify-center text-muted-foreground border border-dashed rounded-lg">
                  Zatiaľ nemáte žiadne záznamy. Pridajte svoju prvú váhu.
                </div>}
            </div>

            {/* Add Weight Form */}
            <div>
              <h3 className="font-semibold text-lg mb-4">Pridať váhu</h3>
              <form onSubmit={handleAddWeight} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">Váha (kg)</Label>
                  <Input id="weight" type="number" step="0.1" value={newWeight} onChange={e => setNewWeight(e.target.value)} placeholder="Napr. 75.5" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="photo">Progress fotka (voliteľné)</Label>
                  <Input id="photo" type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files?.[0] || null)} />
                  {photoFile && <p className="text-sm text-muted-foreground">
                      <Camera className="inline h-3 w-3 mr-1" />
                      {photoFile.name}
                    </p>}
                </div>
                <Button type="submit" className="w-full">
                  Uložiť váhu
                </Button>
              </form>

              <div className="mt-6 space-y-2">
                <h4 className="font-medium text-sm">Tipy na úspech:</h4>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li>• Vážte sa ráno na prázdny žalúdok</li>
                  <li>• Buďte konzistentní s meraním</li>
                  <li>• Sledujte dlhodobý trend</li>
                  <li>• Pridajte fotku pre lepšiu motiváciu</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Photo Gallery - Compact */}
          {!isLoadingPhotos && photos.length > 0 && <>
              <Separator />
              <div>
                <h3 className="font-semibold text-lg mb-4">Fotogaléria pokroku ({photos.length})</h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {photos.slice(0, 6).map(photo => <div key={photo.id} className="relative group cursor-pointer rounded-lg overflow-hidden border hover:border-primary transition-colors aspect-square" onClick={() => setSelectedPhoto(photo)}>
                      <img src={photo.signed_url || ""} alt={`Progress ${format(new Date(photo.date), "dd.MM.yyyy")}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-1">
                        <div className="text-xs font-medium">{format(new Date(photo.date), "dd.MM")}</div>
                        {photo.weight && <div className="flex items-center gap-1 text-xs mt-1">
                            <Weight className="h-3 w-3" />
                            {photo.weight}kg
                          </div>}
                      </div>
                    </div>)}
                </div>

                {photos.length > 6 && <p className="text-sm text-muted-foreground text-center mt-3">
                    +{photos.length - 6} ďalších fotiek (kliknite na fotku pre detail)
                  </p>}

                {photos.length >= 2 && <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-semibold mb-3 text-sm">Porovnanie Before/After</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Prvá fotka</p>
                        <img src={photos[photos.length - 1].signed_url || ""} alt="Before" className="w-full h-48 object-cover rounded-lg cursor-pointer" onClick={() => setSelectedPhoto(photos[photos.length - 1])} />
                        <p className="text-xs mt-2">
                          {format(new Date(photos[photos.length - 1].date), "dd.MM.yyyy")}
                          {photos[photos.length - 1].weight && ` - ${photos[photos.length - 1].weight} kg`}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Najnovšia fotka</p>
                        <img src={photos[0].signed_url || ""} alt="After" className="w-full h-48 object-cover rounded-lg cursor-pointer" onClick={() => setSelectedPhoto(photos[0])} />
                        <p className="text-xs mt-2">
                          {format(new Date(photos[0].date), "dd.MM.yyyy")}
                          {photos[0].weight && ` - ${photos[0].weight} kg`}
                        </p>
                      </div>
                    </div>
                  </div>}
              </div>
            </>}

          {isLoadingPhotos && <>
              <Separator />
              <div className="text-center py-8 text-muted-foreground">
                Načítavam fotogalériu...
              </div>
            </>}

          {!isLoadingPhotos && photos.length === 0 && <>
              <Separator />
              <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                Zatiaľ nemáte žiadne fotky. Pridajte prvú fotku pri zaznamenaní váhy!
              </div>
            </>}
        </CardContent>
      </Card>

      {/* Photo Detail Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={open => !open && setSelectedPhoto(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detail fotky</DialogTitle>
          </DialogHeader>
          {selectedPhoto && <div className="space-y-4">
              <img src={selectedPhoto.signed_url || ""} alt="Progress detail" className="w-full rounded-lg" />
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(selectedPhoto.date), "dd.MM.yyyy")}
                  </div>
                  {selectedPhoto.weight && <div className="flex items-center gap-2 text-sm mt-2">
                      <Weight className="h-4 w-4" />
                      {selectedPhoto.weight} kg
                    </div>}
                </div>
                <Button variant="destructive" size="sm" onClick={() => deletePhoto(selectedPhoto)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Vymazať
                </Button>
              </div>
            </div>}
        </DialogContent>
      </Dialog>
    </>;
}