import { useEffect, useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  calories: number;
  proteins: number;
  fats: number;
  carbs: number;
  description: string;
  allergens: string[];
}

export const MenuManagement = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    price: "",
    calories: "",
    proteins: "",
    fats: "",
    carbs: "",
    description: "",
    allergens: "",
  });

  useEffect(() => {
    loadMenuItems();
  }, []);

  const loadMenuItems = async () => {
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .order("category", { ascending: true });

    if (error) {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa načítať jedlá",
        variant: "destructive",
      });
      return;
    }

    setItems(data as MenuItem[]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const itemData = {
      name: formData.name,
      category: formData.category || null,
      price: formData.price ? parseFloat(formData.price) : null,
      calories: formData.calories ? parseInt(formData.calories) : null,
      proteins: formData.proteins ? parseFloat(formData.proteins) : null,
      fats: formData.fats ? parseFloat(formData.fats) : null,
      carbs: formData.carbs ? parseFloat(formData.carbs) : null,
      description: formData.description || null,
      allergens: formData.allergens.split(",").map((a) => a.trim()).filter(Boolean),
    };

    if (editingItem) {
      const { error } = await supabase
        .from("menu_items")
        .update(itemData)
        .eq("id", editingItem.id);

      if (error) {
        toast({
          title: "Chyba",
          description: "Nepodarilo sa aktualizovať jedlo",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Úspech",
        description: "Jedlo bolo úspešne aktualizované",
      });
    } else {
      const { error } = await supabase.from("menu_items").insert(itemData);

      if (error) {
        toast({
          title: "Chyba",
          description: "Nepodarilo sa pridať jedlo",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Úspech",
        description: "Jedlo bolo úspešne pridané",
      });
    }

    resetForm();
    loadMenuItems();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Naozaj chcete vymazať toto jedlo?")) return;

    const { error } = await supabase.from("menu_items").delete().eq("id", id);

    if (error) {
      toast({
        title: "Chyba",
        description: "Nepodarilo sa vymazať jedlo",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Úspech",
      description: "Jedlo bolo vymazané",
    });

    loadMenuItems();
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      price: item.price.toString(),
      calories: item.calories.toString(),
      proteins: item.proteins.toString(),
      fats: item.fats.toString(),
      carbs: item.carbs.toString(),
      description: item.description || "",
      allergens: item.allergens?.join(", ") || "",
    });
    setIsAddDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      price: "",
      calories: "",
      proteins: "",
      fats: "",
      carbs: "",
      description: "",
      allergens: "",
    });
    setEditingItem(null);
    setIsAddDialogOpen(false);
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-primary">Správa jedál</CardTitle>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90" onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Pridať jedlo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Upraviť jedlo" : "Pridať nové jedlo"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Názov</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Kategória (voliteľné)</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="price">Cena (€) (voliteľné)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="calories">Kalórie (voliteľné)</Label>
                    <Input
                      id="calories"
                      type="number"
                      value={formData.calories}
                      onChange={(e) =>
                        setFormData({ ...formData, calories: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="proteins">Proteíny (g) (voliteľné)</Label>
                    <Input
                      id="proteins"
                      type="number"
                      step="0.1"
                      value={formData.proteins}
                      onChange={(e) =>
                        setFormData({ ...formData, proteins: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="fats">Tuky (g) (voliteľné)</Label>
                    <Input
                      id="fats"
                      type="number"
                      step="0.1"
                      value={formData.fats}
                      onChange={(e) =>
                        setFormData({ ...formData, fats: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="carbs">Sacharidy (g) (voliteľné)</Label>
                    <Input
                      id="carbs"
                      type="number"
                      step="0.1"
                      value={formData.carbs}
                      onChange={(e) =>
                        setFormData({ ...formData, carbs: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="allergens">Alergény (oddelené čiarkou)</Label>
                    <Input
                      id="allergens"
                      value={formData.allergens}
                      onChange={(e) =>
                        setFormData({ ...formData, allergens: e.target.value })
                      }
                      placeholder="napr. gluten, laktóza"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Popis</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Zrušiť
                  </Button>
                  <Button type="submit" className="bg-primary hover:bg-primary/90">
                    {editingItem ? "Uložiť zmeny" : "Pridať jedlo"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Názov</TableHead>
              <TableHead>Kategória</TableHead>
              <TableHead>Cena</TableHead>
              <TableHead>Kalórie</TableHead>
              <TableHead>Proteíny</TableHead>
              <TableHead>Akcie</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell className="font-bold">{item.price.toFixed(2)} €</TableCell>
                <TableCell>{item.calories} kcal</TableCell>
                <TableCell>{item.proteins}g</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(item)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(item.id)}
                    >
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
  );
};
