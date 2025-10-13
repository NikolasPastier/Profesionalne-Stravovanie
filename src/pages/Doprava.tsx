import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Clock, MapPin, Euro } from "lucide-react";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";

const Doprava = () => {
  const cardsRef = useScrollAnimation();
  const infoRef = useScrollAnimation();
  
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 pt-32 pb-20">
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="font-display text-4xl md:text-6xl font-bold mb-6 text-gradient-gold">
            Doprava a Rozvoz
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Vaše jedlo doručíme čerstvé priamo k vašim dverám
          </p>
        </div>

        <div ref={cardsRef.ref} className={`grid md:grid-cols-2 gap-8 max-w-6xl mx-auto mb-16 transition-all duration-700 ${cardsRef.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <Card className="card-premium">
            <CardHeader>
              <div className="flex items-center gap-3 mb-4">
                <Truck className="h-8 w-8 text-primary" />
                <CardTitle className="text-2xl text-gradient-gold">Spôsob doručenia</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-bold text-lg mb-2 text-primary">Osobný rozvoz</h3>
                <p className="text-muted-foreground">
                  Vaše jedlá doručujeme osobne v chladiacich taškách, aby sme zaistili maximálnu čerstvosť a kvalitu.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2 text-primary">Hygiena</h3>
                <p className="text-muted-foreground">
                  Všetky jedlá sú bezpečne zabalené a označené s dátumom spotreby a návodom na skladovanie.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="card-premium">
            <CardHeader>
              <div className="flex items-center gap-3 mb-4">
                <Clock className="h-8 w-8 text-primary" />
                <CardTitle className="text-2xl text-gradient-gold">Časy doručenia</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-bold text-lg mb-2 text-primary">Týždenné menu</h3>
                <p className="text-muted-foreground">
                  Doručenie každú nedeľu večer (18:00 - 21:00) pre celý nasledujúci týždeň.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2 text-primary">Denné menu</h3>
                <p className="text-muted-foreground">
                  Doručenie každý deň ráno (7:00 - 9:00) na aktuálny deň.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="card-premium">
            <CardHeader>
              <div className="flex items-center gap-3 mb-4">
                <MapPin className="h-8 w-8 text-primary" />
                <CardTitle className="text-2xl text-gradient-gold">Oblasti rozvozu</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-bold text-lg mb-2 text-primary">Bratislava a okolie</h3>
                <p className="text-muted-foreground mb-4">
                  Doručujeme v Bratislave a v okruhu 20 km od centra mesta.
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Bratislava - Staré Mesto</li>
                  <li>• Bratislava - Ružinov</li>
                  <li>• Bratislava - Petržalka</li>
                  <li>• Bratislava - Karlova Ves</li>
                  <li>• Senec, Pezinok, Ivanka pri Dunaji</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="card-premium">
            <CardHeader>
              <div className="flex items-center gap-3 mb-4">
                <Euro className="h-8 w-8 text-primary" />
                <CardTitle className="text-2xl text-gradient-gold">Platba a ceny</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-bold text-lg mb-2 text-primary">Doprava ZDARMA</h3>
                <p className="text-muted-foreground mb-4">
                  Pri objednávke týždenného menu je doprava v cene.
                </p>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2 text-primary">Platba</h3>
                <p className="text-muted-foreground">
                  Hotovosť pri doručení prvej objednávky v celej sume. Pri ďalších objednávkach je možné platiť aj prevodom.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

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
    </div>
  );
};

export default Doprava;