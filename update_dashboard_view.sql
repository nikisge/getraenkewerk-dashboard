DROP VIEW IF EXISTS dashboard_tasks CASCADE;

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
    NULL AS last_purchase_date,
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
