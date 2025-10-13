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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { User, Target, Activity, TrendingUp, UtensilsCrossed, Package, Scale, TrendingDown, Calendar, Sparkles, Mail, Lock, Trash2, Camera, Trophy, MapPin } from "lucide-react";
import { MenuManagement } from "@/components/admin/MenuManagement";
import { WeeklyMenuManagement } from "@/components/admin/WeeklyMenuManagement";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ProgressGallery } from "@/components/dashboard/ProgressGallery";
import { AchievementBadge } from "@/components/dashboard/AchievementBadge";
import { MotivationalQuote } from "@/components/dashboard/MotivationalQuote";
import { AIMotivator } from "@/components/dashboard/AIMotivator";
import { checkAndAwardAchievements } from "@/utils/achievementChecker";
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
  note?: string;
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
  const {
    toast
  } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [progressData, setProgressData] = useState<ProgressEntry[]>([]);
  const [newWeight, setNewWeight] = useState("");
  const [aiAdvice, setAiAdvice] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [userId, setUserId] = useState<string>("");
  
  // Order details modal state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isAllOrdersModalOpen, setIsAllOrdersModalOpen] = useState(false);

  // Account management states
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Edit profile states
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    age: "",
    height: "",
    weight: "",
    goal: "",
    activity: "",
    allergies: "",
    preferences: "",
    dislikes: "",
    favorite_foods: "",
    health_issues: ""
  });
  useEffect(() => {
    checkUserAndLoadProfile();
  }, []);
  const checkUserAndLoadProfile = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check if user is admin
      const {
        data: roleData
      } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").single();
      const adminStatus = !!roleData;
      setIsAdmin(adminStatus);
      if (adminStatus) {
        // Load admin data
        await loadOrders();
        await loadNotifications();
      } else {
        // Load regular user profile
        const {
          data,
          error
        } = await supabase.from("user_profiles").select("*").eq("user_id", user.id).single();
        if (error) {
          if (error.code === "PGRST116") {
            navigate("/onboarding");
            return;
          }
          throw error;
        }
        setProfile(data as UserProfile);
        setUserId(user.id);

        // Load progress data, orders, and achievements
        await loadProgressData(user.id);
        await loadUserOrders(user.id);
        await loadAchievements(user.id);
      }
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const loadOrders = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("orders").select("*").order("created_at", {
        ascending: false
      });
      if (error) throw error;

      // Load user profiles separately
      const ordersWithProfiles = await Promise.all((data || []).map(async order => {
        const {
          data: profile
        } = await supabase.from("user_profiles").select("name, email").eq("user_id", order.user_id).maybeSingle();
        return {
          ...order,
          user_profiles: profile || {
            name: "N/A",
            email: "N/A"
          }
        };
      }));
      setOrders(ordersWithProfiles);
    } catch (error: any) {
      toast({
        title: "Chyba pri načítaní objednávok",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const loadNotifications = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("admin_notifications").select("*").eq("seen", false).order("created_at", {
        ascending: false
      });
      if (error) throw error;
      setNotifications(data || []);
    } catch (error: any) {
      console.error("Error loading notifications:", error);
    }
  };
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const {
        error
      } = await supabase.from("orders").update({
        status: newStatus
      }).eq("id", orderId);
      if (error) throw error;
      toast({
        title: "Úspech",
        description: "Stav objednávky bol aktualizovaný"
      });
      loadOrders();
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const markNotificationAsSeen = async (notificationId: string) => {
    try {
      const {
        error
      } = await supabase.from("admin_notifications").update({
        seen: true
      }).eq("id", notificationId);
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
    const labels: {
      [key: string]: string;
    } = {
      pending: "Čaká sa",
      confirmed: "Potvrdené",
      in_progress: "Pripravuje sa",
      ready: "Pripravené",
      delivered: "Doručené",
      cancelled: "Zrušené"
    };
    return labels[status] || status;
  };
  const getRecommendedMenuSize = () => {
    if (!profile) return "M";
    
    // Použiť aktuálnu váhu z progressu namiesto statickej váhy z profilu
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
  const loadProgressData = async (userId: string) => {
    try {
      const {
        data,
        error
      } = await supabase.from("progress").select("*").eq("user_id", userId).order("date", {
        ascending: true
      });
      if (error) throw error;
      setProgressData(data || []);
    } catch (error: any) {
      console.error("Error loading progress:", error);
    }
  };
  const loadUserOrders = async (userId: string) => {
    try {
      const {
        data,
        error
      } = await supabase.from("orders").select("*").eq("user_id", userId).order("created_at", {
        ascending: false
      });
      if (error) throw error;
      setUserOrders(data || []);
    } catch (error: any) {
      console.error("Error loading user orders:", error);
    }
  };
  const loadAchievements = async (userId: string) => {
    try {
      const {
        data,
        error
      } = await supabase.from("achievements").select("*").eq("user_id", userId).order("earned_at", {
        ascending: false
      });
      if (error) throw error;
      setAchievements(data || []);
    } catch (error: any) {
      console.error("Error loading achievements:", error);
    }
  };
  const handleAddWeight = async (e: React.FormEvent) => {
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

      // Upload photo if selected
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
      const {
        error
      } = await supabase.from("progress").insert({
        user_id: user.id,
        weight: parseFloat(newWeight),
        date: new Date().toISOString().split("T")[0],
        photo_url: photoUrl
      });
      if (error) throw error;

      // Aktualizovať váhu aj v user_profiles
      const { error: profileError } = await supabase
        .from("user_profiles")
        .update({ weight: parseFloat(newWeight) })
        .eq("user_id", user.id);

      if (profileError) {
        console.error("Chyba pri aktualizácii profilu:", profileError);
        // Nehaváriť, len logovať - váha v progress je už uložená
      }

      // Check for new achievements
      const updatedProgress = await supabase.from("progress").select("*").eq("user_id", user.id).order("date", {
        ascending: true
      });
      if (updatedProgress.data) {
        await checkAndAwardAchievements(user.id, updatedProgress.data, profile);
        await loadAchievements(user.id);
      }

      await loadProgressData(user.id);
      await checkUserAndLoadProfile();
      
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
  const getAIAdvice = async () => {
    if (!profile) return;
    setLoadingAI(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("health-assistant", {
        body: {
          userProfile: profile,
          progressData
        }
      });
      if (error) throw error;
      setAiAdvice(data.advice);
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: "Chyba pri načítaní AI rád: " + error.message,
        variant: "destructive"
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
    return progressData.map(entry => ({
      date: new Date(entry.date).toLocaleDateString("sk-SK", {
        day: "numeric",
        month: "numeric"
      }),
      weight: entry.weight
    }));
  };
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };
  const handleEmailChange = async () => {
    if (!newEmail) {
      toast({
        title: "Chyba",
        description: "Zadajte nový email",
        variant: "destructive"
      });
      return;
    }
    try {
      const {
        error
      } = await supabase.auth.updateUser({
        email: newEmail
      });
      if (error) throw error;
      toast({
        title: "Úspech",
        description: "Email bol úspešne zmenený. Skontrolujte váš email pre potvrdenie."
      });
      setIsEmailDialogOpen(false);
      setNewEmail("");
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Chyba",
        description: "Vyplňte všetky polia",
        variant: "destructive"
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "Chyba",
        description: "Heslá sa nezhodujú",
        variant: "destructive"
      });
      return;
    }
    if (newPassword.length < 6) {
      toast({
        title: "Chyba",
        description: "Heslo musí mať aspoň 6 znakov",
        variant: "destructive"
      });
      return;
    }
    try {
      const {
        error
      } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;
      toast({
        title: "Úspech",
        description: "Heslo bolo úspešne zmenené"
      });
      setIsPasswordDialogOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const handleAccountDelete = async () => {
    try {
      // First delete user data
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;

      // Delete user profile
      await supabase.from("user_profiles").delete().eq("user_id", user.id);

      // Delete progress data
      await supabase.from("progress").delete().eq("user_id", user.id);
      toast({
        title: "Účet vymazaný",
        description: "Váš účet a všetky údaje boli úspešne vymazané"
      });

      // Sign out and redirect
      await supabase.auth.signOut();
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteOrder = async (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Naozaj chcete odstrániť túto objednávku?")) return;
    
    try {
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId);
      
      if (error) throw error;
      
      toast({
        title: "Úspech",
        description: "Objednávka bola odstránená"
      });
      
      loadOrders();
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleOpenEditProfile = () => {
    if (!profile) return;
    setEditFormData({
      age: profile.age?.toString() || "",
      height: profile.height?.toString() || "",
      weight: getCurrentWeight().toString() || "",
      goal: profile.goal || "",
      activity: profile.activity || "",
      allergies: profile.allergies?.join(", ") || "",
      preferences: profile.preferences?.join(", ") || "",
      dislikes: (profile as any).dislikes?.join(", ") || "",
      favorite_foods: (profile as any).favorite_foods?.join(", ") || "",
      health_issues: (profile as any).health_issues || ""
    });
    setIsEditProfileOpen(true);
  };

  const handleSaveProfile = async () => {
    try {
      // Validation
      const age = parseInt(editFormData.age);
      const height = parseInt(editFormData.height);
      const weight = parseFloat(editFormData.weight);

      if (age < 13 || age > 120) {
        toast({
          title: "Chyba",
          description: "Vek musí byť medzi 13 a 120 rokov",
          variant: "destructive"
        });
        return;
      }

      if (height < 100 || height > 250) {
        toast({
          title: "Chyba",
          description: "Výška musí byť medzi 100 a 250 cm",
          variant: "destructive"
        });
        return;
      }

      if (weight < 30 || weight > 300) {
        toast({
          title: "Chyba",
          description: "Váha musí byť medzi 30 a 300 kg",
          variant: "destructive"
        });
        return;
      }

      if (!editFormData.goal || !editFormData.activity) {
        toast({
          title: "Chyba",
          description: "Vyplňte všetky povinné polia",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from("user_profiles")
        .update({
          age,
          height,
          weight,
          goal: editFormData.goal,
          activity: editFormData.activity,
          allergies: editFormData.allergies.split(",").map(a => a.trim()).filter(Boolean),
          preferences: editFormData.preferences.split(",").map(p => p.trim()).filter(Boolean),
          dislikes: editFormData.dislikes.split(",").map(d => d.trim()).filter(Boolean),
          favorite_foods: editFormData.favorite_foods.split(",").map(f => f.trim()).filter(Boolean),
          health_issues: editFormData.health_issues
        })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "Úspech",
        description: "Profil bol úspešne aktualizovaný"
      });

      setIsEditProfileOpen(false);
      await checkUserAndLoadProfile();
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary text-xl">Načítavam...</div>
      </div>;
  }

  // Admin view
  if (isAdmin) {
    return <div className="min-h-screen bg-background">
        <Navigation />

        <main className="container mx-auto px-4 py-20">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8 mx-0 my-[20px]">
              <h1 className="text-4xl font-display text-primary">
                Admin Panel
              </h1>
              
            </div>

            {notifications.length > 0 && <Card className="mb-6 border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Nové notifikácie ({notifications.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {notifications.map(notification => <div key={notification.id} className="flex justify-between items-center p-3 bg-background rounded-lg">
                        <span className="text-sm">
                          Nová objednávka #{notification.order_id.slice(0, 8)}
                        </span>
                        <Button size="sm" onClick={() => markNotificationAsSeen(notification.id)}>
                          Označiť ako prečítané
                        </Button>
                      </div>)}
                  </div>
                </CardContent>
              </Card>}

            <Tabs defaultValue="orders" className="space-y-6">
              <TabsList className="grid w-full max-w-md grid-cols-3">
                <TabsTrigger value="orders">
                  <Package className="h-4 w-4 mr-2" />
                  Objednávky
                </TabsTrigger>
                <TabsTrigger value="dishes">
                  <UtensilsCrossed className="h-4 w-4 mr-2" />
                  Správa jedál
                </TabsTrigger>
                <TabsTrigger value="weekly-menu">
                  <Calendar className="h-4 w-4 mr-2" />
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
                        {orders.map(order => <TableRow 
                            key={order.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsOrderModalOpen(true);
                            }}
                          >
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
                            <TableCell onClick={(e) => e.stopPropagation()} className="bg-muted">
                              <div className="flex items-center gap-2">
                                <select value={order.status} onChange={e => updateOrderStatus(order.id, e.target.value)} className="border rounded px-2 py-1 text-sm bg-background">
                                  <option value="pending">Čaká sa</option>
                                  <option value="confirmed">Potvrdené</option>
                                  <option value="in_progress">Pripravuje sa</option>
                                  <option value="ready">Pripravené</option>
                                  <option value="delivered">Doručené</option>
                                  <option value="cancelled">Zrušené</option>
                                </select>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={(e) => handleDeleteOrder(order.id, e)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>)}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="dishes">
                <MenuManagement />
              </TabsContent>

              <TabsContent value="weekly-menu">
                <WeeklyMenuManagement />
              </TabsContent>
            </Tabs>
          </div>
        </main>

        {/* Order Details Modal */}
        <Dialog open={isOrderModalOpen} onOpenChange={setIsOrderModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Detail objednávky</DialogTitle>
              <DialogDescription>
                Objednávka #{selectedOrder?.id.slice(0, 8)}
              </DialogDescription>
            </DialogHeader>

            {selectedOrder && (
              <div className="space-y-6">
                {/* Customer Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Informácie o zákazníkovi</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Meno</p>
                      <p className="font-medium">{selectedOrder.user_profiles?.name || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{selectedOrder.user_profiles?.email || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Telefón</p>
                      <p className="font-medium">{selectedOrder.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Dátum objednávky</p>
                      <p className="font-medium">
                        {new Date(selectedOrder.created_at).toLocaleString("sk-SK")}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Adresa doručenia</p>
                    <p className="font-medium">{selectedOrder.address}</p>
                  </div>
                </div>

                {/* Order Details */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Detaily objednávky</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Typ doručenia</p>
                      <p className="font-medium">{selectedOrder.delivery_type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Stav</p>
                      <Badge className={getStatusColor(selectedOrder.status)}>
                        {getStatusLabel(selectedOrder.status)}
                      </Badge>
                    </div>
                    {selectedOrder.delivery_date && (
                      <div>
                        <p className="text-sm text-muted-foreground">Dátum doručenia</p>
                        <p className="font-medium">
                          {new Date(selectedOrder.delivery_date).toLocaleDateString("sk-SK")}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">Celková cena</p>
                      <p className="font-medium text-lg">{selectedOrder.total_price}€</p>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Obsah objednávky</h3>
                  <div className="space-y-3">
                    {selectedOrder.items && Array.isArray(selectedOrder.items) && selectedOrder.items.map((day: any, idx: number) => (
                      <div key={idx} className="border rounded-lg p-4 bg-muted/30">
                        <h4 className="font-semibold mb-2 text-primary">{day.day}</h4>
                        <div className="space-y-1">
                          {day.meals && day.meals.length > 0 ? (
                            day.meals.map((meal: any, mealIdx: number) => (
                              <p key={mealIdx} className="text-sm">
                                • {typeof meal === 'string' ? meal : meal.name}
                              </p>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground italic">Žiadne jedlá</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Note */}
                {selectedOrder.note && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg border-b pb-2">Poznámka</h3>
                    <p className="text-sm bg-muted/30 p-3 rounded-lg">{selectedOrder.note}</p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOrderModalOpen(false)}>
                Zavrieť
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Footer />
      </div>;
  }

  // Regular user view
  if (!profile) {
    return null;
  }
  return <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="mt-5">
            <h1 className="text-4xl font-display text-foreground mb-2">
              Vitajte späť, {profile.name}! 👋
            </h1>
            <p className="text-muted-foreground text-lg">
              Sledujte svoj pokrok a dosahujte svoje ciele
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 mt-8">
            {/* Recommended Menu */}
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

            {/* Current Weight */}
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

            {/* Goal Weight */}
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

            {/* Remaining Weight */}
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
                    {getChartData().length > 0 ? <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={getChartData()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis domain={['auto', 'auto']} />
                          <Tooltip />
                          <Line type="monotone" dataKey="weight" stroke="hsl(var(--foreground))" strokeWidth={2} dot={{
                        fill: 'hsl(var(--foreground))',
                        r: 4
                      }} />
                        </LineChart>
                      </ResponsiveContainer> : <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        Zatiaľ nemáte žiadne záznamy. Pridajte svoju prvú váhu.
                      </div>}
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

              {/* Motivational Quote */}
              <MotivationalQuote />

              {/* Progress Photo Gallery */}
              <ProgressGallery userId={userId} />

              {/* Achievements */}
              <AchievementBadge achievements={achievements} />
            </TabsContent>

            <TabsContent value="ai-assistant" className="space-y-6">
              {/* AI Motivator */}
              <AIMotivator userProfile={profile} progressData={progressData} />

              {/* AI Health Assistant */}
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
                  <Button onClick={getAIAdvice} disabled={loadingAI} className="w-full">
                    {loadingAI ? "Generujem rady..." : "Získať AI analýzu a rady"}
                  </Button>

                  {aiAdvice && <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap">
                      {aiAdvice}
                    </div>}

                  {!aiAdvice && !loadingAI && <div className="text-center text-muted-foreground py-8">
                      Kliknite na tlačidlo vyššie pre získanie personalizovaných rád od AI asistenta.
                    </div>}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>


          {/* Account Settings */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Nastavenia účtu</CardTitle>
              <CardDescription>
                Spravujte svoje prihlásenie a bezpečnosť
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={handleOpenEditProfile} variant="outline" className="w-full justify-start">
                <User className="h-4 w-4 mr-2" />
                Upraviť profil
              </Button>
              <Button onClick={() => setIsAllOrdersModalOpen(true)} variant="outline" className="w-full justify-start">
                <Package className="h-4 w-4 mr-2" />
                Moje objednávky
              </Button>
              <Button onClick={() => setIsEmailDialogOpen(true)} variant="outline" className="w-full justify-start">
                <Mail className="h-4 w-4 mr-2" />
                Zmeniť email
              </Button>
              <Button onClick={() => setIsPasswordDialogOpen(true)} variant="outline" className="w-full justify-start">
                <Lock className="h-4 w-4 mr-2" />
                Zmeniť heslo
              </Button>
              <Button onClick={() => setIsDeleteDialogOpen(true)} variant="destructive" className="w-full justify-start">
                <Trash2 className="h-4 w-4 mr-2" />
                Vymazať účet
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Email Change Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zmeniť email</DialogTitle>
            <DialogDescription>
              Zadajte nový email. Budete musieť potvrdiť zmenu cez email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-email">Nový email</Label>
              <Input id="new-email" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="novy@email.sk" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)}>
              Zrušiť
            </Button>
            <Button onClick={handleEmailChange}>Zmeniť email</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zmeniť heslo</DialogTitle>
            <DialogDescription>
              Zadajte nové heslo. Musí mať aspoň 6 znakov.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nové heslo</Label>
              <Input id="new-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Potvrďte heslo</Label>
              <Input id="confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
              Zrušiť
            </Button>
            <Button onClick={handlePasswordChange}>Zmeniť heslo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Naozaj chcete vymazať účet?</AlertDialogTitle>
            <AlertDialogDescription>
              Táto akcia je nenávratná. Všetky vaše údaje, objednávky a progres
              budú natrvalo vymazané.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušiť</AlertDialogCancel>
            <AlertDialogAction onClick={handleAccountDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Áno, vymazať účet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upraviť fitness profil</DialogTitle>
            <DialogDescription>
              Aktualizujte svoje fitness údaje a stravovacie preferencie
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Základné fitness údaje */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Základné fitness údaje</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-age">Vek *</Label>
                  <Input
                    id="edit-age"
                    type="number"
                    value={editFormData.age}
                    onChange={(e) => setEditFormData({ ...editFormData, age: e.target.value })}
                    placeholder="napr. 25"
                    min="13"
                    max="120"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-height">Výška (cm) *</Label>
                  <Input
                    id="edit-height"
                    type="number"
                    value={editFormData.height}
                    onChange={(e) => setEditFormData({ ...editFormData, height: e.target.value })}
                    placeholder="napr. 175"
                    min="100"
                    max="250"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-weight">
                    Aktuálna váha (kg) *
                    {progressData.length > 0 && (
                      <span className="text-xs text-muted-foreground ml-2 font-normal">
                        (aktualizované {new Date(progressData[progressData.length - 1].date).toLocaleDateString("sk-SK")})
                      </span>
                    )}
                  </Label>
                  <Input
                    id="edit-weight"
                    type="number"
                    step="0.1"
                    value={editFormData.weight}
                    onChange={(e) => setEditFormData({ ...editFormData, weight: e.target.value })}
                    placeholder="napr. 70"
                    min="30"
                    max="300"
                  />
                  <p className="text-xs text-muted-foreground">
                    Zmena váhy ovplyvní vaše odporúčané veľkosti menu
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-goal">Cieľ *</Label>
                  <Select
                    value={editFormData.goal}
                    onValueChange={(value) => setEditFormData({ ...editFormData, goal: value })}
                  >
                    <SelectTrigger id="edit-goal">
                      <SelectValue placeholder="Vyberte cieľ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hubnutie">Chudnutie</SelectItem>
                      <SelectItem value="udrzanie">Udržanie váhy</SelectItem>
                      <SelectItem value="nabrat">Nabratie svalovej hmoty</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-activity">Úroveň aktivity *</Label>
                  <Select
                    value={editFormData.activity}
                    onValueChange={(value) => setEditFormData({ ...editFormData, activity: value })}
                  >
                    <SelectTrigger id="edit-activity">
                      <SelectValue placeholder="Vyberte úroveň" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sedavy">Sedavý (žiadne cvičenie)</SelectItem>
                      <SelectItem value="mierny">Mierne aktívny (1-3x týždenne)</SelectItem>
                      <SelectItem value="aktivny">Aktívny (3-5x týždenne)</SelectItem>
                      <SelectItem value="velmi">Veľmi aktívny (6-7x týždenne)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Stravovacie preferencie */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Stravovacie preferencie</h3>
              
              <div className="space-y-2">
                <Label htmlFor="edit-allergies">Alergie</Label>
                <Input
                  id="edit-allergies"
                  value={editFormData.allergies}
                  onChange={(e) => setEditFormData({ ...editFormData, allergies: e.target.value })}
                  placeholder="napr. laktóza, gluten, orechy (oddelené čiarkou)"
                />
                <p className="text-xs text-muted-foreground">Oddeľte čiarkou</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-preferences">Stravovacie preferencie</Label>
                <Input
                  id="edit-preferences"
                  value={editFormData.preferences}
                  onChange={(e) => setEditFormData({ ...editFormData, preferences: e.target.value })}
                  placeholder="napr. vegetarián, vegan, bez cukru (oddelené čiarkou)"
                />
                <p className="text-xs text-muted-foreground">Oddeľte čiarkou</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-dislikes">Neobľúbené jedlá</Label>
                <Input
                  id="edit-dislikes"
                  value={editFormData.dislikes}
                  onChange={(e) => setEditFormData({ ...editFormData, dislikes: e.target.value })}
                  placeholder="napr. brokolica, špenát (oddelené čiarkou)"
                />
                <p className="text-xs text-muted-foreground">Oddeľte čiarkou</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-favorite-foods">Obľúbené jedlá</Label>
                <Input
                  id="edit-favorite-foods"
                  value={editFormData.favorite_foods}
                  onChange={(e) => setEditFormData({ ...editFormData, favorite_foods: e.target.value })}
                  placeholder="napr. kuracie mäso, ryža, cesnak (oddelené čiarkou)"
                />
                <p className="text-xs text-muted-foreground">Oddeľte čiarkou</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-health-issues">Zdravotné problémy (voliteľné)</Label>
                <Textarea
                  id="edit-health-issues"
                  value={editFormData.health_issues}
                  onChange={(e) => setEditFormData({ ...editFormData, health_issues: e.target.value })}
                  placeholder="Popíšte akékoľvek zdravotné problémy, ktoré by sme mali brať do úvahy..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditProfileOpen(false)}>
              Zrušiť
            </Button>
            <Button onClick={handleSaveProfile}>
              Uložiť zmeny
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* All Orders Modal */}
      <Dialog open={isAllOrdersModalOpen} onOpenChange={setIsAllOrdersModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl text-primary">Moje objednávky</DialogTitle>
            <DialogDescription>
              Prehľad všetkých vašich objednávok
            </DialogDescription>
          </DialogHeader>

          {userOrders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-16 w-16 text-primary/50 mx-auto mb-4" />
              <p className="text-xl text-muted-foreground mb-4">
                Zatiaľ nemáte žiadne objednávky
              </p>
              <Button onClick={() => {
                setIsAllOrdersModalOpen(false);
                navigate("/menu");
              }}>
                Prejsť do menu
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {userOrders.map((order) => (
                <Card 
                  key={order.id} 
                  className="border-primary/20 cursor-pointer hover:border-primary/40 transition-all"
                  onClick={() => {
                    setSelectedOrder(order);
                    setIsOrderModalOpen(true);
                  }}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <CardTitle className="text-primary">
                        Objednávka #{order.id.slice(0, 8)}
                      </CardTitle>
                      <Badge className={getStatusColor(order.status)}>
                        {getStatusLabel(order.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-primary" />
                          <span className="text-sm text-muted-foreground">Typ doručenia:</span>
                          <span className="font-semibold">
                            {order.delivery_type === "weekly" ? "Týždenné" : "Denné"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span className="text-sm text-muted-foreground">Dátum objednávky:</span>
                          <span className="font-semibold">
                            {new Date(order.created_at).toLocaleDateString("sk-SK")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          <span className="text-sm text-muted-foreground">Adresa:</span>
                          <span className="font-semibold">{order.address}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {order.delivery_date && (
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Dátum doručenia:</span>
                            <span className="font-semibold">
                              {new Date(order.delivery_date).toLocaleDateString("sk-SK")}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Celková cena:</span>
                          <span className="font-bold text-primary text-lg">
                            {order.total_price.toFixed(2)} €
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Order Details Modal */}
      <Dialog open={isOrderModalOpen} onOpenChange={setIsOrderModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl text-primary">Detail objednávky</DialogTitle>
            <DialogDescription>
              Objednávka #{selectedOrder?.id.slice(0, 8)}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b border-primary/20 pb-2">
                  Detaily objednávky
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Telefón</p>
                    <p className="font-medium">{selectedOrder.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Dátum objednávky</p>
                    <p className="font-medium">
                      {new Date(selectedOrder.created_at).toLocaleString("sk-SK")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Adresa doručenia</p>
                    <p className="font-medium">{selectedOrder.address}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Typ doručenia</p>
                    <p className="font-medium">
                      {selectedOrder.delivery_type === "weekly" ? "Týždenné" : "Denné"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Stav</p>
                    <Badge className={getStatusColor(selectedOrder.status)}>
                      {getStatusLabel(selectedOrder.status)}
                    </Badge>
                  </div>
                  {selectedOrder.delivery_date && (
                    <div>
                      <p className="text-sm text-muted-foreground">Dátum doručenia</p>
                      <p className="font-medium">
                        {new Date(selectedOrder.delivery_date).toLocaleDateString("sk-SK")}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Celková cena</p>
                    <p className="font-medium text-lg text-primary">
                      {selectedOrder.total_price.toFixed(2)}€
                    </p>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b border-primary/20 pb-2">
                  Obsah objednávky
                </h3>
                <div className="space-y-3">
                  {selectedOrder.items && Array.isArray(selectedOrder.items) && 
                    selectedOrder.items.map((day: any, idx: number) => (
                      <div key={idx} className="border border-primary/10 rounded-lg p-4 bg-muted/30">
                        <h4 className="font-semibold mb-2 text-primary">{day.day}</h4>
                        <div className="space-y-1">
                          {day.meals && day.meals.length > 0 ? (
                            day.meals.map((meal: any, mealIdx: number) => (
                              <p key={mealIdx} className="text-sm">
                                • {typeof meal === 'string' ? meal : meal.name}
                              </p>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground italic">Žiadne jedlá</p>
                          )}
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>

              {/* Note */}
              {selectedOrder.note && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg border-b border-primary/20 pb-2">Poznámka</h3>
                  <p className="text-sm bg-muted/30 p-3 rounded-lg">{selectedOrder.note}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOrderModalOpen(false)}>
              Zavrieť
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>;
};
export default Dashboard;