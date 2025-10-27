import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('feishu_token');
    if (token) {
      navigate('/pc');
    }

    // Handle OAuth callback
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');

      if (code) {
        setIsLoading(true);
        try {
          const redirectUri = `${window.location.origin}/auth`;
          
          const { data, error } = await supabase.functions.invoke('feishu-auth', {
            body: { code, redirectUri },
          });

          if (error) throw error;

          if (data.success) {
            // Store token and profile
            localStorage.setItem('feishu_token', data.token);
            localStorage.setItem('feishu_profile', JSON.stringify(data.profile));

            toast({
              title: "登录成功",
              description: `欢迎回来，${data.profile.name}！`,
            });

            navigate('/pc');
          } else {
            throw new Error(data.error || '登录失败');
          }
        } catch (error: any) {
          console.error('Auth error:', error);
          toast({
            title: "登录失败",
            description: error.message || "请稍后重试",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      }
    };

    handleCallback();
  }, [navigate, toast]);

  const handleFeishuLogin = () => {
    const appId = 'cli_a7a95893e878d00c'; // Replace with your actual Feishu App ID
    const redirectUri = `${window.location.origin}/auth`;
    const feishuAuthUrl = `https://open.feishu.cn/open-apis/authen/v1/authorize?app_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=STATE`;
    
    window.location.href = feishuAuthUrl;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">正在登录...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">AI服务器巡检系统</h1>
          <p className="text-muted-foreground">请使用飞书账号登录</p>
        </div>

        <Button
          onClick={handleFeishuLogin}
          className="w-full"
          size="lg"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
          </svg>
          使用飞书登录
        </Button>

        <p className="text-xs text-muted-foreground text-center mt-6">
          登录即表示您同意我们的服务条款和隐私政策
        </p>
      </Card>
    </div>
  );
};

export default Auth;
