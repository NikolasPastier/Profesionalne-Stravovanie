import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface PromoUser {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  promo_code: string;
  promo_discount_used: boolean;
  created_at: string;
}

interface UserOrder {
  id: string;
  created_at: string;
  total_price: number;
  status: string;
  delivery_date: string | null;
}

export const PromoCodeUsers = () => {
  const [promoUsers, setPromoUsers] = useState<PromoUser[]>([]);
  const [userOrders, setUserOrders] = useState<Record<string, UserOrder[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  useEffect(() => {
    fetchPromoUsers();
  }, []);

  const fetchPromoUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .not("promo_code", "is", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setPromoUsers(data || []);

      // Fetch orders for each user
      if (data) {
        const ordersMap: Record<string, UserOrder[]> = {};
        for (const user of data) {
          const { data: orders } = await supabase
            .from("orders")
            .select("id, created_at, total_price, status, delivery_date")
            .eq("user_id", user.user_id)
            .order("created_at", { ascending: false });

          ordersMap[user.user_id] = orders || [];
        }
        setUserOrders(ordersMap);
      }
    } catch (error) {
      console.error("Error fetching promo users:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500";
      case "confirmed":
        return "bg-blue-500";
      case "completed":
        return "bg-green-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Čaká";
      case "confirmed":
        return "Potvrdené";
      case "completed":
        return "Dokončené";
      case "cancelled":
        return "Zrušené";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Používatelia s promo kódom</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (promoUsers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Používatelia s promo kódom</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Žiadni používatelia s promo kódom
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Používatelia s promo kódom VITAJ5</CardTitle>
        <p className="text-sm text-muted-foreground">
          Celkový počet: {promoUsers.length} používateľov
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Meno</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefón</TableHead>
              <TableHead>Zľava použitá</TableHead>
              <TableHead>Objednávky</TableHead>
              <TableHead>Registrácia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {promoUsers.map((user) => {
              const orders = userOrders[user.user_id] || [];
              const isExpanded = expandedUser === user.user_id;

              return (
                <>
                  <TableRow
                    key={user.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedUser(isExpanded ? null : user.user_id)}
                  >
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone}</TableCell>
                    <TableCell>
                      <Badge variant={user.promo_discount_used ? "default" : "secondary"}>
                        {user.promo_discount_used ? "Áno" : "Nie"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{orders.length}</Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString("sk-SK")}
                    </TableCell>
                  </TableRow>
                  {isExpanded && orders.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-muted/30">
                        <div className="py-4 px-2">
                          <h4 className="font-semibold mb-3">Objednávky používateľa:</h4>
                          <div className="space-y-2">
                            {orders.map((order) => (
                              <div
                                key={order.id}
                                className="flex items-center justify-between p-3 bg-background rounded-lg border"
                              >
                                <div className="flex-1">
                                  <p className="text-sm font-medium">
                                    Objednávka #{order.id.slice(0, 8)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(order.created_at).toLocaleString("sk-SK")}
                                  </p>
                                </div>
                                <div className="flex items-center gap-4">
                                  <Badge className={getStatusColor(order.status)}>
                                    {getStatusLabel(order.status)}
                                  </Badge>
                                  <p className="font-bold text-primary">
                                    €{order.total_price.toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
