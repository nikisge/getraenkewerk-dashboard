-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.actions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  product_id real,
  product_name text,
  promo_from date,
  promo_to date,
  image text,
  customers numeric,
  acceptance text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  lowest_price numeric,
  CONSTRAINT actions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.campaigns (
  id integer NOT NULL DEFAULT nextval('campaigns_id_seq'::regclass),
  campaign_code character varying NOT NULL UNIQUE,
  name character varying NOT NULL,
  is_active boolean DEFAULT true,
  active_from date NOT NULL,
  active_to date,
  exclude_existing_buyers boolean DEFAULT false,
  default_next_check_days integer DEFAULT 7,
  Niedrigster_VK text,
  CONSTRAINT campaigns_pkey PRIMARY KEY (id)
);
CREATE TABLE public.churn_callbacks (
  kunden_nummer integer NOT NULL,
  action text NOT NULL,
  rep_username text NOT NULL,
  telegram_chat_id bigint NOT NULL,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  note text,
  Churn_Grund text,
  CONSTRAINT churn_callbacks_pkey PRIMARY KEY (id),
  CONSTRAINT churn_callbacks_kunden_nummer_fkey FOREIGN KEY (kunden_nummer) REFERENCES public.dim_customers(kunden_nummer)
);
CREATE TABLE public.dim_customers (
  kunden_nummer integer NOT NULL,
  firma character varying DEFAULT ''::character varying,
  email character varying DEFAULT ''::character varying,
  email2 character varying DEFAULT ''::character varying,
  strasse character varying DEFAULT ''::character varying,
  plz character varying DEFAULT ''::character varying,
  ort character varying DEFAULT ''::character varying,
  gesellschaft character varying DEFAULT ''::character varying,
  telefon character varying DEFAULT ''::character varying,
  mobil character varying DEFAULT ''::character varying,
  rep_id integer,
  u_key character varying NOT NULL UNIQUE,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  source_file_id character varying NOT NULL,
  last_order_date date,
  days_since_last_order integer,
  revenue_30d numeric DEFAULT 0,
  revenue_90d numeric DEFAULT 0,
  revenue_180d numeric DEFAULT 0,
  revenue_365d numeric DEFAULT 0,
  orders_365d integer DEFAULT 0,
  activity_state character varying DEFAULT NULL::character varying,
  status_active boolean,
  abc_class character varying DEFAULT 'D'::character varying,
  churn_alert_pending boolean DEFAULT false,
  purchase_interval USER-DEFINED DEFAULT '7'::purchase_interval,
  inactive_reason text,
  CONSTRAINT dim_customers_pkey PRIMARY KEY (kunden_nummer),
  CONSTRAINT dim_customers_rep_id_fkey FOREIGN KEY (rep_id) REFERENCES public.reps(rep_id),
  CONSTRAINT dim_customers_rep_id_fkey1 FOREIGN KEY (rep_id) REFERENCES public.reps(rep_id)
);
CREATE TABLE public.etl_log (
  id bigint NOT NULL DEFAULT nextval('etl_log_id_seq'::regclass),
  timestamp timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  flow text NOT NULL,
  n8n_process_id character varying NOT NULL,
  file_id character varying DEFAULT NULL::character varying,
  file_name character varying DEFAULT NULL::character varying,
  file_url text,
  rows_in integer,
  rows_upserted integer,
  rows_updated integer,
  errors jsonb,
  warnings jsonb,
  CONSTRAINT etl_log_pkey PRIMARY KEY (id)
);
CREATE TABLE public.fact_sales (
  id integer NOT NULL DEFAULT nextval('fact_sales_id_seq'::regclass),
  datum date NOT NULL,
  periode_bis date NOT NULL,
  kunden_nummer integer,
  kunde_firma character varying NOT NULL,
  artikel character varying NOT NULL,
  menge integer NOT NULL,
  umsatz numeric NOT NULL,
  kategorie character varying DEFAULT ''::character varying,
  sku character varying DEFAULT ''::character varying,
  gesellschaft character varying DEFAULT ''::character varying,
  source_file_id character varying NOT NULL,
  row_id integer NOT NULL,
  buisness_key character varying NOT NULL UNIQUE,
  CONSTRAINT fact_sales_pkey PRIMARY KEY (id),
  CONSTRAINT fact_sales_kunden_nummer_fkey FOREIGN KEY (kunden_nummer) REFERENCES public.dim_customers(kunden_nummer)
);
CREATE TABLE public.reps (
  rep_id integer NOT NULL,
  name character varying NOT NULL,
  telegram_username character varying NOT NULL,
  telegram_chat_id text NOT NULL,
  auth_token text,
  CONSTRAINT reps_pkey PRIMARY KEY (rep_id)
);
CREATE TABLE public.tasks (
  kunden_nummer integer,
  campaign_code character varying,
  status character varying NOT NULL,
  active_from date,
  last_change timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  note text,
  verified_by_sales boolean DEFAULT false,
  last_purchase_date date,
  adaption_state character varying DEFAULT NULL::character varying,
  id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  last_sent_at timestamp without time zone,
  notitz_rep text,
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_kunden_nummer_fkey FOREIGN KEY (kunden_nummer) REFERENCES public.dim_customers(kunden_nummer),
  CONSTRAINT tasks_campaign_code_fkey FOREIGN KEY (campaign_code) REFERENCES public.campaigns(campaign_code)
);