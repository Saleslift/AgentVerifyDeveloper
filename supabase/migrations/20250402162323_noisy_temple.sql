-- Create a function to get unread message counts for a user across multiple deals
CREATE OR REPLACE FUNCTION get_unread_message_counts(
  p_user_id uuid,
  p_deal_ids uuid[]
)
RETURNS TABLE (
  deal_id uuid,
  count bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    deal_id,
    COUNT(*) as count
  FROM 
    deal_chats
  WHERE 
    read = false
    AND sender_id != p_user_id
    AND deal_id = ANY(p_deal_ids)
  GROUP BY 
    deal_id;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_unread_message_counts(uuid, uuid[]) TO authenticated;