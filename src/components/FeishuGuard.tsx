import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";

interface FeishuGuardProps {
  children: React.ReactNode;
}

export const FeishuGuard = ({ children }: FeishuGuardProps) => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isFeishu, setIsFeishu] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if in Feishu environment
    const userAgent = navigator.userAgent.toLowerCase();
    const isFeishuClient = userAgent.includes('lark') || userAgent.includes('feishu');
    const isDevelopment = import.meta.env.DEV;
    
    setIsFeishu(isDevelopment || isFeishuClient);

    // Check authentication
    const token = localStorage.getItem('feishu_token');
    const profile = localStorage.getItem('feishu_profile');
    
    if (token && profile) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
      navigate('/auth');
    }
  }, [navigate]);

  if (isFeishu === null || isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
};
