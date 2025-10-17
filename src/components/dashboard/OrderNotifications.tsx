import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Bell } from "lucide-react";

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
}

interface OrderNotificationsProps {
  userId: string;
  onOrderClick: (order: Order) => void;
}

export function OrderNotifications({ userId, onOrderClick }: OrderNotificationsProps) {
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);

  useEffect(() => {
    loadRecentOrders();
    
    // Subscribe to order status changes
    const channel = supabase
      .channel('order-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${userId}`
        },
        () => {
          loadRecentOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadRecentOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(2);

      if (error) throw error;
      setRecentOrders(data || []);
    } catch (error) {
      console.error("Error loading orders:", error);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      pending: "Čaká sa",
      confirmed: "Potvrdené",
      in_progress: "V procese",
      ready: "Pripravené",
      delivered: "Doručené",
      cancelled: "Zrušené"
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500 hover:bg-yellow-600";
      case "confirmed":
        return "bg-blue-500 hover:bg-blue-600";
      case "in_progress":
        return "bg-purple-500 hover:bg-purple-600";
      case "ready":
        return "bg-green-500 hover:bg-green-600";
      case "delivered":
        return "bg-gray-500 hover:bg-gray-600";
      case "cancelled":
        return "bg-red-500 hover:bg-red-600";
      default:
        return "bg-gray-500 hover:bg-gray-600";
    }
  };

  if (recentOrders.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Nové notifikácie ({recentOrders.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {recentOrders.map((order) => (
          <button
            key={order.id}
            onClick={() => onOrderClick(order)}
            className="w-full text-left p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all border border-transparent hover:border-primary/20 group"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground truncate">
                  Objednávka #{order.id.slice(0, 8).toUpperCase()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(order.created_at).toLocaleDateString("sk-SK")}
                </p>
              </div>
              <Badge className={`${getStatusColor(order.status)} text-white text-xs whitespace-nowrap`}>
                {getStatusLabel(order.status).toUpperCase()}
              </Badge>
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
