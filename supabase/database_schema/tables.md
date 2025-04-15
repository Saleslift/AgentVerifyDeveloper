# Database Schema Overview

## Tables

### 1. agency_agents
```sql
CREATE TABLE public.agency_agents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active'::text,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT agency_agents_pkey PRIMARY KEY (id),
  CONSTRAINT agency_agents_agency_id_agent_id_key UNIQUE (agency_id, agent_id),
  CONSTRAINT agency_agents_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT agency_agents_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE public.agency_project_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  agency_id uuid NOT NULL,
  signed_file text NULL,
  signed_file_name text NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  requested_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT agency_project_requests_pkey PRIMARY KEY (id),
  CONSTRAINT agency_project_requests_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT agency_project_requests_project_id_fkey FOREIGN KEY (project_id) REFERENCES properties(id) ON DELETE CASCADE,
  CONSTRAINT agency_project_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'signed_uploaded'::text, 'approved'::text, 'rejected'::text]))
);

CREATE TABLE public.agency_properties (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  property_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active'::text,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT agency_properties_pkey PRIMARY KEY (id),
  CONSTRAINT agency_properties_agency_id_property_id_key UNIQUE (agency_id, property_id),
  CONSTRAINT agency_properties_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT agency_properties_property_id_fkey FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

CREATE TABLE public.agent_certifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  name text NOT NULL,
  file_url text NOT NULL,
  is_rera boolean NULL DEFAULT false,
  rera_number text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT agent_certifications_pkey PRIMARY KEY (id),
  CONSTRAINT agent_certifications_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE public.agent_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  agency_id uuid NOT NULL,
  token text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  full_name text NULL,
  phone text NULL,
  whatsapp text NULL,
  CONSTRAINT agent_invitations_pkey PRIMARY KEY (id),
  CONSTRAINT agent_invitations_token_key UNIQUE (token),
  CONSTRAINT agent_invitations_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT agent_invitations_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'expired'::text])))
);

CREATE TABLE public.agent_projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  project_id uuid NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT agent_projects_pkey PRIMARY KEY (id),
  CONSTRAINT agent_projects_agent_id_project_id_key UNIQUE (agent_id, project_id),
  CONSTRAINT agent_projects_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT agent_projects_project_id_fkey FOREIGN KEY (project_id) REFERENCES properties(id) ON DELETE CASCADE
);

CREATE TABLE public.agent_properties (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active'::text,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT agent_properties_pkey PRIMARY KEY (id),
  CONSTRAINT agent_properties_property_id_agent_id_key UNIQUE (property_id, agent_id),
  CONSTRAINT agent_properties_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT agent_properties_property_id_fkey FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

CREATE TABLE public.agent_referrals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  referral_name text NOT NULL,
  referral_contact text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT agent_referrals_pkey PRIMARY KEY (id),
  CONSTRAINT agent_referrals_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE public.agent_service_areas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  location text NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT agent_service_areas_pkey PRIMARY KEY (id),
  CONSTRAINT agent_service_areas_agent_id_location_key UNIQUE (agent_id, location),
  CONSTRAINT agent_service_areas_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE MATERIALIZED VIEW public.agent_statistics AS 
WITH property_counts AS (
    SELECT properties.agent_id,
        count(*) AS total_properties,
        count(*) FILTER (WHERE properties.shared = true) AS shared_properties,
        count(*) FILTER (WHERE properties.created_at >= (now() - '30 days'::interval)) AS new_properties_30d
    FROM properties
    GROUP BY properties.agent_id
), marketplace_counts AS (
    SELECT agent_properties.agent_id,
        count(*) AS marketplace_properties
    FROM agent_properties
    WHERE agent_properties.status = 'active'::text
    GROUP BY agent_properties.agent_id
), view_counts AS (
    SELECT page_views.profile_id AS agent_id,
        count(*) AS total_views,
        count(DISTINCT date(page_views.viewed_at)) AS unique_days,
        count(*) FILTER (WHERE page_views.viewed_at >= (now() - '30 days'::interval)) AS views_30d
    FROM page_views
    WHERE page_views.profile_id IS NOT NULL
    GROUP BY page_views.profile_id
), deal_counts AS (
    SELECT d.agent_id,
        count(*) AS total_deals,
        count(*) FILTER (WHERE d.status <> ALL (ARRAY['transfer'::deal_status, 'payment'::deal_status])) AS active_deals,
        count(*) FILTER (WHERE d.created_at >= (now() - '30 days'::interval)) AS new_deals_30d
    FROM (
        SELECT deals.listing_agent_id AS agent_id,
            deals.status,
            deals.created_at
        FROM deals
        UNION ALL
        SELECT deals.buying_agent_id AS agent_id,
            deals.status,
            deals.created_at
        FROM deals
    ) d
    GROUP BY d.agent_id
), share_counts AS (
    SELECT property_shares.shared_by AS agent_id,
        count(*) AS total_shares,
        count(DISTINCT property_shares.property_id) AS unique_properties_shared,
        count(*) FILTER (WHERE property_shares.shared_at >= (now() - '30 days'::interval)) AS shares_30d
    FROM property_shares
    WHERE property_shares.status = 'active'::text
    GROUP BY property_shares.shared_by
)
SELECT p.id AS agent_id,
    p.full_name,
    p.role,
    p.verified,
    COALESCE(pc.total_properties, 0::bigint) + COALESCE(mc.marketplace_properties, 0::bigint) AS total_properties,
    COALESCE(pc.shared_properties, 0::bigint) AS shared_properties,
    COALESCE(pc.new_properties_30d, 0::bigint) AS new_properties_30d,
    COALESCE(vc.total_views, 0::bigint) AS total_views,
    COALESCE(vc.views_30d, 0::bigint) AS views_30d,
    COALESCE(vc.unique_days, 0::bigint) AS unique_viewing_days,
    COALESCE(dc.total_deals, 0::bigint) AS total_deals,
    COALESCE(dc.active_deals, 0::bigint) AS active_deals,
    COALESCE(dc.new_deals_30d, 0::bigint) AS new_deals_30d,
    COALESCE(sc.total_shares, 0::bigint) AS total_shares,
    COALESCE(sc.unique_properties_shared, 0::bigint) AS unique_properties_shared,
    COALESCE(sc.shares_30d, 0::bigint) AS shares_30d,
    now() AS refreshed_at
FROM profiles p
LEFT JOIN property_counts pc ON pc.agent_id = p.id
LEFT JOIN marketplace_counts mc ON mc.agent_id = p.id
LEFT JOIN view_counts vc ON vc.agent_id = p.id
LEFT JOIN deal_counts dc ON dc.agent_id = p.id
LEFT JOIN share_counts sc ON sc.agent_id = p.id
WHERE p.role = 'agent'::text;

CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  old_data jsonb NULL,
  new_data jsonb NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.collaboration_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  requesting_agent_id uuid NOT NULL,
  receiving_agent_id uuid NOT NULL,
  client_name text NOT NULL,
  client_email text NOT NULL,
  client_phone text NOT NULL,
  notes text NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT collaboration_requests_pkey PRIMARY KEY (id),
  CONSTRAINT collaboration_requests_property_id_fkey FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  CONSTRAINT collaboration_requests_receiving_agent_id_fkey FOREIGN KEY (receiving_agent_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT collaboration_requests_requesting_agent_id_fkey FOREIGN KEY (requesting_agent_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT collaboration_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text])))
);

CREATE TABLE public.crm_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lead_id uuid NULL,
  deal_id uuid NULL,
  agent_id uuid NOT NULL,
  activity_type text NOT NULL,
  description text NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT crm_activities_pkey PRIMARY KEY (id),
  CONSTRAINT crm_activities_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT crm_activities_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES crm_deals(id) ON DELETE CASCADE,
  CONSTRAINT crm_activities_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE CASCADE,
  CONSTRAINT crm_activities_activity_type_check CHECK ((activity_type = ANY (ARRAY['Note'::text, 'Call'::text, 'Email'::text, 'Meeting'::text, 'Document'::text, 'Status Change'::text]))),
  CONSTRAINT crm_activities_check CHECK ((((lead_id IS NOT NULL) AND (deal_id IS NULL)) OR ((lead_id IS NULL) AND (deal_id IS NOT NULL))))
);

CREATE TABLE public.crm_checklists (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL,
  title text NOT NULL,
  is_completed boolean NULL DEFAULT false,
  sort_order integer NULL DEFAULT 0,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT crm_checklists_pkey PRIMARY KEY (id),
  CONSTRAINT crm_checklists_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES crm_deals(id) ON DELETE CASCADE
);

CREATE TABLE public.crm_deals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  deal_type text NOT NULL,
  lead_id uuid NULL,
  property_id uuid NULL,
  project_id uuid NULL,
  agent_id uuid NOT NULL,
  co_agent_id uuid NULL,
  status text NOT NULL,
  deal_value numeric NULL,
  commission_split text NULL,
  notes text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT crm_deals_pkey PRIMARY KEY (id),
  CONSTRAINT crm_deals_co_agent_id_fkey FOREIGN KEY (co_agent_id) REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT crm_deals_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE SET NULL,
  CONSTRAINT crm_deals_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT crm_deals_project_id_fkey FOREIGN KEY (project_id) REFERENCES properties(id) ON DELETE SET NULL,
  CONSTRAINT crm_deals_property_id_fkey FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL,
  CONSTRAINT crm_deals_deal_type_check CHECK ((deal_type = ANY (ARRAY['Own Property'::text, 'Marketplace Property'::text, 'Collaboration'::text, 'Off-plan Project'::text]))),
  CONSTRAINT crm_deals_status_check CHECK ((status = ANY (ARRAY['Draft'::text, 'In Progress'::text, 'Docs Sent'::text, 'Signed'::text, 'Closed'::text, 'Lost'::text])))
);

CREATE TABLE public.crm_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL,
  type text NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size integer NOT NULL,
  uploaded_by uuid NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT crm_documents_pkey PRIMARY KEY (id),
  CONSTRAINT crm_documents_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES crm_deals(id) ON DELETE CASCADE,
  CONSTRAINT crm_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT crm_documents_type_check CHECK ((type = ANY (ARRAY['ID'::text, 'Buyer Passport'::text, 'Seller ID'::text, 'MOU'::text, 'Contract'::text, 'Payment Receipt'::text])))
);


CREATE TABLE public.crm_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone_number text NOT NULL,
  email text NULL,
  language text NULL,
  lead_type text NOT NULL,
  agent_id uuid NOT NULL,
  lead_score integer NULL,
  status text NOT NULL,
  notes text NULL,
  last_contacted_at timestamp with time zone NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT crm_leads_pkey PRIMARY KEY (id),
  CONSTRAINT crm_leads_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT crm_leads_language_check CHECK ((language = ANY (ARRAY['English'::text, 'Arabic'::text]))),
  CONSTRAINT crm_leads_lead_score_check CHECK (((lead_score >= 0) AND (lead_score <= 100))),
  CONSTRAINT crm_leads_lead_type_check CHECK ((lead_type = ANY (ARRAY['Buyer'::text, 'Renter'::text, 'Seller'::text, 'Investor'::text]))),
  CONSTRAINT crm_leads_status_check CHECK ((status = ANY (ARRAY['New'::text, 'Contacted'::text, 'Follow-up'::text, 'Converted'::text, 'Lost'::text])))
);

CREATE TABLE public.crm_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  message text NOT NULL,
  is_read boolean NULL DEFAULT false,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT crm_messages_pkey PRIMARY KEY (id),
  CONSTRAINT crm_messages_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES crm_deals(id) ON DELETE CASCADE,
  CONSTRAINT crm_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE public.crm_reminders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lead_id uuid NULL,
  deal_id uuid NULL,
  agent_id uuid NOT NULL,
  title text NOT NULL,
  description text NULL,
  due_date timestamp with time zone NOT NULL,
  is_completed boolean NULL DEFAULT false,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT crm_reminders_pkey PRIMARY KEY (id),
  CONSTRAINT crm_reminders_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT crm_reminders_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES crm_deals(id) ON DELETE CASCADE,
  CONSTRAINT crm_reminders_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE CASCADE,
  CONSTRAINT crm_reminders_check CHECK ((((lead_id IS NOT NULL) AND (deal_id IS NULL)) OR ((lead_id IS NULL) AND (deal_id IS NOT NULL))))
);

CREATE TABLE public.custom_amenities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  name text NOT NULL,
  created_by uuid NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT custom_amenities_pkey PRIMARY KEY (id),
  CONSTRAINT custom_amenities_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT custom_amenities_property_id_fkey FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

CREATE TABLE public.deal_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  action_type text NOT NULL,
  details text NOT NULL,
  CONSTRAINT deal_activities_pkey PRIMARY KEY (id),
  CONSTRAINT deal_activities_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT deal_activities_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES crm_deals(id) ON DELETE CASCADE
);

CREATE TABLE public.deal_activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL,
  user_id uuid NOT NULL,
  type text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT deal_activity_logs_pkey PRIMARY KEY (id),
  CONSTRAINT deal_activity_logs_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES crm_deals(id) ON DELETE CASCADE,
  CONSTRAINT deal_activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE TABLE public.deal_chats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  message text NOT NULL,
  read boolean NULL DEFAULT false,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT deal_chats_pkey PRIMARY KEY (id),
  CONSTRAINT deal_chats_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES crm_deals(id) ON DELETE CASCADE,
  CONSTRAINT deal_chats_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE TABLE public.deal_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  url text NOT NULL,
  uploaded_by uuid NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  category text NULL DEFAULT 'other'::text,
  ai_check_result jsonb NULL,
  ai_check_status text NULL,
  checked_at timestamp with time zone NULL,
  CONSTRAINT deal_documents_pkey PRIMARY KEY (id),
  CONSTRAINT deal_documents_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES crm_deals(id) ON DELETE CASCADE,
  CONSTRAINT deal_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE TABLE public.deal_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL,
  title text NOT NULL,
  description text NULL,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  location text NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT deal_events_pkey PRIMARY KEY (id),
  CONSTRAINT deal_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT deal_events_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES crm_deals(id) ON DELETE CASCADE
);

CREATE TABLE public.deal_meetings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL,
  title text NOT NULL,
  description text NULL,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  location text NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT deal_meetings_pkey PRIMARY KEY (id),
  CONSTRAINT deal_meetings_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT deal_meetings_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES crm_deals(id) ON DELETE CASCADE
);

CREATE TABLE public.deal_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL,
  author_id uuid NOT NULL,
  text text NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT deal_notes_pkey PRIMARY KEY (id),
  CONSTRAINT deal_notes_author_id_fkey FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT deal_notes_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES crm_deals(id) ON DELETE CASCADE
);

CREATE TABLE public.deal_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  type text NOT NULL,
  message text NOT NULL,
  read boolean NULL DEFAULT false,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT deal_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT deal_notifications_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES crm_deals(id) ON DELETE CASCADE,
  CONSTRAINT deal_notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT deal_notifications_type_check CHECK ((type = ANY (ARRAY['chat'::text, 'file'::text, 'mou-signed'::text, 'meeting'::text])))
);

CREATE TABLE public.deals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  listing_agent_id uuid NOT NULL,
  buying_agent_id uuid NOT NULL,
  client_name text NOT NULL,
  client_email text NOT NULL,
  status public.deal_status NOT NULL DEFAULT 'inquiry'::deal_status,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  listing_agent_signed boolean NULL DEFAULT false,
  buying_agent_signed boolean NULL DEFAULT false,
  signed_at timestamp with time zone NULL,
  closed_at timestamp with time zone NULL,
  archived_at timestamp with time zone NULL,
  inquiry_at timestamp with time zone NULL,
  viewing_at timestamp with time zone NULL,
  offer_at timestamp with time zone NULL,
  negotiation_at timestamp with time zone NULL,
  contract_at timestamp with time zone NULL,
  payment_at timestamp with time zone NULL,
  transfer_at timestamp with time zone NULL,
  locked boolean NULL DEFAULT false,
  deal_type text NOT NULL DEFAULT 'own_property'::text,
  commission_split numeric NULL,
  deal_progress jsonb NULL DEFAULT '{}'::jsonb,
  draft_at timestamp with time zone NULL,
  in_progress_at timestamp with time zone NULL,
  docs_sent_at timestamp with time zone NULL,
  lost_at timestamp with time zone NULL,
  lead_id uuid NULL,
  collaboration_request_id uuid NULL,
  CONSTRAINT deals_pkey PRIMARY KEY (id),
  CONSTRAINT deals_collaboration_request_id_fkey FOREIGN KEY (collaboration_request_id) REFERENCES collaboration_requests(id) ON DELETE SET NULL,
  CONSTRAINT deals_buying_agent_id_fkey FOREIGN KEY (buying_agent_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT deals_listing_agent_id_fkey FOREIGN KEY (listing_agent_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT deals_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES crm_leads(id) ON DELETE SET NULL,
  CONSTRAINT deals_property_id_fkey FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  CONSTRAINT deals_deal_type_check CHECK ((deal_type = ANY (ARRAY['own_property'::text, 'marketplace'::text, 'collaboration'::text, 'off_plan_project'::text])))
);

CREATE TABLE public.developer_agency_contracts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  developer_id uuid NOT NULL,
  agency_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  developer_contract_url text NULL,
  agency_license_url text NULL,
  agency_signed_contract_url text NULL,
  agency_registration_url text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  notes text NULL,
  CONSTRAINT developer_agency_contracts_pkey PRIMARY KEY (id),
  CONSTRAINT developer_agency_contracts_developer_id_agency_id_key UNIQUE (developer_id, agency_id),
  CONSTRAINT developer_agency_contracts_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT developer_agency_contracts_developer_id_fkey FOREIGN KEY (developer_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT developer_agency_contracts_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'rejected'::text])))
);

CREATE TABLE public.developer_contracts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  developer_id uuid NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  uploaded_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT developer_contracts_pkey PRIMARY KEY (id),
  CONSTRAINT developer_contracts_developer_id_fkey FOREIGN KEY (developer_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE public.developer_meetings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  developer_id uuid NOT NULL,
  project_id uuid NULL,
  agent_id uuid NULL,
  agency_id uuid NULL,
  title text NOT NULL,
  notes text NULL,
  date timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'upcoming'::text,
  CONSTRAINT developer_meetings_pkey PRIMARY KEY (id),
  CONSTRAINT developer_meetings_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES profiles(id),
  CONSTRAINT developer_meetings_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES profiles(id),
  CONSTRAINT developer_meetings_developer_id_fkey FOREIGN KEY (developer_id) REFERENCES profiles(id),
  CONSTRAINT developer_meetings_project_id_fkey FOREIGN KEY (project_id) REFERENCES properties(id),
  CONSTRAINT developer_meetings_status_check CHECK ((status = ANY (ARRAY['upcoming'::text, 'done'::text]))),
  CONSTRAINT check_agent_or_agency CHECK ((((agent_id IS NOT NULL) AND (agency_id IS NULL)) OR ((agent_id IS NULL) AND (agency_id IS NOT NULL)) OR ((agent_id IS NULL) AND (agency_id IS NULL))))
);

CREATE TABLE public.developer_project_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  agency_id uuid NULL,
  developer_id uuid NOT NULL,
  project_id uuid NOT NULL,
  client_name text NOT NULL,
  status text NOT NULL DEFAULT 'new'::text,
  notes text NULL,
  submitted_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT developer_project_leads_pkey PRIMARY KEY (id),
  CONSTRAINT developer_project_leads_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES profiles(id),
  CONSTRAINT developer_project_leads_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES profiles(id),
  CONSTRAINT developer_project_leads_developer_id_fkey FOREIGN KEY (developer_id) REFERENCES profiles(id),
  CONSTRAINT developer_project_leads_project_id_fkey FOREIGN KEY (project_id) REFERENCES properties(id) ON DELETE CASCADE,
  CONSTRAINT developer_project_leads_status_check CHECK ((status = ANY (ARRAY['new'::text, 'in-talk'::text, 'site-visit'::text, 'closed'::text])))
);

CREATE TABLE public.developer_project_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  developer_id uuid NOT NULL,
  project_id uuid NULL,
  num_partner_agencies integer NOT NULL DEFAULT 0,
  num_agents_in_agencies integer NOT NULL DEFAULT 0,
  num_agents_displaying_project integer NOT NULL DEFAULT 0,
  num_projects_uploaded_by_developer integer NOT NULL DEFAULT 0,
  num_active_projects integer NOT NULL DEFAULT 0,
  num_total_properties_for_sale integer NOT NULL DEFAULT 0,
  total_project_page_views_by_agents integer NOT NULL DEFAULT 0,
  total_project_page_views_by_buyers integer NOT NULL DEFAULT 0,
  last_updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT developer_project_stats_pkey PRIMARY KEY (id),
  CONSTRAINT developer_project_stats_developer_id_fkey FOREIGN KEY (developer_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT developer_project_stats_project_id_fkey FOREIGN KEY (project_id) REFERENCES properties(id) ON DELETE CASCADE
);

CREATE TABLE public.homepage_assets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  url text NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  created_by uuid NULL,
  CONSTRAINT homepage_assets_pkey PRIMARY KEY (id),
  CONSTRAINT homepage_assets_created_by_fkey FOREIGN KEY (created_by) REFERENCES super_admins(id)
);

CREATE TABLE public.homepage_content (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  section_id text NOT NULL,
  title text NULL,
  subtitle text NULL,
  description text NULL,
  image_url text NULL,
  video_url text NULL,
  link_url text NULL,
  link_text text NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  created_by uuid NULL,
  updated_by uuid NULL,
  CONSTRAINT homepage_content_pkey PRIMARY KEY (id),
  CONSTRAINT homepage_content_section_id_key UNIQUE (section_id),
  CONSTRAINT homepage_content_created_by_fkey FOREIGN KEY (created_by) REFERENCES super_admins(id),
  CONSTRAINT homepage_content_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES super_admins(id)
);

CREATE TABLE public.import_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  developer_id uuid NULL,
  project_count integer NULL DEFAULT 0,
  created_at timestamp with time zone NULL DEFAULT now(),
  expires_at timestamp with time zone NULL DEFAULT (now() + '24:00:00'::interval),
  used_at timestamp with time zone NULL,
  CONSTRAINT import_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT import_tokens_developer_id_fkey FOREIGN KEY (developer_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE public.job_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  cover_letter text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT job_applications_pkey PRIMARY KEY (id),
  CONSTRAINT job_applications_job_id_agent_id_key UNIQUE (job_id, agent_id),
  CONSTRAINT job_applications_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT job_applications_job_id_fkey FOREIGN KEY (job_id) REFERENCES job_postings(id) ON DELETE CASCADE,
  CONSTRAINT job_applications_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'reviewing'::text, 'accepted'::text, 'rejected'::text])))
);

CREATE TABLE public.job_postings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  title text NOT NULL,
  experience_required text NOT NULL,
  languages text[] NOT NULL,
  location text NOT NULL,
  salary_min numeric NULL,
  salary_max numeric NULL,
  description text NOT NULL,
  qualifications text[] NOT NULL,
  deadline timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'active'::text,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  contract_type text NULL DEFAULT 'Full-Time'::text,
  CONSTRAINT job_postings_pkey PRIMARY KEY (id),
  CONSTRAINT job_postings_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES profiles(id)
);

CREATE TABLE public.leads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  whatsapp text NOT NULL,
  budget text NOT NULL,
  timeline text NOT NULL,
  status text NOT NULL DEFAULT 'new'::text,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT leads_pkey PRIMARY KEY (id)
);

CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id)
);

CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  link_url text NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  agency_id uuid NULL,
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES auth.users(id),
  CONSTRAINT notifications_type_check CHECK ((type = ANY (ARRAY['review'::text, 'deal'::text, 'system'::text, 'alert'::text])))
);

CREATE TABLE public.page_views (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  profile_id uuid NULL,
  property_id uuid NULL,
  viewer_id uuid NULL,
  ip_address text NULL,
  user_agent text NULL,
  viewed_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT page_views_pkey PRIMARY KEY (id),
  CONSTRAINT page_views_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT page_views_property_id_fkey FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  CONSTRAINT page_views_viewer_id_fkey FOREIGN KEY (viewer_id) REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT page_views_check CHECK ((((profile_id IS NOT NULL) AND (property_id IS NULL)) OR ((profile_id IS NULL) AND (property_id IS NOT NULL))))
);

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  full_name text NULL,
  avatar_url text NULL,
  introduction text NULL,
  agency_name text NULL,
  agency_logo text NULL,
  registration_number text NULL,
  whatsapp text NULL,
  location text NULL,
  experience text NULL,
  languages text[] NULL,
  specialties text[] NULL,
  verified boolean NULL DEFAULT false,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  agency_id uuid NULL,
  role text NOT NULL DEFAULT ''::text,
  company_details jsonb NULL,
  developer_details jsonb NULL,
  youtube text NULL,
  facebook text NULL,
  instagram text NULL,
  linkedin text NULL,
  tiktok text NULL,
  x text NULL,
  agency_website text NULL,
  agency_email text NULL,
  agency_formation_date date NULL,
  agency_team_size integer NULL,
  slug text NULL,
  api_token uuid NULL DEFAULT gen_random_uuid(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES profiles(id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['agent'::text, 'agency'::text, 'developer'::text])))
);

CREATE TABLE public.properties (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NULL,
  type public.property_type NOT NULL,
  contract_type public.contract_type NOT NULL,
  price numeric NOT NULL,
  location text NOT NULL,
  bedrooms integer NULL,
  bathrooms numeric NULL,
  sqft numeric NULL,
  highlight text NULL,
  images text[] NOT NULL,
  videos text[] NULL,
  agent_id uuid NOT NULL,
  shared boolean NULL DEFAULT false,
  amenities text[] NULL,
  furnishing_status public.furnishing_status NULL,
  completion_status public.completion_status NULL,
  lat numeric NULL,
  lng numeric NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'direct'::text,
  marketplace_id uuid NULL,
  creator_type text NOT NULL DEFAULT 'agent'::text,
  creator_id uuid NULL,
  floor_plan_image text NULL,
  parking_available boolean NULL DEFAULT false,
  slug text NULL,
  handover_date date NULL,
  payment_plan text NULL,
  brochure_url text NULL,
  status text NULL DEFAULT 'draft'::text,
  media_images jsonb NULL,
  media_videos jsonb NULL,
  brochure jsonb NULL,
  floor_plan jsonb NULL,
  import_token uuid NULL,
  is_prelaunch boolean NULL DEFAULT false,
  map_address text NULL,
  map_latitude double precision NULL,
  map_longitude double precision NULL,
  eoi_amount numeric NULL,
  launch_date date NULL,
  unit_types text[] NULL,
  average_unit_size integer NULL,
  unit_size_unit text NULL DEFAULT 'sqft'::text,
  release_process text NULL,
  entry_type public.project_entry_type NULL DEFAULT 'manual'::project_entry_type,
  starting_price_by_unit_type jsonb NULL DEFAULT '{}'::jsonb,
  size_range_min integer NULL,
  size_range_max integer NULL,
  payment_plan_type text NULL,
  first_payment_percent numeric NULL,
  monthly_payment_percent numeric NULL,
  monthly_payment_months integer NULL,
  handover_percent numeric NULL,
  posthandover_percent numeric NULL,
  posthandover_months integer NULL,
  posthandover_years_after integer NULL,
  shared_with_all_agents boolean NULL DEFAULT false,
  CONSTRAINT properties_pkey PRIMARY KEY (id),
  CONSTRAINT properties_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT properties_marketplace_id_fkey FOREIGN KEY (marketplace_id) REFERENCES properties(id) ON DELETE SET NULL,
  CONSTRAINT properties_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT properties_bedrooms_check CHECK ((bedrooms >= 0)),
  CONSTRAINT properties_creator_type_check CHECK ((creator_type = ANY (ARRAY['agent'::text, 'agency'::text, 'developer'::text]))),
  CONSTRAINT properties_price_check CHECK ((price >= (0)::numeric)),
  CONSTRAINT properties_source_check CHECK ((source = ANY (ARRAY['direct'::text, 'marketplace'::text]))),
  CONSTRAINT properties_sqft_check CHECK ((sqft >= (0)::numeric)),
  CONSTRAINT properties_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'validated'::text, 'published'::text]))),
  CONSTRAINT check_agent_creator CHECK ((((creator_type = 'agent'::text) AND (agent_id = creator_id)) OR ((creator_type = 'developer'::text) AND (creator_id = creator_id)) OR (creator_type = 'agency'::text))),
  CONSTRAINT properties_unit_size_unit_check CHECK ((unit_size_unit = ANY (ARRAY['sqft'::text, 'sqm'::text]))),
  CONSTRAINT check_marketplace_id CHECK ((((shared = false) AND (marketplace_id IS NULL)) OR ((shared = true) AND (marketplace_id IS NOT NULL)))),
  CONSTRAINT check_prelaunch_fields CHECK (((NOT is_prelaunch) OR (is_prelaunch AND (launch_date IS NOT NULL)))),
  CONSTRAINT properties_bathrooms_check CHECK ((bathrooms >= (0)::numeric))
);

CREATE TABLE public.property_shares (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  shared_by uuid NOT NULL,
  shared_with uuid NOT NULL,
  status text NOT NULL DEFAULT 'active'::text,
  shared_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT property_shares_pkey PRIMARY KEY (id),
  CONSTRAINT property_shares_property_id_fkey FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  CONSTRAINT property_shares_shared_by_fkey FOREIGN KEY (shared_by) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT property_shares_shared_with_fkey FOREIGN KEY (shared_with) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL,
  reviewer_id uuid NULL,
  rating integer NOT NULL,
  comment text NOT NULL,
  agent_reply text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  reviewer_contact jsonb NULL,
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);

CREATE MATERIALIZED VIEW public.service_area_statistics AS 
SELECT p.agent_id,
    p.location,
    count(*) AS total_properties,
    count(*) FILTER (WHERE p.contract_type = 'Sale'::contract_type) AS sale_properties,
    count(*) FILTER (WHERE p.contract_type = 'Rent'::contract_type) AS rent_properties,
    min(p.price) AS min_price,
    max(p.price) AS max_price,
    count(DISTINCT ap.agent_id) AS total_agents_active,
    count(*) FILTER (WHERE p.created_at >= (now() - '30 days'::interval)) AS new_properties_30d
FROM properties p
LEFT JOIN agent_properties ap ON p.id = ap.property_id
GROUP BY p.agent_id, p.location;

CREATE TABLE public.shared_properties (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  shared_by_agency_id uuid NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  notified boolean NULL DEFAULT false,
  CONSTRAINT shared_properties_pkey PRIMARY KEY (id),
  CONSTRAINT shared_properties_property_id_agent_id_shared_by_agency_id_key UNIQUE (property_id, agent_id, shared_by_agency_id),
  CONSTRAINT shared_properties_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT shared_properties_property_id_fkey FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  CONSTRAINT shared_properties_shared_by_agency_id_fkey FOREIGN KEY (shared_by_agency_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE public.super_admins (
  id uuid NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT super_admins_pkey PRIMARY KEY (id),
  CONSTRAINT super_admins_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE public.unit_types (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  developer_id uuid NOT NULL,
  name text NOT NULL,
  size_range text NULL,
  floor_range text NULL,
  price_range text NULL,
  status text NOT NULL DEFAULT 'available'::text,
  notes text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  units_available integer NULL DEFAULT 0,
  CONSTRAINT unit_types_pkey PRIMARY KEY (id),
  CONSTRAINT unit_types_developer_id_fkey FOREIGN KEY (developer_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT unit_types_project_id_fkey FOREIGN KEY (project_id) REFERENCES properties(id) ON DELETE CASCADE,
  CONSTRAINT unit_types_status_check CHECK ((status = ANY (ARRAY['available'::text, 'sold out'::text])))
);

```


