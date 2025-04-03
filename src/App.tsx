import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Interfaces
interface Lead {
  id: string;
  timestamp: string;
  loanType: string;
  profile: string;
  monthlyIncome: number;
  loanAmount: number;
  firstName: string;
  lastName: string;
  mobileNumber: string;
  emailId: string;
  gender: 'Male' | 'Female' | 'Other';
  dateOfBirth: string;
  panCard: string;
  pincode: string;
  consent: boolean;
  source: string;
  status: 'New' | 'Processing' | 'Approved' | 'Rejected' | 'Docs Pending';
  createdBy: string; // partnerId or 'admin'
  documents?: { name: string; url: string }[];
}

interface Partner {
  id: string;
  name: string;
  username: string;
  password?: string; // Only used during creation/reset, not stored directly in state usually
}

interface User {
  id: string;
  name: string;
  username: string;
  role: 'Admin' | 'Partner';
}

interface FormDefinition {
  id: string;
  partnerId: string;
  name: string;
  fields: string[]; // Names of fields from Lead interface
  shareableLink: string;
}

type View = 'login' | 'register' | 'dashboard' | 'leads' | 'addLead' | 'editLead' | 'application' | 'report' | 'settings' | 'partners' | 'addPartner' | 'editPartner' | 'formBuilder' | 'viewForm';

// Mock Data
const MOCK_ADMIN_USER: User = { id: 'admin001', name: 'Admin User', username: 'admin', role: 'Admin' };
const MOCK_PARTNERS: Partner[] = [
  { id: 'partner001', name: 'Partner One', username: 'partner1' },
  { id: 'partner002', name: 'Partner Two', username: 'partner2' },
];
const MOCK_LEADS: Lead[] = [
  { id: 'lead001', timestamp: new Date(Date.now() - 86400000 * 5).toISOString(), loanType: 'Personal', profile: 'Salaried', monthlyIncome: 50000, loanAmount: 100000, firstName: 'John', lastName: 'Doe', mobileNumber: '9876543210', emailId: 'john.doe@email.com', gender: 'Male', dateOfBirth: '1990-05-15', panCard: 'ABCDE1234F', pincode: '110001', consent: true, source: 'Partner One', status: 'New', createdBy: 'partner001', documents: [] },
  { id: 'lead002', timestamp: new Date(Date.now() - 86400000 * 3).toISOString(), loanType: 'Home', profile: 'Self-Employed', monthlyIncome: 120000, loanAmount: 5000000, firstName: 'Jane', lastName: 'Smith', mobileNumber: '9876543211', emailId: 'jane.smith@email.com', gender: 'Female', dateOfBirth: '1985-11-20', panCard: 'FGHIJ5678K', pincode: '560001', consent: true, source: 'Admin', status: 'Processing', createdBy: 'admin001', documents: [] },
  { id: 'lead003', timestamp: new Date(Date.now() - 86400000 * 1).toISOString(), loanType: 'Car', profile: 'Salaried', monthlyIncome: 75000, loanAmount: 500000, firstName: 'Peter', lastName: 'Jones', mobileNumber: '9876543212', emailId: 'peter.jones@email.com', gender: 'Male', dateOfBirth: '1995-02-25', panCard: 'LMNOP9012L', pincode: '400001', consent: true, source: 'Partner Two', status: 'Approved', createdBy: 'partner002', documents: [{name: 'OfferLetter.pdf', url: '#'}] },
  { id: 'lead004', timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), loanType: 'Personal', profile: 'Self-Employed', monthlyIncome: 60000, loanAmount: 150000, firstName: 'Mary', lastName: 'Brown', mobileNumber: '9876543213', emailId: 'mary.brown@email.com', gender: 'Female', dateOfBirth: '1992-08-10', panCard: 'QRSTU3456M', pincode: '600001', consent: true, source: 'Partner One', status: 'Rejected', createdBy: 'partner001', documents: [] },
   { id: 'lead005', timestamp: new Date().toISOString(), loanType: 'Home', profile: 'Salaried', monthlyIncome: 90000, loanAmount: 3000000, firstName: 'David', lastName: 'Wilson', mobileNumber: '9876543214', emailId: 'david.wilson@email.com', gender: 'Male', dateOfBirth: '1988-12-01', panCard: 'VWXYZ7890N', pincode: '700001', consent: true, source: 'Admin', status: 'Docs Pending', createdBy: 'admin001', documents: [] },
];

// Dummy Passwords (In real app, use hashing and secure storage)
const MOCK_PASSWORDS: { [username: string]: string } = {
  admin: 'adminpass',
  partner1: 'partnerpass1',
  partner2: 'partnerpass2',
};

const LeadManagementApp: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('login');
  const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
  const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS);
  const [partners, setPartners] = useState<Partner[]>(MOCK_PARTNERS);
  const [forms, setForms] = useState<FormDefinition[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Form States
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [addPartnerName, setAddPartnerName] = useState('');
  const [addPartnerUsername, setAddPartnerUsername] = useState('');
  const [addPartnerPassword, setAddPartnerPassword] = useState('');
  const [leadFormData, setLeadFormData] = useState<Partial<Lead>>({});
  const [formBuilderName, setFormBuilderName] = useState('');
  const [formBuilderFields, setFormBuilderFields] = useState<string[]>([]);
  const [reportMonth, setReportMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM

  // --- Effects ---
  useEffect(() => {
    // Clear notification after some time
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // --- Authentication ---
  const handleLogin = () => {
    if (loginUsername === MOCK_ADMIN_USER.username && loginPassword === MOCK_PASSWORDS[MOCK_ADMIN_USER.username]) {
      setLoggedInUser(MOCK_ADMIN_USER);
      setCurrentView('dashboard');
      setNotification({ type: 'success', message: 'Admin login successful!' });
    } else {
      const partner = partners.find(p => p.username === loginUsername);
      if (partner && loginPassword === MOCK_PASSWORDS[partner.username]) {
        setLoggedInUser({ ...partner, role: 'Partner' });
        setCurrentView('dashboard');
        setNotification({ type: 'success', message: 'Partner login successful!' });
      } else {
        setNotification({ type: 'error', message: 'Invalid username or password.' });
      }
    }
    setLoginUsername('');
    setLoginPassword('');
  };

  const handleRegister = () => {
    if (!registerName || !registerUsername || !registerPassword) {
      setNotification({ type: 'error', message: 'All registration fields are required.' });
      return;
    }
    if (partners.some(p => p.username === registerUsername) || registerUsername === MOCK_ADMIN_USER.username) {
      setNotification({ type: 'error', message: 'Username already exists.' });
      return;
    }
    const newPartner: Partner = {
      id: `partner${Date.now()}`,
      name: registerName,
      username: registerUsername,
    };
    MOCK_PASSWORDS[registerUsername] = registerPassword; // Add password to mock store
    setPartners(prev => [...prev, newPartner]);
    setNotification({ type: 'success', message: 'Registration successful! Please login.' });
    setCurrentView('login');
    setRegisterName('');
    setRegisterUsername('');
    setRegisterPassword('');
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    setCurrentView('login');
    setNotification({ type: 'success', message: 'Logged out successfully.' });
  };

  // --- Navigation ---
  const navigateTo = (view: View) => {
    setCurrentView(view);
    // Reset specific states when navigating away
    setSelectedLeadId(null);
    setSelectedPartnerId(null);
    setLeadFormData({});
    setFormBuilderName('');
    setFormBuilderFields([]);
  };

  // --- Lead Management ---
   const handleAddLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggedInUser) return;

    const newLead: Lead = {
      id: `lead${Date.now()}`,
      timestamp: new Date().toISOString(),
      loanType: leadFormData.loanType || '',
      profile: leadFormData.profile || '',
      monthlyIncome: Number(leadFormData.monthlyIncome) || 0,
      loanAmount: Number(leadFormData.loanAmount) || 0,
      firstName: leadFormData.firstName || '',
      lastName: leadFormData.lastName || '',
      mobileNumber: leadFormData.mobileNumber || '',
      emailId: leadFormData.emailId || '',
      gender: leadFormData.gender || 'Other',
      dateOfBirth: leadFormData.dateOfBirth || '',
      panCard: leadFormData.panCard || '',
      pincode: leadFormData.pincode || '',
      consent: Boolean(leadFormData.consent),
      source: loggedInUser.role === 'Admin' ? 'Admin' : loggedInUser.name,
      status: 'New',
      createdBy: loggedInUser.id,
      documents: [],
    };
    setLeads(prev => [newLead, ...prev]);
    setNotification({ type: 'success', message: 'Lead added successfully!' });
    navigateTo('leads');
  };

  const handleUpdateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId || !loggedInUser) return;

    const leadToUpdate = leads.find(l => l.id === selectedLeadId);
    if (!leadToUpdate) {
        setNotification({ type: 'error', message: 'Lead not found.' });
        return;
    }

    // Authorization check
    if (loggedInUser.role !== 'Admin' && leadToUpdate.createdBy !== loggedInUser.id) {
        setNotification({ type: 'error', message: 'You are not authorized to edit this lead.' });
        return;
    }

    setLeads(prev => prev.map(lead =>
      lead.id === selectedLeadId ? { ...lead, ...leadFormData, monthlyIncome: Number(leadFormData.monthlyIncome), loanAmount: Number(leadFormData.loanAmount), consent: Boolean(leadFormData.consent) } : lead
    ));
    setNotification({ type: 'success', message: 'Lead updated successfully!' });
    navigateTo('leads');
  };


  const handleLeadFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setLeadFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const startEditLead = (leadId: string) => {
      const lead = leads.find(l => l.id === leadId);
      if (lead) {
          // Authorization check
          if (loggedInUser?.role !== 'Admin' && lead.createdBy !== loggedInUser?.id) {
              setNotification({ type: 'error', message: 'You can only edit leads you created.' });
              return;
          }
          setSelectedLeadId(leadId);
          setLeadFormData(lead);
          navigateTo('editLead');
      }
  };


  // --- Partner Management ---
  const handleAddPartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (loggedInUser?.role !== 'Admin') return;

    if (!addPartnerName || !addPartnerUsername || !addPartnerPassword) {
        setNotification({ type: 'error', message: 'All partner fields are required.' });
        return;
    }
    if (partners.some(p => p.username === addPartnerUsername) || addPartnerUsername === MOCK_ADMIN_USER.username) {
       setNotification({ type: 'error', message: 'Username already exists.' });
       return;
    }

    const newPartner: Partner = {
      id: `partner${Date.now()}`,
      name: addPartnerName,
      username: addPartnerUsername,
    };
    MOCK_PASSWORDS[addPartnerUsername] = addPartnerPassword; // Add password
    setPartners(prev => [...prev, newPartner]);
    setNotification({ type: 'success', message: 'Partner added successfully!' });
    navigateTo('partners');
    setAddPartnerName('');
    setAddPartnerUsername('');
    setAddPartnerPassword('');
  };

  // --- Application/Document Upload ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!selectedLeadId) return;
      const file = e.target.files?.[0];
      if (file) {
          // Simulate upload - in real app, upload to server and get URL
          const dummyUrl = `#${file.name}`;
          setLeads(prev => prev.map(lead => {
              if (lead.id === selectedLeadId) {
                  const updatedDocs = [...(lead.documents || []), { name: file.name, url: dummyUrl }];
                  return { ...lead, documents: updatedDocs };
              }
              return lead;
          }));
          setNotification({ type: 'success', message: `${file.name} uploaded successfully (simulated).` });
          // Reset file input (optional)
          e.target.value = '';
      }
  };

   const openApplicationView = (leadId: string) => {
        setSelectedLeadId(leadId);
        navigateTo('application');
    };

   const selectedLead = useMemo(() => leads.find(l => l.id === selectedLeadId), [leads, selectedLeadId]);


  // --- Form Builder ---
  const handleCreateForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggedInUser || loggedInUser.role !== 'Partner') return;
    if (!formBuilderName || formBuilderFields.length === 0) {
        setNotification({ type: 'error', message: 'Form name and at least one field are required.' });
        return;
    }
    const newForm: FormDefinition = {
        id: `form${Date.now()}`,
        partnerId: loggedInUser.id,
        name: formBuilderName,
        fields: formBuilderFields,
        shareableLink: `/capture-lead?formId=form${Date.now()}` // Simulated link
    };
    setForms(prev => [...prev, newForm]);
    setNotification({ type: 'success', message: `Form "${formBuilderName}" created! Shareable link (simulated): ${newForm.shareableLink}` });
    navigateTo('dashboard'); // Or maybe a 'view forms' section
  };

  const handleFormFieldToggle = (fieldName: string) => {
    setFormBuilderFields(prev =>
        prev.includes(fieldName) ? prev.filter(f => f !== fieldName) : [...prev, fieldName]
    );
  };

  const leadFieldOptions: (keyof Omit<Lead, 'id' | 'timestamp' | 'status' | 'createdBy' | 'documents'>)[] = [
      'loanType', 'profile', 'monthlyIncome', 'loanAmount', 'firstName', 'lastName',
      'mobileNumber', 'emailId', 'gender', 'dateOfBirth', 'panCard', 'pincode', 'consent', 'source'
  ];

  // --- Reporting ---
  const generateReport = () => {
      const [year, month] = reportMonth.split('-').map(Number);
      const filteredLeads = leads.filter(lead => {
          const leadDate = new Date(lead.timestamp);
          return leadDate.getFullYear() === year && leadDate.getMonth() === month - 1;
      });
      // In a real app, you'd format this data into a downloadable report (CSV, PDF)
      // For now, just display counts
      const reportData = {
          totalLeads: filteredLeads.length,
          byStatus: filteredLeads.reduce((acc, lead) => {
              acc[lead.status] = (acc[lead.status] || 0) + 1;
              return acc;
          }, {} as Record<Lead['status'], number>),
          byLoanType: filteredLeads.reduce((acc, lead) => {
              acc[lead.loanType] = (acc[lead.loanType] || 0) + 1;
              return acc;
          }, {} as Record<string, number>),
      };
      // Displaying the report data could be done via a modal or dedicated report view section
      setNotification({ type: 'success', message: `Generated Report for ${reportMonth}: ${JSON.stringify(reportData, null, 2)}` });
  };

  // --- Dashboard Data ---
  const dashboardData = useMemo(() => {
    const userLeads = loggedInUser?.role === 'Admin'
        ? leads
        : leads.filter(lead => lead.createdBy === loggedInUser?.id);

    const statusCounts = userLeads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {} as Record<Lead['status'], number>);

    const chartData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

    return {
      totalLeads: userLeads.length,
      statusCounts,
      chartData,
    };
  }, [leads, loggedInUser]);

  const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // --- Render Logic ---
  const renderView = () => {
    switch (currentView) {
      case 'login': return <LoginScreen />;
      case 'register': return <RegisterScreen />;
      case 'dashboard': return <DashboardView />;
      case 'leads': return <LeadsView />;
      case 'addLead': return <LeadForm mode="add" />;
      case 'editLead': return <LeadForm mode="edit" />;
      case 'application': return <ApplicationView />;
      case 'report': return <ReportView />;
      case 'settings': return <SettingsView />;
      case 'partners': return <PartnerManagementView />;
      case 'addPartner': return <PartnerForm mode="add"/>;
      // case 'editPartner': return <PartnerForm mode="edit" />; // Edit partner not fully implemented yet
       case 'formBuilder': return <FormBuilderView />;
      default: return <DashboardView />; // Fallback to dashboard
    }
  };

  // --- Sub-Components (defined as functions returning JSX) ---

  const NotificationBar = () => {
    if (!notification) return null;
    const bgColor = notification.type === 'success' ? 'bg-green-500' : 'bg-red-500';
    return (
      <div className={`fixed top-4 right-4 ${bgColor} text-white p-4 rounded-md shadow-lg z-50`}>
        {notification.message}
      </div>
    );
  };

  const NavigationBar = () => {
    if (!loggedInUser) return null;
    const isAdmin = loggedInUser.role === 'Admin';
    const isPartner = loggedInUser.role === 'Partner';

    return (
      <nav className="bg-indigo-700 text-white p-4 flex justify-between items-center shadow-md">
        <div className="flex items-center space-x-6">
          <span className="font-bold text-xl">CRM App</span>
          <button onClick={() => navigateTo('dashboard')} className="hover:bg-indigo-600 px-3 py-1 rounded">Dashboard</button>
          <button onClick={() => navigateTo('leads')} className="hover:bg-indigo-600 px-3 py-1 rounded">Leads</button>
          {(isAdmin || isPartner) && <button onClick={() => navigateTo('addLead')} className="hover:bg-indigo-600 px-3 py-1 rounded">Add Lead</button>}
           {/* Application view is accessed from Leads list */}
          <button onClick={() => navigateTo('report')} className="hover:bg-indigo-600 px-3 py-1 rounded">Report</button>
          {isAdmin && <button onClick={() => navigateTo('partners')} className="hover:bg-indigo-600 px-3 py-1 rounded">Partners</button>}
          {isPartner && <button onClick={() => navigateTo('formBuilder')} className="hover:bg-indigo-600 px-3 py-1 rounded">Form Builder</button>}
          <button onClick={() => navigateTo('settings')} className="hover:bg-indigo-600 px-3 py-1 rounded">Settings</button>
        </div>
        <div className="flex items-center space-x-4">
          <span>Welcome, {loggedInUser.name} ({loggedInUser.role})</span>
          <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded">Logout</button>
        </div>
      </nav>
    );
  };

  const LoginScreen = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-6 text-center text-indigo-700">Login</h2>
        <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Login
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <button onClick={() => navigateTo('register')} className="font-medium text-indigo-600 hover:text-indigo-500">
            Register as Partner
          </button>
        </p>
      </div>
    </div>
  );

  const RegisterScreen = () => (
     <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-6 text-center text-indigo-700">Register as Partner</h2>
        <form onSubmit={(e) => { e.preventDefault(); handleRegister(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              value={registerName}
              onChange={(e) => setRegisterName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              value={registerUsername}
              onChange={(e) => setRegisterUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={registerPassword}
              onChange={(e) => setRegisterPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Register
          </button>
        </form>
         <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <button onClick={() => navigateTo('login')} className="font-medium text-indigo-600 hover:text-indigo-500">
            Login
          </button>
        </p>
      </div>
    </div>
  );

  const DashboardView = () => {
    if (!loggedInUser) return null;
    const { totalLeads, statusCounts, chartData } = dashboardData;

    return (
      <div className="p-6 space-y-6">
        <h2 className="text-3xl font-bold text-gray-800">Dashboard</h2>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-600">Total Leads</h3>
            <p className="text-3xl font-bold text-indigo-700">{totalLeads}</p>
          </div>
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-600">{status}</h3>
              <p className="text-3xl font-bold text-indigo-700">{count}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <div className="bg-white p-4 rounded-lg shadow h-96">
             <h3 className="text-xl font-semibold text-gray-700 mb-4">Leads by Status (Pie)</h3>
             {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                        {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                    </PieChart>
                </ResponsiveContainer>
             ) : (
                <p className='text-gray-500 text-center pt-16'>No lead data available for charts.</p>
             )}
            </div>
           <div className="bg-white p-4 rounded-lg shadow h-96">
             <h3 className="text-xl font-semibold text-gray-700 mb-4">Leads by Status (Bar)</h3>
             {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false}/>
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#4f46e5" />
                    </BarChart>
                </ResponsiveContainer>
             ) : (
                 <p className='text-gray-500 text-center pt-16'>No lead data available for charts.</p>
             )}
            </div>
        </div>
      </div>
    );
  };

  const LeadsView = () => {
    if (!loggedInUser) return null;
    const userVisibleLeads = loggedInUser.role === 'Admin'
        ? leads
        : leads.filter(lead => lead.createdBy === loggedInUser.id);

    return (
      <div className="p-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Leads</h2>
        <div className="bg-white shadow rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Timestamp', 'Name', 'Loan Type', 'Amount', 'Mobile', 'Status', 'Source', 'Actions'].map(header => (
                   <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {userVisibleLeads.length === 0 && (
                 <tr><td colSpan={8} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">No leads found.</td></tr>
              )}
              {userVisibleLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(lead.timestamp).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{lead.firstName} {lead.lastName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lead.loanType}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lead.loanAmount.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lead.mobileNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                     <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        lead.status === 'Approved' ? 'bg-green-100 text-green-800' :
                        lead.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                        lead.status === 'Processing' ? 'bg-yellow-100 text-yellow-800' :
                        lead.status === 'Docs Pending' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                       {lead.status}
                     </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lead.source}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button onClick={() => openApplicationView(lead.id)} className="text-indigo-600 hover:text-indigo-900">View/Docs</button>
                     {(loggedInUser.role === 'Admin' || lead.createdBy === loggedInUser.id) && (
                        <button onClick={() => startEditLead(lead.id)} className="text-yellow-600 hover:text-yellow-900">Edit</button>
                     )}
                    {/* Add Delete button if needed, maybe only for Admin */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };


    const LeadForm = ({ mode }: { mode: 'add' | 'edit' }) => {
    if (!loggedInUser) return null;

    const handleSubmit = mode === 'add' ? handleAddLead : handleUpdateLead;
    const title = mode === 'add' ? 'Add New Lead' : 'Edit Lead';

    return (
      <div className="p-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">{title}</h2>
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Form Fields */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Loan Type</label>
                    <select name="loanType" value={leadFormData.loanType || ''} onChange={handleLeadFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required>
                        <option value="">Select Loan Type</option>
                        <option value="Personal">Personal Loan</option>
                        <option value="Home">Home Loan</option>
                        <option value="Car">Car Loan</option>
                        <option value="Business">Business Loan</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Profile</label>
                     <select name="profile" value={leadFormData.profile || ''} onChange={handleLeadFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required>
                        <option value="">Select Profile</option>
                        <option value="Salaried">Salaried</option>
                        <option value="Self-Employed">Self-Employed</option>
                        <option value="Business Owner">Business Owner</option>
                    </select>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Income</label>
                    <input type="number" name="monthlyIncome" value={leadFormData.monthlyIncome || ''} onChange={handleLeadFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Loan Amount</label>
                    <input type="number" name="loanAmount" value={leadFormData.loanAmount || ''} onChange={handleLeadFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input type="text" name="firstName" value={leadFormData.firstName || ''} onChange={handleLeadFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input type="text" name="lastName" value={leadFormData.lastName || ''} onChange={handleLeadFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                    <input type="tel" name="mobileNumber" value={leadFormData.mobileNumber || ''} onChange={handleLeadFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required pattern="[0-9]{10}" title="Enter 10 digit mobile number" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email ID</label>
                    <input type="email" name="emailId" value={leadFormData.emailId || ''} onChange={handleLeadFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <select name="gender" value={leadFormData.gender || ''} onChange={handleLeadFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required>
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                    <input type="date" name="dateOfBirth" value={leadFormData.dateOfBirth || ''} onChange={handleLeadFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">PAN Card</label>
                    <input type="text" name="panCard" value={leadFormData.panCard || ''} onChange={handleLeadFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}" title="Enter valid PAN format (ABCDE1234F)"/>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                    <input type="text" name="pincode" value={leadFormData.pincode || ''} onChange={handleLeadFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required pattern="[0-9]{6}" title="Enter 6 digit pincode"/>
                </div>
                {mode === 'edit' && (
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select name="status" value={leadFormData.status || ''} onChange={handleLeadFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required>
                        <option value="New">New</option>
                        <option value="Processing">Processing</option>
                         <option value="Docs Pending">Docs Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                    </select>
                </div>
                )}
                {loggedInUser.role === 'Admin' && mode === 'edit' && (
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Source (Admin Edit)</label>
                        <input type="text" name="source" value={leadFormData.source || ''} onChange={handleLeadFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
                     </div>
                 )}

           </div>
            <div className="flex items-center space-x-2 pt-4">
                <input type="checkbox" id="consent" name="consent" checked={Boolean(leadFormData.consent)} onChange={handleLeadFormChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" required />
                <label htmlFor="consent" className="text-sm font-medium text-gray-700">I give consent to process my information.</label>
            </div>
           <div className="flex justify-end space-x-3 pt-4">
             <button type="button" onClick={() => navigateTo('leads')} className="bg-gray-300 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none">
               Cancel
             </button>
             <button type="submit" className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
               {mode === 'add' ? 'Add Lead' : 'Save Changes'}
             </button>
           </div>
        </form>
      </div>
    );
  };


  const ApplicationView = () => {
    if (!selectedLead) {
        return <div className="p-6 text-center text-gray-500">Please select a lead from the list to view details.</div>;
    }

    return (
      <div className="p-6 space-y-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Application Details - {selectedLead.firstName} {selectedLead.lastName}</h2>

        {/* Lead Details Section */}
        <div className="bg-white p-6 rounded-lg shadow">
             <h3 className="text-xl font-semibold text-gray-700 mb-4">Lead Information</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                {Object.entries(selectedLead).map(([key, value]) => {
                    if (key === 'id' || key === 'createdBy' || key === 'documents') return null; // Hide internal fields
                    const displayKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()); // Format key
                    const displayValue = typeof value === 'boolean' ? (value ? 'Yes' : 'No') :
                                         key === 'timestamp' ? new Date(value).toLocaleString() :
                                         (key === 'loanAmount' || key === 'monthlyIncome') ? Number(value).toLocaleString() :
                                         value;
                    return (
                        <div key={key}>
                            <span className="font-medium text-gray-600">{displayKey}: </span>
                            <span className="text-gray-800">{displayValue}</span>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Document Upload Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">Documents</h3>
           <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Upload New Document</label>
              <input
                type="file"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
           </div>
           {selectedLead.documents && selectedLead.documents.length > 0 ? (
                <ul className="space-y-2">
                    {selectedLead.documents.map((doc, index) => (
                        <li key={index} className="flex justify-between items-center p-2 border border-gray-200 rounded-md">
                            <span className="text-sm text-gray-700">{doc.name}</span>
                            {/* In a real app, this link would point to the actual document */}
                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 text-sm">View (Simulated)</a>
                        </li>
                    ))}
                </ul>
           ) : (
                <p className="text-sm text-gray-500">No documents uploaded yet.</p>
           )}
        </div>

         <div className="flex justify-end pt-4">
             <button onClick={() => navigateTo('leads')} className="bg-gray-300 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none">
               Back to Leads
             </button>
           </div>
      </div>
    );
  };


  const ReportView = () => {
      return (
        <div className="p-6 space-y-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Generate Monthly Report</h2>
            <div className="bg-white p-6 rounded-lg shadow max-w-md">
                <div className="mb-4">
                    <label htmlFor="reportMonth" className="block text-sm font-medium text-gray-700 mb-1">Select Month</label>
                    <input
                        type="month"
                        id="reportMonth"
                        value={reportMonth}
                        onChange={(e) => setReportMonth(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
                <button
                    onClick={generateReport}
                    className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    Generate Report
                </button>
                 <p className="mt-4 text-sm text-gray-500">Note: Report generation is simulated. Results will be shown in a notification.</p>
            </div>
        </div>
      );
  };


  const SettingsView = () => (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Settings</h2>
      <div className="bg-white p-6 rounded-lg shadow">
        <p className="text-gray-700">Settings section placeholder. Future enhancements could include:</p>
         <ul className="list-disc list-inside text-gray-600 mt-2">
            <li>User profile update (Name, Password Change)</li>
            <li>Notification preferences</li>
            <li>Application theme</li>
            {loggedInUser?.role === 'Admin' && <li>Global application settings</li>}
        </ul>
      </div>
    </div>
  );

  const PartnerManagementView = () => {
     if (loggedInUser?.role !== 'Admin') return <div className="p-6 text-red-500">Access Denied.</div>;

    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-gray-800">Partner Management</h2>
             <button onClick={() => navigateTo('addPartner')} className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
               Add Partner
             </button>
        </div>
        <div className="bg-white shadow rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                 <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                 <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                 <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {partners.length === 0 && (
                 <tr><td colSpan={3} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">No partners found.</td></tr>
              )}
              {partners.map((partner) => (
                <tr key={partner.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{partner.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{partner.username}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {/* <button onClick={() => {setSelectedPartnerId(partner.id); navigateTo('editPartner');}} className="text-yellow-600 hover:text-yellow-900">Edit</button> */}
                    <span className="text-gray-400">Edit (NYI)</span> {/* NYI = Not Yet Implemented */}
                    {/* Add Delete button if needed */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const PartnerForm = ({ mode }: { mode: 'add' | 'edit' }) => {
       if (loggedInUser?.role !== 'Admin') return <div className="p-6 text-red-500">Access Denied.</div>;

        const handleSubmit = handleAddPartner; // Only add mode is fully implemented
        const title = 'Add New Partner';

        return (
            <div className="p-6">
                <h2 className="text-3xl font-bold text-gray-800 mb-6">{title}</h2>
                 <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4 max-w-md">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Partner Name</label>
                        <input type="text" value={addPartnerName} onChange={(e) => setAddPartnerName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                        <input type="text" value={addPartnerUsername} onChange={(e) => setAddPartnerUsername(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input type="password" value={addPartnerPassword} onChange={(e) => setAddPartnerPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required />
                    </div>
                     <div className="flex justify-end space-x-3 pt-4">
                        <button type="button" onClick={() => navigateTo('partners')} className="bg-gray-300 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none">
                            Cancel
                        </button>
                        <button type="submit" className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            Add Partner
                        </button>
                    </div>
                 </form>
            </div>
        );
  };

   const FormBuilderView = () => {
        if (!loggedInUser || loggedInUser.role !== 'Partner') return <div className="p-6 text-red-500">Access Denied. Only partners can build forms.</div>;

        const partnerForms = forms.filter(f => f.partnerId === loggedInUser.id);

        return (
            <div className="p-6 space-y-6">
                <h2 className="text-3xl font-bold text-gray-800 mb-4">Form Builder</h2>

                {/* Create New Form Section */}
                <form onSubmit={handleCreateForm} className="bg-white p-6 rounded-lg shadow space-y-4">
                    <h3 className="text-xl font-semibold text-gray-700 mb-3">Create New Lead Capture Form</h3>
                    <div>
                        <label htmlFor="formName" className="block text-sm font-medium text-gray-700 mb-1">Form Name</label>
                        <input
                            type="text"
                            id="formName"
                            value={formBuilderName}
                            onChange={(e) => setFormBuilderName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Fields for Form</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {leadFieldOptions.map(field => (
                                <div key={field} className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id={`field-${field}`}
                                        checked={formBuilderFields.includes(field)}
                                        onChange={() => handleFormFieldToggle(field)}
                                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                    />
                                    <label htmlFor={`field-${field}`} className="ml-2 block text-sm text-gray-900 capitalize">
                                        {field.replace(/([A-Z])/g, ' $1')}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                     <div className="flex justify-end pt-4">
                        <button type="submit" className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            Create Form
                        </button>
                    </div>
                </form>

                 {/* List Existing Forms Section */}
                 <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-xl font-semibold text-gray-700 mb-3">Your Forms</h3>
                    {partnerForms.length === 0 ? (
                        <p className="text-sm text-gray-500">You haven't created any forms yet.</p>
                    ) : (
                        <ul className="space-y-3">
                            {partnerForms.map(form => (
                                <li key={form.id} className="p-3 border border-gray-200 rounded-md flex justify-between items-center">
                                    <div>
                                        <p className="text-md font-medium text-gray-800">{form.name}</p>
                                        <p className="text-xs text-gray-500">Fields: {form.fields.join(', ')}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-indigo-600 font-mono">{form.shareableLink}</p>
                                        <button onClick={() => navigator.clipboard.writeText(form.shareableLink).then(() => setNotification({type: 'success', message: 'Link copied!'}))} className="text-xs text-blue-500 hover:underline">Copy Link</button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        );
   };


  // --- Main Render ---
  return (
    <div className="min-h-screen bg-gray-100">
      <NotificationBar />
      {loggedInUser && <NavigationBar />}
      <main className={loggedInUser ? "pt-4" : ""}> {/* Add padding top only if logged in to avoid overlap */}
        {renderView()}
      </main>
       {/* Footer or other global elements can go here */}
    </div>
  );
};

export default LeadManagementApp;