import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { rep } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (rep && rep.role !== 'admin') {
      navigate('/');
    }
  }, [rep, navigate]);

  if (!rep || rep.role !== 'admin') {
    return null;
  }

  return <>{children}</>;
}
