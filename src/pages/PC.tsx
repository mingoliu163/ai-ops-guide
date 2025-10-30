import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Activity, Server, TrendingUp, AlertCircle } from "lucide-react";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const PC = () => {
  const [ipInput, setIpInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const profileData = localStorage.getItem('feishu_profile');
    if (profileData) {
      setUserProfile(JSON.parse(profileData));
    }
  }, []);

  const handleInspection = async () => {
    if (!ipInput.trim()) {
      toast({
        title: "请输入IP地址",
        description: "请至少输入一个IP地址进行巡检",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Parse IP addresses from input (one per line)
      const ipAddresses = ipInput.split('\n')
        .map(ip => ip.trim())
        .filter(ip => ip.length > 0);

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        'https://awwdfsoycnnhykezauhc.supabase.co/functions/v1/ip-inspection',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify({ ipAddresses }),
        }
      );

      if (!response.ok) {
        throw new Error(`请求失败: ${response.status}`);
      }

      const data = await response.json();
      
      setResults({
        score: data.aiResult?.score || 0,
        details: data.aiResult?.analysis || '分析结果不可用',
        suggestions: data.aiResult?.suggestions || '',
        location: data.location,
        timestamp: new Date().toLocaleString("zh-CN"),
        nagiosData: data.nagiosData,
      });
      
      toast({
        title: "巡检完成",
        description: `AI分析已完成，评分：${data.aiResult?.score || 0}/10`,
      });
    } catch (error) {
      console.error('Inspection error:', error);
      toast({
        title: "巡检失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-accent";
    if (score >= 60) return "text-warning";
    return "text-destructive";
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  AI运维巡检系统
                </h1>
                <p className="text-muted-foreground mt-1">智能分析服务器状态，提升运维效率</p>
              </div>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2 border-primary/20">
                  <AvatarImage src={userProfile?.avatar_url} alt={userProfile?.name} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {userProfile?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="text-right">
                  <p className="text-sm font-medium">{userProfile?.name || '用户'}</p>
                  <p className="text-xs text-muted-foreground">PC端</p>
                </div>
              </div>
            </div>

            {/* IP Input Card */}
            <Card className="p-6 bg-gradient-card border-border/50 shadow-lg">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Server className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">输入服务器IP</h2>
                </div>
                
                <Textarea
                  placeholder="请输入一个或多个IP地址，每行一个&#10;例如：&#10;192.168.1.100&#10;10.0.0.50"
                  value={ipInput}
                  onChange={(e) => setIpInput(e.target.value)}
                  className="min-h-[150px] bg-background/50 border-border focus:border-primary transition-colors"
                />

                <Button
                  onClick={handleInspection}
                  disabled={isLoading}
                  className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Activity className="w-4 h-4 mr-2 animate-spin" />
                      正在巡检...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-4 h-4 mr-2" />
                      开始AI巡检
                    </>
                  )}
                </Button>
              </div>
            </Card>

            {/* Results Card */}
            {results && (
              <Card className="p-6 bg-gradient-card border-border/50 shadow-lg animate-in fade-in duration-500">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">巡检结果</h2>
                    <Badge variant="secondary" className="text-xs">
                      {results.timestamp}
                    </Badge>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">综合评分</p>
                      <p className={`text-4xl font-bold ${getScoreColor(results.score)}`}>
                        {results.score}
                        <span className="text-lg text-muted-foreground">/100</span>
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">机房位置</p>
                      <Badge variant="outline" className="text-base border-primary/50">
                        {results.location}
                      </Badge>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">AI分析</p>
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-background/50">
                        <AlertCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <p className="text-sm leading-relaxed">{results.details}</p>
                      </div>
                    </div>
                    
                    {results.suggestions && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">改进建议</p>
                        <div className="p-3 rounded-lg bg-background/50">
                          <p className="text-sm leading-relaxed">{results.suggestions}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default PC;
