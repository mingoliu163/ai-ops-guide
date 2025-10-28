import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { ipAddresses }: InspectionRequest = await req.json();
    console.log('Received IP addresses for inspection:', ipAddresses);

    if (!ipAddresses || ipAddresses.length === 0) {
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
    const ipAddress = ipAddresses[0].trim();
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
