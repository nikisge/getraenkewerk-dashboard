import { useState } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';

export default function Auth() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error('Bitte Token eingeben');
      return;
    }

    setLoading(true);
    const { error } = await signIn(token);
    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Erfolgreich eingeloggt');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>CRM Login</CardTitle>
          <CardDescription>
            Bitte mit deinem Token anmelden
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Token</Label>
              <Input
                id="token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
                autoFocus
                placeholder="Dein Token"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Lädt...' : 'Anmelden'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
