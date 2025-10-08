import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { User, Target, Activity, TrendingUp, UtensilsCrossed, Package } from "lucide-react";
import { MenuManagement } from "@/components/admin/MenuManagement";

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

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

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
