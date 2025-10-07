import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Cart = () => {
  const [cartItem, setCartItem] = useState<any>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [deliveryType, setDeliveryType] = useState("weekly");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const storedCart = localStorage.getItem("cart");
    if (storedCart) {
      setCartItem(JSON.parse(storedCart));
    }

    // Load user data if available
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("user_id", session.user.id)
          .single();

        if (profile) {
          setName(profile.name || "");
          setEmail(profile.email || session.user.email || "");
          setPhone(profile.phone || "");
          setAddress(profile.address || "");
        } else {
          setEmail(session.user.email || "");
        }
      }
    });
  }, []);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Prosím prihláste sa");
        navigate("/auth");
        return;
      }

      if (!cartItem) {
        toast.error("Košík je prázdny");
        return;
      }

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: session.user.id,
          menu_id: cartItem.menuId,
          items: cartItem.menu.items,
          menu_size: cartItem.size,
          calories: parseInt(cartItem.size.match(/\d+/)?.[0] || "2000"),
          total_price: 45.95, // Base price, can be calculated
          delivery_type: deliveryType,
          address,
          phone,
          note,
          payment_type: "cash",
          status: "pending"
        })
        .select()
        .single();

      if (orderError) {
        toast.error("Chyba pri vytváraní objednávky");
        return;
      }

      // Create admin notification
      await supabase.from("admin_notifications").insert({
        order_id: order.id,
        seen: false
      });

      // Update user profile
      await supabase
        .from("user_profiles")
        .upsert({
          user_id: session.user.id,
          name,
          email,
          phone,
          address
        });

      localStorage.removeItem("cart");
      toast.success("Objednávka úspešne odoslaná!");
      navigate("/orders");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!cartItem) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 pt-32 pb-20 text-center">
          <h1 className="font-display text-4xl font-bold mb-8 text-gradient-gold">
            Váš košík je prázdny 🛒
          </h1>
          <Button onClick={() => navigate("/menu")} className="bg-primary hover:glow-gold-strong">
            Prejsť na menu
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 pt-32 pb-20">
        <h1 className="font-display text-4xl md:text-6xl font-bold text-center mb-12 text-gradient-gold">
          Košík
        </h1>

        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Cart Items */}
          <Card className="card-premium">
            <CardHeader>
              <CardTitle className="text-2xl text-gradient-gold">Vaša objednávka</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border border-primary/20 rounded-lg p-4">
                <h3 className="font-bold text-lg mb-2 text-primary">Týždenné menu</h3>
                <p className="text-muted-foreground mb-2">
                  {new Date(cartItem.menu.start_date).toLocaleDateString("sk-SK")} - {new Date(cartItem.menu.end_date).toLocaleDateString("sk-SK")}
                </p>
                <div className="flex justify-between items-center mt-4">
                  <span className="font-bold text-primary">Veľkosť: {cartItem.size}</span>
                  <span className="font-bold text-xl text-primary">€45.95</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Form */}
          <Card className="card-premium">
            <CardHeader>
              <CardTitle className="text-2xl text-gradient-gold">Informácie o objednávke</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitOrder} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Meno a priezvisko *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Ján Novák"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="jan@priklad.sk"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefónne číslo *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    placeholder="+421 XXX XXX XXX"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Adresa doručenia *</Label>
                  <Textarea
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                    placeholder="Ulica, číslo domu, mesto, PSČ"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="note">Poznámka (voliteľná)</Label>
                  <Textarea
                    id="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Napr. alergény, špeciálne požiadavky..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Typ objednávky</Label>
                  <RadioGroup value={deliveryType} onValueChange={setDeliveryType}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="weekly" id="weekly" />
                      <Label htmlFor="weekly" className="cursor-pointer">
                        Týždenné menu (pondelok–piatok)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="daily" id="daily" />
                      <Label htmlFor="daily" className="cursor-pointer">
                        Denné menu
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="border-t border-primary/20 pt-4 mt-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-bold">Celková suma:</span>
                    <span className="text-2xl font-bold text-primary">€45.95</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    💰 Platba: Hotovosť pri doručení prvej objednávky v celej sume
                  </p>
                  <Button
                    type="submit"
                    className="w-full bg-primary hover:glow-gold-strong text-lg py-6"
                    disabled={loading}
                  >
                    {loading ? "Spracovávam..." : "Odoslať objednávku"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Cart;