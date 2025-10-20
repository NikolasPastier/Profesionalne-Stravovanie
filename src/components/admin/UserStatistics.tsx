import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Activity, TrendingUp, Calendar, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface UserProfile {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  age: number | null;
  height: number | null;
  weight: number | null;
  goal_weight: number | null;
  goal: string | null;
  gender: string | null;
  activity: string | null;
  health_issues: string | null;
  allergies: string[] | null;
  preferences: string[] | null;
  dislikes: string[] | null;
  favorite_foods: string[] | null;
  created_at: string;
}

interface ProgressEntry {
  id: string;
  user_id: string;
  date: string;
  weight: number | null;
  photo_url: string | null;
  created_at: string;
}

interface UserStats {
  profile: UserProfile;
  progressCount: number;
  lastActivity: string | null;
  progressPercent: number | null;
  progressEntries: ProgressEntry[];
}

export const UserStatistics = () => {
  const [users, setUsers] = useState<UserStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserStats | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    loadAllUsers();
  }, []);

  const loadAllUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch all user profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("user_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all progress entries
      const { data: progressData, error: progressError } = await supabase
        .from("progress")
        .select("*")
        .order("date", { ascending: false });

      if (progressError) throw progressError;

      // Combine data
      const userStats: UserStats[] = profiles.map((profile) => {
        const userProgress = progressData.filter((p) => p.user_id === profile.user_id);
        const lastEntry = userProgress[0];
        
        let progressPercent = null;
        if (profile.goal_weight && profile.weight && lastEntry?.weight) {
          const start = profile.weight;
          const current = lastEntry.weight;
          const goal = profile.goal_weight;
          const totalChange = Math.abs(goal - start);
          const currentChange = Math.abs(current - start);
          progressPercent = totalChange > 0 ? Math.round((currentChange / totalChange) * 100) : 0;
        }

        return {
          profile,
          progressCount: userProgress.length,
          lastActivity: lastEntry?.date || null,
          progressPercent,
          progressEntries: userProgress,
        };
      });

      setUsers(userStats);
    } catch (error: any) {
      console.error("Error loading users:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa načítať používateľov",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPhotoUrls = async (entries: ProgressEntry[]) => {
    const urls: Record<string, string> = {};
    for (const entry of entries) {
      if (entry.photo_url) {
        const { data } = await supabase.storage
          .from("progress-photos")
          .createSignedUrl(entry.photo_url, 3600);
        if (data?.signedUrl) {
          urls[entry.id] = data.signedUrl;
        }
      }
    }
    setPhotoUrls(urls);
  };

  const openDetailModal = async (user: UserStats) => {
    setSelectedUser(user);
    setDetailModalOpen(true);
    await loadPhotoUrls(user.progressEntries);
  };

  const calculateBMR = (profile: UserProfile, currentWeight: number) => {
    if (!profile.age || !profile.height) return null;
    const weight = currentWeight;
    const height = profile.height;
    const age = profile.age;
    const gender = profile.gender;
    
    if (gender === "male") {
      return 10 * weight + 6.25 * height - 5 * age + 5;
    } else if (gender === "female") {
      return 10 * weight + 6.25 * height - 5 * age - 161;
    } else {
      // Default to male formula if gender not specified
      return 10 * weight + 6.25 * height - 5 * age + 5;
    }
  };

  const calculateTDEE = (bmr: number, activity: string | null) => {
    const multipliers: Record<string, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };
    return bmr * (multipliers[activity || "sedentary"] || 1.2);
  };

  const getGoalLabel = (goal: string | null) => {
    const labels: Record<string, string> = {
      lose: "Schudnúť",
      gain: "Pribrať",
      maintain: "Udržať",
    };
    return labels[goal || ""] || goal || "N/A";
  };

  const getActivityLabel = (activity: string | null) => {
    const labels: Record<string, string> = {
      sedentary: "Sedavý",
      light: "Ľahká aktivita",
      moderate: "Stredná aktivita",
      active: "Aktívny",
      very_active: "Veľmi aktívny",
    };
    return labels[activity || ""] || activity || "N/A";
  };

  // Calculate overall stats
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => {
    if (!u.lastActivity) return false;
    const lastDate = new Date(u.lastActivity);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return lastDate >= thirtyDaysAgo;
  }).length;
  const avgProgress = users.filter((u) => u.progressPercent !== null).length > 0
    ? Math.round(
        users.reduce((sum, u) => sum + (u.progressPercent || 0), 0) /
        users.filter((u) => u.progressPercent !== null).length
      )
    : 0;
  const totalProgressEntries = users.reduce((sum, u) => sum + u.progressCount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Načítavam...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Celkový počet používateľov</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktívni používatelia</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsers}</div>
            <p className="text-xs text-muted-foreground">za posledných 30 dní</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Priemerný pokrok</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgProgress}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progress záznamy</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProgressEntries}</div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Zoznam používateľov</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Meno</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Aktuálna váha</TableHead>
                  <TableHead>Cieľová váha</TableHead>
                  <TableHead>Cieľ</TableHead>
                  <TableHead>Záznamy</TableHead>
                  <TableHead>Pokrok</TableHead>
                  <TableHead>Posledná aktivita</TableHead>
                  <TableHead>Akcie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const currentWeight = user.progressEntries[0]?.weight || user.profile.weight;
                  return (
                    <TableRow key={user.profile.id}>
                      <TableCell className="font-medium">
                        {user.profile.name || "Bez mena"}
                      </TableCell>
                      <TableCell>{user.profile.email || "N/A"}</TableCell>
                      <TableCell>{currentWeight ? `${currentWeight} kg` : "N/A"}</TableCell>
                      <TableCell>
                        {user.profile.goal_weight ? `${user.profile.goal_weight} kg` : "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getGoalLabel(user.profile.goal)}</Badge>
                      </TableCell>
                      <TableCell>{user.progressCount}</TableCell>
                      <TableCell>
                        {user.progressPercent !== null ? (
                          <Badge>{user.progressPercent}%</Badge>
                        ) : (
                          "N/A"
                        )}
                      </TableCell>
                      <TableCell>
                        {user.lastActivity
                          ? new Date(user.lastActivity).toLocaleDateString("sk-SK")
                          : "Žiadna"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDetailModal(user)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Detail
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Detail používateľa: {selectedUser?.profile.name || "Bez mena"}
            </DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6">
              {/* Profile Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Profilové informácie</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground mb-1">Email</p>
                    <p className="font-medium text-base break-all bg-muted/30 px-3 py-2 rounded-md">
                      {selectedUser.profile.email || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vek</p>
                    <p className="font-medium">{selectedUser.profile.age || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Výška</p>
                    <p className="font-medium">
                      {selectedUser.profile.height ? `${selectedUser.profile.height} cm` : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Aktivita</p>
                    <p className="font-medium">{getActivityLabel(selectedUser.profile.activity)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Cieľ</p>
                    <p className="font-medium">{getGoalLabel(selectedUser.profile.goal)}</p>
                  </div>
                  {selectedUser.profile.allergies && selectedUser.profile.allergies.length > 0 && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Alergény</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedUser.profile.allergies.map((allergy, i) => (
                          <Badge key={i} variant="secondary">{allergy}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedUser.profile.health_issues && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Zdravotné problémy</p>
                      <p className="font-medium">{selectedUser.profile.health_issues}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Metrics */}
              {selectedUser.progressEntries[0]?.weight && (
                <Card>
                  <CardHeader>
                    <CardTitle>Metriky a výpočty</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    {(() => {
                      const currentWeight = selectedUser.progressEntries[0].weight;
                      const bmr = calculateBMR(selectedUser.profile, currentWeight);
                      const tdee = bmr ? calculateTDEE(bmr, selectedUser.profile.activity) : null;
                      const goalWeight = selectedUser.profile.goal_weight;
                      const goal = selectedUser.profile.goal;
                      
                      let recommendedCalories = tdee;
                      if (tdee && goal === "lose") {
                        recommendedCalories = tdee - 500;
                      } else if (tdee && goal === "gain") {
                        recommendedCalories = tdee + 500;
                      }

                      return (
                        <>
                          <div>
                            <p className="text-sm text-muted-foreground">BMR</p>
                            <p className="font-medium">{bmr ? `${Math.round(bmr)} kcal` : "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">TDEE</p>
                            <p className="font-medium">{tdee ? `${Math.round(tdee)} kcal` : "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Odporúčané kalórie</p>
                            <p className="font-medium">
                              {recommendedCalories ? `${Math.round(recommendedCalories)} kcal` : "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Pokrok k cieľu</p>
                            <p className="font-medium">
                              {selectedUser.progressPercent !== null
                                ? `${selectedUser.progressPercent}%`
                                : "N/A"}
                            </p>
                          </div>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}

              {/* Weight Chart */}
              {selectedUser.progressEntries.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Graf váhy</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart
                        data={[...selectedUser.progressEntries]
                          .reverse()
                          .filter((e) => e.weight)
                          .map((entry) => ({
                            date: new Date(entry.date).toLocaleDateString("sk-SK"),
                            weight: entry.weight,
                          }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="weight"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Progress Photos */}
              {Object.keys(photoUrls).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Progress fotografie</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedUser.progressEntries
                        .filter((e) => photoUrls[e.id])
                        .map((entry) => (
                          <div key={entry.id} className="space-y-2">
                            <img
                              src={photoUrls[entry.id]}
                              alt="Progress"
                              className="w-full h-48 object-cover rounded-lg"
                            />
                            <p className="text-sm text-center text-muted-foreground">
                              {new Date(entry.date).toLocaleDateString("sk-SK")}
                            </p>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Weight History Table */}
              <Card>
                <CardHeader>
                  <CardTitle>História váhy</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dátum</TableHead>
                        <TableHead>Váha</TableHead>
                        <TableHead>Fotka</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedUser.progressEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            {new Date(entry.date).toLocaleDateString("sk-SK")}
                          </TableCell>
                          <TableCell>{entry.weight ? `${entry.weight} kg` : "N/A"}</TableCell>
                          <TableCell>{entry.photo_url ? "✓" : "✗"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
