import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { FUNCTIONS_BASE } from '@/lib/functions-base';

export function DebugPanel() {
  const [results, setResults] = useState<any[]>([]);
  const [testing, setTesting] = useState(false);

  const testEndpoint = async (endpoint: string, method: string = 'GET') => {
    try {
      const url = `${FUNCTIONS_BASE}/${endpoint}`;
      console.log(`Testing: ${method} ${url}`);
      
      const response = await fetch(url, {
        method,
        credentials: method === 'GET' ? 'omit' : 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = {
        endpoint,
        method,
        url,
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
        body: null as any
      };

      try {
        const text = await response.text();
        try {
          result.body = JSON.parse(text);
        } catch {
          result.body = text;
        }
      } catch {
        result.body = 'Could not read response body';
      }

      return result;
    } catch (error) {
      return {
        endpoint,
        method,
        url: `${FUNCTIONS_BASE}/${endpoint}`,
        error: error.message,
        networkError: true
      };
    }
  };

  const runTests = async () => {
    setTesting(true);
    setResults([]);
    
    const tests = [
      ['api-countries', 'GET'],
      ['auth-aps-status', 'GET'], 
      ['auth-aps-start', 'GET'],
      ['auth-aps-callback', 'GET'],
    ];

    const results: any[] = [];
    
    for (const [endpoint, method] of tests) {
      const result = await testEndpoint(endpoint, method);
      results.push(result);
      setResults([...results]);
    }
    
    setTesting(false);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Function Connectivity Debug</CardTitle>
        <div className="text-sm text-muted-foreground">
          Base URL: {FUNCTIONS_BASE}
        </div>
      </CardHeader>
      <CardContent>
        <Button onClick={runTests} disabled={testing} className="mb-4">
          {testing ? 'Testing...' : 'Run Connectivity Tests'}
        </Button>
        
        <div className="space-y-4">
          {results.map((result, index) => (
            <div key={index} className="border rounded p-3 text-xs">
              <div className="font-semibold mb-2">
                {result.method} /{result.endpoint}
              </div>
              
              {result.networkError ? (
                <div className="text-red-600">
                  Network Error: {result.error}
                </div>
              ) : (
                <>
                  <div className="mb-2">
                    <span className={`inline-block px-2 py-1 rounded text-xs ${
                      result.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {result.status}
                    </span>
                  </div>
                  
                  <div className="bg-gray-50 p-2 rounded mb-2">
                    <strong>URL:</strong> {result.url}
                  </div>
                  
                  <details className="mb-2">
                    <summary className="cursor-pointer font-medium">Response Headers</summary>
                    <pre className="bg-gray-50 p-2 rounded mt-1 overflow-auto text-xs">
                      {JSON.stringify(result.headers, null, 2)}
                    </pre>
                  </details>
                  
                  <details>
                    <summary className="cursor-pointer font-medium">Response Body</summary>
                    <pre className="bg-gray-50 p-2 rounded mt-1 overflow-auto text-xs">
                      {typeof result.body === 'string' 
                        ? result.body 
                        : JSON.stringify(result.body, null, 2)}
                    </pre>
                  </details>
                </>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}