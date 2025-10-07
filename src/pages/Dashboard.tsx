import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { User, Target, Activity, TrendingUp } from "lucide-react";

interface UserProfile {
  name: string;
  age: number;
  height: number;
  weight: number;
  goal: string;
  activity: string;
  allergies: string[];
  preferences: string[];
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserAndLoadProfile();
  }, []);

  const checkUserAndLoadProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          navigate("/onboarding");
          return;
        }
        throw error;
      }

      setProfile(data as UserProfile);
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRecommendedMenuSize = () => {
    if (!profile) return "M";

    const { weight, goal, activity } = profile;
    let baseCalories = weight * 30;

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary text-xl">Načítavam...</div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-display text-primary">
              Môj Dashboard
            </h1>
            <Button onClick={handleLogout} variant="outline">
              Odhlásiť sa
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Meno</CardTitle>
                <User className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {profile.name}
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cieľ</CardTitle>
                <Target className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {profile.goal}
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Aktivita</CardTitle>
                <Activity className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {profile.activity}
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Váha</CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {profile.weight} kg
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-primary">
                  Odporúčaná veľkosť menu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="text-6xl font-display text-primary mb-4">
                    {getRecommendedMenuSize()}
                  </div>
                  <p className="text-muted-foreground">
                    Na základe vášho profilu odporúčame túto veľkosť menu
                  </p>
                  <Button
                    onClick={() => navigate("/menu")}
                    className="mt-6 bg-primary hover:bg-primary/90"
                  >
                    Zobraziť menu
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-primary">Osobné údaje</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vek:</span>
                  <span className="font-semibold">{profile.age} rokov</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Výška:</span>
                  <span className="font-semibold">{profile.height} cm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Váha:</span>
                  <span className="font-semibold">{profile.weight} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Alergie:</span>
                  <span className="font-semibold">
                    {profile.allergies?.join(", ") || "Žiadne"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Preferencie:</span>
                  <span className="font-semibold">
                    {profile.preferences?.join(", ") || "Žiadne"}
                  </span>
                </div>
                <Button
                  onClick={() => navigate("/onboarding")}
                  variant="outline"
                  className="w-full mt-4"
                >
                  Upraviť profil
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card className="border-primary/20 mt-6">
            <CardHeader>
              <CardTitle className="text-primary">Rýchle akcie</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <Button
                onClick={() => navigate("/orders")}
                className="bg-primary hover:bg-primary/90"
              >
                Moje objednávky
              </Button>
              <Button
                onClick={() => navigate("/cart")}
                variant="outline"
              >
                Košík
              </Button>
              <Button
                onClick={() => navigate("/cennik")}
                variant="outline"
              >
                Cenník
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
