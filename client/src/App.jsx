import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './styles/toast.css';
import { ConfirmDialogProvider } from '@omit/react-confirm-dialog';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ConfigurationProvider } from './context/ConfigurationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Quiz from './pages/Quiz';
import History from './pages/History';
import QuizResult from './pages/QuizResult';
import CoachDashboard from './pages/coach/Dashboard';
import Students from './pages/coach/Students';
import StudentRoster from './pages/coach/StudentRoster';
import Assignments from './pages/coach/Assignments';
import AssignmentStatus from './pages/coach/AssignmentStatus';
import StudentProfile from './pages/coach/StudentProfile';
import PerformanceManagement from './pages/coach/PerformanceManagement';
import StudentPersonalProfile from './pages/StudentProfile';
import UserProfile from './pages/UserProfile';
import DashboardRedirect from './components/DashboardRedirect';
import CoachEvents from './pages/coach/Events';
import EventEdit from './pages/coach/EventEdit';
import EventRegistrations from './pages/coach/EventRegistrations';
import EventRegistration from './pages/EventRegistration';
import EventRegistrationDetail from './pages/EventRegistrationDetail';
import JoinRelayTeam from './pages/JoinRelayTeam';
import ITEvents from './pages/it/Events';
import ConfigurationManagement from './pages/ConfigurationManagement';

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ConfirmDialogProvider>
          <AuthProvider>
            <ConfigurationProvider>
              <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<DashboardRedirect />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/quiz/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Quiz />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <Layout>
                    <History />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/results/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <QuizResult />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/coach/dashboard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CoachDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/coach/students"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Students />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/coach/roster"
              element={
                <ProtectedRoute>
                  <Layout>
                    <StudentRoster />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/roster"
              element={
                <ProtectedRoute>
                  <Layout>
                    <StudentRoster />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/coach/assignments"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Assignments />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/coach/assignments/:assignmentId/status"
              element={
                <ProtectedRoute>
                  <Layout>
                    <AssignmentStatus />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/coach/students/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <StudentProfile />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/coach/performance-management"
              element={
                <ProtectedRoute>
                  <Layout>
                    <PerformanceManagement />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/profile"
              element={
                <ProtectedRoute>
                  <Layout>
                    <StudentPersonalProfile />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Layout>
                    <UserProfile />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
               path="/coach"
               element={
                 <ProtectedRoute>
                   <Layout>
                     <CoachDashboard />
                   </Layout>
                 </ProtectedRoute>
               }
             />
            <Route
              path="/coach/events"
              element={
                <ProtectedRoute>
                  <Layout>
                    <CoachEvents />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/coach/events/new"
              element={
                <ProtectedRoute>
                  <Layout>
                    <EventEdit />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/coach/events/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <EventEdit />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/coach/events/:id/registrations"
              element={
                <ProtectedRoute>
                  <Layout>
                    <EventRegistrations />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/events/register"
              element={
                <ProtectedRoute>
                  <Layout>
                    <EventRegistration />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/events/register/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <EventRegistrationDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/join-relay/:inviteCode"
              element={
                <ProtectedRoute>
                  <Layout>
                    <JoinRelayTeam />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/it/events"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ITEvents />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/configurations"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ConfigurationManagement />
                  </Layout>
                </ProtectedRoute>
              }
            />
            </Routes>
            </Router>
            <ToastContainer
              position="top-right"
              autoClose={4000}
              hideProgressBar={false}
              newestOnTop={true}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="colored"
              toastClassName="text-sm"
            />
            </ConfigurationProvider>
          </AuthProvider>
        </ConfirmDialogProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
