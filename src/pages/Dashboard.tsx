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
import { User, Package, Mail, Lock, Trash2, MapPin, UtensilsCrossed, Calendar, Users } from "lucide-react";
import { MenuManagement } from "@/components/admin/MenuManagement";
import { WeeklyMenuManagement } from "@/components/admin/WeeklyMenuManagement";
import { UserStatistics } from "@/components/admin/UserStatistics";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";

interface UserProfile {
  name: string;
  address?: string;
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
  gender?: "male" | "female";
  goal_weight?: number;
  created_at?: string;
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
  menu_size?: string;
  calories?: number;
  menu_id?: string;
  name?: string;
  email?: string;
  user_profiles?: {
    name: string;
    email: string;
    allergies?: string[];
    dislikes?: string[];
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
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [userId, setUserId] = useState<string>("");

  // Order details modal state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isAllOrdersModalOpen, setIsAllOrdersModalOpen] = useState(false);
  const [removingDayOrderId, setRemovingDayOrderId] = useState<string | null>(null);

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
    name: "",
    address: "",
    age: "",
    height: "",
    weight: "",
    gender: "",
    goal_weight: "",
    goal: "",
    activity: "",
    allergies: "",
    preferences: "",
    dislikes: "",
    favorite_foods: "",
    health_issues: "",
  });

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

      // Check if user is admin using server-side security definer function
      const { data: userRole, error: roleError } = await supabase.rpc("get_current_user_role");
      const adminStatus = userRole === "admin";

      if (roleError) {
        console.error("Error checking user role:", roleError);
      }

      setIsAdmin(adminStatus);
      if (adminStatus) {
        // Load admin data
        await loadOrders();
        await loadNotifications();
      } else {
        // Load regular user profile
        const { data, error } = await supabase.from("user_profiles").select("*").eq("user_id", user.id).single();
        if (error) {
          if (error.code === "PGRST116") {
            navigate("/onboarding");
            return;
          }
          throw error;
        }
        setProfile(data as UserProfile);
        setUserId(user.id);

        // Load progress data and orders
        await loadProgressData(user.id);
        await loadUserOrders(user.id);
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
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;

      // Load user profiles separately
      const ordersWithProfiles = await Promise.all(
        (data || []).map(async (order) => {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("name, email, allergies, dislikes")
            .eq("user_id", order.user_id)
            .maybeSingle();
          return {
            ...order,
            user_profiles: profile || {
              name: "N/A",
              email: "N/A",
              allergies: [],
              dislikes: [],
            },
          };
        }),
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
      if (import.meta.env.DEV) {
        console.error("Error loading notifications:", error);
      }
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      // Update the order status in the database
      const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
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

  const updateDayStatus = async (orderId: string, dayIndex: number, newStatus: string) => {
    try {
      // Get the current order
      const { data: order, error: fetchError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (fetchError) throw fetchError;

      // Update the specific day's status
      const items = order.items as any[];
      const updatedItems = items.map((item: any, idx: number) => {
        if (idx === dayIndex) {
          return { ...item, status: newStatus };
        }
        return item;
      });

      // Update the order in database
      const { error: updateError } = await supabase
        .from("orders")
        .update({ items: updatedItems })
        .eq("id", orderId);

      if (updateError) throw updateError;

      // If status is being changed to "ready", send notification email to customer
      if (newStatus === "ready") {
        try {
          // Fetch user profile separately
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("name, email")
            .eq("user_id", order.user_id)
            .maybeSingle();

          // Get customer email and name (prefer order fields, fallback to profile)
          const customerEmail = order.email || profile?.email;
          const customerName = order.name || profile?.name || "Zákazník";
          const dayName = items[dayIndex].day;

          if (customerEmail) {
            // Call the edge function to send the email (non-blocking)
            const { error: emailError } = await supabase.functions.invoke("send-order-ready-email", {
              body: {
                orderId: orderId,
                customerName: customerName,
                customerEmail: customerEmail,
                deliveryDate: order.delivery_date,
                dayName: dayName,
              },
            });

            if (emailError) {
              console.error("Error sending ready email:", emailError);
            } else {
              console.log("Order ready email sent successfully");
            }
          }
        } catch (emailError) {
          // Log email errors but don't block the status update
          console.error("Error in email notification:", emailError);
        }
      }

      toast({
        title: "Úspech",
        description: newStatus === "ready" 
          ? "Stav dňa bol aktualizovaný a zákazník bol upovedomený emailom"
          : "Stav dňa bol aktualizovaný",
      });
      
      // Update selected order if it's currently open
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({
          ...order,
          items: updatedItems,
        });
      }
      
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
      const { error } = await supabase.from("admin_notifications").update({ seen: true }).eq("id", notificationId);
      if (error) throw error;
      loadNotifications();
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error("Error marking notification as seen:", error);
      }
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
      case "completed":
        return "bg-teal-500";
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
      completed: "Dokončené",
      cancelled: "Zrušené",
    };
    return labels[status] || status;
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
      if (import.meta.env.DEV) {
        console.error("Error loading progress:", error);
      }
    }
  };

  const loadUserOrders = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setUserOrders(data || []);
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error("Error loading user orders:", error);
      }
    }
  };

  const canRemoveDay = (dayString: string): boolean => {
    // Try to parse as date first
    const dayDate = new Date(dayString);
    
    // If it's a valid date string (ISO format like "2025-10-27")
    if (!isNaN(dayDate.getTime())) {
      const now = new Date();
      const hoursUntil = (dayDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      return hoursUntil >= 48;
    }
    
    // Otherwise, handle day names in Slovak
    const dayMap: { [key: string]: number } = {
      "Pondelok": 1,
      "Utorok": 2,
      "Streda": 3,
      "Štvrtok": 4,
      "Piatok": 5,
      "Sobota": 6,
      "Nedeľa": 0,
    };

    const now = new Date();
    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const targetDay = dayMap[dayString];

    if (targetDay === undefined) return false;

    // Calculate hours until the target day
    let daysUntil = targetDay - currentDay;
    if (daysUntil < 0) daysUntil += 7;
    if (daysUntil === 0) daysUntil = 7; // If it's the same day, count as next week

    const hoursUntil = daysUntil * 24 - currentHour;

    // Must be at least 48 hours before
    return hoursUntil >= 48;
  };

  const handleRemoveDay = async (orderId: string, dayToRemove: string) => {
    if (!canRemoveDay(dayToRemove)) {
      toast({
        title: "Nemôžete odstrániť tento deň",
        description: "Deň môžete odstrániť len 48 hodín pred doručením.",
        variant: "destructive",
      });
      return;
    }

    try {
      setRemovingDayOrderId(orderId);

      // Get the current order
      const { data: order, error: fetchError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (fetchError) throw fetchError;

      // Filter out the day to remove
      const items = order.items as any[];
      const updatedItems = items.filter((item: any) => item.day !== dayToRemove);

      if (updatedItems.length === 0) {
        toast({
          title: "Nemôžete odstrániť všetky dni",
          description: "Musí zostať aspoň jeden deň v objednávke.",
          variant: "destructive",
        });
        setRemovingDayOrderId(null);
        return;
      }

      // Calculate new total price based on remaining days
      const pricePerDay = order.total_price / items.length;
      const newTotalPrice = pricePerDay * updatedItems.length;

      // Update the order in database
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          items: updatedItems,
          total_price: newTotalPrice,
        })
        .eq("id", orderId);

      if (updateError) throw updateError;

      // Send email notification to admin
      const remainingDays = updatedItems.map((item: any) => item.day);
      
      await supabase.functions.invoke("send-order-modification-email", {
        body: {
          userName: order.name || profile?.name || "Zákazník",
          userEmail: order.email || "",
          orderId: order.id,
          removedDay: dayToRemove,
          remainingDays: remainingDays,
          orderDate: new Date(order.created_at).toLocaleDateString("sk-SK"),
        },
      });

      toast({
        title: "Deň odstránený",
        description: `${dayToRemove} bol úspešne odstránený z objednávky.`,
      });

      // Reload orders
      await loadUserOrders(userId);
      
      // Update selected order if it's currently open
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({
          ...order,
          items: updatedItems,
          total_price: newTotalPrice,
        });
      }
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRemovingDayOrderId(null);
    }
  };

  const getGoalWeight = () => {
    if (!profile) return 0;
    return profile.goal_weight || (profile.goal === "hubnutie" ? profile.weight * 0.9 : profile.weight * 1.1);
  };

  const getCurrentWeight = () => {
    if (progressData.length > 0) {
      return progressData[progressData.length - 1].weight;
    }
    return profile?.weight || 0;
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
        variant: "destructive",
      });
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      toast({
        title: "Úspech",
        description: "Email bol úspešne zmenený. Skontrolujte váš email pre potvrdenie.",
      });
      setIsEmailDialogOpen(false);
      setNewEmail("");
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Chyba",
        description: "Vyplňte všetky polia",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "Chyba",
        description: "Heslá sa nezhodujú",
        variant: "destructive",
      });
      return;
    }
    // Validate password strength (same requirements as signup)
    if (newPassword.length < 8) {
      toast({
        title: "Chyba",
        description: "Heslo musí mať aspoň 8 znakov",
        variant: "destructive",
      });
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      toast({
        title: "Chyba",
        description: "Heslo musí obsahovať aspoň jedno veľké písmeno",
        variant: "destructive",
      });
      return;
    }
    if (!/[a-z]/.test(newPassword)) {
      toast({
        title: "Chyba",
        description: "Heslo musí obsahovať aspoň jedno malé písmeno",
        variant: "destructive",
      });
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      toast({
        title: "Chyba",
        description: "Heslo musí obsahovať aspoň jedno číslo",
        variant: "destructive",
      });
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({
        title: "Úspech",
        description: "Heslo bolo úspešne zmenené",
      });
      setIsPasswordDialogOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAccountDelete = async () => {
    try {
      setIsDeleteDialogOpen(false);

      // Get current session for authorization
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Chyba",
          description: "Musíte byť prihlásený",
          variant: "destructive",
        });
        return;
      }

      // Call edge function to delete account and all related data
      const { data, error } = await supabase.functions.invoke("delete-user-account", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error("Delete account error:", error);
        toast({
          title: "Chyba",
          description: "Nepodarilo sa vymazať účet. Skúste to prosím znova.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Účet vymazaný",
        description: "Váš účet a všetky údaje boli úspešne vymazané",
      });

      // Sign out and redirect
      await supabase.auth.signOut();
      navigate("/");
    } catch (error: any) {
      console.error("Account deletion error:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa vymazať účet",
        variant: "destructive",
      });
    }
  };

  const handleDeleteOrder = async (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Naozaj chcete odstrániť túto objednávku?")) return;
    try {
      const { error } = await supabase.from("orders").delete().eq("id", orderId);
      if (error) throw error;
      toast({
        title: "Úspech",
        description: "Objednávka bola odstránená",
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

  const handleOpenEditProfile = () => {
    if (!profile) return;
    setEditFormData({
      name: profile.name || "",
      address: profile.address || "",
      age: profile.age?.toString() || "",
      height: profile.height?.toString() || "",
      weight: getCurrentWeight().toString() || "",
      gender: profile.gender || "",
      goal_weight: profile.goal_weight?.toString() || "",
      goal: profile.goal || "",
      activity: profile.activity || "",
      allergies: profile.allergies?.join(", ") || "",
      preferences: profile.preferences?.join(", ") || "",
      dislikes: (profile as any).dislikes?.join(", ") || "",
      favorite_foods: (profile as any).favorite_foods?.join(", ") || "",
      health_issues: (profile as any).health_issues || "",
    });
    setIsEditProfileOpen(true);
  };

  const handleSaveProfile = async () => {
    try {
      // Validation
      if (!editFormData.name.trim()) {
        toast({
          title: "Chyba",
          description: "Meno je povinné",
          variant: "destructive",
        });
        return;
      }
      const age = parseInt(editFormData.age);
      const height = parseInt(editFormData.height);
      const weight = parseFloat(editFormData.weight);
      if (age < 13 || age > 120) {
        toast({
          title: "Chyba",
          description: "Vek musí byť medzi 13 a 120 rokov",
          variant: "destructive",
        });
        return;
      }
      if (height < 100 || height > 250) {
        toast({
          title: "Chyba",
          description: "Výška musí byť medzi 100 a 250 cm",
          variant: "destructive",
        });
        return;
      }
      if (weight < 30 || weight > 300) {
        toast({
          title: "Chyba",
          description: "Váha musí byť medzi 30 a 300 kg",
          variant: "destructive",
        });
        return;
      }
      if (!editFormData.goal || !editFormData.activity) {
        toast({
          title: "Chyba",
          description: "Vyplňte všetky povinné polia",
          variant: "destructive",
        });
        return;
      }

      // Update user profile without weight
      const { error: profileError } = await supabase
        .from("user_profiles")
        .update({
          name: editFormData.name.trim(),
          address: editFormData.address.trim() || null,
          age,
          height,
          gender: editFormData.gender || null,
          goal_weight: editFormData.goal_weight ? parseFloat(editFormData.goal_weight) : null,
          goal: editFormData.goal,
          activity: editFormData.activity,
          allergies: editFormData.allergies
            .split(",")
            .map((a) => a.trim())
            .filter(Boolean),
          preferences: editFormData.preferences
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean),
          dislikes: editFormData.dislikes
            .split(",")
            .map((d) => d.trim())
            .filter(Boolean),
          favorite_foods: editFormData.favorite_foods
            .split(",")
            .map((f) => f.trim())
            .filter(Boolean),
          health_issues: editFormData.health_issues,
        })
        .eq("user_id", userId);

      if (profileError) throw profileError;

      // Insert new weight into progress table if different from current weight
      const currentWeight = getCurrentWeight();
      if (weight !== currentWeight) {
        const { error: progressError } = await supabase.from("progress").insert({
          user_id: userId,
          weight,
          date: new Date().toISOString().split("T")[0],
          created_at: new Date().toISOString(),
        });

        if (progressError) throw progressError;
      }

      toast({
        title: "Úspech",
        description: "Profil bol úspešne aktualizovaný",
      });
      setIsEditProfileOpen(false);
      await checkUserAndLoadProfile();
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive",
      });
    }
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
            <div className="flex justify-between items-center mb-8 mx-0 my-[20px]">
              <h1 className="text-4xl font-display text-primary">Admin Panel</h1>
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
                        <span className="text-sm">Nová objednávka #{notification.order_id.slice(0, 8)}</span>
                        <Button size="sm" onClick={() => markNotificationAsSeen(notification.id)}>
                          Označiť ako prečítané
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Tabs defaultValue="orders" className="space-y-6">
              <TabsList className="flex flex-wrap w-full max-w-4xl gap-2 h-auto">
                <TabsTrigger
                  value="orders"
                  className="w-1/2 md:w-auto flex-1 md:flex-none flex-col md:flex-row items-center justify-center gap-1 md:gap-2 py-3"
                >
                  <Package className="h-4 w-4" />
                  <span className="text-xs md:text-sm">Objednávky</span>
                </TabsTrigger>
                <TabsTrigger
                  value="dishes"
                  className="w-1/2 md:w-auto flex-1 md:flex-none flex-col md:flex-row items-center justify-center gap-1 md:gap-2 py-3"
                >
                  <UtensilsCrossed className="h-4 w-4" />
                  <span className="text-xs md:text-sm">Správa jedál</span>
                </TabsTrigger>
                <TabsTrigger
                  value="weekly-menu"
                  className="w-1/2 md:w-auto flex-1 md:flex-none flex-col md:flex-row items-center justify-center gap-1 md:gap-2 py-3"
                >
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs md:text-sm">Menu</span>
                </TabsTrigger>
                <TabsTrigger
                  value="users"
                  className="w-1/2 md:w-auto flex-1 md:flex-none flex-col md:flex-row items-center justify-center gap-1 md:gap-2 py-3"
                >
                  <Users className="h-4 w-4" />
                  <span className="text-xs md:text-sm">Používatelia</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="orders" className="mt-6">
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-primary">Správa objednávok</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
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
                          <TableRow
                            key={order.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsOrderModalOpen(true);
                            }}
                          >
                            <TableCell>{new Date(order.created_at).toLocaleDateString("sk-SK")}</TableCell>
                            <TableCell>{order.user_profiles?.name || "N/A"}</TableCell>
                            <TableCell>{order.delivery_type}</TableCell>
                            <TableCell>{order.phone}</TableCell>
                            <TableCell>{order.total_price}€</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(order.status)}>{getStatusLabel(order.status)}</Badge>
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-2">
                                <select
                                  value={order.status}
                                  onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                                  className="border rounded px-2 py-1 text-sm bg-card"
                                >
                                  <option value="pending">Čaká sa</option>
                                  <option value="confirmed">Potvrdené</option>
                                  <option value="completed">Dokončené</option>
                                  <option value="cancelled">Zrušené</option>
                                </select>
                                <Button variant="destructive" size="sm" onClick={(e) => handleDeleteOrder(order.id, e)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="dishes" className="mt-6">
                <MenuManagement />
              </TabsContent>

              <TabsContent value="weekly-menu" className="mt-6">
                <WeeklyMenuManagement />
              </TabsContent>

              <TabsContent value="users" className="mt-6">
                <UserStatistics />
              </TabsContent>
            </Tabs>
          </div>
        </main>

        {/* Order Details Modal */}
        <Dialog open={isOrderModalOpen} onOpenChange={setIsOrderModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Detail objednávky</DialogTitle>
              <DialogDescription>Objednávka #{selectedOrder?.id.slice(0, 8)}</DialogDescription>
            </DialogHeader>

            {selectedOrder && (
              <div className="space-y-6">
                {/* Customer Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Informácie o zákazníkovi</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Meno</p>
                      <p className="font-medium">{selectedOrder.name || selectedOrder.user_profiles?.name || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">
                        {selectedOrder.email || selectedOrder.user_profiles?.email || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Telefón</p>
                      <p className="font-medium">{selectedOrder.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Dátum objednávky</p>
                      <p className="font-medium">{new Date(selectedOrder.created_at).toLocaleString("sk-SK")}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Adresa doručenia</p>
                    <p className="font-medium">{selectedOrder.address}</p>
                  </div>
                </div>

                {/* Dietary Requirements */}
                {(selectedOrder.user_profiles?.allergies && selectedOrder.user_profiles.allergies.length > 0) ||
                (selectedOrder.user_profiles?.dislikes && selectedOrder.user_profiles.dislikes.length > 0) ? (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">Diétne požiadavky zákazníka</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedOrder.user_profiles?.allergies && selectedOrder.user_profiles.allergies.length > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Alergény</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedOrder.user_profiles.allergies.map((allergy, idx) => (
                              <Badge key={idx} variant="destructive" className="text-xs">
                                {allergy}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedOrder.user_profiles?.dislikes && selectedOrder.user_profiles.dislikes.length > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Nechce</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedOrder.user_profiles.dislikes.map((dislike, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {dislike}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* Order Details */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Detaily objednávky</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Typ menu</p>
                      <p className="font-medium">{selectedOrder.menu_size}</p>
                    </div>
                    {selectedOrder.calories && (
                      <div>
                        <p className="text-sm text-muted-foreground">Kalórie</p>
                        <p className="font-medium">{selectedOrder.calories} kcal</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">Typ jedálnička</p>
                      <div className="flex gap-2">
                        {!selectedOrder.menu_id ? (
                          <Badge variant="secondary">Na mieru</Badge>
                        ) : (
                          <Badge variant="outline">Týždenné menu</Badge>
                        )}
                        {selectedOrder.items?.some((day: any) =>
                          day.meals?.some((meal: any) =>
                            typeof meal === "string"
                              ? meal.toLowerCase().includes("vegetarian") || meal.toLowerCase().includes("vegetariánsk")
                              : meal.name?.toLowerCase().includes("vegetarian") ||
                                meal.name?.toLowerCase().includes("vegetariánsk"),
                          ),
                        ) && <Badge className="bg-green-500 hover:bg-green-600">Vegetariánske</Badge>}
                      </div>
                    </div>
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
                    {selectedOrder.items &&
                      Array.isArray(selectedOrder.items) &&
                      selectedOrder.items.map((day: any, idx: number) => {
                        // Format day display - check if it's a date or day name
                        const dayDate = new Date(day.day);
                        const dayDisplay = !isNaN(dayDate.getTime()) 
                          ? dayDate.toLocaleDateString("sk-SK", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
                          : day.day;
                        
                        return (
                          <div key={idx} className="border rounded-lg p-4 bg-muted/30 relative">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h4 className="font-semibold mb-1 text-primary">{dayDisplay}</h4>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="text-xs text-muted-foreground">Stav:</span>
                                  {isAdmin ? (
                                    <select
                                      value={day.status || "pending"}
                                      onChange={(e) => updateDayStatus(selectedOrder.id, idx, e.target.value)}
                                      className="border rounded px-2 py-1 text-xs bg-card"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <option value="pending">Čaká sa</option>
                                      <option value="in_progress">Pripravuje sa</option>
                                      <option value="ready">Pripravené</option>
                                      <option value="delivered">Doručené</option>
                                      <option value="cancelled">Zrušené</option>
                                    </select>
                                  ) : (
                                    <Badge className={getStatusColor(day.status || "pending")}>
                                      {getStatusLabel(day.status || "pending")}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {!isAdmin && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  disabled={!canRemoveDay(day.day) || removingDayOrderId === selectedOrder.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveDay(selectedOrder.id, day.day);
                                  }}
                                  className="ml-2"
                                >
                                  {removingDayOrderId === selectedOrder.id ? "Odstraňuje sa..." : "Odstrániť"}
                                </Button>
                              )}
                            </div>
                            {!isAdmin && !canRemoveDay(day.day) && (
                              <p className="text-xs text-muted-foreground italic mb-2">
                                Tento deň možno odstrániť len 48 hodín pred doručením
                              </p>
                            )}
                            <div className="space-y-1">
                              {day.meals && day.meals.length > 0 ? (
                                day.meals.map((meal: any, mealIdx: number) => (
                                  <p key={mealIdx} className="text-sm">
                                    • {typeof meal === "string" ? meal : meal.name}
                                  </p>
                                ))
                              ) : (
                                <p className="text-sm text-muted-foreground italic">Žiadne jedlá</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
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
          <div className="mt-5">
            <h1 className="text-4xl font-display text-foreground mb-2">Vitajte späť, {profile.name}! 👋</h1>
            <p className="text-muted-foreground text-lg">Sledujte svoj pokrok a dosahujte svoje ciele</p>
          </div>

          {/* Dashboard Overview - All Components in One */}
          <div className="mt-8">
            <DashboardOverview
              profile={profile}
              userId={userId}
              progressData={progressData}
              onWeightAdded={async () => {
                await loadProgressData(userId);
                await checkUserAndLoadProfile();
              }}
            />
          </div>

          {/* Account Settings */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Nastavenia účtu</CardTitle>
              <CardDescription>Spravujte svoje prihlásenie a bezpečnosť</CardDescription>
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
              <Button
                onClick={() => setIsDeleteDialogOpen(true)}
                variant="destructive"
                className="w-full justify-start"
              >
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
            <DialogDescription>Zadajte nový email. Budete musieť potvrdiť zmenu cez email.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-email">Nový email</Label>
              <Input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="novy@email.sk"
              />
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
            <DialogDescription>Zadajte nové heslo. Musí mať aspoň 8 znakov.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nové heslo</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Potvrďte heslo</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
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
              Táto akcia je nenávratná. Všetky vaše údaje, objednávky a progres budú natrvalo vymazané.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušiť</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAccountDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
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
            <DialogDescription>Aktualizujte svoje fitness údaje a stravovacie preferencie</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Osobné údaje */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Osobné údaje</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Meno *</Label>
                  <Input
                    id="edit-name"
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    placeholder="Vaše meno"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-address">Adresa</Label>
                  <Input
                    id="edit-address"
                    type="text"
                    value={editFormData.address}
                    onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                    placeholder="Ulica, číslo, PSČ, Mesto"
                  />
                  <p className="text-xs text-muted-foreground">Použije sa pre doručenie objednávok</p>
                </div>
              </div>
            </div>

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
                        (aktualizované{" "}
                        {new Date(progressData[progressData.length - 1].date).toLocaleDateString("sk-SK")})
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
                  <p className="text-xs text-muted-foreground">Zmena váhy ovplyvní vaše odporúčané veľkosti menu</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-gender">Pohlavie *</Label>
                  <Select
                    value={editFormData.gender}
                    onValueChange={(value) => setEditFormData({ ...editFormData, gender: value })}
                  >
                    <SelectTrigger id="edit-gender">
                      <SelectValue placeholder="Vyberte pohlavie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Muž</SelectItem>
                      <SelectItem value="female">Žena</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Pohlavie ovplyvňuje výpočet BMR a kalorických potrieb</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-goal-weight">Cieľová váha (kg)</Label>
                  <Input
                    id="edit-goal-weight"
                    type="number"
                    step="0.1"
                    value={editFormData.goal_weight}
                    onChange={(e) => setEditFormData({ ...editFormData, goal_weight: e.target.value })}
                    placeholder="napr. 75"
                    min="30"
                    max="300"
                  />
                  <p className="text-xs text-muted-foreground">Použije sa na výpočet času a sledovanie pokroku</p>
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
                  placeholder="napr. vegetarián, vegan, bez cukru"
                />
                <p className="text-xs text-muted-foreground">Oddeľte čiarkou</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-dislikes">Nemám rád</Label>
                <Input
                  id="edit-dislikes"
                  value={editFormData.dislikes}
                  onChange={(e) => setEditFormData({ ...editFormData, dislikes: e.target.value })}
                  placeholder="napr. brokolica, ryby (oddelené čiarkou)"
                />
                <p className="text-xs text-muted-foreground">Oddeľte čiarkou</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-favorite-foods">Obľúbené jedlá</Label>
                <Input
                  id="edit-favorite-foods"
                  value={editFormData.favorite_foods}
                  onChange={(e) => setEditFormData({ ...editFormData, favorite_foods: e.target.value })}
                  placeholder="napr. pizza, sushi (oddelené čiarkou)"
                />
                <p className="text-xs text-muted-foreground">Oddeľte čiarkou</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-health-issues">Zdravotné problémy</Label>
                <Textarea
                  id="edit-health-issues"
                  value={editFormData.health_issues}
                  onChange={(e) => setEditFormData({ ...editFormData, health_issues: e.target.value })}
                  placeholder="napr. cukrovka, vysoký krvný tlak"
                />
                <p className="text-xs text-muted-foreground">Popíšte akékoľvek zdravotné problémy</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditProfileOpen(false)}>
              Zrušiť
            </Button>
            <Button onClick={handleSaveProfile}>Uložiť zmeny</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* All Orders Modal */}
      <Dialog open={isAllOrdersModalOpen} onOpenChange={setIsAllOrdersModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Moje objednávky</DialogTitle>
            <DialogDescription>Zoznam všetkých vašich objednávok</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dátum</TableHead>
                  <TableHead>Typ doručenia</TableHead>
                  <TableHead>Suma</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userOrders.map((order) => (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSelectedOrder(order);
                      setIsOrderModalOpen(true);
                    }}
                  >
                    <TableCell>{new Date(order.created_at).toLocaleDateString("sk-SK")}</TableCell>
                    <TableCell>{order.delivery_type}</TableCell>
                    <TableCell>{order.total_price}€</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(order.status)}>{getStatusLabel(order.status)}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAllOrdersModalOpen(false)}>
              Zavrieť
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Dashboard;
