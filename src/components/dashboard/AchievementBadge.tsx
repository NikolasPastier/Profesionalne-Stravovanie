import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Camera, TrendingDown, Calendar, Target, Flame, Award } from "lucide-react";
import { format } from "date-fns";

interface Achievement {
  id: string;
  achievement_type: string;
  title: string;
  description: string;
  icon: string;
  earned_at: string;
}

interface AchievementBadgeProps {
  achievements: Achievement[];
}

const getIconComponent = (iconName: string) => {
  const icons: { [key: string]: any } = {
    trophy: Trophy,
    camera: Camera,
    trending: TrendingDown,
    calendar: Calendar,
    target: Target,
    flame: Flame,
    award: Award,
  };
  return icons[iconName] || Trophy;
};

export function AchievementBadge({ achievements }: AchievementBadgeProps) {
  if (achievements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Moje úspechy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Zatiaľ nemáte žiadne úspechy. Pokračujte vo svojej ceste a odblokovávajte nové!
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Moje úspechy ({achievements.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {achievements.map((achievement) => {
            const IconComponent = getIconComponent(achievement.icon);
            return (
              <div
                key={achievement.id}
                className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="p-3 rounded-full bg-primary/10">
                  <IconComponent className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">{achievement.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {achievement.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Odblokované: {format(new Date(achievement.earned_at), "dd.MM.yyyy")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
