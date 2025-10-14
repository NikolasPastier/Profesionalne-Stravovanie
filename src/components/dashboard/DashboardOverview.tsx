import { FormEvent, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
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
            console.error("Error creating signed URL:", signedError);
            return { ...photo, signed_url: "" };
          }

          return { ...photo, signed_url: signedData.signedUrl };
        })
      );

      setPhotos(photosWithSignedUrls);
    } catch (error) {
      console.error("Error loading photos:", error);
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
      console.error("Error deleting photo:", error);
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
        console.error("Chyba pri aktualizácii profilu:", profileError);
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
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Odporúčané menu
            </CardTitle>
            <UtensilsCrossed className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {getRecommendedMenuSize()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pre váš cieľ: {profile.goal}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aktuálna váha
            </CardTitle>
            <Scale className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getCurrentWeight().toFixed(1)} kg
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cieľová váha
            </CardTitle>
            <TrendingDown className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getGoalWeight().toFixed(1)} kg
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Zostáva
            </CardTitle>
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {getRemainingWeight().toFixed(1)} kg
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progress Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Graf pokroku</CardTitle>
            <CardDescription>
              Váš pokrok za posledných 6 týždňov
            </CardDescription>
          </CardHeader>
          <CardContent>
            {getChartData().length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={getChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={['auto', 'auto']} />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="weight" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2} 
                    dot={{ fill: 'hsl(var(--primary))', r: 4 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Zatiaľ nemáte žiadne záznamy. Pridajte svoju prvú váhu.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Weight Form */}
        <Card>
          <CardHeader>
            <CardTitle>Pridať váhu</CardTitle>
            <CardDescription>
              Zaznamenajte svoju týždennú váhu a fotku
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddWeight} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="weight">Váha (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  placeholder="Napr. 75.5"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="photo">Progress fotka (voliteľné)</Label>
                <Input
                  id="photo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                />
                {photoFile && (
                  <p className="text-sm text-muted-foreground">
                    <Camera className="inline h-3 w-3 mr-1" />
                    {photoFile.name}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full">
                Uložiť váhu
              </Button>
            </form>

            <div className="mt-6 space-y-3">
              <h4 className="font-medium">Tipy na úspech:</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Vážte sa ráno na prázdny žalúdok</li>
                <li>• Buďte konzistentní s meraním</li>
                <li>• Sledujte dlhodobý trend</li>
                <li>• Pridajte fotku pre lepšiu motiváciu</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calorie Tracker Section */}
      {profile?.gender && bmr > 0 && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Flame className="h-5 w-5" />
              Kalorický Plán & Cieľ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* BMR & TDEE */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Activity className="h-4 w-4" />
                  <span>BMR</span>
                </div>
                <p className="text-2xl font-bold">{Math.round(bmr)}</p>
                <p className="text-xs text-muted-foreground">kcal/deň</p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Flame className="h-4 w-4" />
                  <span>TDEE</span>
                </div>
                <p className="text-2xl font-bold">{tdee}</p>
                <p className="text-xs text-muted-foreground">kcal/deň</p>
              </div>
            </div>

            {/* Target Calories */}
            <div className="space-y-1 pt-2 border-t border-border">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Target className="h-4 w-4" />
                <span>Cieľový príjem</span>
              </div>
              <p className="text-3xl font-bold text-primary">{targetCalories}</p>
              <p className="text-xs text-muted-foreground">kcal/deň</p>
            </div>

            {/* Deficit/Surplus */}
            <div className={`space-y-1 pt-2 border-t border-border ${getDeficitColor(dailyDeficit)}`}>
              <div className="flex items-center gap-2 text-sm">
                {getDeficitIcon(dailyDeficit)}
                <span>{getDeficitLabel(dailyDeficit)}</span>
              </div>
              <p className="text-2xl font-bold">
                {dailyDeficit > 0 ? '-' : dailyDeficit < 0 ? '+' : ''}
                {Math.abs(dailyDeficit)}
              </p>
              <p className="text-xs">kcal/deň</p>
            </div>

            {/* Time to Goal */}
            {timeToGoal && profile?.goal_weight && (
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Clock className="h-4 w-4" />
                  <span>Odhadovaný čas dosiahnutia cieľa</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-primary">
                    {timeToGoal.months}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {timeToGoal.months === 1 ? 'mesiac' : timeToGoal.months < 5 ? 'mesiace' : 'mesiacov'}
                  </span>
                  <span className="text-muted-foreground">({timeToGoal.weeks} týždňov)</span>
                </div>

                {/* Progress Bar */}
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

                {/* Trend Message */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                  <p className="text-sm text-center">
                    {progress < 10 && "🚀 Začíname! Každý krok sa počíta"}
                    {progress >= 10 && progress < 30 && "💪 Výborne! Držíte správny smer"}
                    {progress >= 30 && progress < 60 && "🎯 Skvelý progres! Pokračujte ďalej"}
                    {progress >= 60 && progress < 90 && "🔥 Fantastické! Blížite sa k cieľu"}
                    {progress >= 90 && "🏆 Už takmer tam! Finálne úsilie"}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Progress Photo Gallery */}
      {isLoadingPhotos ? (
        <Card>
          <CardHeader>
            <CardTitle>Fotogaléria pokroku</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">Načítavam...</div>
          </CardContent>
        </Card>
      ) : photos.length === 0 ? (
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
      ) : (
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
      )}

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
    </div>
  );
}
