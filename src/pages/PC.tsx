import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Activity, Server, TrendingUp, AlertCircle } from "lucide-react";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useToast } from "@/hooks/use-toast";

const PC = () => {
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
    
    // TODO: 调用后端API进行IP巡检
    setTimeout(() => {
      setResults({
        score: 85,
        details: "服务器运行正常，CPU使用率65%，内存使用率72%",
        location: "深圳",
        timestamp: new Date().toLocaleString("zh-CN"),
      });
      setIsLoading(false);
      toast({
        title: "巡检完成",
        description: "AI分析已完成，查看详细结果",
      });
    }, 2000);
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
              <Badge variant="outline" className="h-8 px-4 border-primary/50">
                <Activity className="w-4 h-4 mr-2" />
                PC端
              </Badge>
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

                  <div className="pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-2">详细信息</p>
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-background/50">
                      <AlertCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-sm leading-relaxed">{results.details}</p>
                    </div>
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
