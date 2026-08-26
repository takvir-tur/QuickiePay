'use client';
import { useTheme } from "next-themes";
import { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, Sun, Moon } from 'lucide-react';

export default function LoginPage() {
  const [formData, setFormData] = useState({ phone_number: '', pin: '' });
  const [message, setMessage] = useState<string>('');
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value }); //[cite: 3]
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage('Connecting to backend...');

    try {
      const res = await fetch('http://localhost:5001/api/auth/login', { //[cite: 3]
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        //session storage ensuring closing and reopening browser requires login again
        sessionStorage.setItem('token', data.token);
        sessionStorage.setItem('userId', data.user.user_id);
        sessionStorage.setItem('user', JSON.stringify(data.user));
        
        router.push('/'); //[cite: 3]
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (err) {
      setMessage('Failed to connect to backend server!');
    }
  };

  return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-5 transition-colors dark:bg-gray-900">
        
        {/* Theme Toggle Top Right */}
        <div className="absolute right-6 top-6">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="rounded-xl p-2.5 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
            aria-label="Toggle theme"
          >
            {mounted ? (
              theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />
            ) : (
              <div className="size-5" /> 
            )}
          </button>
        </div>

        {/* Main Card */}
        <div className="w-full max-w-[400px] rounded-3xl border border-gray-200 bg-white p-8 shadow-sm transition-all dark:border-gray-800 dark:bg-gray-950">
          
          {/* Logo header */}
          <div className="mb-8 flex flex-col items-center justify-center gap-3">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white">
              <Zap className="size-7 fill-current" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
              quickie<span className="text-blue-600">pay</span>
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Welcome back! Please enter your details.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number</label>
              <input 
                type="text" 
                name="phone_number" 
                value={formData.phone_number} 
                onChange={handleChange} 
                required 
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              />
            </div>
            
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">PIN</label>
              <input 
                type="password" 
                name="pin" 
                value={formData.pin} 
                onChange={handleChange} 
                required 
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              />
            </div>

            {message && (
              <div className="mt-2 rounded-xl bg-blue-50 p-3 text-center text-sm text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                {message}
              </div>
            )}

            <button 
              type="submit" 
              className="mt-4 w-full rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950"
            >
              Log in
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Don't have an account?{' '}
            <Link href="/register" className="font-semibold text-blue-600 hover:underline dark:text-blue-500">
              Register here
            </Link>
          </p>
        </div>
      </div>
  );
}