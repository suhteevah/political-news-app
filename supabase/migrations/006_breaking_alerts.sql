-- Breaking news alerts: add columns to posts and email_preferences
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_breaking boolean DEFAULT false;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS breaking_sent_at timestamptz DEFAULT null;

-- Let users choose which categories they want breaking alerts for
-- Default: all categories
ALTER TABLE email_preferences ADD COLUMN IF NOT EXISTS alert_categories text[] DEFAULT ARRAY['Breaking','Politics','Economy','Culture','Media','World','Opinion'];
