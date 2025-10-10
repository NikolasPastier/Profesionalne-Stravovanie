import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, Plus, Calendar, History } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MenuItem {
  id: string;
  name: string;
  category: string;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
}

interface DayMenu {
  day: string;
  breakfast: string[];
  lunch: string[];
  snack: string[];
}

interface WeeklyMenu {
  id: string;
  start_date: string;
  end_date: string;
  items: any;
  created_at: string;
}

const DAYS = ["Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok", "Sobota", "Nedeľa"];
const CATEGORIES = ["breakfast", "lunch", "snack"] as const;
const CATEGORY_LABELS = {
  breakfast: "Raňajky",
  lunch: "Obed",
  snack: "Snack"
};

const AdminMenu = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [menuHistory, setMenuHistory] = useState<WeeklyMenu[]>([]);
  const [weekMenu, setWeekMenu] = useState<DayMenu[]>(
    DAYS.map(day => ({
      day,
      breakfast: [],
      lunch: [],
      snack: []
    }))
  );

  useEffect(() => {
    checkAdminAndLoadData();
  }, []);

  const checkAdminAndLoadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (!roleData) {
        navigate("/dashboard");
        return;
      }

      setIsAdmin(true);
      await loadMenuItems();
      await loadMenuHistory();
      setAutoDateRange();
    } catch (error: any) {
      toast.error("Chyba pri načítaní dát");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const loadMenuItems = async () => {
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .order("name");

    if (error) {
      toast.error("Chyba pri načítaní jedál");
      return;
    }

    setMenuItems(data || []);
  };

  const loadMenuHistory = async () => {
    const { data, error } = await supabase
      .from("weekly_menus")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Chyba pri načítaní histórie menu");
      return;
    }

    setMenuHistory(data || []);
  };

  const setAutoDateRange = () => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    setStartDate(monday.toISOString().split("T")[0]);
    setEndDate(sunday.toISOString().split("T")[0]);
  };

  const addMealToDay = (dayIndex: number, category: typeof CATEGORIES[number], mealId: string) => {
    const meal = menuItems.find(m => m.id === mealId);
    if (!meal) return;

    setWeekMenu(prev => {
      const updated = [...prev];
      if (!updated[dayIndex][category].includes(meal.name)) {
        updated[dayIndex][category] = [...updated[dayIndex][category], meal.name];
      }
      return updated;
    });
  };

  const removeMealFromDay = (dayIndex: number, category: typeof CATEGORIES[number], mealName: string) => {
    setWeekMenu(prev => {
      const updated = [...prev];
      updated[dayIndex][category] = updated[dayIndex][category].filter(m => m !== mealName);
      return updated;
    });
  };

  const clearDay = (dayIndex: number) => {
    setWeekMenu(prev => {
      const updated = [...prev];
      updated[dayIndex] = {
        day: updated[dayIndex].day,
        breakfast: [],
        lunch: [],
        snack: []
      };
      return updated;
    });
    toast.success(`${DAYS[dayIndex]} vymazané`);
  };

  const handleSaveMenu = async () => {
    if (!startDate || !endDate) {
      toast.error("Prosím vyberte dátumy");
      return;
    }

    const hasAnyMeals = weekMenu.some(
      day => day.breakfast.length > 0 || day.lunch.length > 0 || day.snack.length > 0
    );

    if (!hasAnyMeals) {
      toast.error("Pridajte aspoň jedno jedlo");
      return;
    }

    try {
      const menuData = weekMenu.map(day => ({
        day: day.day,
        meals: [
          ...day.breakfast.map(m => `🍳 ${m}`),
          ...day.lunch.map(m => `🍽️ ${m}`),
          ...day.snack.map(m => `🥤 ${m}`)
        ]
      }));

      const { error } = await supabase
        .from("weekly_menus")
        .insert({
          start_date: startDate,
          end_date: endDate,
          items: menuData
        });

      if (error) throw error;

      toast.success("Menu úspešne uložené!");
      
      // Reset form and reload history
      setWeekMenu(DAYS.map(day => ({
        day,
        breakfast: [],
        lunch: [],
        snack: []
      })));
      setAutoDateRange();
      await loadMenuHistory();
    } catch (error: any) {
      toast.error("Chyba pri ukladaní menu: " + error.message);
    }
  };

  const handleDeleteMenu = async (menuId: string) => {
    if (!confirm("Naozaj chcete vymazať toto menu?")) return;

    try {
      const { error } = await supabase
        .from("weekly_menus")
        .delete()
        .eq("id", menuId);

      if (error) throw error;

      toast.success("Menu vymazané");
      await loadMenuHistory();
    } catch (error: any) {
      toast.error("Chyba pri mazaní menu: " + error.message);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-foreground">Načítavam...</p>
    </div>;
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 pt-32 pb-20">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gradient-gold">
            Správa týždenného menu
          </h1>
          <Button
            onClick={() => navigate("/dashboard")}
            variant="outline"
          >
            Späť na Dashboard
          </Button>
        </div>

        <Tabs defaultValue="create" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="create">
              <Plus className="h-4 w-4 mr-2" />
              Vytvoriť menu
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-2" />
              História ({menuHistory.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-8">{/* Date Range */}
        <Card className="card-premium mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-accent" />
              Obdobie menu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Začiatok</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-card border-border text-foreground"
                />
              </div>
              <div>
                <Label htmlFor="endDate">Koniec</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-card border-border text-foreground"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Days Menu Builder */}
        <div className="space-y-6 mb-8">
          {weekMenu.map((dayMenu, dayIndex) => (
            <Card key={dayMenu.day} className="card-premium">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-2xl text-primary">
                  {dayMenu.day}
                </CardTitle>
                <Button
                  onClick={() => clearDay(dayIndex)}
                  variant="destructive"
                  size="sm"
                  className="bg-destructive/20 text-destructive border border-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Vymazať deň
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {CATEGORIES.map((category) => (
                    <div key={category} className="space-y-3">
                      <Label className="text-lg font-semibold text-accent">
                        {CATEGORY_LABELS[category]}
                      </Label>
                      
                      {/* Selected meals */}
                      <div className="space-y-2 min-h-[100px] bg-card/50 rounded-lg p-3 border border-border">
                        {dayMenu[category].length === 0 ? (
                          <p className="text-sm text-muted-foreground italic">
                            Žiadne jedlo
                          </p>
                        ) : (
                          dayMenu[category].map((meal, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between bg-background p-2 rounded border border-border"
                            >
                              <span className="text-sm text-foreground">{meal}</span>
                              <Button
                                onClick={() => removeMealFromDay(dayIndex, category, meal)}
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/20"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Add meal selector */}
                      <Select onValueChange={(value) => addMealToDay(dayIndex, category, value)}>
                        <SelectTrigger className="bg-card border-border text-foreground">
                          <SelectValue placeholder="Pridať jedlo" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {menuItems
                            .filter(item => !dayMenu[category].includes(item.name))
                            .map((item) => (
                              <SelectItem
                                key={item.id}
                                value={item.id}
                                className="text-foreground hover:bg-muted cursor-pointer"
                              >
                                {item.name} ({item.calories} kcal)
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Save Button */}
        <div className="flex justify-center gap-4">
          <Button
            onClick={handleSaveMenu}
            size="lg"
            className="bg-accent text-accent-foreground hover:glow-gold-strong transition-smooth"
          >
            <Plus className="h-5 w-5 mr-2" />
            Uložiť týždenné menu
          </Button>
        </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            {menuHistory.length === 0 ? (
              <Card className="card-premium">
                <CardContent className="py-12 text-center">
                  <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Zatiaľ nemáte žiadne uložené menu</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {menuHistory.map((menu) => (
                  <Card key={menu.id} className="card-premium">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-xl text-accent">
                          Menu na týždeň
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(menu.start_date).toLocaleDateString("sk-SK")} - {new Date(menu.end_date).toLocaleDateString("sk-SK")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Vytvorené: {new Date(menu.created_at).toLocaleDateString("sk-SK")}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleDeleteMenu(menu.id)}
                        variant="destructive"
                        size="sm"
                        className="bg-destructive/20 text-destructive border border-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {menu.items && Array.isArray(menu.items) && menu.items.map((day: any, idx: number) => (
                          <div key={idx} className="border border-border rounded-lg p-4 bg-card/50">
                            <h4 className="font-bold mb-2 text-primary">{day.day}</h4>
                            <div className="space-y-1 text-sm">
                              {day.meals && day.meals.map((meal: string, mealIdx: number) => (
                                <p key={mealIdx} className="text-muted-foreground">{meal}</p>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
};

export default AdminMenu;
