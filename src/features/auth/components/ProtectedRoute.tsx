import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { Skeleton } from '@/shared/components/ui/skeleton';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { rep, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !rep) {
      navigate('/auth');
    }
  }, [rep, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 w-full max-w-4xl p-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!rep) {
    return null;
  }

  return <>{children}</>;
}
