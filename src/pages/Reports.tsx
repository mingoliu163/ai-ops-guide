import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

const Reports = () => {
  const mockReports = [
    { date: "2025-01-20", avgScore: 87, totalInspections: 45, status: "excellent" },
    { date: "2025-01-19", avgScore: 82, totalInspections: 38, status: "good" },
    { date: "2025-01-18", avgScore: 75, totalInspections: 42, status: "warning" },
  ];

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
                    <p className="text-2xl font-bold text-accent mt-1">84.5</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-accent" />
                </div>
              </Card>

              <Card className="p-6 bg-gradient-card border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">总巡检次数</p>
                    <p className="text-2xl font-bold text-primary mt-1">125</p>
                  </div>
                  <Activity className="w-8 h-8 text-primary" />
                </div>
              </Card>

              <Card className="p-6 bg-gradient-card border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">问题服务器</p>
                    <p className="text-2xl font-bold text-destructive mt-1">3</p>
                  </div>
                  <TrendingDown className="w-8 h-8 text-destructive" />
                </div>
              </Card>
            </div>

            {/* Daily Reports */}
            <Card className="p-6 bg-gradient-card border-border/50">
              <h2 className="text-xl font-semibold mb-4">每日报表</h2>
              <div className="space-y-3">
                {mockReports.map((report) => (
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
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Reports;
