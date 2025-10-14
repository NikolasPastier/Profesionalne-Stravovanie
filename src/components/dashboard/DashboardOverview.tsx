import { FormEvent, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UtensilsCrossed, Scale, TrendingDown, Calendar, Camera } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CalorieTracker } from "./CalorieTracker";
import { MotivationalQuote } from "./MotivationalQuote";
import { AIMotivator } from "./AIMotivator";
import { ProgressGallery } from "./ProgressGallery";

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

      {/* Calorie Tracker */}
      {profile?.gender && (
        <CalorieTracker 
          weight={profile.weight}
          height={profile.height}
          age={profile.age}
          gender={profile.gender}
          activity={profile.activity}
          goal={profile.goal}
          goalWeight={profile.goal_weight}
        />
      )}

      {/* AI & Motivation Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AIMotivator userProfile={{ ...profile, user_id: userId }} progressData={progressData} />
        <MotivationalQuote />
      </div>

      {/* Progress Photo Gallery */}
      <ProgressGallery userId={userId} />
    </div>
  );
}
