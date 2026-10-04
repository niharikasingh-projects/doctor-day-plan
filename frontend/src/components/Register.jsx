import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register, registerDoctor, verifyLicenseNumber } from '../api/authService';

function Register() {
  const navigate = useNavigate();
  const [role, setRole] = useState('patient');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    phone: '',
    name: '',
    dob: '',
    gender: 'Female',
    specialization: '',
    licenseNumber: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Tracks the licensing-authority check for the doctor tab: 'idle' | 'checking' | 'valid' | 'invalid'.
  const [licenseCheck, setLicenseCheck] = useState({ status: 'idle', message: '', checkedValue: '' });

  // Switching Patient/Doctor starts the form fresh — no leaked field values
  // (e.g. a license number typed on the doctor tab) and no stale error messages.
  const handleRoleChange = (nextRole) => {
    if (nextRole === role) return;
    setRole(nextRole);
    setFormData({
      email: '',
      password: '',
      phone: '',
      name: '',
      dob: '',
      gender: 'Female',
      specialization: '',
      licenseNumber: '',
    });
    setError('');
    setLicenseCheck({ status: 'idle', message: '', checkedValue: '' });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Any edit to the license number invalidates the previous verification.
    if (name === 'licenseNumber') {
      setLicenseCheck({ status: 'idle', message: '', checkedValue: '' });
    }
  };

  const handleVerifyLicense = async () => {
    const candidate = formData.licenseNumber.trim();
    if (!/^(?=.{5,10}$)[A-Za-z]{2,5}-[0-9]{2,7}$/.test(candidate)) {
      setLicenseCheck({
        status: 'invalid',
        message: 'License number must match the format MCI-12345 (letters, "-", digits; max 10 characters) before it can be verified.',
        checkedValue: candidate,
      });
      return;
    }

    setLicenseCheck({ status: 'checking', message: '', checkedValue: candidate });
    try {
      const result = await verifyLicenseNumber(candidate);
      setLicenseCheck({
        status: result.valid ? 'valid' : 'invalid',
        message: result.message,
        checkedValue: candidate,
      });
    } catch (err) {
      setLicenseCheck({
        status: 'invalid',
        message: err.response?.data?.error || 'Unable to verify the license number. Please try again.',
        checkedValue: candidate,
      });
    }
  };

  const isLicenseVerified =
    licenseCheck.status === 'valid' && licenseCheck.checkedValue === formData.licenseNumber.trim();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (role === 'doctor' && !/^(?=.{5,10}$)[A-Za-z]{2,5}-[0-9]{2,7}$/.test(formData.licenseNumber.trim())) {
      setError('Medical license number must match the format MCI-12345 (letters, "-", digits; max 10 characters).');
      return;
    }
    if (role === 'doctor' && !isLicenseVerified) {
      setError('Please verify the medical license number with the licensing authority before registering.');
      return;
    }
    if (!/^(?=.*[A-Za-z])(?=.*[0-9]).{8,}$/.test(formData.password)) {
      setError('Password must be at least 8 characters and contain a letter and a number.');
      return;
    }
    if (formData.phone && !/^\+?[0-9]{7,15}$/.test(formData.phone.trim())) {
      setError('Please enter a valid phone number (7-15 digits, optional leading +).');
      return;
    }

    setIsSubmitting(true);

    try {
      if (role === 'doctor') {
        await registerDoctor({
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          doctorProfile: {
            name: formData.name,
            specialization: formData.specialization,
            licenseNumber: formData.licenseNumber.trim(),
          },
        });
      } else {
        await register({
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          patientProfile: {
            name: formData.name,
            dob: formData.dob,
            gender: formData.gender,
          },
        });
      }
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to register. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="surface w-full max-w-md p-6 sm:p-8 md:p-10">
        <Link to="/" className="brand-mark text-xl font-bold mb-10 no-underline">
          DoctorDayPlan
        </Link>
        <p className="eyebrow mb-2">Get started</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">
          {role === 'doctor' ? 'Doctor Registration' : 'Patient Registration'}
        </h1>

        <div className="flex rounded-lg border border-gray-300 overflow-hidden mb-6">
          <button
            type="button"
            onClick={() => handleRoleChange('patient')}
            className={`flex-1 py-2 text-sm font-medium ${
              role === 'patient' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            I&apos;m a Patient
          </button>
          <button
            type="button"
            onClick={() => handleRoleChange('doctor')}
            className={`flex-1 py-2 text-sm font-medium ${
              role === 'doctor' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            I&apos;m a Doctor
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="e.g. you@example.com"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="Min 8 chars, with a letter and a number"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone {role === 'doctor' && <span className="text-gray-400">(optional)</span>}
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required={role === 'patient'}
              placeholder="e.g. +919876543210"
              value={formData.phone}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="e.g. Priya Sharma"
              value={formData.name}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {role === 'doctor' ? (
            <>
              <div>
                <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Medical License Number <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id="licenseNumber"
                    name="licenseNumber"
                    type="text"
                    required
                    placeholder="e.g. MCI-12345"
                    aria-describedby="licenseNumberHint"
                    value={formData.licenseNumber}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyLicense}
                    disabled={licenseCheck.status === 'checking' || !formData.licenseNumber.trim()}
                    className="shrink-0 rounded-lg border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {licenseCheck.status === 'checking' ? 'Verifying...' : 'Verify License'}
                  </button>
                </div>
                <p id="licenseNumberHint" className="text-xs text-gray-400 mt-1">
                  Format: MCI-12345 (letters, "-", digits; max 10 characters), then click Verify License.
                </p>
                {licenseCheck.status === 'valid' && licenseCheck.checkedValue === formData.licenseNumber.trim() && (
                  <p className="text-xs text-green-700 mt-1">✓ {licenseCheck.message}</p>
                )}
                {licenseCheck.status === 'invalid' && licenseCheck.checkedValue === formData.licenseNumber.trim() && (
                  <p className="text-xs text-red-600 mt-1">✗ {licenseCheck.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="specialization" className="block text-sm font-medium text-gray-700 mb-1">
                  Specialization
                </label>
                <input
                  id="specialization"
                  name="specialization"
                  type="text"
                  placeholder="e.g. Cardiology"
                  value={formData.specialization}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="dob" className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth
                </label>
                <input
                  id="dob"
                  name="dob"
                  type="date"
                  required
                  max={new Date().toISOString().slice(0, 10)}
                  value={formData.dob}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting || (role === 'doctor' && !isLicenseVerified)}
            className="primary-action w-full disabled:opacity-50"
          >
            {isSubmitting ? 'Registering...' : 'Register'}
          </button>
        </form>
        <p className="text-sm text-gray-600 mt-4 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 font-medium hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
