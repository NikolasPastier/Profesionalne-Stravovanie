import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User, Target, Activity, TrendingUp, UtensilsCrossed, Package, Scale, TrendingDown, Calendar, Sparkles } from "lucide-react";
import { MenuManagement } from "@/components/admin/MenuManagement";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

interface Order {
  id: string;
  created_at: string;
  user_id: string;
  status: string;
  total_price: number;
  delivery_type: string;
  delivery_date: string;
  phone: string;
  address: string;
  items: any;
  user_profiles?: {
    name: string;
    email: string;
  };
}

interface Notification {
  id: string;
  order_id: string;
  seen: boolean;
  created_at: string;
}

interface ProgressEntry {
  id: string;
  date: string;
  weight: number;
  created_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [progressData, setProgressData] = useState<ProgressEntry[]>([]);
  const [newWeight, setNewWeight] = useState("");
  const [aiAdvice, setAiAdvice] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);

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

      // Check if user is admin
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      const adminStatus = !!roleData;
      setIsAdmin(adminStatus);

      if (adminStatus) {
        // Load admin data
        await loadOrders();
        await loadNotifications();
      } else {
        // Load regular user profile
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
        
        // Load progress data
        await loadProgressData(user.id);
      }
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

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Load user profiles separately
      const ordersWithProfiles = await Promise.all(
        (data || []).map(async (order) => {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("name, email")
            .eq("user_id", order.user_id)
            .single();

          return {
            ...order,
            user_profiles: profile || { name: "N/A", email: "N/A" },
          };
        })
      );

      setOrders(ordersWithProfiles);
    } catch (error: any) {
      toast({
        title: "Chyba pri načítaní objednávok",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from("admin_notifications")
        .select("*")
        .eq("seen", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error: any) {
      console.error("Error loading notifications:", error);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;

      toast({
        title: "Úspech",
        description: "Stav objednávky bol aktualizovaný",
      });

      loadOrders();
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const markNotificationAsSeen = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("admin_notifications")
        .update({ seen: true })
        .eq("id", notificationId);

      if (error) throw error;
      loadNotifications();
    } catch (error: any) {
      console.error("Error marking notification as seen:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500";
      case "confirmed":
        return "bg-blue-500";
      case "in_progress":
        return "bg-purple-500";
      case "ready":
        return "bg-green-500";
      case "delivered":
        return "bg-gray-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      pending: "Čaká sa",
      confirmed: "Potvrdené",
      in_progress: "Pripravuje sa",
      ready: "Pripravené",
      delivered: "Doručené",
      cancelled: "Zrušené",
    };
    return labels[status] || status;
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

  const loadProgressData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("progress")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: true });

      if (error) throw error;
      setProgressData(data || []);
    } catch (error: any) {
      console.error("Error loading progress:", error);
    }
  };

  const handleAddWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWeight || !profile) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { error } = await supabase.from("progress").insert({
        user_id: user.id,
        weight: parseFloat(newWeight),
        date: new Date().toISOString().split("T")[0],
      });

      if (error) throw error;

      toast({
        title: "Úspech",
        description: "Váha bola úspešne pridaná!",
      });
      setNewWeight("");
      await loadProgressData(user.id);
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: "Chyba pri pridávaní váhy: " + error.message,
        variant: "destructive",
      });
    }
  };

  const getAIAdvice = async () => {
    if (!profile) return;

    setLoadingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("health-assistant", {
        body: { userProfile: profile, progressData },
      });

      if (error) throw error;
      setAiAdvice(data.advice);
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: "Chyba pri načítaní AI rád: " + error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingAI(false);
    }
  };

  const getGoalWeight = () => {
    if (!profile) return 0;
    return profile.goal === "hubnutie" ? profile.weight * 0.9 : profile.weight * 1.1;
  };

  const getCurrentWeight = () => {
    if (progressData.length > 0) {
      return progressData[progressData.length - 1].weight;
    }
    return profile?.weight || 0;
  };

  const getRemainingWeight = () => {
    const current = getCurrentWeight();
    const goal = getGoalWeight();
    return Math.abs(current - goal);
  };

  const getChartData = () => {
    return progressData.map((entry) => ({
      date: new Date(entry.date).toLocaleDateString("sk-SK", { day: "numeric", month: "numeric" }),
      weight: entry.weight,
    }));
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

  // Admin view
  if (isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />

        <main className="container mx-auto px-4 py-20">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-4xl font-display text-primary">
                Admin Panel
              </h1>
              <Button onClick={handleLogout} variant="outline">
                Odhlásiť sa
              </Button>
            </div>

            {notifications.length > 0 && (
              <Card className="mb-6 border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Nové notifikácie ({notifications.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="flex justify-between items-center p-3 bg-background rounded-lg"
                      >
                        <span className="text-sm">
                          Nová objednávka #{notification.order_id.slice(0, 8)}
                        </span>
                        <Button
                          size="sm"
                          onClick={() => markNotificationAsSeen(notification.id)}
                        >
                          Označiť ako prečítané
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Tabs defaultValue="orders" className="space-y-6">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="orders">
                  <Package className="h-4 w-4 mr-2" />
                  Objednávky
                </TabsTrigger>
                <TabsTrigger value="menu">
                  <UtensilsCrossed className="h-4 w-4 mr-2" />
                  Menu
                </TabsTrigger>
              </TabsList>

              <TabsContent value="orders">
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-primary">
                      Správa objednávok
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Dátum</TableHead>
                          <TableHead>Zákazník</TableHead>
                          <TableHead>Typ doručenia</TableHead>
                          <TableHead>Telefón</TableHead>
                          <TableHead>Suma</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Akcie</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell>
                              {new Date(order.created_at).toLocaleDateString("sk-SK")}
                            </TableCell>
                            <TableCell>
                              {order.user_profiles?.name || "N/A"}
                            </TableCell>
                            <TableCell>{order.delivery_type}</TableCell>
                            <TableCell>{order.phone}</TableCell>
                            <TableCell>{order.total_price}€</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(order.status)}>
                                {getStatusLabel(order.status)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <select
                                value={order.status}
                                onChange={(e) =>
                                  updateOrderStatus(order.id, e.target.value)
                                }
                                className="border rounded px-2 py-1 text-sm"
                              >
                                <option value="pending">Čaká sa</option>
                                <option value="confirmed">Potvrdené</option>
                                <option value="in_progress">Pripravuje sa</option>
                                <option value="ready">Pripravené</option>
                                <option value="delivered">Doručené</option>
                                <option value="cancelled">Zrušené</option>
                              </select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="menu">
                <MenuManagement />
              </TabsContent>
            </Tabs>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  // Regular user view
  if (!profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h1 className="text-4xl font-display text-foreground mb-2">
                Vitajte späť, {profile.name}! 👋
              </h1>
              <p className="text-muted-foreground text-lg">
                Sledujte svoj pokrok a dosahujte svoje ciele
              </p>
            </div>
            <Button onClick={handleLogout} variant="outline">
              Odhlásiť sa
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Aktuálna váha
                </CardTitle>
                <Scale className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
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
                <div className="text-3xl font-bold">
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
                <div className="text-3xl font-bold text-orange-500">
                  {getRemainingWeight().toFixed(1)} kg
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="progress" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="progress">
                <TrendingUp className="h-4 w-4 mr-2" />
                Pokrok
              </TabsTrigger>
              <TabsTrigger value="ai-assistant">
                <Sparkles className="h-4 w-4 mr-2" />
                AI Asistent
              </TabsTrigger>
            </TabsList>

            <TabsContent value="progress" className="space-y-6">
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
                            stroke="hsl(var(--foreground))" 
                            strokeWidth={2}
                            dot={{ fill: 'hsl(var(--foreground))', r: 4 }}
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
                      Zaznamenajte svoju týždennú váhu
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
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Menu Recommendation */}
              <Card>
                <CardHeader>
                  <CardTitle>Odporúčaná veľkosť menu</CardTitle>
                  <CardDescription>
                    Na základe vášho profilu a cieľov
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-4xl font-display text-primary mb-2">
                        {getRecommendedMenuSize()}
                      </div>
                      <p className="text-muted-foreground">
                        Optimálna veľkosť pre váš cieľ: {profile.goal}
                      </p>
                    </div>
                    <Button
                      onClick={() => navigate("/menu")}
                      className="bg-primary hover:bg-primary/90"
                    >
                      Zobraziť menu
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ai-assistant">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    AI Zdravotný Asistent
                  </CardTitle>
                  <CardDescription>
                    Personalizované odporúčania na základe vášho progresu
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    onClick={getAIAdvice}
                    disabled={loadingAI}
                    className="w-full"
                  >
                    {loadingAI ? "Generujem rady..." : "Získať AI analýzu a rady"}
                  </Button>

                  {aiAdvice && (
                    <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap">
                      {aiAdvice}
                    </div>
                  )}

                  {!aiAdvice && !loadingAI && (
                    <div className="text-center text-muted-foreground py-8">
                      Kliknite na tlačidlo vyššie pre získanie personalizovaných rád od AI asistenta.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Personal Info Card */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Osobné údaje</CardTitle>
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

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Rýchle akcie</CardTitle>
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
                onClick={() => navigate("/cenník")}
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
