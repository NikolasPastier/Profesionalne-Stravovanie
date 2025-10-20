import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { z } from "zod";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Meno musí mať aspoň 2 znaky").max(100, "Meno je príliš dlhé"),
  age: z.number().min(13, "Minimálny vek je 13 rokov").max(120, "Neplatný vek"),
  height: z.number().min(100, "Výška musí byť aspoň 100 cm").max(250, "Výška nemôže byť viac ako 250 cm"),
  weight: z.number().min(30, "Váha musí byť aspoň 30 kg").max(300, "Váha nemôže byť viac ako 300 kg"),
  phone: z.string().trim().regex(/^\+?[0-9]{9,15}$/, "Neplatné telefónne číslo"),
  address: z.string().trim().min(10, "Adresa musí mať aspoň 10 znakov").max(500, "Adresa je príliš dlhá"),
  health_issues: z.string().max(2000, "Text je príliš dlhý").optional(),
});

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    height: "",
    weight: "",
    gender: "",
    goal: "",
    goal_weight: "",
    activity: "",
    allergies: "",
    preferences: "",
    dislikes: "",
    favorite_foods: "",
    health_issues: "",
    budget: "",
    phone: "",
    address: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      // Validate form data
      const validationResult = profileSchema.safeParse({
        name: formData.name,
        age: parseInt(formData.age),
        height: parseInt(formData.height),
        weight: parseFloat(formData.weight),
        phone: formData.phone,
        address: formData.address,
        health_issues: formData.health_issues,
      });

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        toast({
          title: "Chyba validácie",
          description: firstError.message,
          variant: "destructive",
        });
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Chyba",
          description: "Nie ste prihlásený",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("user_profiles").upsert({
        user_id: user.id,
        name: formData.name,
        age: parseInt(formData.age),
        height: parseInt(formData.height),
        weight: parseFloat(formData.weight),
        gender: formData.gender || null,
        goal: formData.goal,
        goal_weight: formData.goal_weight ? parseFloat(formData.goal_weight) : null,
        activity: formData.activity,
        allergies: formData.allergies.split(",").map((a) => a.trim()),
        preferences: formData.preferences.split(",").map((p) => p.trim()),
        dislikes: formData.dislikes.split(",").map((d) => d.trim()),
        favorite_foods: formData.favorite_foods.split(",").map((f) => f.trim()),
        health_issues: formData.health_issues,
        budget: formData.budget,
        phone: formData.phone,
        address: formData.address,
      });

      if (error) throw error;

      toast({
        title: "Úspech!",
        description: "Váš profil bol úspešne vytvorený",
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background py-20 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-display text-primary mb-8 text-center">
          Vytvorte svoj profil
        </h1>

        <div className="bg-card border-2 border-primary/20 rounded-xl p-8">
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-display text-primary mb-4">
                Základné údaje
              </h2>

              <div>
                <Label htmlFor="name">Meno a priezvisko</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="border-primary/20"
                />
              </div>

              <div>
                <Label htmlFor="gender">Pohlavie</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => handleInputChange("gender", value)}
                >
                  <SelectTrigger className="border-primary/20">
                    <SelectValue placeholder="Vyberte pohlavie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Muž</SelectItem>
                    <SelectItem value="female">Žena</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="age">Vek</Label>
                  <Input
                    id="age"
                    type="number"
                    value={formData.age}
                    onChange={(e) => handleInputChange("age", e.target.value)}
                    className="border-primary/20"
                  />
                </div>
                <div>
                  <Label htmlFor="height">Výška (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={formData.height}
                    onChange={(e) =>
                      handleInputChange("height", e.target.value)
                    }
                    className="border-primary/20"
                  />
                </div>
                <div>
                  <Label htmlFor="weight">Váha (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    value={formData.weight}
                    onChange={(e) =>
                      handleInputChange("weight", e.target.value)
                    }
                    className="border-primary/20"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="phone">Telefónne číslo</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="border-primary/20"
                />
              </div>

              <div>
                <Label htmlFor="address">Adresa doručenia</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  className="border-primary/20"
                />
              </div>

              <Button
                onClick={() => setStep(2)}
                className="w-full bg-primary hover:bg-primary/90"
              >
                Ďalej
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-display text-primary mb-4">
                Ciele a aktivita
              </h2>

              <div>
                <Label htmlFor="goal">Váš cieľ</Label>
                <Select
                  value={formData.goal}
                  onValueChange={(value) => handleInputChange("goal", value)}
                >
                  <SelectTrigger className="border-primary/20">
                    <SelectValue placeholder="Vyberte cieľ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hubnutie">Chudnutie</SelectItem>
                    <SelectItem value="nabrat">Nabrať hmotu</SelectItem>
                    <SelectItem value="udrzat">Udržať váhu</SelectItem>
                    <SelectItem value="zdravie">Zlepšiť zdravie</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="goal_weight">Cieľová váha (kg) - voliteľné</Label>
                <Input
                  id="goal_weight"
                  type="number"
                  step="0.1"
                  value={formData.goal_weight}
                  onChange={(e) => handleInputChange("goal_weight", e.target.value)}
                  placeholder="Napr. 70"
                  className="border-primary/20"
                />
              </div>

              <div>
                <Label htmlFor="activity">Úroveň aktivity</Label>
                <Select
                  value={formData.activity}
                  onValueChange={(value) => handleInputChange("activity", value)}
                >
                  <SelectTrigger className="border-primary/20">
                    <SelectValue placeholder="Vyberte aktivitu" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sedavy">Sedavý životný štýl</SelectItem>
                    <SelectItem value="mierny">Mierne aktívny</SelectItem>
                    <SelectItem value="aktivny">Aktívny</SelectItem>
                    <SelectItem value="velmi">Veľmi aktívny</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={() => setStep(1)}
                  variant="outline"
                  className="w-full"
                >
                  Späť
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  Ďalej
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-display text-primary mb-4">
                Preferencie a alergie
              </h2>

              <div>
                <Label htmlFor="allergies">Alergie (oddelené čiarkou)</Label>
                <Input
                  id="allergies"
                  value={formData.allergies}
                  onChange={(e) =>
                    handleInputChange("allergies", e.target.value)
                  }
                  placeholder="napr. laktóza, orechy"
                  className="border-primary/20"
                />
              </div>

              <div>
                <Label htmlFor="preferences">
                  Stravovacie preferencie (oddelené čiarkou)
                </Label>
                <Input
                  id="preferences"
                  value={formData.preferences}
                  onChange={(e) =>
                    handleInputChange("preferences", e.target.value)
                  }
                  placeholder="napr. vegetarián, vegán"
                  className="border-primary/20"
                />
              </div>

              <div>
                <Label htmlFor="dislikes">
                  Potraviny, ktoré nechcete (oddelené čiarkou)
                </Label>
                <Input
                  id="dislikes"
                  value={formData.dislikes}
                  onChange={(e) =>
                    handleInputChange("dislikes", e.target.value)
                  }
                  placeholder="napr. brokolica, ryby"
                  className="border-primary/20"
                />
              </div>

              <div>
                <Label htmlFor="favorite_foods">
                  Obľúbené jedlá (oddelené čiarkou)
                </Label>
                <Input
                  id="favorite_foods"
                  value={formData.favorite_foods}
                  onChange={(e) =>
                    handleInputChange("favorite_foods", e.target.value)
                  }
                  placeholder="napr. kurča, ryža, cestoviny"
                  className="border-primary/20"
                />
              </div>

              <div>
                <Label htmlFor="health_issues">
                  Zdravotné problémy (voliteľné)
                </Label>
                <Textarea
                  id="health_issues"
                  value={formData.health_issues}
                  onChange={(e) =>
                    handleInputChange("health_issues", e.target.value)
                  }
                  className="border-primary/20"
                />
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={() => setStep(2)}
                  variant="outline"
                  className="w-full"
                >
                  Späť
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  Dokončiť
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
