/*
  # Deal Pipeline Implementation

  1. New Tables
    - `deals` - Store property deals between agents
    - `deal_chats` - Store messages between agents
    - `deal_documents` - Store document metadata
    - `deal_meetings` - Store meeting information

  2. Security
    - Enable RLS on all tables
    - Add policies for agent access
    - Create storage bucket for documents
*/

-- Check if tables already exist before creating them
DO $$ 
BEGIN
  -- Create deals table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deals') THEN
    CREATE TABLE deals (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      property_id uuid REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
      listing_agent_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
      buying_agent_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
      client_name text NOT NULL,
      client_email text NOT NULL,
      status text NOT NULL DEFAULT 'inquiry',
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    -- Enable RLS
    ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

    -- Create indexes
    CREATE INDEX idx_deals_property_id ON deals(property_id);
    CREATE INDEX idx_deals_listing_agent_id ON deals(listing_agent_id);
    CREATE INDEX idx_deals_buying_agent_id ON deals(buying_agent_id);
    CREATE INDEX idx_deals_status ON deals(status);

    -- Create policies
    CREATE POLICY "Agents can view their deals"
      ON deals
      FOR SELECT
      TO authenticated
      USING (
        listing_agent_id = auth.uid() OR 
        buying_agent_id = auth.uid()
      );

    CREATE POLICY "Agents can create deals"
      ON deals
      FOR INSERT
      TO authenticated
      WITH CHECK (
        buying_agent_id = auth.uid()
      );

    CREATE POLICY "Agents can update their deals"
      ON deals
      FOR UPDATE
      TO authenticated
      USING (
        listing_agent_id = auth.uid() OR 
        buying_agent_id = auth.uid()
      )
      WITH CHECK (
        listing_agent_id = auth.uid() OR 
        buying_agent_id = auth.uid()
      );

    -- Create trigger for updated_at
    CREATE TRIGGER update_deals_updated_at
      BEFORE UPDATE ON deals
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- Create deal_chats table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deal_chats') THEN
    CREATE TABLE deal_chats (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
      sender_id uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
      message text NOT NULL,
      read boolean DEFAULT false,
      created_at timestamptz DEFAULT now()
    );

    -- Enable RLS
    ALTER TABLE deal_chats ENABLE ROW LEVEL SECURITY;

    -- Create indexes
    CREATE INDEX idx_deal_chats_deal_id ON deal_chats(deal_id);
    CREATE INDEX idx_deal_chats_sender_id ON deal_chats(sender_id);

    -- Create policies
    CREATE POLICY "Agents can view chats for their deals"
      ON deal_chats
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM deals
          WHERE deals.id = deal_chats.deal_id
          AND (
            deals.listing_agent_id = auth.uid() OR 
            deals.buying_agent_id = auth.uid()
          )
        )
      );

    CREATE POLICY "Agents can send messages in their deals"
      ON deal_chats
      FOR INSERT
      TO authenticated
      WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
          SELECT 1 FROM deals
          WHERE deals.id = deal_chats.deal_id
          AND (
            deals.listing_agent_id = auth.uid() OR 
            deals.buying_agent_id = auth.uid()
          )
        )
      );

    CREATE POLICY "Agents can update read status of messages"
      ON deal_chats
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM deals
          WHERE deals.id = deal_chats.deal_id
          AND (
            deals.listing_agent_id = auth.uid() OR 
            deals.buying_agent_id = auth.uid()
          )
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM deals
          WHERE deals.id = deal_chats.deal_id
          AND (
            deals.listing_agent_id = auth.uid() OR 
            deals.buying_agent_id = auth.uid()
          )
        )
      );
  END IF;

  -- Create deal_documents table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deal_documents') THEN
    CREATE TABLE deal_documents (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
      name text NOT NULL,
      url text NOT NULL,
      type text NOT NULL,
      uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
      document_category text DEFAULT 'other',
      created_at timestamptz DEFAULT now()
    );

    -- Enable RLS
    ALTER TABLE deal_documents ENABLE ROW LEVEL SECURITY;

    -- Create indexes
    CREATE INDEX idx_deal_documents_deal_id ON deal_documents(deal_id);
    CREATE INDEX idx_deal_documents_uploaded_by ON deal_documents(uploaded_by);
    CREATE INDEX idx_deal_documents_category ON deal_documents(document_category);

    -- Create policies
    CREATE POLICY "Agents can view documents for their deals"
      ON deal_documents
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM deals
          WHERE deals.id = deal_documents.deal_id
          AND (
            deals.listing_agent_id = auth.uid() OR 
            deals.buying_agent_id = auth.uid()
          )
        )
      );

    CREATE POLICY "Agents can upload documents to their deals"
      ON deal_documents
      FOR INSERT
      TO authenticated
      WITH CHECK (
        uploaded_by = auth.uid() AND
        EXISTS (
          SELECT 1 FROM deals
          WHERE deals.id = deal_documents.deal_id
          AND (
            deals.listing_agent_id = auth.uid() OR 
            deals.buying_agent_id = auth.uid()
          )
        )
      );
  END IF;

  -- Create deal_meetings table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deal_meetings') THEN
    CREATE TABLE deal_meetings (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
      title text NOT NULL,
      description text,
      start_time timestamptz NOT NULL,
      end_time timestamptz NOT NULL,
      location text,
      created_by uuid REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
      created_at timestamptz DEFAULT now()
    );

    -- Enable RLS
    ALTER TABLE deal_meetings ENABLE ROW LEVEL SECURITY;

    -- Create indexes
    CREATE INDEX idx_deal_meetings_deal_id ON deal_meetings(deal_id);

    -- Create policies
    CREATE POLICY "Agents can view meetings for their deals"
      ON deal_meetings
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM deals
          WHERE deals.id = deal_meetings.deal_id
          AND (
            deals.listing_agent_id = auth.uid() OR 
            deals.buying_agent_id = auth.uid()
          )
        )
      );

    CREATE POLICY "Agents can create meetings for their deals"
      ON deal_meetings
      FOR INSERT
      TO authenticated
      WITH CHECK (
        created_by = auth.uid() AND
        EXISTS (
          SELECT 1 FROM deals
          WHERE deals.id = deal_meetings.deal_id
          AND (
            deals.listing_agent_id = auth.uid() OR 
            deals.buying_agent_id = auth.uid()
          )
        )
      );

    CREATE POLICY "Agents can update meetings they created"
      ON deal_meetings
      FOR UPDATE
      TO authenticated
      USING (
        created_by = auth.uid()
      )
      WITH CHECK (
        created_by = auth.uid()
      );
  END IF;
END $$;

-- Create deal-documents storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('deal-documents', 'deal-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies to avoid conflicts
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Agents can upload deal documents" ON storage.objects;
  DROP POLICY IF EXISTS "Agents can access deal documents" ON storage.objects;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create storage policies for deal documents
CREATE POLICY "Agents can upload deal documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'deal-documents' AND
  (EXISTS (
    SELECT 1 FROM deals
    WHERE deals.id::text = SPLIT_PART(name, '/', 1)
    AND (
      deals.listing_agent_id = auth.uid() OR
      deals.buying_agent_id = auth.uid()
    )
  ))
);

CREATE POLICY "Agents can access deal documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'deal-documents' AND
  (EXISTS (
    SELECT 1 FROM deals
    WHERE deals.id::text = SPLIT_PART(name, '/', 1)
    AND (
      deals.listing_agent_id = auth.uid() OR
      deals.buying_agent_id = auth.uid()
    )
  ))
);