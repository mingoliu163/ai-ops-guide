import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InspectionRequest {
  ipAddresses: string[];
}

interface NagiosConfig {
  url: string;
  location: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only allow POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Safely parse JSON body (handle empty/invalid JSON)
    let ipAddresses: string[] | undefined;
    try {
      const contentType = req.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const bodyText = await req.text();
        if (bodyText && bodyText.trim().length > 0) {
          const parsed: InspectionRequest = JSON.parse(bodyText);
          ipAddresses = parsed.ipAddresses;
        }
      }
    } catch (e) {
      console.warn('Failed to parse JSON body:', e);
    }

    const ipList = Array.isArray(ipAddresses) ? ipAddresses : [];
    console.log('Received IP addresses for inspection:', ipList);

    if (ipList.length === 0) {
      return new Response(
        JSON.stringify({ error: '请提供至少一个IP地址' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const qwenApiKey = Deno.env.get('QWEN_API_KEY');
    if (!qwenApiKey) {
      console.error('QWEN_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI服务未配置' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process first IP address
    const ipAddress = ipList[0].trim();
    console.log('Processing IP:', ipAddress);

    // Determine location based on IP pattern
    const nagiosConfig = determineLocation(ipAddress);
    console.log('Location determined:', nagiosConfig.location);

    // Call Nagios API
    const nagiosData = await fetchNagiosData(ipAddress, nagiosConfig);
    console.log('Nagios data fetched, servicestatus count:', nagiosData?.servicestatus?.length || 0);

    // Call Qwen AI for scoring
    const aiResult = await callQwenAI(nagiosData, qwenApiKey);
    console.log('AI analysis completed');

    // Save inspection record to database
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      let userId: string | null = null;
      const authHeader = req.headers.get('authorization');
      
      if (authHeader) {
        // Try to get user from auth token
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        
        if (user && !userError) {
          const feishuOpenId = user.user_metadata?.feishu_open_id;
          
          if (feishuOpenId) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id')
              .eq('feishu_open_id', feishuOpenId)
              .single();

            if (profile) {
              userId = profile.id;
            }
          }
        }
      }
      
      // If no user found from auth, try to get or create a test user profile
      if (!userId) {
        console.log('No authenticated user, using test user for development');
        
        // Try to find existing test user
        const { data: testProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', 'test@test.com')
          .single();
        
        if (testProfile) {
          userId = testProfile.id;
        } else {
          // Create test user profile
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              email: 'test@test.com',
              name: '测试用户',
              feishu_open_id: 'test_user_dev'
            })
            .select('id')
            .single();
          
          if (newProfile && !insertError) {
            userId = newProfile.id;
            console.log('Created test user profile');
          }
        }
      }

      // Insert inspection record if we have a user_id
      if (userId) {
        await supabase.from('inspection_records').insert({
          user_id: userId,
          ip_addresses: ipList,
          query_info: nagiosData,
          ai_result: aiResult,
          score: aiResult?.score || 0
        });
        console.log('Inspection record saved to database');
      }
    } catch (dbError) {
      console.error('Failed to save inspection record:', dbError);
      // Don't fail the request if DB insert fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        location: nagiosConfig.location,
        ip: ipAddress,
        nagiosData: nagiosData,
        aiResult: aiResult,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in ip-inspection function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : '未知错误',
        details: error instanceof Error ? error.stack : undefined
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function determineLocation(ip: string): NagiosConfig {
  // Check if IP matches Shenzhen pattern (10.162.x.x)
  if (ip.startsWith('10.162.')) {
    return {
      url: 'http://nagiosxisz.bbc.tech/nagiosxi/api/v1/objects/servicestatus',
      location: '深圳'
    };
  }
  
  // Check if IP matches Changzhou pattern (10.77.x.x)
  if (ip.startsWith('10.77.')) {
    return {
      url: 'http://nagiosxicz.bbc.tech/nagiosxi/api/v1/objects/servicestatus',
      location: '常州'
    };
  }

  // Default to Changzhou for other IPs
  return {
    url: 'http://nagiosxicz.bbc.tech/nagiosxi/api/v1/objects/servicestatus',
    location: '其他'
  };
}

async function fetchNagiosData(ip: string, config: NagiosConfig) {
  const apiKey = config.location === '深圳' 
    ? 'KKA2rjh8rhuDtHDeBgDSXUHAV2UoCPqCPgEhCbIjsccf9PtKlmCjgASbR4TJSDiX'
    : 'F7g7quFNHuliKTqQ3BR29eqqqseXRMAs96TCDOFgihS2aiRc9YtCtW2WIvaABZiK';

  const url = `${config.url}?apikey=${apiKey}&pretty=1&address=${ip}`;
  console.log('Fetching Nagios data from:', config.url);

  const response = await fetch(url);
  
  if (!response.ok) {
    console.error('Nagios API error:', response.status, response.statusText);
    throw new Error(`Nagios API请求失败: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

async function callQwenAI(nagiosData: any, apiKey: string) {
  const prompt = `这是Nagios监控的一台服务器的信息，请根据当前信息给服务器状态打分，1到10分打几分。

监控数据：
${JSON.stringify(nagiosData, null, 2)}

请分析以下方面并给出评分：
1. 服务状态（是否有warning或critical状态）
2. 性能指标（CPU、内存、磁盘等）
3. 整体健康度

请以JSON格式返回：{"score": 分数, "analysis": "详细分析", "suggestions": "改进建议"}`;

  console.log('Calling Qwen AI for analysis');

  const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'qwen-plus',
      input: {
        messages: [
          { 
            role: 'system', 
            content: '你是一个服务器健康监控分析专家。请仔细分析Nagios监控数据，给出准确的评分和建议。' 
          },
          { 
            role: 'user', 
            content: prompt 
          }
        ]
      },
      parameters: {
        result_format: 'message'
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Qwen AI API error:', response.status, errorText);
    throw new Error(`AI分析失败: ${response.status}`);
  }

  const result = await response.json();
  console.log('Qwen AI response received');
  
  // Extract the AI response
  const aiMessage = result.output?.choices?.[0]?.message?.content || result.output?.text || '无法获取AI分析结果';
  
  // Try to parse JSON from the response
  try {
    const jsonMatch = aiMessage.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.log('Failed to parse JSON from AI response, returning raw text');
  }

  return {
    score: 5,
    analysis: aiMessage,
    suggestions: '请查看详细分析'
  };
}
