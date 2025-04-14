/*
  # Initial Database Schema

  1. New Tables
    - `profiles` - Extended user profile information
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique)
      - `full_name` (text)
      - `avatar_url` (text)
      - `introduction` (text)
      - `agency_name` (text)
      - `agency_logo` (text)
      - `registration_number` (text)
      - `whatsapp` (text)
      - `location` (text)
      - `experience` (text)
      - `languages` (text[])
      - `specialties` (text[])
      - `verified` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `properties` - Property listings
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `type` (text)
      - `contract_type` (text)
      - `price` (numeric)
      - `location` (text)
      - `bedrooms` (integer)
      - `bathrooms` (numeric)
      - `sqft` (numeric)
      - `highlight` (text)
      - `images` (text[])
      - `videos` (text[])
      - `agent_id` (uuid, references profiles)
      - `shared` (boolean)
      - `amenities` (text[])
      - `furnishing_status` (text)
      - `completion_status` (text)
      - `lat` (numeric)
      - `lng` (numeric)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `reviews` - Agent reviews
      - `id` (uuid, primary key)
      - `agent_id` (uuid, references profiles)
      - `reviewer_id` (uuid, references profiles)
      - `rating` (integer)
      - `comment` (text)
      - `agent_reply` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `deals` - Property deals/transactions
      - `id` (uuid, primary key)
      - `property_id` (uuid, references properties)
      - `listing_agent_id` (uuid, references profiles)
      - `buying_agent_id` (uuid, references profiles)
      - `client_name` (text)
      - `client_email` (text)
      - `status` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `deal_documents` - Documents related to deals
      - `id` (uuid, primary key)
      - `deal_id` (uuid, references deals)
      - `name` (text)
      - `type` (text)
      - `url` (text)
      - `uploaded_by` (uuid, references profiles)
      - `created_at` (timestamptz)

    - `deal_notes` - Notes on deals
      - `id` (uuid, primary key)
      - `deal_id` (uuid, references deals)
      - `author_id` (uuid, references profiles)
      - `text` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Secure access to sensitive data

  3. Indexes
    - Add indexes for frequently queried columns
    - Optimize for common search patterns
*/

-- Create custom types
CREATE TYPE property_type AS ENUM ('Apartment', 'House', 'Villa', 'Land');
CREATE TYPE contract_type AS ENUM ('Sale', 'Rent');
CREATE TYPE furnishing_status AS ENUM ('Furnished', 'Unfurnished', 'Semi-Furnished');
CREATE TYPE completion_status AS ENUM ('Ready', 'Off-Plan');
CREATE TYPE deal_status AS ENUM ('inquiry', 'viewing', 'offer', 'negotiation', 'contract', 'payment', 'transfer');

-- Create profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  introduction text,
  agency_name text,
  agency_logo text,
  registration_number text,
  whatsapp text,
  location text,
  experience text,
  languages text[],
  specialties text[],
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create properties table
CREATE TABLE properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  type property_type NOT NULL,
  contract_type contract_type NOT NULL,
  price numeric NOT NULL CHECK (price >= 0),
  location text NOT NULL,
  bedrooms integer CHECK (bedrooms >= 0),
  bathrooms numeric CHECK (bathrooms >= 0),
  sqft numeric CHECK (sqft >= 0),
  highlight text,
  images text[] NOT NULL,
  videos text[],
  agent_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  shared boolean DEFAULT false,
  amenities text[],
  furnishing_status furnishing_status,
  completion_status completion_status,
  lat numeric,
  lng numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create reviews table
CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  reviewer_id uuid REFERENCES profiles ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text NOT NULL,
  agent_reply text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create deals table
CREATE TABLE deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties ON DELETE CASCADE NOT NULL,
  listing_agent_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  buying_agent_id uuid REFERENCES profiles ON DELETE CASCADE NOT NULL,
  client_name text NOT NULL,
  client_email text NOT NULL,
  status deal_status NOT NULL DEFAULT 'inquiry',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create deal_documents table
CREATE TABLE deal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  url text NOT NULL,
  uploaded_by uuid REFERENCES profiles ON DELETE SET NULL NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create deal_notes table
CREATE TABLE deal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES profiles ON DELETE SET NULL NOT NULL,
  text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_properties_agent_id ON properties(agent_id);
CREATE INDEX idx_properties_location ON properties(location);
CREATE INDEX idx_properties_type ON properties(type);
CREATE INDEX idx_properties_contract_type ON properties(contract_type);
CREATE INDEX idx_properties_price ON properties(price);
CREATE INDEX idx_reviews_agent_id ON reviews(agent_id);
CREATE INDEX idx_deals_property_id ON deals(property_id);
CREATE INDEX idx_deals_listing_agent_id ON deals(listing_agent_id);
CREATE INDEX idx_deals_buying_agent_id ON deals(buying_agent_id);
CREATE INDEX idx_deal_documents_deal_id ON deal_documents(deal_id);
CREATE INDEX idx_deal_notes_deal_id ON deal_notes(deal_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_notes ENABLE ROW LEVEL SECURITY;

-- Create policies

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Properties policies
CREATE POLICY "Properties are viewable by everyone"
  ON properties FOR SELECT
  USING (true);

CREATE POLICY "Agents can insert own properties"
  ON properties FOR INSERT
  WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Agents can update own properties"
  ON properties FOR UPDATE
  USING (auth.uid() = agent_id);

CREATE POLICY "Agents can delete own properties"
  ON properties FOR DELETE
  USING (auth.uid() = agent_id);

-- Reviews policies
CREATE POLICY "Reviews are viewable by everyone"
  ON reviews FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create reviews"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users can update own reviews"
  ON reviews FOR UPDATE
  USING (auth.uid() = reviewer_id);

CREATE POLICY "Users can delete own reviews"
  ON reviews FOR DELETE
  USING (auth.uid() = reviewer_id);

-- Deals policies
CREATE POLICY "Agents can view their deals"
  ON deals FOR SELECT
  USING (
    auth.uid() = listing_agent_id OR 
    auth.uid() = buying_agent_id
  );

CREATE POLICY "Agents can create deals"
  ON deals FOR INSERT
  WITH CHECK (
    auth.uid() = listing_agent_id OR 
    auth.uid() = buying_agent_id
  );

CREATE POLICY "Involved agents can update deals"
  ON deals FOR UPDATE
  USING (
    auth.uid() = listing_agent_id OR 
    auth.uid() = buying_agent_id
  );

-- Deal documents policies
CREATE POLICY "Involved agents can view deal documents"
  ON deal_documents FOR SELECT
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

CREATE POLICY "Involved agents can insert deal documents"
  ON deal_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_documents.deal_id
      AND (
        deals.listing_agent_id = auth.uid() OR
        deals.buying_agent_id = auth.uid()
      )
    )
  );

-- Deal notes policies
CREATE POLICY "Involved agents can view deal notes"
  ON deal_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_notes.deal_id
      AND (
        deals.listing_agent_id = auth.uid() OR
        deals.buying_agent_id = auth.uid()
      )
    )
  );

CREATE POLICY "Involved agents can insert deal notes"
  ON deal_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = deal_notes.deal_id
      AND (
        deals.listing_agent_id = auth.uid() OR
        deals.buying_agent_id = auth.uid()
      )
    )
  );

-- Create functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically create profile after signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile after signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();