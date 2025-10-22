import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const orderSchema = z.object({
  name: z.string().trim().min(2, "Meno musí mať aspoň 2 znaky").max(100, "Meno je príliš dlhé"),
  email: z.string().trim().email("Neplatný email").max(255, "Email je príliš dlhý"),
  phone: z.string().trim().regex(/^\+?[0-9]{9,15}$/, "Neplatné telefónne číslo"),
  address: z.string().trim().min(10, "Adresa musí mať aspoň 10 znakov").max(500, "Adresa je príliš dlhá"),
  note: z.string().max(1000, "Poznámka je príliš dlhá").optional(),
});

const Cart = () => {
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [deliveryType, setDeliveryType] = useState("weekly");
  const [loading, setLoading] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showSetPasswordDialog, setShowSetPasswordDialog] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tempOrderData, setTempOrderData] = useState<any>(null);
  const [deliveryRegion, setDeliveryRegion] = useState("nitra");
  const [deliveryFee, setDeliveryFee] = useState(0);
  const navigate = useNavigate();

  // Helper function to get calories from size
  const getCaloriesFromSize = (size: string, customNutrition?: any): number => {
    if (size === "CUSTOM" && customNutrition?.calories) {
      return customNutrition.calories;
    }
    const calorieMap: Record<string, number> = {
      "S": 1600,
      "M": 2000,
      "L": 2500,
      "XL": 3000,
      "XXL": 3500
    };
    return calorieMap[size] || 2000;
  };

  useEffect(() => {
    const storedCart = localStorage.getItem("cart");
    if (storedCart) {
      const parsed = JSON.parse(storedCart);
      setCartItems(Array.isArray(parsed) ? parsed : [parsed]);
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

  // Calculate delivery fee based on address
  const calculateDeliveryFee = (address: string) => {
    const lowerAddress = address.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Nitra a okolie - zdarma (do 20km)
    const nitraRegions = [
      'nitra', 'lapas', 'beladice', 'luzianky', 'ludanice', 'cabaj', 'capor',
      'jelšovce', 'jeľsovce', 'ivanka', 'lehota', 'parovske haje',
      'mlynarce', 'janíkovce', 'janikovec', 'branc', 'drazovce'
    ];
    
    if (nitraRegions.some(region => lowerAddress.includes(region))) {
      return { fee: 0.00, region: 'nitra' };
    }
    
    // Sereď - €4.00
    if (lowerAddress.includes('sered')) {
      return { fee: 4.00, region: 'sered' };
    }
    
    // Trnava - €5.00
    if (lowerAddress.includes('trnava')) {
      return { fee: 5.00, region: 'trnava' };
    }
    
    // Bratislava - €6.00
    if (lowerAddress.includes('bratislava')) {
      return { fee: 6.00, region: 'bratislava' };
    }
    
    // Iné vzdialenosti - dohodou
    return { fee: 0, region: 'other' };
  };

  // Auto-detect delivery region when address changes
  useEffect(() => {
    if (address.length >= 5) {
      const { fee, region } = calculateDeliveryFee(address);
      setDeliveryFee(fee);
      setDeliveryRegion(region);
    }
  }, [address]);

  const createOrder = async (userId: string) => {
    try {
      if (!cartItems || cartItems.length === 0) {
        toast.error("Košík je prázdny");
        return false;
      }

      const orderData = tempOrderData || { name, email, phone, address, note, deliveryType };

      // Create orders for each cart item
      for (const item of cartItems) {
        // Calculate price based on size and vegetarian option
        const isVegetarian = item.isVegetarian || false;
        const dayPrice = isVegetarian ? 16.99 : 6.99;
        
        // For weekly menu, calculate price based on actual number of selected days
        const numberOfDays = item.type === 'week' ? (item.selectedDays?.length || item.menu?.items?.length || 5) : 1;
        const weekPrice = dayPrice * numberOfDays;
        
        // Calculate delivery fee per item (divide by number of items)
        const itemDeliveryFee = deliveryFee / cartItems.length;
        
        const orderDetails = item.type === 'week' ? {
          user_id: userId,
          menu_id: item.menuId,
          items: item.menu.items,
          menu_size: item.size,
          calories: getCaloriesFromSize(item.size, item.customNutrition),
          total_price: weekPrice + itemDeliveryFee,
          delivery_fee: itemDeliveryFee,
          delivery_type: orderData.deliveryType,
          address: orderData.address,
          phone: orderData.phone,
          name: orderData.name,
          email: orderData.email,
          note: orderData.note,
          payment_type: "cash",
          status: "pending"
        } : {
          user_id: userId,
          menu_id: item.menuId,
          items: [{ day: item.day, meals: item.meals }],
          menu_size: item.size,
          calories: getCaloriesFromSize(item.size, item.customNutrition),
          total_price: dayPrice + itemDeliveryFee,
          delivery_fee: itemDeliveryFee,
          delivery_type: orderData.deliveryType,
          address: orderData.address,
          phone: orderData.phone,
          name: orderData.name,
          email: orderData.email,
          note: orderData.note,
          payment_type: "cash",
          status: "pending"
        };

        const { data: order, error: orderError } = await supabase
          .from("orders")
          .insert(orderDetails)
          .select()
          .single();

        if (orderError) throw orderError;

        // Create admin notification
        try {
          await supabase
            .from("admin_notifications")
            .insert({
              order_id: order.id,
              seen: false
            });
        } catch (err) {
          console.error("Notification error:", err);
        }
      }

      // Update user profile
      await supabase
        .from("user_profiles")
        .upsert({
          user_id: userId,
          name: orderData.name,
          email: orderData.email,
          phone: orderData.phone,
          address: orderData.address
        });

      // Send order confirmation emails
      try {
        const orderItems = cartItems.map(item => {
          const isVegetarian = item.isVegetarian || false;
          const dayPrice = isVegetarian ? 16.99 : 6.99;
          const numberOfDays = item.type === 'week' ? (item.selectedDays?.length || item.menu?.items?.length || 5) : 1;
          const price = item.type === 'week' ? (dayPrice * numberOfDays) : dayPrice;
          
          const orderItem: any = {
            name: item.type === 'week' ? 'Týždenné menu' : `Menu - ${item.day}`,
            size: item.size,
            quantity: 1,
            price: price
          };
          
          // Add detailed days and meals for weekly orders
          if (item.type === 'week' && item.menu?.items) {
            orderItem.days = item.menu.items.map((day: any) => ({
              day: day.day,
              meals: day.meals || []
            }));
          }
          
          return orderItem;
        });

        await supabase.functions.invoke('send-order-email', {
          body: {
            orderId: userId,
            customerName: orderData.name,
            customerEmail: orderData.email,
            orderItems: orderItems,
            totalPrice: subtotalPrice + deliveryFee,
            deliveryFee: deliveryFee,
            deliveryAddress: orderData.address,
            deliveryDate: orderData.deliveryType === 'delivery' ? 'Na mieru' : undefined,
            phone: orderData.phone
          }
        });
        
        console.log("Order confirmation emails sent successfully");
      } catch (emailError) {
        console.error("Failed to send order emails:", emailError);
        // Don't fail the order if email fails
      }

      localStorage.removeItem("cart");
      window.dispatchEvent(new Event("cartUpdated"));
      toast.success("Objednávka úspešne vytvorená!");
      return true;
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error("Order creation error:", error);
      }
      toast.error("Nepodarilo sa vytvoriť objednávku. Skúste to prosím znova.");
      return false;
    }
  };

  const handleLogin = async () => {
    if (!loginPassword) {
      toast.error("Zadajte heslo");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: tempOrderData.email,
        password: loginPassword,
      });

      if (error) throw error;

      const success = await createOrder(data.user.id);
      if (success) {
        setShowLoginDialog(false);
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast.error("Prihlásenie zlyhalo: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async () => {
    // Validate password strength
    if (!newPassword || newPassword.length < 8) {
      toast.error("Heslo musí mať minimálne 8 znakov");
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      toast.error("Heslo musí obsahovať aspoň jedno veľké písmeno");
      return;
    }
    if (!/[a-z]/.test(newPassword)) {
      toast.error("Heslo musí obsahovať aspoň jedno malé písmeno");
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      toast.error("Heslo musí obsahovať aspoň jedno číslo");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Heslá sa nezhodujú");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Nepodarilo sa získať session");

      const success = await createOrder(session.user.id);
      if (success) {
        setShowSetPasswordDialog(false);
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast.error("Chyba pri nastavení hesla: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate form data
      const validationResult = orderSchema.safeParse({
        name,
        email,
        phone,
        address,
        note,
      });

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        toast.error(firstError.message);
        setLoading(false);
        return;
      }

      if (!cartItems || cartItems.length === 0) {
        toast.error("Košík je prázdny");
        setLoading(false);
        return;
      }

      // Check for "other" region and confirm
      if (deliveryRegion === 'other') {
        const confirmed = window.confirm(
          'Pre vašu oblasť je potrebné dohodnúť si cenu dopravy. Budeme vás kontaktovať. Chcete pokračovať?'
        );
        if (!confirmed) {
          setLoading(false);
          return;
        }
      }

      // Check if user is already logged in
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // User is logged in, create order directly
        const success = await createOrder(session.user.id);
        if (success) {
          navigate("/dashboard");
        }
        return;
      }

      // Use secure checkout handler
      const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke(
        'checkout-handler',
        {
          body: { email, name, phone, address, note, deliveryType }
        }
      );

      if (checkoutError) {
        if (checkoutError.message?.includes('rate limit')) {
          toast.error("Príliš veľa pokusov. Skúste to neskôr.");
        } else {
          toast.error("Chyba pri spracovaní objednávky");
        }
        return;
      }

      if (checkoutData.rateLimitExceeded) {
        toast.error("Príliš veľa pokusov. Skúste to neskôr.");
        return;
      }

      if (checkoutData.accountExists) {
        // Show login dialog
        setTempOrderData({ name, email, phone, address, note, deliveryType });
        setShowLoginDialog(true);
      } else if (checkoutData.accountCreated) {
        // Show password setup dialog
        setTempOrderData({ name, email, phone, address, note, deliveryType });
        setShowSetPasswordDialog(true);
        toast.success("Účet vytvorený! Nastavte si heslo.");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!cartItems || cartItems.length === 0) {
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

  const removeFromCart = (index: number) => {
    const newCart = cartItems.filter((_, i) => i !== index);
    setCartItems(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
    window.dispatchEvent(new Event("cartUpdated"));
    toast.success("Položka odstránená z košíka");
  };

  const subtotalPrice = cartItems.reduce((sum, item) => {
    const isVegetarian = item.isVegetarian || false;
    const dayPrice = isVegetarian ? 16.99 : 6.99;
    
    if (item.type === 'week') {
      const numberOfDays = item.selectedDays?.length || item.menu?.items?.length || 5;
      return sum + (dayPrice * numberOfDays);
    } else {
      return sum + dayPrice;
    }
  }, 0);

  const totalPrice = subtotalPrice + deliveryFee;

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
              {cartItems.map((item, index) => (
                <div key={index} className="border border-primary/20 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-lg text-primary">
                        {item.type === 'week' ? 'Týždenné menu' : item.day}
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        {item.type === 'week' 
                          ? `${new Date(item.menu.start_date).toLocaleDateString("sk-SK")} - ${new Date(item.menu.end_date).toLocaleDateString("sk-SK")}`
                          : item.weekRange}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromCart(index)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      Odstrániť
                    </Button>
                  </div>
                  {item.type === 'day' && (
                    <div className="mt-3 space-y-2">
                      {item.meals?.map((meal: any, idx: number) => {
                        const mealName = typeof meal === 'string' ? meal.replace(/^[🍳🍽️🥤]\s*/, '') : meal.name;
                        const categoryLabel = meal.category === 'breakfast' ? 'Raňajky' : meal.category === 'lunch' ? 'Obed' : meal.category === 'dinner' ? 'Večera' : '';
                        return (
                          <div key={idx} className="bg-card/30 rounded p-2 border border-border/50">
                            <div className="text-xs font-semibold text-accent/80 mb-1">{categoryLabel}</div>
                            <div className="text-sm text-foreground">{mealName}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-4">
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-primary">
                        Veľkosť: {item.size} ({getCaloriesFromSize(item.size, item.customNutrition)} kcal)
                      </span>
                      {item.isVegetarian && (
                        <span className="text-xs text-accent font-semibold">
                          🌱 Vegetariánske menu
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-xl text-primary">
                      €{(() => {
                        const isVegetarian = item.isVegetarian || false;
                        const dayPrice = isVegetarian ? 16.99 : 6.99;
                        
                        if (item.type === 'week') {
                          const numberOfDays = item.selectedDays?.length || item.menu?.items?.length || 5;
                          return (dayPrice * numberOfDays).toFixed(2);
                        } else {
                          return dayPrice.toFixed(2);
                        }
                      })()}
                    </span>
                  </div>
                </div>
              ))}
              <div className="border-t pt-4 mt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-base text-foreground">Jedlo:</span>
                  <span className="text-base font-semibold">€{subtotalPrice.toFixed(2)}</span>
                </div>
                {deliveryFee > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-base text-foreground">Doprava:</span>
                    <span className="text-base font-semibold">€{deliveryFee.toFixed(2)}</span>
                  </div>
                )}
                {deliveryRegion === 'nitra' && (
                  <div className="flex justify-between items-center text-green-600">
                    <span className="text-base">Doprava:</span>
                    <span className="text-base font-semibold">Zdarma ✓</span>
                  </div>
                )}
                <div className="flex justify-between items-center border-t pt-3">
                  <span className="font-bold text-xl text-foreground">Celkom:</span>
                  <span className="font-bold text-2xl text-gradient-gold">€{totalPrice.toFixed(2)}</span>
                </div>
                {deliveryRegion === 'other' && (
                  <p className="text-sm text-amber-500">
                    ⚠️ Finálna cena bude potvrdená po dohode o doprave
                  </p>
                )}
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
                  <Label htmlFor="deliveryRegion">Oblasť doručenia</Label>
                  <Select value={deliveryRegion} onValueChange={(value) => {
                    setDeliveryRegion(value);
                    const fees: Record<string, number> = {
                      'nitra': 0,
                      'sered': 4.00,
                      'trnava': 5.00,
                      'bratislava': 6.00,
                      'other': 0
                    };
                    setDeliveryFee(fees[value]);
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nitra">Nitra a okolie (zdarma)</SelectItem>
                      <SelectItem value="sered">Sereď (+€4.00)</SelectItem>
                      <SelectItem value="trnava">Trnava (+€5.00)</SelectItem>
                      <SelectItem value="bratislava">Bratislava (+€6.00)</SelectItem>
                      <SelectItem value="other">Iná vzdialenosť (dohodou)</SelectItem>
                    </SelectContent>
                  </Select>
                  {deliveryFee > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Poplatok za dopravu: €{deliveryFee.toFixed(2)}
                    </p>
                  )}
                  {deliveryRegion === 'other' && (
                    <p className="text-sm text-amber-500">
                      ⚠️ Pre túto oblasť je potrebné dohodnúť si cenu dopravy
                    </p>
                  )}
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

                <div className="border-t border-primary/20 pt-4 mt-6">
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-base">Jedlo:</span>
                      <span className="text-base font-semibold">€{subtotalPrice.toFixed(2)}</span>
                    </div>
                    {deliveryFee > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-base">Doprava:</span>
                        <span className="text-base font-semibold">€{deliveryFee.toFixed(2)}</span>
                      </div>
                    )}
                    {deliveryRegion === 'nitra' && (
                      <div className="flex justify-between items-center text-green-600">
                        <span className="text-base">Doprava:</span>
                        <span className="text-base font-semibold">Zdarma ✓</span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center border-t pt-2 mb-2">
                    <span className="text-lg font-bold">Celková suma:</span>
                    <span className="text-2xl font-bold text-primary">€{totalPrice.toFixed(2)}</span>
                  </div>
                  {deliveryRegion === 'other' && (
                    <p className="text-sm text-amber-500 mb-2">
                      ⚠️ Finálna cena bude potvrdená po dohode o doprave
                    </p>
                  )}
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

      {/* Login Dialog */}
      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prihlásenie</DialogTitle>
            <DialogDescription>
              Účet s emailom {tempOrderData?.email} už existuje. Prihláste sa pre dokončenie objednávky.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="loginPassword">Heslo</Label>
              <Input
                id="loginPassword"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Zadajte heslo"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleLogin}
              disabled={loading}
              className="bg-primary hover:glow-gold-strong"
            >
              {loading ? "Prihlasovanie..." : "Prihlásiť sa a dokončiť objednávku"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Password Dialog */}
      <Dialog open={showSetPasswordDialog} onOpenChange={setShowSetPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nastavte si heslo</DialogTitle>
            <DialogDescription>
              Váš účet bol vytvorený. Pre dokončenie objednávky si nastavte heslo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newPassword">Nové heslo</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimálne 6 znakov"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Potvrďte heslo</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Zopakujte heslo"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSetPassword}
              disabled={loading}
              className="bg-primary hover:glow-gold-strong"
            >
              {loading ? "Nastavovanie..." : "Nastaviť heslo a dokončiť objednávku"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Cart;