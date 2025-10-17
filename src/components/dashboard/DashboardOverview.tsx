import { FormEvent, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tooltip as TooltipUI, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UtensilsCrossed, Scale, Target, Calendar, Camera, Flame, TrendingUp, Clock, Activity, Weight, Trash2, Plus, Info } from "lucide-react";
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

export function DashboardOverview({ profile, userId, progressData, onWeightAdded }: DashboardOverviewProps) {
  const { toast } = useToast();
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
      setIsLoadingPhotos(false);
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

  const calculateTimeToGoal = (dailyDeficit: number): { weeks: number; months: number } | null => {
    if (!profile?.goal_weight || !profile?.weight || profile.goal_weight === profile.weight || dailyDeficit === 0) return null;
    
    const remainingWeight = Math.abs(profile.weight - profile.goal_weight);
    const weeklyWeightChange = Math.abs((dailyDeficit * 7) / 7700);
    const weeks = Math.ceil(remainingWeight / weeklyWeightChange);
    const months = Math.round(weeks / 4.33);
    
    return { weeks, months };
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
    return Math.min(100, Math.round((currentChange / totalChange) * 100));
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
    const { goal, activity } = profile;
    let baseCalories = currentWeight * 30;

    if (activity === "velmi") baseCalories *= 1.3;
    else if (activity === "aktivny") baseCalories *= 1.2;
    else if (activity === "mierny") baseCalories *= 1.1;

    if (goal === "hubnutie") baseCalories *= 0.85;
    else if (goal === "nabrat") baseCalories *= 1.15;

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let photoUrl = null;

      if (photoFile) {
        const formData = new FormData();
        formData.append('file', photoFile);

        const { data: uploadData, error: uploadError } = await supabase.functions.invoke(
          'upload-progress-photo',
          {
            body: formData,
          }
        );

        if (uploadError || !uploadData?.success) {
          throw new Error(uploadData?.error || 'Nepodarilo sa nahrať fotografiu');
        }

        photoUrl = uploadData.fileName;
      }

      const { error } = await supabase.from("progress").insert({
        user_id: user.id,
        weight: parseFloat(newWeight),
        date: new Date().toISOString().split("T")[0],
        photo_url: photoUrl
      });

      if (error) throw error;

      const { error: profileError } = await supabase
        .from("user_profiles")
        .update({ weight: parseFloat(newWeight) })
        .eq("user_id", user.id);

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

  return (
    <TooltipProvider>
      <div className="w-full space-y-6 animate-fade-in">
        {/* Top Bar - Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="card-premium hover:scale-105 transition-smooth border-border/50">
            <CardContent className="p-6 text-center space-y-2">
              <Scale className="h-8 w-8 mx-auto text-white/60" />
              <div className="text-3xl font-bold text-white">{getCurrentWeight().toFixed(1)} kg</div>
              <div className="text-sm text-white/60">Aktuálna váha</div>
            </CardContent>
          </Card>
          
          <Card className="card-premium hover:scale-105 transition-smooth border-border/50">
            <CardContent className="p-6 text-center space-y-2">
              <Target className="h-8 w-8 mx-auto text-white/60" />
              <div className="text-3xl font-bold text-white">{getGoalWeight().toFixed(1)} kg</div>
              <div className="text-sm text-white/60">Cieľová váha</div>
            </CardContent>
          </Card>
          
          <Card className="card-premium hover:scale-105 transition-smooth border-orange-500/20 bg-gradient-to-br from-card to-orange-500/5">
            <CardContent className="p-6 text-center space-y-2">
              <Calendar className="h-8 w-8 mx-auto" style={{ color: 'hsl(25, 95%, 53%)' }} />
              <div className="text-3xl font-bold" style={{ color: 'hsl(25, 95%, 53%)' }}>{getRemainingWeight().toFixed(1)} kg</div>
              <div className="text-sm text-white/60">Zostáva</div>
            </CardContent>
          </Card>
          
          <Card className="card-premium hover:scale-105 transition-smooth border-border/50">
            <CardContent className="p-6 text-center space-y-2">
              <UtensilsCrossed className="h-8 w-8 mx-auto text-white/60" />
              <div className="text-3xl font-bold text-white">{getRecommendedMenuSize()}</div>
              <div className="text-sm text-white/60">Odporúčané menu</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Section - Graph with Metrics */}
        <Card className="card-premium border-border/50">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr_200px] gap-6 items-start">
              {/* Left Metrics */}
              {profile?.gender && bmr > 0 && (
                <div className="space-y-4">
                  <Card className="bg-muted/30 border-border/30 hover:border-border/60 transition-smooth">
                    <CardContent className="p-4 text-center space-y-1">
                      <Activity className="h-5 w-5 mx-auto text-white/50" />
                      <div className="text-xs text-white/50">BMR</div>
                      <div className="text-2xl font-bold text-white">{Math.round(bmr)}</div>
                      <div className="text-xs text-white/40">kcal/deň</div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-muted/30 border-border/30 hover:border-border/60 transition-smooth">
                    <CardContent className="p-4 text-center space-y-1">
                      <Flame className="h-5 w-5 mx-auto text-white/50" />
                      <div className="text-xs text-white/50">TDEE</div>
                      <div className="text-2xl font-bold text-white">{tdee}</div>
                      <div className="text-xs text-white/40">kcal/deň</div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Center - Graph */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white text-center">Graf pokroku</h3>
                {getChartData().length > 0 ? (
                  <div className="bg-muted/20 rounded-2xl p-4 border border-border/30">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={getChartData()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis 
                          dataKey="date" 
                          stroke="rgba(255,255,255,0.5)"
                          style={{ fontSize: '12px' }}
                        />
                        <YAxis 
                          domain={['auto', 'auto']} 
                          stroke="rgba(255,255,255,0.5)"
                          style={{ fontSize: '12px' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(0,0,0,0.9)', 
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="weight" 
                          stroke="hsl(25, 95%, 53%)"
                          strokeWidth={3} 
                          dot={{ fill: 'hsl(25, 95%, 53%)', r: 5 }} 
                          activeDot={{ r: 7 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-white/40 border border-dashed border-white/10 rounded-2xl">
                    Zatiaľ nemáte žiadne záznamy
                  </div>
                )}

                {/* Progress Bar Below Graph */}
                {timeToGoal && profile?.goal_weight && (
                  <div className="space-y-3 bg-gradient-to-br from-muted/30 to-muted/10 rounded-2xl p-4 border border-border/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-white/60">
                        <Clock className="h-4 w-4" />
                        <span>Odhadovaný čas</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-white">{timeToGoal.months}</span>
                        <span className="text-sm text-white/60">
                          {timeToGoal.months === 1 ? 'mesiac' : timeToGoal.months < 5 ? 'mesiace' : 'mesiacov'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/60">Progres</span>
                        <span className="font-medium text-white">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  </div>
                )}
              </div>

              {/* Right Metrics */}
              {profile?.gender && bmr > 0 && (
                <div className="space-y-4">
                  <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20 hover:border-green-500/40 transition-smooth">
                    <CardContent className="p-4 text-center space-y-1">
                      <TrendingUp className="h-5 w-5 mx-auto" style={{ color: 'hsl(142, 76%, 36%)' }} />
                      <div className="text-xs text-white/50">{getDeficitLabel(dailyDeficit)}</div>
                      <div className="text-2xl font-bold" style={{ color: 'hsl(142, 76%, 36%)' }}>
                        {dailyDeficit > 0 ? '-' : dailyDeficit < 0 ? '+' : ''}
                        {Math.abs(dailyDeficit)}
                      </div>
                      <div className="text-xs text-white/40">kcal/deň</div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-muted/30 border-border/30 hover:border-border/60 transition-smooth">
                    <CardContent className="p-4 text-center space-y-1">
                      <Target className="h-5 w-5 mx-auto text-white/50" />
                      <div className="text-xs text-white/50">Cieľ</div>
                      <div className="text-2xl font-bold text-white">{targetCalories}</div>
                      <div className="text-xs text-white/40">kcal/deň</div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bottom Section - Add Weight & Tips */}
        <Card className="card-premium border-border/50">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Add Weight Form */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Pridať záznam</h3>
                <form onSubmit={handleAddWeight} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="weight" className="text-white/80">Váha (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      value={newWeight}
                      onChange={(e) => setNewWeight(e.target.value)}
                      placeholder="Napr. 75.5"
                      className="bg-muted/30 border-border/30 text-white"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="photo" className="text-white/80">Progress fotka (voliteľné)</Label>
                    <Input
                      id="photo"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                      className="bg-muted/30 border-border/30 text-white"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button type="submit" className="flex-1 bg-white text-black hover:bg-white/90">
                      <Plus className="h-4 w-4 mr-2" />
                      Pridať váhu
                    </Button>
                    {photoFile && (
                      <Button type="button" variant="outline" className="flex-1" onClick={() => setPhotoFile(null)}>
                        <Camera className="h-4 w-4 mr-2" />
                        Zrušiť fotku
                      </Button>
                    )}
                  </div>
                </form>
              </div>

              {/* Tips */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Tipy na úspech</h3>
                <div className="space-y-3">
                  <TooltipUI>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-smooth cursor-help">
                        <Info className="h-5 w-5 text-white/50" />
                        <span className="text-sm text-white/80">Vážte sa ráno</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Vážte sa vždy ráno na prázdny žalúdok pre najpresnejšie výsledky</p>
                    </TooltipContent>
                  </TooltipUI>

                  <TooltipUI>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-smooth cursor-help">
                        <Info className="h-5 w-5 text-white/50" />
                        <span className="text-sm text-white/80">Sledujte trend</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Nepanikte pri denných výkyvoch, sledujte dlhodobý trend</p>
                    </TooltipContent>
                  </TooltipUI>

                  <TooltipUI>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-smooth cursor-help">
                        <Info className="h-5 w-5 text-white/50" />
                        <span className="text-sm text-white/80">Buďte konzistentní</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Pravidelnosť je kľúčom k úspechu, meranie aspoň 2x týždenne</p>
                    </TooltipContent>
                  </TooltipUI>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Photo Gallery */}
        {!isLoadingPhotos && photos.length > 0 && (
          <Card className="card-premium border-border/50">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Fotogaléria pokroku ({photos.length})
              </h3>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {photos.slice(0, 6).map((photo) => (
                  <div
                    key={photo.id}
                    className="relative group cursor-pointer rounded-lg overflow-hidden border border-border/30 hover:border-orange-500/50 transition-smooth aspect-square"
                    onClick={() => setSelectedPhoto(photo)}
                  >
                    <img
                      src={photo.signed_url || ""}
                      alt={`Progress ${format(new Date(photo.date), "dd.MM.yyyy")}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-smooth flex flex-col items-center justify-center text-white p-1">
                      <div className="text-xs font-medium">{format(new Date(photo.date), "dd.MM")}</div>
                      {photo.weight && (
                        <div className="flex items-center gap-1 text-xs mt-1">
                          <Weight className="h-3 w-3" />
                          {photo.weight}kg
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Photo Detail Dialog */}
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
    </TooltipProvider>
  );
}
