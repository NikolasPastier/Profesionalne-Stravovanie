import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Instagram } from "lucide-react";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";
const ONas = () => {
  const profileRef = useScrollAnimation();
  const statsRef = useScrollAnimation();
  const philosophyRef = useScrollAnimation();
  
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 pt-32 pb-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <h1 className="font-display text-4xl md:text-6xl font-bold mb-6 text-gradient-gold">O nás</h1>
            <p className="text-xl text-muted-foreground">Tvoje telo. Tvoje ciele. Naša zodpovednosť.</p>
          </div>

          <Card ref={profileRef.ref} className={`card-premium mb-12 transition-all duration-700 ${profileRef.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <CardContent className="p-8 md:p-12">
              <div className="space-y-6">
                <h2 className="font-display text-3xl font-bold text-gradient-gold">Patrik Rigodanzo</h2>
                <p className="text-lg text-muted-foreground">Profesionálny tréner a výživový poradca</p>
                <div className="space-y-4 text-foreground">
                  <p>
                    Vítajte vo svete VIP Profesionálneho Krabičkového Stravovania! Som Patrik Rigodanzo, osobný tréner a
                    výživový poradca s viac ako 10-ročnými skúsenosťami v oblasti fitness a zdravého životného štýlu.
                  </p>
                  <p>
                    Mojou víziou je pomôcť vám dosiahnuť vaše ciele bez kompromisov v chuti a kvalite. Každé jedlo,
                    ktoré pripravujeme, je starostlivo navrhnuté s ohľadom na vaše individuálne potreby a presne
                    prepočítané makroživiny.
                  </p>
                  <p className="font-bold text-primary">Nebojte sa zmeny - začnite dnes!</p>
                </div>
                <Button
                  onClick={() => window.open("https://instagram.com/patrik.rigodanzo/", "_blank")}
                  className="bg-primary hover:glow-gold-strong gap-2"
                  size="lg"
                >
                  <Instagram className="h-5 w-5" />
                  Sleduj ma na Instagrame
                </Button>
              </div>
            </CardContent>
          </Card>

          <div ref={statsRef.ref} className={`grid md:grid-cols-3 gap-6 mb-12 transition-all duration-700 ${statsRef.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <Card className="card-premium text-center p-8">
              <div className="text-4xl mb-4">💪</div>
              <h3 className="font-bold text-xl mb-2 text-primary">10+ Rokov</h3>
              <p className="text-muted-foreground">Skúseností v oblasti fitness</p>
            </Card>
            <Card className="card-premium text-center p-8">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="font-bold text-xl mb-2 text-primary">500+</h3>
              <p className="text-muted-foreground">Spokojných klientov</p>
            </Card>
            <Card className="card-premium text-center p-8">
              <div className="text-4xl mb-4">⭐</div>
              <h3 className="font-bold text-xl mb-2 text-primary">100%</h3>
              <p className="text-muted-foreground">Osobný prístup</p>
            </Card>
          </div>

          <Card ref={philosophyRef.ref} className={`card-premium transition-all duration-700 ${philosophyRef.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <CardContent className="p-8 md:p-12">
              <h2 className="font-display text-3xl font-bold mb-6 text-gradient-gold text-center">Naša filozofia</h2>
              <div className="space-y-4 text-foreground">
                <p>
                  Veríme, že zdravé stravovanie nemusí byť nudné ani komplikované. Naše menu je navrhnuté tak, aby bolo
                  nielen výživné, ale aj chutné a rozmanité.
                </p>
                <p>
                  Používame len najkvalitnejšie suroviny od overených dodávateľov. Každé jedlo pripravujeme čerstvé, s
                  láskou a odbornosťou, aby ste dosiahli svoje ciele a pritom si užili každé jedlo.
                </p>
                <div className="grid md:grid-cols-2 gap-4 mt-8">
                  <div className="border-l-4 border-primary pl-4">
                    <h4 className="font-bold mb-2 text-primary">Kvalita</h4>
                    <p className="text-sm text-muted-foreground">
                      Používame len prémiové suroviny a dávame dôraz na čerstvosť
                    </p>
                  </div>
                  <div className="border-l-4 border-primary pl-4">
                    <h4 className="font-bold mb-2 text-primary">Individuálny prístup</h4>
                    <p className="text-sm text-muted-foreground">
                      Každý klient je jedinečný, preto prispôsobujeme menu vašim potrebám
                    </p>
                  </div>
                  <div className="border-l-4 border-primary pl-4">
                    <h4 className="font-bold mb-2 text-primary">Výsledky</h4>
                    <p className="text-sm text-muted-foreground">
                      Sledujeme váš progres a pomáhame vám dosiahnuť vaše ciele
                    </p>
                  </div>
                  <div className="border-l-4 border-primary pl-4">
                    <h4 className="font-bold mb-2 text-primary">Podpora</h4>
                    <p className="text-sm text-muted-foreground">
                      Sme tu pre vás 24/7 pre akékoľvek otázky či poradenstvo
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
};
export default ONas;
