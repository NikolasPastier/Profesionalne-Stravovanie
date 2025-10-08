import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Package, Check, UtensilsCrossed } from "lucide-react";
import { MenuManagement } from "@/components/admin/MenuManagement";

interface Order {
  id: string;
  created_at: string;
  user_id: string;
  menu_size: string;
  total_price: number;
  delivery_type: string;
  status: string;
  address: string;
  phone: string;
}

interface Notification {
  id: string;
  order_id: string;
  seen: boolean;
  created_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (roleError || !roleData || roleData.role !== "admin") {
        toast({
          title: "Prístup zamietnutý",
          description: "Nemáte oprávnenie pristupovať k admin panelu",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setIsAdmin(true);
      loadOrders();
      loadNotifications();
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive",
      });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa načítať objednávky",
        variant: "destructive",
      });
      return;
    }

    setOrders(data as Order[]);
  };

  const loadNotifications = async () => {
    const { data, error } = await supabase
      .from("admin_notifications")
      .select("*")
      .eq("seen", false)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa načítať notifikácie",
        variant: "destructive",
      });
      return;
    }

    setNotifications(data as Notification[]);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa aktualizovať stav objednávky",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Úspech",
      description: "Stav objednávky bol aktualizovaný",
    });

    loadOrders();
  };

  const markNotificationAsSeen = async (notificationId: string) => {
    const { error } = await supabase
      .from("admin_notifications")
      .update({ seen: true })
      .eq("id", notificationId);

    if (error) {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa označiť notifikáciu",
        variant: "destructive",
      });
      return;
    }

    loadNotifications();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary text-xl">Načítavam...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-display text-primary">Admin Panel</h1>
          <div className="flex gap-4">
            <Button
              variant="outline"
              className="relative"
              onClick={() => loadNotifications()}
            >
              <Bell className="h-4 w-4 mr-2" />
              Notifikácie
              {notifications.length > 0 && (
                <Badge className="ml-2 bg-red-500">{notifications.length}</Badge>
              )}
            </Button>
            <Button onClick={() => navigate("/")}>Späť na web</Button>
          </div>
        </div>

        {notifications.length > 0 && (
          <Card className="border-primary/20 mb-6">
            <CardHeader>
              <CardTitle className="text-primary flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Nové notifikácie
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="flex justify-between items-center p-3 border border-primary/20 rounded-lg"
                  >
                    <span>
                      Nová objednávka #{notification.order_id.slice(0, 8)}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => markNotificationAsSeen(notification.id)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Objednávky
            </TabsTrigger>
            <TabsTrigger value="menu" className="flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4" />
              Správa menu
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-primary flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Všetky objednávky
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Dátum</TableHead>
                      <TableHead>Veľkosť</TableHead>
                      <TableHead>Cena</TableHead>
                      <TableHead>Telefón</TableHead>
                      <TableHead>Adresa</TableHead>
                      <TableHead>Stav</TableHead>
                      <TableHead>Akcie</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">
                          {order.id.slice(0, 8)}
                        </TableCell>
                        <TableCell>
                          {new Date(order.created_at).toLocaleDateString("sk-SK")}
                        </TableCell>
                        <TableCell>{order.menu_size}</TableCell>
                        <TableCell className="font-bold">
                          {order.total_price.toFixed(2)} €
                        </TableCell>
                        <TableCell>{order.phone}</TableCell>
                        <TableCell>{order.address}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              order.status === "pending"
                                ? "bg-yellow-500"
                                : order.status === "confirmed"
                                ? "bg-blue-500"
                                : order.status === "delivered"
                                ? "bg-green-500"
                                : "bg-red-500"
                            }
                          >
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {order.status === "pending" && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  updateOrderStatus(order.id, "confirmed")
                                }
                              >
                                Potvrdiť
                              </Button>
                            )}
                            {order.status === "confirmed" && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  updateOrderStatus(order.id, "delivered")
                                }
                              >
                                Doručené
                              </Button>
                            )}
                          </div>
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
    </div>
  );
};

export default Admin;
