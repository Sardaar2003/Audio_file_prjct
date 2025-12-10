import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { signup } from '../api';
import { useAuth } from '../context/AuthContext';

interface SignupForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const SignupPage = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupForm>();
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (values: SignupForm) => {
    try {
      setLoading(true);
      setServerError('');
      const response = await signup(values);
      setAuth({ user: response.data.user, token: response.data.token });
      navigate('/');
    } catch (error: any) {
      setServerError(error?.response?.data?.message || 'Unable to sign up. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: 420, maxWidth: '100%' }}>
        <h2>Create an Account</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
          Every user starts with the <strong>User</strong> role. Admins can promote you later.
        </p>
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label>Name</label>
            <input className="input" {...register('name', { required: true })} placeholder="Jane Doe" />
            {errors.name && <small style={{ color: '#f87171' }}>Name is required.</small>}
          </div>
          <div>
            <label>Email</label>
            <input className="input" type="email" {...register('email', { required: true })} placeholder="you@company.com" />
            {errors.email && <small style={{ color: '#f87171' }}>Email is required.</small>}
          </div>
          <div>
            <label>Password</label>
            <input className="input" type="password" {...register('password', { required: true, minLength: 8 })} />
            {errors.password && <small style={{ color: '#f87171' }}>Min 8 characters required.</small>}
          </div>
          <div>
            <label>Confirm Password</label>
            <input
              className="input"
              type="password"
              {...register('confirmPassword', {
                required: true,
                validate: (value) => value === watch('password'),
              })}
            />
            {errors.confirmPassword && <small style={{ color: '#f87171' }}>Passwords must match.</small>}
          </div>
          {serverError && <div style={{ color: '#f87171' }}>{serverError}</div>}
          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>
        <p style={{ marginTop: '1rem', fontSize: '0.95rem' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent)' }}>
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;


