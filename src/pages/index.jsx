import Layout from "./Layout.jsx";

import AdminDashboard from "./AdminDashboard";

import DoctorDashboard from "./DoctorDashboard";

import ManageDoctors from "./ManageDoctors";

import MLModels from "./MLModels";

import SystemLogs from "./SystemLogs";

import NewDiagnosis from "./NewDiagnosis";

import PatientRecords from "./PatientRecords";

import PatientDetails from "./PatientDetails";

import ImageAnalysis from "./ImageAnalysis";

import PendingApproval from "./PendingApproval";

import ProfileSettings from "./ProfileSettings";

import Home from "./Home";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    AdminDashboard: AdminDashboard,
    
    DoctorDashboard: DoctorDashboard,
    
    ManageDoctors: ManageDoctors,
    
    MLModels: MLModels,
    
    SystemLogs: SystemLogs,
    
    NewDiagnosis: NewDiagnosis,
    
    PatientRecords: PatientRecords,
    
    PatientDetails: PatientDetails,
    
    ImageAnalysis: ImageAnalysis,
    
    PendingApproval: PendingApproval,
    
    ProfileSettings: ProfileSettings,
    
    Home: Home,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<AdminDashboard />} />
                
                
                <Route path="/AdminDashboard" element={<AdminDashboard />} />
                
                <Route path="/DoctorDashboard" element={<DoctorDashboard />} />
                
                <Route path="/ManageDoctors" element={<ManageDoctors />} />
                
                <Route path="/MLModels" element={<MLModels />} />
                
                <Route path="/SystemLogs" element={<SystemLogs />} />
                
                <Route path="/NewDiagnosis" element={<NewDiagnosis />} />
                
                <Route path="/PatientRecords" element={<PatientRecords />} />
                
                <Route path="/PatientDetails" element={<PatientDetails />} />
                
                <Route path="/ImageAnalysis" element={<ImageAnalysis />} />
                
                <Route path="/PendingApproval" element={<PendingApproval />} />
                
                <Route path="/ProfileSettings" element={<ProfileSettings />} />
                
                <Route path="/Home" element={<Home />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}