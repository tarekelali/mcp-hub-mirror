import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';
import { j } from "../_shared/cors.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return j({ error: 'Method not allowed' }, 405);
  }

  try {
    const url = new URL(req.url);
    const cmpId = url.pathname.split('/').pop();
    
    if (!cmpId) {
      return j({ error: 'CMP ID required' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get contact for this CMP
    const { data: contact, error } = await supabase
      .from('contacts')
      .select('name, role, email, phone')
      .eq('cmp_id', cmpId)
      .maybeSingle();

    if (error) {
      console.error('Database error:', error);
      return j({ error: 'Failed to fetch contact' }, 500);
    }

    const response = {
      contact: contact || null
    };

    return j(response);
  } catch (error) {
    console.error('Contact error:', error);
    return j({ error: 'Internal server error' }, 500);
  }
});