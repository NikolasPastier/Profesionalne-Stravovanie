import { supabase } from "@/integrations/supabase/client";

interface Achievement {
  type: string;
  title: string;
  description: string;
  icon: string;
}

const ACHIEVEMENTS: Achievement[] = [
  {
    type: "first_photo",
    title: "Prvá fotka",
    description: "Pridali ste svoju prvú progress fotku!",
    icon: "camera",
  },
  {
    type: "first_weight",
    title: "Prvé meranie",
    description: "Zaznamenali ste svoju prvú váhu!",
    icon: "trending",
  },
  {
    type: "week_streak",
    title: "Týždenná séria",
    description: "7 dní po sebe ste zaznamenali váhu!",
    icon: "flame",
  },
  {
    type: "weight_loss_1kg",
    title: "Prvé kilo dole",
    description: "Stratili ste svoje prvé kilo!",
    icon: "trophy",
  },
  {
    type: "weight_loss_5kg",
    title: "5 kíl pokrok",
    description: "Úžasný pokrok - 5 kíl dole!",
    icon: "award",
  },
  {
    type: "month_active",
    title: "Mesačný bojovník",
    description: "Celý mesiac ste sledovali váhu!",
    icon: "calendar",
  },
  {
    type: "goal_reached",
    title: "Cieľ splnený",
    description: "Dosiahli ste svoj cieľ!",
    icon: "target",
  },
];

export async function checkAndAwardAchievements(
  userId: string,
  progressData: any[],
  userProfile: any
) {
  const achievements: string[] = [];

  // Check for first photo
  const hasPhoto = progressData.some((p) => p.photo_url);
  if (hasPhoto) {
    await awardAchievement(userId, "first_photo");
    achievements.push("first_photo");
  }

  // Check for first weight
  if (progressData.length > 0) {
    await awardAchievement(userId, "first_weight");
    achievements.push("first_weight");
  }

  // Check for week streak
  const hasWeekStreak = checkWeekStreak(progressData);
  if (hasWeekStreak) {
    await awardAchievement(userId, "week_streak");
    achievements.push("week_streak");
  }

  // Check for weight loss
  if (progressData.length >= 2) {
    const sortedData = [...progressData].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const firstWeight = sortedData[0].weight;
    const lastWeight = sortedData[sortedData.length - 1].weight;
    
    if (firstWeight && lastWeight) {
      const weightLoss = firstWeight - lastWeight;
      
      if (weightLoss >= 1) {
        await awardAchievement(userId, "weight_loss_1kg");
        achievements.push("weight_loss_1kg");
      }
      
      if (weightLoss >= 5) {
        await awardAchievement(userId, "weight_loss_5kg");
        achievements.push("weight_loss_5kg");
      }
    }
  }

  // Check for month active
  const hasMonthActive = checkMonthActive(progressData);
  if (hasMonthActive) {
    await awardAchievement(userId, "month_active");
    achievements.push("month_active");
  }

  return achievements;
}

async function awardAchievement(userId: string, achievementType: string) {
  // Check if already awarded
  const { data: existing } = await supabase
    .from("achievements")
    .select("id")
    .eq("user_id", userId)
    .eq("achievement_type", achievementType)
    .single();

  if (existing) return;

  // Award new achievement
  const achievement = ACHIEVEMENTS.find((a) => a.type === achievementType);
  if (!achievement) return;

  await supabase.from("achievements").insert({
    user_id: userId,
    achievement_type: achievementType,
    title: achievement.title,
    description: achievement.description,
    icon: achievement.icon,
  });
}

function checkWeekStreak(progressData: any[]): boolean {
  if (progressData.length < 7) return false;

  const sortedData = [...progressData].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  let streak = 1;
  for (let i = 0; i < sortedData.length - 1; i++) {
    const current = new Date(sortedData[i].date);
    const next = new Date(sortedData[i + 1].date);
    const diffDays = Math.floor(
      (current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 1) {
      streak++;
      if (streak >= 7) return true;
    } else if (diffDays > 1) {
      streak = 1;
    }
  }

  return false;
}

function checkMonthActive(progressData: any[]): boolean {
  const now = new Date();
  const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

  const recentData = progressData.filter(
    (p) => new Date(p.date) >= monthAgo
  );

  return recentData.length >= 20; // At least 20 entries in a month
}
