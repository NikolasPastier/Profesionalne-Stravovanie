import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Truck, Clock, MapPin, Euro } from "lucide-react";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";
const Doprava = () => {
  const cardsRef = useScrollAnimation();
  const infoRef = useScrollAnimation();
  return <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 pt-32 pb-20">
        

        <Card ref={cardsRef.ref} className={`card-premium max-w-5xl mx-auto mb-16 transition-all duration-700 ${cardsRef.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <CardHeader className="text-center">
            <CardTitle className="text-4xl font-display text-gradient-gold mb-4">Doprava a Rozvoz</CardTitle>
            <CardDescription className="text-lg">
              Doručenie každú nedeľu - piatok večer (18:00 - 21:00)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="border border-primary/20 rounded-lg p-6 hover:scale-105 transition-transform duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <MapPin className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-display text-gradient-gold">Nitra a okolie</h3>
                </div>
                <p className="text-primary text-lg font-bold mb-2">Doprava ZDARMA</p>
                <p className="text-sm text-muted-foreground">
                  Bezplatné doručenie v Nitre a okolí
                </p>
              </div>

              <div className="border border-primary/20 rounded-lg p-6 hover:scale-105 transition-transform duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <Truck className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-display text-gradient-gold">Mimo okolia Nitry</h3>
                </div>
                <p className="text-primary text-lg font-bold mb-2">Individuálna cena</p>
                <p className="text-sm text-muted-foreground">
                  Cena dopravy sa určí individuálne
                </p>
              </div>

              <div className="border border-primary/20 rounded-lg p-6 hover:scale-105 transition-transform duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <Euro className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-display text-gradient-gold">Platba</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Hotovosť pri doručení prvej objednávky v celej sume. Pri ďalších objednávkach je možné platiť aj prevodom.
                </p>
              </div>

              <div className="border border-primary/20 rounded-lg p-6 hover:scale-105 transition-transform duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <Clock className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-display text-gradient-gold">Čas doručenia</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Každú nedeľu - piatok večer medzi 18:00 - 21:00
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card ref={infoRef.ref} className={`card-premium max-w-4xl mx-auto transition-all duration-700 ${infoRef.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <CardHeader>
            <CardTitle className="text-2xl text-gradient-gold text-center">
              Dôležité informácie
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-muted-foreground">
              <p>
                📦 <strong className="text-primary">Balenie:</strong> Všetky jedlá sú balené v ekologických, recyklovateľných obaloch.
              </p>
              <p>
                ❄️ <strong className="text-primary">Skladovanie:</strong> Po doručení jedlá ihneď umiestnite do chladničky. Spotrebujte do 5 dní.
              </p>
              <p>
                🔥 <strong className="text-primary">Ohrievanie:</strong> Jedlá je možné ohriať v mikrovlnnej rúre (2-3 minúty) alebo na panvici.
              </p>
              <p>
                ⚠️ <strong className="text-primary">Alergény:</strong> Všetky jedlá sú označené s informáciami o alergénoch.
              </p>
              <p>
                🔄 <strong className="text-primary">Zmena objednávky:</strong> Zmeny v objednávke je možné urobiť najneskôr 48 hodín pred doručením.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>;
};
export default Doprava;