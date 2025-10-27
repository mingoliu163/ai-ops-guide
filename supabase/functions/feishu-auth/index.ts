import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FeishuTokenResponse {
  code: number;
  msg: string;
  app_access_token?: string;
  tenant_access_token?: string;
  expire?: number;
}

interface FeishuUserInfo {
  code: number;
  msg: string;
  data?: {
    user_id: string;
    union_id: string;
    open_id: string;
    name: string;
    avatar_url: string;
    mobile: string;
    email: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, redirectUri } = await req.json();

    if (!code) {
      throw new Error('Authorization code is required');
    }

    const appId = Deno.env.get('FEISHU_APP_ID');
    const appSecret = Deno.env.get('FEISHU_APP_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!appId || !appSecret || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    console.log('Getting app access token from Feishu...');
    
    // Get app access token
    const tokenResponse = await fetch('https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: appId,
        app_secret: appSecret,
      }),
    });

    const tokenData: FeishuTokenResponse = await tokenResponse.json();
    
    if (tokenData.code !== 0 || !tokenData.app_access_token) {
      console.error('Failed to get app access token:', tokenData);
      throw new Error(`Failed to get app access token: ${tokenData.msg}`);
    }

    console.log('Getting user access token...');

    // Exchange code for user access token
    const userTokenResponse = await fetch('https://open.feishu.cn/open-apis/authen/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.app_access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: code,
      }),
    });

    const userTokenData = await userTokenResponse.json();
    
    if (userTokenData.code !== 0 || !userTokenData.data?.access_token) {
      console.error('Failed to get user access token:', userTokenData);
      throw new Error(`Failed to get user access token: ${userTokenData.msg}`);
    }

    console.log('Getting user info...');

    // Get user info
    const userInfoResponse = await fetch('https://open.feishu.cn/open-apis/authen/v1/user_info', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userTokenData.data.access_token}`,
      },
    });

    const userInfo: FeishuUserInfo = await userInfoResponse.json();
    
    if (userInfo.code !== 0 || !userInfo.data) {
      console.error('Failed to get user info:', userInfo);
      throw new Error(`Failed to get user info: ${userInfo.msg}`);
    }

    console.log('User info retrieved:', userInfo.data.open_id);

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('feishu_open_id', userInfo.data.open_id)
      .maybeSingle();

    let profileId: string;

    if (existingProfile) {
      console.log('Updating existing profile:', existingProfile.id);
      
      // Update existing profile
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({
          name: userInfo.data.name,
          email: userInfo.data.email,
          mobile: userInfo.data.mobile,
          avatar_url: userInfo.data.avatar_url,
          feishu_union_id: userInfo.data.union_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingProfile.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating profile:', updateError);
        throw updateError;
      }

      profileId = updatedProfile.id;
    } else {
      console.log('Creating new profile');
      
      // Create new profile
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          feishu_open_id: userInfo.data.open_id,
          feishu_union_id: userInfo.data.union_id,
          name: userInfo.data.name,
          email: userInfo.data.email,
          mobile: userInfo.data.mobile,
          avatar_url: userInfo.data.avatar_url,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating profile:', insertError);
        throw insertError;
      }

      profileId = newProfile.id;
    }

    console.log('Profile created/updated successfully:', profileId);

    // Create custom JWT token with feishu_open_id
    const token = await createCustomJWT(userInfo.data.open_id, profileId);

    return new Response(
      JSON.stringify({
        success: true,
        profile: {
          id: profileId,
          feishu_open_id: userInfo.data.open_id,
          name: userInfo.data.name,
          email: userInfo.data.email,
          mobile: userInfo.data.mobile,
          avatar_url: userInfo.data.avatar_url,
        },
        token,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in feishu-auth function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Helper function to create a custom JWT token
async function createCustomJWT(feishuOpenId: string, profileId: string): Promise<string> {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const payload = {
    feishu_open_id: feishuOpenId,
    profile_id: profileId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
  };

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  const signature = await sign(`${encodedHeader}.${encodedPayload}`, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

async function sign(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}
