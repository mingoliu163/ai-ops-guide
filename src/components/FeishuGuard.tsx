import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface FeishuGuardProps {
  children: React.ReactNode;
}

export const FeishuGuard = ({ children }: FeishuGuardProps) => {
  const [isFeishu, setIsFeishu] = useState<boolean | null>(null);

  useEffect(() => {
    // 检测是否在飞书环境中
    const userAgent = navigator.userAgent.toLowerCase();
    const isFeishuClient = userAgent.includes('lark') || userAgent.includes('feishu');
    
    // 开发环境下允许访问，生产环境严格检查
    const isDevelopment = import.meta.env.DEV;
    setIsFeishu(isDevelopment || isFeishuClient);
  }, []);

  if (isFeishu === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!isFeishu) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md p-8 bg-gradient-card border-border/50 text-center">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">访问受限</h1>
          <p className="text-muted-foreground">
            此应用仅支持在飞书客户端中访问。请在飞书PC端或移动端中打开此应用。
          </p>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
