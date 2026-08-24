// 目標（挑戦する資格・コミット額）をサーバー側に登録する。
// weeks（課金の元になるテーブル）はクライアントから直接書けない設計にしているため、
// ローカルで目標を作った/次シーズンを始めたタイミングでここを呼び、
// 判定・課金の元になる週データをサーバー側で作る。
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface WeekPlan {
  weekIndex: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  scheduledDays: number;
}

interface CreateGoalPayload {
  name: string;
  category: string;
  examDate: string | null;
  targetTotalHours: number | null;
  commitAmount: number;
  dailyTargetMin: number;
  weeks: WeekPlan[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const authHeader = req.headers.get('Authorization') ?? '';
    const { data: userData, error: userErr } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: '未ログインです' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = userData.user.id;

    const payload = (await req.json()) as CreateGoalPayload;
    if (!payload.name || !payload.weeks?.length) {
      return new Response(JSON.stringify({ error: '不正なリクエストです' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 前の目標が active のままなら完了扱いにする（1ユーザー1アクティブ目標）
    await supabase
      .from('goals')
      .update({ status: 'completed' })
      .eq('user_id', userId)
      .eq('status', 'active');

    const weeksTotal = payload.weeks.length;
    const stakeAmount = Math.round(payload.commitAmount / weeksTotal);

    const { data: goalRow, error: goalErr } = await supabase
      .from('goals')
      .insert({
        user_id: userId,
        name: payload.name,
        category: payload.category,
        exam_date: payload.examDate,
        target_total_hours: payload.targetTotalHours,
        commit_amount: payload.commitAmount,
        weeks_total: weeksTotal,
      })
      .select('id')
      .single();

    if (goalErr || !goalRow) throw goalErr ?? new Error('goal insert failed');

    const weekRows = payload.weeks.map((w) => ({
      goal_id: goalRow.id,
      user_id: userId,
      week_index: w.weekIndex,
      start_date: w.startDate,
      end_date: w.endDate,
      scheduled_days: w.scheduledDays,
      stake_amount: stakeAmount,
      daily_target_min: payload.dailyTargetMin,
    }));

    const { error: weeksErr } = await supabase.from('weeks').insert(weekRows);
    if (weeksErr) throw weeksErr;

    return new Response(JSON.stringify({ goalId: goalRow.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
