import { Link } from "react-router-dom";
import { Instagram, Facebook } from "lucide-react";
export const Footer = () => {
  return <footer className="bg-background border-t border-primary/20 py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="font-display text-xl text-gradient-gold mb-4">VIP Stravovanie</h3>
            <p className="text-muted-foreground">
              Tvoje telo. Tvoje ciele. Naša zodpovednosť.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4 text-primary">Navigácia</h4>
            <div className="flex flex-col gap-2">
              <Link to="/" className="text-muted-foreground hover:text-primary transition-smooth">
                Domov
              </Link>
              <Link to="/menu" className="text-muted-foreground hover:text-primary transition-smooth">
                Menu
              </Link>
              <Link to="/cennik" className="text-muted-foreground hover:text-primary transition-smooth">
                Cenník
              </Link>
              <Link to="/doprava" className="text-muted-foreground hover:text-primary transition-smooth">
                Doprava
              </Link>
              <Link to="/onas" className="text-muted-foreground hover:text-primary transition-smooth">
                O nás
              </Link>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4 text-primary">Sleduj nás</h4>
            <div className="flex gap-4">
              <a href="https://www.instagram.com/profesionalne_stravovanie/" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-smooth">
                <Instagram className="h-6 w-6" />
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-smooth">
                
              </a>
            </div>
          </div>
        </div>
        
        <div className="border-t border-primary/20 pt-8 text-center text-muted-foreground">
          <p>© 2025 VIP Profesionálne Krabičkové Stravovanie. Všetky práva vyhradené.</p>
        </div>
      </div>
    </footer>;
};