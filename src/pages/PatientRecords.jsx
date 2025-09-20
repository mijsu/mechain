import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Patient } from "@/api/entities";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, UserPlus, Eye, Loader2 } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function PatientRecords() {
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentDoctor, setCurrentDoctor] = useState(null);
  const [newPatient, setNewPatient] = useState({
    patient_id: "",
    full_name: "",
    age: "",
    gender: "",
    blood_type: "",
    phone: "",
    emergency_contact: "",
    medical_history: [],
    allergies: []
  });

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    const results = patients.filter(p =>
      p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.patient_id.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredPatients(results);
  }, [searchTerm, patients]);

  const loadPatients = async () => {
    setIsLoading(true);
    try {
      const doctor = await User.me();
      setCurrentDoctor(doctor);
      
      // Load only patients assigned to this doctor
      const patientsList = await Patient.filter({ assigned_doctor_id: doctor.id }, '-created_date');
      setPatients(patientsList);
      setFilteredPatients(patientsList);
    } catch (error) {
      console.error("Error loading patients:", error);
    }
    setIsLoading(false);
  };

  const generatePatientId = () => {
    const prefix = "P";
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 3).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  };

  const handleCreatePatient = async () => {
    if (!newPatient.full_name || !newPatient.age || !newPatient.gender) {
      alert("Please fill in all required fields.");
      return;
    }

    setIsSaving(true);
    try {
      const patientData = {
        ...newPatient,
        patient_id: newPatient.patient_id || generatePatientId(),
        age: parseInt(newPatient.age),
        assigned_doctor_id: currentDoctor.id,
        blockchain_hash: `0x${Date.now().toString(16)}${Math.random().toString(36).substr(2, 8)}`
      };

      await Patient.create(patientData);
      setIsNewPatientModalOpen(false);
      resetNewPatientForm();
      loadPatients();
    } catch (error) {
      console.error("Error creating patient:", error);
      alert("Error creating patient. Please try again.");
    }
    setIsSaving(false);
  };

  const resetNewPatientForm = () => {
    setNewPatient({
      patient_id: "",
      full_name: "",
      age: "",
      gender: "",
      blood_type: "",
      phone: "",
      emergency_contact: "",
      medical_history: [],
      allergies: []
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900">My Patient Records</h1>
        <div className="flex gap-2">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              placeholder="Search by name or ID..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={() => setIsNewPatientModalOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            New Patient
          </Button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient ID</TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i} className="animate-pulse">
                  <TableCell><div className="h-4 bg-gray-200 rounded w-24"></div></TableCell>
                  <TableCell><div className="h-4 bg-gray-200 rounded w-32"></div></TableCell>
                  <TableCell><div className="h-4 bg-gray-200 rounded w-12"></div></TableCell>
                  <TableCell><div className="h-4 bg-gray-200 rounded w-16"></div></TableCell>
                  <TableCell><div className="h-4 bg-gray-200 rounded w-24"></div></TableCell>
                  <TableCell className="text-right"><div className="h-8 bg-gray-200 rounded w-16 ml-auto"></div></TableCell>
                </TableRow>
              ))
            ) : filteredPatients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  {searchTerm ? "No patients found matching your search." : "No patients registered yet. Add your first patient to get started."}
                </TableCell>
              </TableRow>
            ) : (
              filteredPatients.map((patient) => (
                <TableRow key={patient.id}>
                  <TableCell className="font-medium">{patient.patient_id}</TableCell>
                  <TableCell>{patient.full_name}</TableCell>
                  <TableCell>{patient.age}</TableCell>
                  <TableCell className="capitalize">{patient.gender}</TableCell>
                  <TableCell>{patient.phone || 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <Link to={createPageUrl(`PatientDetails?id=${patient.id}`)}>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* New Patient Modal */}
      <Dialog open={isNewPatientModalOpen} onOpenChange={setIsNewPatientModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Register New Patient</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="patient_id">Patient ID (Auto-generated if empty)</Label>
                <Input 
                  id="patient_id" 
                  placeholder={generatePatientId()}
                  value={newPatient.patient_id} 
                  onChange={(e) => setNewPatient({...newPatient, patient_id: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input 
                  id="full_name" 
                  value={newPatient.full_name} 
                  onChange={(e) => setNewPatient({...newPatient, full_name: e.target.value})} 
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age">Age *</Label>
                <Input 
                  id="age" 
                  type="number" 
                  value={newPatient.age} 
                  onChange={(e) => setNewPatient({...newPatient, age: e.target.value})} 
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender *</Label>
                <Select 
                  value={newPatient.gender} 
                  onValueChange={(value) => setNewPatient({...newPatient, gender: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="blood_type">Blood Type</Label>
                <Select 
                  value={newPatient.blood_type} 
                  onValueChange={(value) => setNewPatient({...newPatient, blood_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select blood type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input 
                  id="phone" 
                  value={newPatient.phone} 
                  onChange={(e) => setNewPatient({...newPatient, phone: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency_contact">Emergency Contact</Label>
                <Input 
                  id="emergency_contact" 
                  value={newPatient.emergency_contact} 
                  onChange={(e) => setNewPatient({...newPatient, emergency_contact: e.target.value})} 
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {setIsNewPatientModalOpen(false); resetNewPatientForm();}}>
              Cancel
            </Button>
            <Button onClick={handleCreatePatient} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Patient"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}