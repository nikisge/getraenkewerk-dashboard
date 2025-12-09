-- Complete database view update script
-- Run this to update both dashboard_tasks and rep_performance views

-- 1. Drop old views with CASCADE
DROP VIEW IF EXISTS dashboard_tasks CASCADE;

-- 2. Recreate dashboard_tasks view
CREATE OR REPLACE VIEW dashboard_tasks AS
-- 1. Promo Tasks
SELECT 
    t.id::text AS task_id,
    t.kunden_nummer,
    t.campaign_code,
    t.status,
    t.note,
    t.verified_by_sales,
    t.last_purchase_date,
    c.days_since_last_order,
    t.last_change,
    t.notitz_rep,
    t.reminder_date,
    t.failure_reason,
    t.active_from AS next_check_date,
    t.adaption_state,
    c.firma,
    c.ort,
    r.rep_id,
    r.name AS rep_name,
    r.auth_token,
    cam.name AS title,
    cam.active_from AS due_date,
    cam.rejection_reasons AS campaign_rejection_reasons,
    'promo' AS task_type,
    t.id::text AS reference_id,
    NULL::text AS season_start,
    NULL::text AS season_end,
    NULL::integer AS seasonal_interval,
    NULL::integer AS custom_interval,
    NULL::text AS purchase_interval
FROM tasks t
LEFT JOIN dim_customers c ON t.kunden_nummer = c.kunden_nummer
LEFT JOIN reps r ON c.rep_id = r.rep_id
LEFT JOIN campaigns cam ON t.campaign_code = cam.campaign_code
WHERE t.campaign_code IS NOT NULL
  -- Show if NOT verified OR if it has a reminder (pending offer)
  AND (t.verified_by_sales = false OR t.reminder_date IS NOT NULL)

UNION ALL

-- 2. Churn Tasks (Customers with churn_alert_pending = true)
-- Shows both: new alerts (no callback yet) AND pending callbacks
SELECT 
    COALESCE(cb.id::text, 'churn_' || c.kunden_nummer::text) AS task_id,
    c.kunden_nummer,
    NULL AS campaign_code,
    COALESCE(cb.action, 'PENDING') AS status,
    cb.note,
    CASE WHEN cb.action IN ('RETAINED', 'LOST') THEN true ELSE false END AS verified_by_sales,
    c.last_order_date AS last_purchase_date,
    c.days_since_last_order,
    COALESCE(cb.created_at, c.updated_at, NOW()) AS last_change,
    cb.note AS notitz_rep,
    NULL AS reminder_date,
    cb."Churn_Grund" AS failure_reason,
    NULL AS next_check_date,
    NULL AS adaption_state,
    c.firma,
    c.ort,
    r.rep_id,
    r.name AS rep_name,
    r.auth_token,
    'Churn Alert: ' || c.firma AS title,
    COALESCE(cb.created_at::date, c.updated_at::date, CURRENT_DATE) AS due_date,
    NULL AS campaign_rejection_reasons,
    'churn' AS task_type,
    COALESCE(cb.id::text, 'churn_' || c.kunden_nummer::text) AS reference_id,
    c.season_start,
    c.season_end,
    NULL::integer AS seasonal_interval,
    NULL::integer AS custom_interval,
    c.purchase_interval::text
FROM dim_customers c
LEFT JOIN churn_callbacks cb ON c.kunden_nummer = cb.kunden_nummer AND cb.action = 'PENDING'
LEFT JOIN reps r ON c.rep_id = r.rep_id
WHERE c.churn_alert_pending = true;

-- 3. Recreate rep_performance view
CREATE OR REPLACE VIEW rep_performance AS
SELECT 
    r.rep_id,
    r.name,
    COUNT(DISTINCT dt.task_id) FILTER (WHERE dt.task_type = 'promo' AND dt.verified_by_sales = false) AS open_tasks,
    COUNT(DISTINCT dt.task_id) FILTER (WHERE dt.task_type = 'promo' AND dt.status = 'OFFER') AS pending_tasks,
    COUNT(DISTINCT dt.task_id) FILTER (WHERE dt.task_type = 'promo' AND dt.status = 'CLAIMED') AS completed_tasks,
    COUNT(DISTINCT dt.task_id) FILTER (WHERE dt.task_type = 'promo') AS total_tasks,
    CASE 
        WHEN COUNT(DISTINCT dt.task_id) FILTER (WHERE dt.task_type = 'promo') > 0 THEN
            ROUND(100.0 * COUNT(DISTINCT dt.task_id) FILTER (WHERE dt.task_type = 'promo' AND dt.status = 'CLAIMED') / 
                  COUNT(DISTINCT dt.task_id) FILTER (WHERE dt.task_type = 'promo'), 2)
        ELSE 0
    END AS completion_rate,
    COUNT(DISTINCT c.kunden_nummer) AS assigned_customers,
    COUNT(DISTINCT c.kunden_nummer) FILTER (WHERE c.status_active = true) AS active_customers,
    COUNT(DISTINCT c.kunden_nummer) FILTER (WHERE c.churn_alert_pending = true) AS at_risk_customers,
    ROUND(
        COUNT(DISTINCT dt.task_id) FILTER (
            WHERE dt.task_type = 'promo' 
            AND dt.status = 'CLAIMED' 
            AND dt.last_change >= CURRENT_DATE - INTERVAL '7 days'
        )::numeric / 7.0, 2
    ) AS tasks_per_day_7d,
    ROUND(
        COUNT(DISTINCT dt.task_id) FILTER (
            WHERE dt.task_type = 'promo' 
            AND dt.status = 'CLAIMED' 
            AND dt.last_change >= CURRENT_DATE - INTERVAL '14 days'
        )::numeric / 14.0, 2
    ) AS tasks_per_day_14d,
    ROUND(
        COUNT(DISTINCT dt.task_id) FILTER (
            WHERE dt.task_type = 'promo' 
            AND dt.status = 'CLAIMED' 
            AND dt.last_change >= CURRENT_DATE - INTERVAL '30 days'
        )::numeric / 30.0, 2
    ) AS tasks_per_day_30d,
    ROUND(
        COUNT(DISTINCT dt.task_id) FILTER (
            WHERE dt.task_type = 'promo' 
            AND dt.status = 'CLAIMED' 
        )::numeric / GREATEST(DATE_PART('day', NOW() - MIN(dt.last_change)), 1)::numeric, 2
    ) AS tasks_per_day_all
FROM reps r
LEFT JOIN dim_customers c ON r.rep_id = c.rep_id
LEFT JOIN dashboard_tasks dt ON c.kunden_nummer = dt.kunden_nummer
GROUP BY r.rep_id, r.name;
