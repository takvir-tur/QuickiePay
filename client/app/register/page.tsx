'use client';
import { useTheme } from "next-themes";
import { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, Sun, Moon } from 'lucide-react';

export default function RegisterPage() {
  const [formData, setFormData] = useState({ 
    full_name: '', phone_number: '', email: '', pin: '', confirm_pin: '', 
    national_id: '', account_type: 'PERSONAL', 
    business_name: '', trade_license: '', organization_name: '', service_name: 'ELECTRICITY'
  }); //[cite: 4]
  
  const [message, setMessage] = useState<string>('');
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  // Updated to support both inputs and selects cleanly
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (formData.pin !== formData.confirm_pin) { //[cite: 4]
      setMessage("Error: PINs do not match!");
      return;
    }
    
    try {
      const res = await fetch('http://localhost:5001/api/auth/register', { //[cite: 4]
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage('Registration Successful! Redirecting to login...');
        setTimeout(() => router.push('/login'), 1500); //[cite: 4]
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (err) {
      setMessage('Failed to connect to backend server!');
    }
  };

  const inputClass = "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white";
  const labelClass = "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300";

  return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-5 transition-colors dark:bg-gray-900">
        
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
        <div className="w-full max-w-[500px] rounded-3xl border border-gray-200 bg-white p-8 shadow-sm transition-all dark:border-gray-800 dark:bg-gray-950">
          
          <div className="mb-8 flex flex-col items-center justify-center gap-3">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white">
              <Zap className="size-7 fill-current" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
              Create an account
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Full Name</label>
                <input type="text" name="full_name" onChange={handleChange} required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Phone Number</label>
                <input type="text" name="phone_number" onChange={handleChange} required className={inputClass} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Email (Optional)</label>
              <input type="email" name="email" onChange={handleChange} className={inputClass} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>PIN</label>
                <input type="password" name="pin" onChange={handleChange} required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Confirm PIN</label>
                <input type="password" name="confirm_pin" onChange={handleChange} required className={inputClass} />
              </div>
            </div>

            <div>
              <label className={labelClass}>National ID</label>
              <input type="text" name="national_id" onChange={handleChange} className={inputClass} />
            </div>

            {/* Account Type Dropdown */}
            <div className="mt-2 rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
              <label className={labelClass}>Account Type</label>
              <select name="account_type" onChange={handleChange} value={formData.account_type} className={inputClass}>
                <option value="PERSONAL">Personal</option>
                <option value="AGENT">Agent</option>
                <option value="BUSINESS">Merchant / Business</option>
                <option value="BILLER">Biller</option>
              </select>

              {/* AGENT OR BUSINESS CONDITIONAL */}
              {(formData.account_type === 'AGENT' || formData.account_type === 'BUSINESS') && (
                <div className="mt-4">
                  <label className={labelClass}>Business Name</label>
                  <input type="text" name="business_name" onChange={handleChange} required className={inputClass} />
                </div>
              )}

              {/* BUSINESS-ONLY CONDITIONAL */}
              {formData.account_type === 'BUSINESS' && ( //[cite: 4]
                <div className="mt-4">
                  <label className={labelClass}>Trade License</label>
                  <input type="text" name="trade_license" onChange={handleChange} className={inputClass} />
                </div>
              )}

              {/* BILLER-ONLY CONDITIONAL */}
              {formData.account_type === 'BILLER' && ( //[cite: 4]
                <div className="mt-4 flex flex-col gap-4">
                  <div>
                    <label className={labelClass}>Organization Name</label>
                    <input type="text" name="organization_name" onChange={handleChange} required className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Service Type</label>
                    <select name="service_name" onChange={handleChange} className={inputClass}>
                      <option value="ELECTRICITY">Electricity</option>
                      <option value="GAS">Gas</option>
                      <option value="WATER">Water</option>
                      <option value="INTERNET">Internet</option>
                      <option value="MOBILE">Mobile</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>
              )}
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
              Register Account
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Already registered?{' '}
            <Link href="/login" className="font-semibold text-blue-600 hover:underline dark:text-blue-500">
              Login here
            </Link>
          </p>
        </div>
      </div>
  );
}