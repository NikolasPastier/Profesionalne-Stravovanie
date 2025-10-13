import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, Target, TrendingDown, TrendingUp, Clock, Activity } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface CalorieTrackerProps {
  weight: number;
  height: number;
  age: number;
  gender: 'male' | 'female';
  activity: string;
  goal: string;
  goalWeight?: number;
}

export function CalorieTracker({ 
  weight, 
  height, 
  age, 
  gender, 
  activity, 
  goal,
  goalWeight 
}: CalorieTrackerProps) {
  
  // Calculate BMR using Mifflin-St Jeor equation
  const calculateBMR = (): number => {
    if (gender === 'male') {
      return 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      return 10 * weight + 6.25 * height - 5 * age - 161;
    }
  };

  // Calculate TDEE based on activity level
  const calculateTDEE = (bmr: number): number => {
    const activityMultipliers: Record<string, number> = {
      'sedavy': 1.2,
      'mierny': 1.375,
      'aktivny': 1.55,
      'velmi': 1.725
    };
    return Math.round(bmr * (activityMultipliers[activity] || 1.2));
  };

  // Calculate target calories based on goal
  const calculateTargetCalories = (tdee: number): number => {
    const goalAdjustments: Record<string, number> = {
      'hubnutie': -500,
      'udrzat': 0,
      'udrzanie': 0,
      'nabrat': 500,
      'zdravie': 0
    };
    return Math.round(tdee + (goalAdjustments[goal] || 0));
  };

  // Calculate time to goal
  const calculateTimeToGoal = (dailyDeficit: number): { weeks: number; months: number } | null => {
    if (!goalWeight || goalWeight === weight || dailyDeficit === 0) return null;
    
    const remainingWeight = Math.abs(weight - goalWeight);
    const weeklyWeightChange = Math.abs((dailyDeficit * 7) / 7700);
    const weeks = Math.ceil(remainingWeight / weeklyWeightChange);
    const months = Math.round(weeks / 4.33);
    
    return { weeks, months };
  };

  // Calculate progress percentage
  const calculateProgress = (): number => {
    if (!goalWeight || goalWeight === weight) return 0;
    
    // Determine starting weight based on goal
    let startWeight = weight;
    if (goal === 'hubnutie' && goalWeight < weight) {
      startWeight = weight + Math.abs(weight - goalWeight);
    } else if (goal === 'nabrat' && goalWeight > weight) {
      startWeight = weight;
    }
    
    const totalChange = Math.abs(startWeight - goalWeight);
    const currentChange = Math.abs(startWeight - weight);
    return Math.min(100, Math.round((currentChange / totalChange) * 100));
  };

  const bmr = calculateBMR();
  const tdee = calculateTDEE(bmr);
  const targetCalories = calculateTargetCalories(tdee);
  const dailyDeficit = tdee - targetCalories;
  const timeToGoal = calculateTimeToGoal(dailyDeficit);
  const progress = calculateProgress();

  const getDeficitColor = () => {
    if (dailyDeficit > 0) return "text-orange-500";
    if (dailyDeficit < 0) return "text-green-500";
    return "text-blue-500";
  };

  const getDeficitIcon = () => {
    if (dailyDeficit > 0) return <TrendingDown className="h-5 w-5" />;
    if (dailyDeficit < 0) return <TrendingUp className="h-5 w-5" />;
    return <Activity className="h-5 w-5" />;
  };

  const getDeficitLabel = () => {
    if (dailyDeficit > 0) return "Deficit";
    if (dailyDeficit < 0) return "Surplus";
    return "Udržanie";
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Flame className="h-5 w-5" />
          Kalorický Plán & Cieľ
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* BMR & TDEE */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Activity className="h-4 w-4" />
              <span>BMR</span>
            </div>
            <p className="text-2xl font-bold">{Math.round(bmr)}</p>
            <p className="text-xs text-muted-foreground">kcal/deň</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Flame className="h-4 w-4" />
              <span>TDEE</span>
            </div>
            <p className="text-2xl font-bold">{tdee}</p>
            <p className="text-xs text-muted-foreground">kcal/deň</p>
          </div>
        </div>

        {/* Target Calories */}
        <div className="space-y-1 pt-2 border-t border-border">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Target className="h-4 w-4" />
            <span>Cieľový príjem</span>
          </div>
          <p className="text-3xl font-bold text-primary">{targetCalories}</p>
          <p className="text-xs text-muted-foreground">kcal/deň</p>
        </div>

        {/* Deficit/Surplus */}
        <div className={`space-y-1 pt-2 border-t border-border ${getDeficitColor()}`}>
          <div className="flex items-center gap-2 text-sm">
            {getDeficitIcon()}
            <span>{getDeficitLabel()}</span>
          </div>
          <p className="text-2xl font-bold">
            {dailyDeficit > 0 ? '-' : dailyDeficit < 0 ? '+' : ''}
            {Math.abs(dailyDeficit)}
          </p>
          <p className="text-xs">kcal/deň</p>
        </div>

        {/* Time to Goal */}
        {timeToGoal && goalWeight && (
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Clock className="h-4 w-4" />
              <span>Odhadovaný čas dosiahnutia cieľa</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-primary">
                {timeToGoal.months}
              </span>
              <span className="text-sm text-muted-foreground">
                {timeToGoal.months === 1 ? 'mesiac' : timeToGoal.months < 5 ? 'mesiace' : 'mesiacov'}
              </span>
              <span className="text-muted-foreground">({timeToGoal.weeks} týždňov)</span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progres k cieľu</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{weight} kg</span>
                <span className="font-medium text-primary">{goalWeight} kg</span>
              </div>
            </div>

            {/* Trend Message */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <p className="text-sm text-center">
                {progress < 10 && "🚀 Začíname! Každý krok sa počíta"}
                {progress >= 10 && progress < 30 && "💪 Výborne! Držíte správny smer"}
                {progress >= 30 && progress < 60 && "🎯 Skvelý progres! Pokračujte ďalej"}
                {progress >= 60 && progress < 90 && "🔥 Fantastické! Blížite sa k cieľu"}
                {progress >= 90 && "🏆 Už takmer tam! Finálne úsilie"}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}