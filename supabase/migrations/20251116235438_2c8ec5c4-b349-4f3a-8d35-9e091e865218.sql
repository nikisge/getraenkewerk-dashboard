-- View für Rep Performance Metriken
CREATE OR REPLACE VIEW rep_performance AS
SELECT 
  r.rep_id,
  r.name,
  COUNT(DISTINCT t.id) as total_tasks,
  COUNT(DISTINCT CASE WHEN t.status = 'YES' THEN t.id END) as completed_tasks,
  COUNT(DISTINCT CASE WHEN t.status = 'NO' THEN t.id END) as open_tasks,
  COUNT(DISTINCT CASE WHEN t.status = 'PENDING' THEN t.id END) as pending_tasks,
  ROUND(
    CAST(COUNT(DISTINCT CASE WHEN t.status = 'YES' THEN t.id END) AS NUMERIC) / 
    NULLIF(COUNT(DISTINCT t.id), 0) * 100, 
    2
  ) as completion_rate,
  COUNT(DISTINCT dc.kunden_nummer) as assigned_customers,
  COUNT(DISTINCT CASE WHEN dc.activity_state = 'ACTIVE' THEN dc.kunden_nummer END) as active_customers,
  COUNT(DISTINCT CASE WHEN dc.churn_alert_pending = true THEN dc.kunden_nummer END) as at_risk_customers,
  -- Tasks pro Tag (letzte 30 Tage)
  ROUND(
    CAST(COUNT(DISTINCT CASE 
      WHEN t.last_change >= CURRENT_DATE - INTERVAL '30 days' 
        AND t.status = 'YES' 
      THEN t.id 
    END) AS NUMERIC) / 30,
    2
  ) as tasks_per_day_30d,
  -- Durchschnittliche Tasks pro Tag (letzte 7 Tage)
  ROUND(
    CAST(COUNT(DISTINCT CASE 
      WHEN t.last_change >= CURRENT_DATE - INTERVAL '7 days' 
        AND t.status = 'YES' 
      THEN t.id 
    END) AS NUMERIC) / 7,
    2
  ) as tasks_per_day_7d
FROM reps r
LEFT JOIN dim_customers dc ON r.rep_id = dc.rep_id
LEFT JOIN tasks t ON dc.kunden_nummer = t.kunden_nummer
GROUP BY r.rep_id, r.name;

-- Grant access to the view
GRANT SELECT ON rep_performance TO anon, authenticated, service_role;