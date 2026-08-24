-- judge-weeks が「その日、目標時間に届いたか」を正しく判定できるように、
-- 週ごとに「1日の目標時間（分）」を持たせる（goals にも持たせず週に複製するのは、
-- 目標を変更してもその週の判定基準は作成時のまま固定するため）。
alter table weeks add column if not exists daily_target_min integer not null default 1;
