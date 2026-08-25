'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  user_id: string;
  full_name: string;
  phone_number: string;
  email?: string;
}

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!token) {
      router.push('/login');
    } else if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, [router]);

  if (!user) return <p style={{ padding: '20px' }}>Checking authentication...</p>;

  return (
    <div style={{ padding: '40px' }}>
      <h1>Welcome to QuickiePay, {user.full_name}! 👋</h1>
      <p>Phone: {user.phone_number}</p>
      <button 
        onClick={() => {
          localStorage.clear();
          router.push('/login');
        }}
        style={{ padding: '8px 16px', marginTop: '20px', cursor: 'pointer' }}
      >
        Logout
      </button>
    </div>
  );
}