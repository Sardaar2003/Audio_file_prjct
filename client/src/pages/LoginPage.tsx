import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../api';
import { useAuth } from '../context/AuthContext';

interface LoginForm {
  email: string;
  password: string;
}

const LoginPage = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (values: LoginForm) => {
    try {
      setLoading(true);
      setServerError('');
      const response = await login(values);
      setAuth({ user: response.data.user, token: response.data.token });
      navigate('/');
    } catch (error: any) {
      setServerError(error?.response?.data?.message || 'Unable to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: 400, maxWidth: '100%' }}>
        <h2>Welcome Back</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>Sign in to continue to the QA control room.</p>
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label>Email</label>
            <input className="input" type="email" {...register('email', { required: true })} placeholder="you@company.com" />
            {errors.email && <small style={{ color: '#f87171' }}>Email is required.</small>}
          </div>
          <div>
            <label>Password</label>
            <input className="input" type="password" {...register('password', { required: true })} placeholder="••••••••" />
            {errors.password && <small style={{ color: '#f87171' }}>Password is required.</small>}
          </div>
          {serverError && <div style={{ color: '#f87171' }}>{serverError}</div>}
          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Authenticating...' : 'Login'}
          </button>
        </form>
        <p style={{ marginTop: '1rem', fontSize: '0.95rem' }}>
          Need an account?{' '}
          <Link to="/signup" style={{ color: 'var(--accent)' }}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;


