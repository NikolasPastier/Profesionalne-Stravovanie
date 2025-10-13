import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Package, Calendar, MapPin, AlertCircle } from "lucide-react";

interface Order {
  id: string;
  created_at: string;
  menu_size: string;
  total_price: number;
  delivery_type: string;
  delivery_date: string;
  status: string;
  address: string;
}

const Orders = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileComplete, setProfileComplete] = useState(true);

  useEffect(() => {
    checkUserAndLoadOrders();
  }, []);

  const checkUserAndLoadOrders = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setOrders(data as Order[]);

      // Check if profile is complete
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("name, age, height, weight, goal, activity")
        .eq("user_id", user.id)
        .single();

      const isComplete = profile && 
        profile.name && 
        profile.age && 
        profile.height && 
        profile.weight && 
        profile.goal && 
        profile.activity;

      setProfileComplete(!!isComplete);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500";
      case "confirmed":
        return "bg-blue-500";
      case "delivered":
        return "bg-green-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Čaká na potvrdenie";
      case "confirmed":
        return "Potvrdené";
      case "delivered":
        return "Doručené";
      case "cancelled":
        return "Zrušené";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary text-xl">Načítavam...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-display text-primary mb-8">
            Moje objednávky
          </h1>

          {!profileComplete && (
            <Alert className="mb-6 border-primary/50 bg-primary/5">
              <AlertCircle className="h-4 w-4 text-primary" />
              <AlertDescription className="flex items-center justify-between">
                <span className="text-foreground">
                  Dokončite svoj profil pre lepší personalizovaný zážitok!
                </span>
                <Button 
                  onClick={() => navigate('/onboarding')} 
                  className="bg-primary hover:glow-gold-strong ml-4"
                  size="sm"
                >
                  Dokončiť profil
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {orders.length === 0 ? (
            <Card className="border-primary/20">
              <CardContent className="py-12 text-center">
                <Package className="h-16 w-16 text-primary/50 mx-auto mb-4" />
                <p className="text-xl text-muted-foreground mb-4">
                  Zatiaľ nemáte žiadne objednávky
                </p>
                <button
                  onClick={() => navigate("/menu")}
                  className="text-primary hover:underline"
                >
                  Prejsť do menu
                </button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => (
                <Card key={order.id} className="border-primary/20">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-primary">
                        Objednávka #{order.id.slice(0, 8)}
                      </CardTitle>
                      <Badge className={getStatusColor(order.status)}>
                        {getStatusText(order.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-primary" />
                          <span className="text-sm text-muted-foreground">
                            Veľkosť menu:
                          </span>
                          <span className="font-semibold">
                            {order.menu_size}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span className="text-sm text-muted-foreground">
                            Dátum objednávky:
                          </span>
                          <span className="font-semibold">
                            {new Date(order.created_at).toLocaleDateString(
                              "sk-SK"
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          <span className="text-sm text-muted-foreground">
                            Adresa:
                          </span>
                          <span className="font-semibold">{order.address}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">
                            Typ doručenia:
                          </span>
                          <span className="font-semibold">
                            {order.delivery_type === "weekly"
                              ? "Týždenné"
                              : "Denné"}
                          </span>
                        </div>
                        {order.delivery_date && (
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">
                              Dátum doručenia:
                            </span>
                            <span className="font-semibold">
                              {new Date(order.delivery_date).toLocaleDateString(
                                "sk-SK"
                              )}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">
                            Celková cena:
                          </span>
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
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Orders;
