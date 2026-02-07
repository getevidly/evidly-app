import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { CheckCircle, Clock, Thermometer, ClipboardCheck, Truck, AlertCircle, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Task {
  id: string;
  time: string;
  label: string;
  link: string;
  completed: boolean;
  overdue: boolean;
  minutesLate?: number;
}

export function KitchenDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [tasks] = useState<Task[]>([
    { id: '1', time: '6:00 AM', label: 'Opening Checklist (14 items)', link: '/checklists', completed: true, overdue: false },
    { id: '2', time: '7:00 AM', label: 'Walk-in Cooler temp check', link: '/temp-logs', completed: true, overdue: false },
    { id: '3', time: '7:00 AM', label: 'Walk-in Freezer temp check', link: '/temp-logs', completed: true, overdue: false },
    { id: '4', time: '7:00 AM', label: 'Prep Cooler temp check', link: '/temp-logs', completed: true, overdue: false },
    { id: '5', time: '10:00 AM', label: 'Hot Hold Cabinet temp check', link: '/temp-logs', completed: true, overdue: false },
    { id: '6', time: '10:00 AM', label: 'Salad Bar temp check', link: '/temp-logs', completed: false, overdue: false },
    { id: '7', time: '11:00 AM', label: 'Receiving check (delivery expected)', link: '/temp-logs?tab=receiving', completed: false, overdue: false },
    { id: '8', time: '2:00 PM', label: 'All equipment temp check', link: '/temp-logs', completed: false, overdue: false },
    { id: '9', time: '6:00 PM', label: 'Closing Checklist (10 items)', link: '/checklists', completed: false, overdue: false },
  ]);

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const progressPercentage = Math.round((completedCount / totalCount) * 100);

  const overdueItems = tasks.filter(t => t.overdue && !t.completed);

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = profile?.full_name?.split(' ')[0] || 'User';

  return (
    <Layout title="My Dashboard">
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold mb-1">{greeting}, {firstName}!</h1>
          <p className="text-blue-100">Today is {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <p className="text-blue-100 text-sm mt-1">Shift: 6:00 AM - 2:00 PM</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">My Tasks Today</h2>
            <div className="text-sm font-medium text-gray-600">
              {completedCount} of {totalCount} complete ({progressPercentage}%)
            </div>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
            <div
              className="h-3 rounded-full bg-blue-600 transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => navigate(task.link)}
                className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  task.completed
                    ? 'bg-gray-50 border-gray-200'
                    : task.overdue
                    ? 'bg-red-50 border-red-300 hover:bg-red-100'
                    : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                <div className="flex items-center space-x-4 flex-1">
                  <div className={`flex-shrink-0 ${task.completed ? 'text-green-600' : task.overdue ? 'text-red-600' : 'text-gray-400'}`}>
                    {task.completed ? (
                      <CheckCircle className="h-6 w-6" />
                    ) : (
                      <div className="h-6 w-6 rounded-full border-2 border-current" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className={`font-medium ${task.completed ? 'text-gray-500 line-through' : task.overdue ? 'text-red-900' : 'text-gray-900'}`}>
                      {task.time} — {task.label}
                    </div>
                    {task.overdue && !task.completed && (
                      <div className="text-sm text-red-600 font-semibold mt-1">
                        OVERDUE — {task.minutesLate || 120} minutes late
                      </div>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            ))}
          </div>
        </div>

        {overdueItems.length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-600 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-red-900 mb-3">Missed / Overdue</h3>
                <div className="space-y-2">
                  {overdueItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between bg-white rounded-lg p-3">
                      <div>
                        <div className="font-medium text-gray-900">{item.label}</div>
                        <div className="text-sm text-gray-600">Scheduled: {item.time} • {item.minutesLate || 120} minutes late</div>
                      </div>
                      <button
                        onClick={() => navigate(item.link)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
                      >
                        Do It Now
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => navigate('/temp-logs')}
            className="bg-white rounded-lg shadow-sm border-2 border-gray-200 p-8 hover:border-blue-500 hover:shadow-md transition-all text-center group"
            style={{ minHeight: '120px' }}
          >
            <Thermometer className="h-12 w-12 text-blue-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <div className="text-lg font-bold text-gray-900">Log Temperature</div>
          </button>

          <button
            onClick={() => navigate('/checklists')}
            className="bg-white rounded-lg shadow-sm border-2 border-gray-200 p-8 hover:border-blue-500 hover:shadow-md transition-all text-center group"
            style={{ minHeight: '120px' }}
          >
            <ClipboardCheck className="h-12 w-12 text-blue-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <div className="text-lg font-bold text-gray-900">Start Checklist</div>
          </button>

          <button
            onClick={() => navigate('/temp-logs?tab=receiving')}
            className="bg-white rounded-lg shadow-sm border-2 border-gray-200 p-8 hover:border-blue-500 hover:shadow-md transition-all text-center group"
            style={{ minHeight: '120px' }}
          >
            <Truck className="h-12 w-12 text-blue-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <div className="text-lg font-bold text-gray-900">Log Receiving</div>
          </button>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-6">
          <h3 className="text-lg font-bold text-yellow-900 mb-3 flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Reminders
          </h3>
          <ul className="space-y-2 text-sm text-yellow-900">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Your Food Handler Certification expires in 30 days</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>New HACCP plan posted — review required by Friday</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Team meeting at 3 PM today</span>
            </li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
