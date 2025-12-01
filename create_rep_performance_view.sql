-- Recreate rep_performance view after dashboard_tasks update
DROP VIEW IF EXISTS rep_performance;

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
            AND dt.last_change >= CURRENT_DATE - INTERVAL '30 days'
        )::numeric / 30.0, 2
    ) AS tasks_per_day_30d
FROM reps r
LEFT JOIN dim_customers c ON r.rep_id = c.rep_id
LEFT JOIN dashboard_tasks dt ON c.kunden_nummer = dt.kunden_nummer
GROUP BY r.rep_id, r.name;
