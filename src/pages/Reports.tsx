import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface DailyReport {
  date: string;
  avgScore: number;
  totalInspections: number;
  status: string;
}

interface Stats {
  avgScore: number;
  totalInspections: number;
  problemServers: number;
}

const Reports = () => {
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [stats, setStats] = useState<Stats>({ avgScore: 0, totalInspections: 0, problemServers: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('feishu_open_id', user.user_metadata?.feishu_open_id)
        .single();

      if (!profile) return;

      // Get all inspection records
      const { data: records, error } = await supabase
        .from('inspection_records')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (records && records.length > 0) {
        // Calculate stats
        const totalScore = records.reduce((sum, r) => sum + (r.score || 0), 0);
        const avgScore = totalScore / records.length;
        const problemServers = records.filter(r => (r.score || 0) < 6).length;

        setStats({
          avgScore: Math.round(avgScore * 10) / 10,
          totalInspections: records.length,
          problemServers
        });

        // Group by date
        const dailyMap = new Map<string, { scores: number[], count: number }>();
        records.forEach(record => {
          const date = new Date(record.created_at).toLocaleDateString('zh-CN');
          if (!dailyMap.has(date)) {
            dailyMap.set(date, { scores: [], count: 0 });
          }
          const day = dailyMap.get(date)!;
          day.scores.push(record.score || 0);
          day.count++;
        });

        // Convert to array and calculate averages
        const reports: DailyReport[] = Array.from(dailyMap.entries()).map(([date, data]) => {
          const avgScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
          return {
            date,
            avgScore: Math.round(avgScore * 10) / 10,
            totalInspections: data.count,
            status: avgScore >= 8 ? 'excellent' : avgScore >= 6 ? 'good' : 'warning'
          };
        });

        setDailyReports(reports);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      excellent: { label: "优秀", className: "bg-accent/20 text-accent border-accent/50" },
      good: { label: "良好", className: "bg-primary/20 text-primary border-primary/50" },
      warning: { label: "警告", className: "bg-warning/20 text-warning border-warning/50" },
    };
    const config = variants[status as keyof typeof variants];
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  巡检报表
                </h1>
                <p className="text-muted-foreground mt-1">查看每日巡检统计和趋势分析</p>
              </div>
              <Badge variant="outline" className="h-8 px-4 border-primary/50">
                <BarChart3 className="w-4 h-4 mr-2" />
                数据分析
              </Badge>
            </div>

            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="p-6 bg-gradient-card border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">平均评分</p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-16 mt-1" />
                    ) : (
                      <p className="text-2xl font-bold text-accent mt-1">{stats.avgScore}</p>
                    )}
                  </div>
                  <TrendingUp className="w-8 h-8 text-accent" />
                </div>
              </Card>

              <Card className="p-6 bg-gradient-card border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">总巡检次数</p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-16 mt-1" />
                    ) : (
                      <p className="text-2xl font-bold text-primary mt-1">{stats.totalInspections}</p>
                    )}
                  </div>
                  <Activity className="w-8 h-8 text-primary" />
                </div>
              </Card>

              <Card className="p-6 bg-gradient-card border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">问题服务器</p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-16 mt-1" />
                    ) : (
                      <p className="text-2xl font-bold text-destructive mt-1">{stats.problemServers}</p>
                    )}
                  </div>
                  <TrendingDown className="w-8 h-8 text-destructive" />
                </div>
              </Card>
            </div>

            {/* Daily Reports */}
            <Card className="p-6 bg-gradient-card border-border/50">
              <h2 className="text-xl font-semibold mb-4">每日报表</h2>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : dailyReports.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">暂无巡检数据</p>
              ) : (
                <div className="space-y-3">
                  {dailyReports.map((report) => (
                    <div
                      key={report.date}
                      className="flex items-center justify-between p-4 rounded-lg bg-background/50 hover:bg-background/70 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-sm">
                          <p className="font-medium">{report.date}</p>
                          <p className="text-muted-foreground">巡检 {report.totalInspections} 次</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">平均分</p>
                          <p className="text-lg font-bold">{report.avgScore}</p>
                        </div>
                        {getStatusBadge(report.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Reports;
