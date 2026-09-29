'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    
    if (!token) {
      router.replace('/');
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.isAdmin === true || payload.role === 'ADMIN' || payload.account_type === 'ADMIN') {
        setIsAuthorized(true);
      } else {
        router.replace('/');
      }
    } catch (e) {
      router.replace('/');
    }
  }, [router]);

  if (!isAuthorized) {
    return null; 
  }

  return <>{children}</>;
}
