# Edge Function Request Failure Troubleshooting Guide

## Common Causes

1. **Configuration Issues**
   - Missing or incorrect environment variables
   - Invalid function URLs
   - Incorrect API keys or credentials
   - CORS configuration problems

2. **Network Problems**
   - Connectivity issues
   - DNS resolution failures
   - Firewall or security group restrictions
   - Rate limiting

3. **Function Errors**
   - Runtime errors in function code
   - Memory limits exceeded
   - Timeout issues
   - Dependencies not properly imported

4. **Authentication/Authorization**
   - Invalid or expired tokens
   - Missing authorization headers
   - Insufficient permissions
   - Role-based access control (RBAC) issues

## Diagnostic Process

### 1. Check Function Configuration
```bash
# Verify environment variables
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY

# Check function URL format
# Should be: https://<project-ref>.supabase.co/functions/v1/<function-name>
```

### 2. Verify Network Connectivity
```typescript
// Test function reachability
const testConnection = async () => {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/health-check`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      }
    });
    return response.ok;
  } catch (error) {
    console.error('Connection test failed:', error);
    return false;
  }
}
```

### 3. Check Error Logs
```typescript
// Enable detailed logging
const { data, error } = await supabase.functions.invoke('function-name', {
  body: payload,
  headers: { 'x-debug-mode': 'true' }
});

if (error) {
  console.error('Function error:', error);
  console.error('Request ID:', error.requestId);
  console.error('Status:', error.status);
  console.error('Message:', error.message);
}
```

## Error Codes and Solutions

### 1. HTTP Status Codes

| Code | Meaning | Solution |
|------|----------|----------|
| 401  | Unauthorized | Check authentication token |
| 403  | Forbidden | Verify permissions and RBAC |
| 404  | Not Found | Confirm function URL and deployment |
| 429  | Too Many Requests | Implement rate limiting handling |
| 500  | Internal Server Error | Check function logs for errors |
| 502  | Bad Gateway | Verify function deployment |
| 504  | Gateway Timeout | Check function timeout settings |

### 2. Common Error Messages

```typescript
// Handle specific error types
switch (error.code) {
  case 'FUNCTION_NOT_FOUND':
    console.error('Function not deployed or incorrect URL');
    break;
  case 'INVALID_TOKEN':
    console.error('Authentication token is invalid or expired');
    break;
  case 'RATE_LIMIT_EXCEEDED':
    console.error('Too many requests, implement backoff');
    break;
  case 'TIMEOUT':
    console.error('Function execution timed out');
    break;
}
```

## Required Configuration Checks

### 1. Environment Variables
```typescript
// Verify required environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const checkEnvVars = () => {
  const missing = requiredEnvVars.filter(
    varName => !process.env[varName]
  );
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
}
```

### 2. CORS Configuration
```typescript
// Required CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Handle CORS preflight
if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders });
}
```

## Network Connectivity Verification

### 1. Test Function Availability
```typescript
const verifyFunctionAccess = async (functionName: string) => {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/${functionName}`,
      {
        method: 'OPTIONS',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    );
    return response.ok;
  } catch (error) {
    console.error('Function access verification failed:', error);
    return false;
  }
}
```

### 2. Check Request Headers
```typescript
const validateHeaders = (headers: Headers) => {
  const required = ['authorization', 'content-type'];
  const missing = required.filter(
    header => !headers.has(header)
  );
  return missing.length === 0;
}
```

## Error Log Analysis

### 1. Enable Debug Mode
```typescript
const invokeWithDebug = async (functionName: string, payload: any) => {
  return await supabase.functions.invoke(functionName, {
    body: payload,
    headers: {
      'x-debug-mode': 'true',
      'x-debug-level': 'verbose'
    }
  });
}
```

### 2. Log Collection
```typescript
const collectErrorDetails = (error: any) => {
  return {
    timestamp: new Date().toISOString(),
    requestId: error.requestId,
    status: error.status,
    message: error.message,
    context: {
      function: error.functionName,
      payload: error.payload,
      headers: error.headers
    }
  };
}
```

## Solutions for Common Issues

### 1. Authentication Errors
```typescript
const handleAuthError = async (error: any) => {
  if (error.status === 401) {
    // Attempt token refresh
    const { data: { session }, error: refreshError } = 
      await supabase.auth.refreshSession();
    
    if (!refreshError && session) {
      // Retry request with new token
      return await supabase.functions.invoke(functionName, {
        body: payload,
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
    }
  }
  throw error;
}
```

### 2. Rate Limiting
```typescript
const withRetry = async (fn: Function, maxRetries = 3) => {
  let attempts = 0;
  while (attempts < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429) {
        attempts++;
        const delay = Math.pow(2, attempts) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

## Verification Steps

### 1. Function Health Check
```typescript
const checkFunctionHealth = async (functionName: string) => {
  const checks = [
    verifyFunctionAccess(functionName),
    validateHeaders(headers),
    checkEnvVars()
  ];
  
  const results = await Promise.all(checks);
  return results.every(result => result === true);
}
```

### 2. End-to-End Testing
```typescript
const testFunctionE2E = async (functionName: string, testCases: any[]) => {
  const results = [];
  
  for (const testCase of testCases) {
    try {
      const result = await supabase.functions.invoke(functionName, {
        body: testCase.payload
      });
      
      results.push({
        case: testCase.name,
        success: true,
        result
      });
    } catch (error) {
      results.push({
        case: testCase.name,
        success: false,
        error
      });
    }
  }
  
  return results;
}
```

### 3. Monitoring
```typescript
const monitorFunction = async (functionName: string) => {
  const metrics = {
    invocations: 0,
    errors: 0,
    avgLatency: 0
  };
  
  // Set up monitoring interval
  setInterval(async () => {
    try {
      const stats = await supabase.rpc('get_function_metrics', {
        function_name: functionName
      });
      
      Object.assign(metrics, stats);
      
      if (metrics.errors / metrics.invocations > 0.1) {
        console.warn('High error rate detected');
      }
    } catch (error) {
      console.error('Monitoring error:', error);
    }
  }, 60000);
  
  return metrics;
}
```