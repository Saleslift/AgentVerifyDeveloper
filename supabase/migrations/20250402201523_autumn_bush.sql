-- Create function to execute SQL statements
CREATE OR REPLACE FUNCTION create_validation_function(function_definition text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE function_definition;
END;
$$;

-- Create function to create triggers
CREATE OR REPLACE FUNCTION create_trigger(trigger_definition text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE trigger_definition;
END;
$$;

-- Create function to add columns
CREATE OR REPLACE FUNCTION add_columns(sql_statement text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_statement;
END;
$$;

-- Create function to create indexes
CREATE OR REPLACE FUNCTION create_indexes(sql_statement text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_statement;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION create_validation_function(text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_trigger(text) TO authenticated;
GRANT EXECUTE ON FUNCTION add_columns(text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_indexes(text) TO authenticated;