import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, Plus, Calendar, History, Pencil, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  breakfast: { id: string; name: string }[];
  lunch: { id: string; name: string }[];
  dinner: { id: string; name: string }[];
}

interface WeeklyMenu {
  id: string;
  start_date: string;
  end_date: string;
  items: any;
  created_at: string;
}

const DAYS = ["Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok"];
const CATEGORIES = ["breakfast", "lunch", "dinner"] as const;
const CATEGORY_LABELS = {
  breakfast: "Raňajky",
  lunch: "Obed",
  dinner: "Večera"
};

export const WeeklyMenuManagement = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [menuHistory, setMenuHistory] = useState<WeeklyMenu[]>([]);
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("create");
  const [weekMenu, setWeekMenu] = useState<DayMenu[]>(
    DAYS.map(day => ({
      day,
      breakfast: [],
      lunch: [],
      dinner: []
    }))
  );

  useEffect(() => {
    loadMenuItems();
    loadMenuHistory();
    setAutoDateRange();
  }, []);

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
    // getDay(): 0 = Sunday, 1 = Monday, ...
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);

    setStartDate(monday.toISOString().split("T")[0]);
    setEndDate(friday.toISOString().split("T")[0]);
  };
  const addMealToDay = (dayIndex: number, category: typeof CATEGORIES[number], mealId: string) => {
    const meal = menuItems.find(m => m.id === mealId);
    if (!meal) return;

    setWeekMenu(prev => {
      const updated = [...prev];
      if (!updated[dayIndex][category].find(m => m.id === mealId)) {
        updated[dayIndex][category] = [...updated[dayIndex][category], { id: meal.id, name: meal.name }];
      }
      return updated;
    });
  };

  const removeMealFromDay = (dayIndex: number, category: typeof CATEGORIES[number], mealId: string) => {
    setWeekMenu(prev => {
      const updated = [...prev];
      updated[dayIndex][category] = updated[dayIndex][category].filter(m => m.id !== mealId);
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
        dinner: []
      };
      return updated;
    });
    toast.success(`${DAYS[dayIndex]} vymazané`);
  };

  const resetForm = () => {
    setEditingMenuId(null);
    setWeekMenu(DAYS.map(day => ({
      day,
      breakfast: [],
      lunch: [],
      dinner: []
    })));
    setAutoDateRange();
  };

  const loadMenuForEditing = (menu: WeeklyMenu) => {
    setEditingMenuId(menu.id);
    setStartDate(menu.start_date);
    setEndDate(menu.end_date);
    
    const loadedWeekMenu = DAYS.map(day => {
      const dayData = menu.items.find((item: any) => item.day === day);
      return {
        day,
        breakfast: dayData?.meals.filter((m: any) => m.category === 'breakfast').map((m: any) => ({ id: m.id, name: m.name })) || [],
        lunch: dayData?.meals.filter((m: any) => m.category === 'lunch').map((m: any) => ({ id: m.id, name: m.name })) || [],
        dinner: dayData?.meals.filter((m: any) => m.category === 'dinner').map((m: any) => ({ id: m.id, name: m.name })) || []
      };
    });
    
    setWeekMenu(loadedWeekMenu);
    setActiveTab("create");
    toast.info("Menu načítané na úpravu");
  };

  const handleSaveMenu = async () => {
    if (!startDate || !endDate) {
      toast.error("Prosím vyberte dátumy");
      return;
    }

    const hasAnyMeals = weekMenu.some(
      day => day.breakfast.length > 0 || day.lunch.length > 0 || day.dinner.length > 0
    );

    if (!hasAnyMeals) {
      toast.error("Pridajte aspoň jedno jedlo");
      return;
    }

    try {
      const menuData = weekMenu.map(day => ({
        day: day.day,
        meals: [
          ...day.breakfast.map(m => ({ id: m.id, name: m.name, category: 'breakfast' })),
          ...day.lunch.map(m => ({ id: m.id, name: m.name, category: 'lunch' })),
          ...day.dinner.map(m => ({ id: m.id, name: m.name, category: 'dinner' }))
        ]
      }));

      if (editingMenuId) {
        // Update existing menu
        const { error } = await supabase
          .from("weekly_menus")
          .update({
            start_date: startDate,
            end_date: endDate,
            items: menuData
          })
          .eq("id", editingMenuId);

        if (error) throw error;
        toast.success("Menu úspešne aktualizované!");
      } else {
        // Insert new menu
        const { error } = await supabase
          .from("weekly_menus")
          .insert({
            start_date: startDate,
            end_date: endDate,
            items: menuData
          });

        if (error) throw error;
        toast.success("Menu úspešne uložené!");
      }
      
      // Reset form and reload history
      resetForm();
      await loadMenuHistory();
      setActiveTab("history");
    } catch (error: any) {
      toast.error("Chyba pri ukladaní menu: " + error.message);
    }
  };

  const handleDeleteMenu = async (menuId: string) => {
    if (!confirm("Naozaj chcete vymazať toto menu?")) return;

    try {
      // Skontrolovať, či existujú objednávky s týmto menu
      const { data: ordersWithMenu, error: checkError } = await supabase
        .from("orders")
        .select("id")
        .eq("menu_id", menuId)
        .limit(1);

      if (checkError) throw checkError;

      // Ak existujú objednávky, informujeme užívateľa a ponúkneme možnosti
      if (ordersWithMenu && ordersWithMenu.length > 0) {
        const confirmDetach = confirm(
          "Toto menu je použité v existujúcich objednávkach. " +
          "Kliknutím na OK sa objednávky odpoja od menu a menu bude vymazané. " +
          "Objednávky ostanú zachované so svojimi položkami."
        );
        
        if (!confirmDetach) return;

        // Odpojíme objednávky (nastavíme menu_id na NULL)
        const { error: updateError } = await supabase
          .from("orders")
          .update({ menu_id: null })
          .eq("menu_id", menuId);

        if (updateError) throw updateError;
      }

      // Teraz môžeme bezpečne vymazať menu
      const { error: deleteError } = await supabase
        .from("weekly_menus")
        .delete()
        .eq("id", menuId);

      if (deleteError) throw deleteError;

      toast.success("Menu vymazané");
      await loadMenuHistory();
    } catch (error: any) {
      toast.error("Chyba pri mazaní menu: " + error.message);
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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

      <TabsContent value="create" className="space-y-8">
        {/* Edit Mode Indicator */}
        {editingMenuId && (
          <Alert className="bg-accent/10 border-accent">
            <AlertDescription className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pencil className="h-4 w-4 text-accent" />
                <span className="text-foreground">
                  Upravujete menu od <strong>{new Date(startDate).toLocaleDateString("sk-SK")}</strong> do <strong>{new Date(endDate).toLocaleDateString("sk-SK")}</strong>
                </span>
              </div>
              <Button
                onClick={resetForm}
                variant="ghost"
                size="sm"
                className="text-accent hover:text-accent hover:bg-accent/20"
              >
                <X className="h-4 w-4 mr-2" />
                Zrušiť úpravu
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Date Range */}
        <Card className="card-premium">
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
        <div className="space-y-6">
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
                              <span className="text-sm text-foreground">{meal.name}</span>
                              <Button
                                onClick={() => removeMealFromDay(dayIndex, category, meal.id)}
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
                        <SelectContent className="bg-card border-border max-h-[300px] overflow-y-auto">
                          {menuItems
                            .filter(item => {
                              // Filter by category
                              const itemCategory = item.category?.toLowerCase() || '';
                              const matchesCategory = 
                                (category === 'breakfast' && itemCategory.includes('raňajk')) ||
                                (category === 'lunch' && itemCategory.includes('obed')) ||
                                (category === 'dinner' && itemCategory.includes('večer'));
                              
                              // Don't show already added items
                              const notAdded = !dayMenu[category].find(m => m.id === item.id);
                              
                              return matchesCategory && notAdded;
                            })
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
          {editingMenuId && (
            <Button
              onClick={resetForm}
              size="lg"
              variant="outline"
              className="border-border text-foreground hover:bg-muted"
            >
              <X className="h-5 w-5 mr-2" />
              Zrušiť
            </Button>
          )}
          <Button
            onClick={handleSaveMenu}
            size="lg"
            className="bg-accent text-accent-foreground hover:glow-gold-strong transition-smooth"
          >
            {editingMenuId ? (
              <>
                <Pencil className="h-5 w-5 mr-2" />
                Aktualizovať menu
              </>
            ) : (
              <>
                <Plus className="h-5 w-5 mr-2" />
                Uložiť týždenné menu
              </>
            )}
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
                  <div className="flex gap-2">
                    <Button
                      onClick={() => loadMenuForEditing(menu)}
                      variant="outline"
                      size="sm"
                      className="border-accent text-accent hover:bg-accent/20"
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Upraviť
                    </Button>
                    <Button
                      onClick={() => handleDeleteMenu(menu.id)}
                      variant="destructive"
                      size="sm"
                      className="bg-destructive/20 text-destructive border border-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {menu.items && Array.isArray(menu.items) && menu.items.map((day: any, idx: number) => (
                      <div key={idx} className="border border-border rounded-lg p-4 bg-card/50">
                        <h4 className="font-bold mb-2 text-primary">{day.day}</h4>
                        <div className="space-y-2 text-sm">
                          {day.meals && day.meals.map((meal: any, mealIdx: number) => {
                            const categoryLabel = meal.category === 'breakfast' ? 'Raňajky' : meal.category === 'lunch' ? 'Obed' : meal.category === 'dinner' ? 'Večera' : 'Jedlo';
                            return (
                              <div key={mealIdx} className="bg-card/30 rounded-md p-2 border border-border/50">
                                <div className="text-xs font-semibold text-accent/80 mb-1">{categoryLabel}</div>
                                <p className="text-foreground font-medium">{meal.name}</p>
                              </div>
                            );
                          })}
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
  );
};
