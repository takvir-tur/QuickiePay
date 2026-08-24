'use client';
import { useState, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const [formData, setFormData] = useState({ full_name: '', phone_number: '', email: '', pin: '', national_id: '' });
  const [message, setMessage] = useState<string>('');
  const router = useRouter();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5001/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage('Registration Successful! Redirecting to login...');
        setTimeout(() => router.push('/login'), 1500);
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (err) {
      setMessage('Failed to connect to backend server!');
    }
  };

  return (
    <div style={{ maxWidth: '350px', margin: '40px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>QuickiePay Register</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <label>Full Name:</label>
          <input type="text" name="full_name" onChange={handleChange} required style={{ width: '100%', padding: '8px', marginTop: '5px' }} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Phone Number:</label>
          <input type="text" name="phone_number" onChange={handleChange} required style={{ width: '100%', padding: '8px', marginTop: '5px' }} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Email (Optional):</label>
          <input type="email" name="email" onChange={handleChange} style={{ width: '100%', padding: '8px', marginTop: '5px' }} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>PIN:</label>
          <input type="password" name="pin" onChange={handleChange} required style={{ width: '100%', padding: '8px', marginTop: '5px' }} />
        </div>
        <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Register</button>
      </form>
      {message && <p style={{ marginTop: '15px' }}>{message}</p>}
      <p style={{ marginTop: '15px' }}>
        Already registered? <Link href="/login" style={{ color: '#007bff' }}>Login here</Link>
      </p>
    </div>
  );
}