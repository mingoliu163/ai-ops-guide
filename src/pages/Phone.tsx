import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Activity, Server, TrendingUp, AlertCircle, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AppSidebar } from "@/components/AppSidebar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Phone = () => {
  const [ipInput, setIpInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

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

      const response = await fetch(
        'https://awwdfsoycnnhykezauhc.supabase.co/functions/v1/ip-inspection',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
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

      // Store inspection record in database
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('feishu_open_id', user.user_metadata?.feishu_open_id)
            .single();

          if (profile) {
            await supabase.from('inspection_records').insert({
              user_id: profile.id,
              ip_addresses: ipAddresses,
              query_info: data.nagiosData,
              ai_result: data.aiResult,
              score: data.aiResult?.score || 0
            });
          }
        }
      } catch (dbError) {
        console.error('Failed to save inspection record:', dbError);
      }
      
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
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-2">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <AppSidebar />
            </SheetContent>
          </Sheet>

          <div className="flex-1">
            <h1 className="text-lg font-bold bg-gradient-primary bg-clip-text text-transparent">
              AI运维巡检
            </h1>
          </div>

          <Badge variant="outline" className="border-primary/50">
            <Activity className="w-3 h-3 mr-1" />
            移动端
          </Badge>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 space-y-4 pb-20">
        {/* IP Input Card */}
        <Card className="p-4 bg-gradient-card border-border/50">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">输入服务器IP</h2>
            </div>
            
            <Textarea
              placeholder="请输入IP地址&#10;每行一个&#10;例如：192.168.1.100"
              value={ipInput}
              onChange={(e) => setIpInput(e.target.value)}
              className="min-h-[120px] bg-background/50 border-border text-sm"
            />

            <Button
              onClick={handleInspection}
              disabled={isLoading}
              className="w-full bg-gradient-primary hover:opacity-90"
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
          <Card className="p-4 bg-gradient-card border-border/50 animate-in fade-in duration-500">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">巡检结果</h2>
                <Badge variant="secondary" className="text-xs">
                  {results.timestamp}
                </Badge>
              </div>

              <div className="grid gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">综合评分</p>
                  <p className={`text-3xl font-bold ${getScoreColor(results.score)}`}>
                    {results.score}
                    <span className="text-base text-muted-foreground">/100</span>
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">机房位置</p>
                  <Badge variant="outline" className="border-primary/50 w-fit">
                    {results.location}
                  </Badge>
                </div>
              </div>

              <div className="pt-3 border-t border-border space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">AI分析</p>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-background/50">
                    <AlertCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-xs leading-relaxed">{results.details}</p>
                  </div>
                </div>
                
                {results.suggestions && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">改进建议</p>
                    <div className="p-3 rounded-lg bg-background/50">
                      <p className="text-xs leading-relaxed">{results.suggestions}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Phone;
