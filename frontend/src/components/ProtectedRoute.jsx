import { Navigate } from 'react-router-dom';

function ProtectedRoute({ allowedRole, children }) {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && role !== allowedRole) {
    return <Navigate to={role === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard'} replace />;
  }

  return children;
}

export default ProtectedRoute;
