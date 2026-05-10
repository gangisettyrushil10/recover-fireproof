'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardHeader } from '@fireproof/ui';
import { apiClient, setAuthToken, ApiError } from '@/lib/api';

const SEEDED_USERS = [
  { email: 'lpark@beacon.example', label: 'Office Manager — L. Park (Beacon)' },
  { email: 'mdisalvo@beacon.example', label: 'Lead Field Tech — M. DiSalvo (Beacon)' },
  { email: 'bryan@steeplechase.example', label: 'Property Manager — Bryan (Steeplechase)' },
  { email: 'counsel@worthpatel.example', label: 'Counsel — Worth, Patel' },
];

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function pick(email: string): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const r = await apiClient.auth.devLogin(email);
      setAuthToken(r.token);
      router.replace('/');
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Login failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-lg font-semibold">Sign in to Fireproof</h1>
          <p className="text-sm text-muted-foreground">
            Demo accounts seeded for Cedar Heights. Pick a role to continue.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {SEEDED_USERS.map((u) => (
              <Button
                key={u.email}
                variant="secondary"
                disabled={busy}
                onClick={() => pick(u.email)}
                className="justify-start text-left"
              >
                {u.label}
              </Button>
            ))}
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>
    </main>
  );
}
