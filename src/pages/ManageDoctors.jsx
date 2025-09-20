
import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { Invitation } from "@/api/entities";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow } from
"@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription } from
"@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Edit, Mail, Info, RefreshCw, Send, Trash2, CheckCircle, AlertTriangle, Clock, UserCheck, UserX } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function ManageDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // State for modals
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteStep, setInviteStep] = useState(1);
  const [newInvite, setNewInvite] = useState({ email: "", specialization: "", department: "", phone: "", role: "user" });
  const [userToDelete, setUserToDelete] = useState(null); // Renamed from doctorToDelete
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState(''); // 'delete' or 'reject'
  const [editingPendingUser, setEditingPendingUser] = useState(null);
  const [isEditPendingModalOpen, setIsEditPendingModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [userToApprove, setUserToApprove] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allUsers, pendingInvites] = await Promise.all([
      User.list(),
      Invitation.filter({ status: 'pending' })]
      );

      const nonAdminUsers = allUsers.filter((u) => u.role !== 'admin');

      // Correctly filter pending users: includes 'pending_approval' and new signups (undefined status)
      setPendingUsers(nonAdminUsers.filter((u) => u.status === 'pending_approval' || u.status === undefined || u.status === null));

      // UPDATE: include both 'active' and 'disabled' doctors in the accounts table
      setDoctors(
        nonAdminUsers.filter((u) =>
        u.role === 'user' && (u.status === 'active' || u.status === 'disabled')
        )
      );

      setInvitations(pendingInvites);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const handleToggleStatus = async (doctor) => {
    // Simplified and corrected toggle logic
    const newStatus = doctor.status === 'active' ? 'disabled' : 'active';
    try {
      await User.update(doctor.id, { status: newStatus });
      loadData();
    } catch (error) {
      console.error("Error updating doctor status:", error);
    }
  };

  const handleEditDoctor = (doctor) => {
    setSelectedDoctor({ ...doctor });
    setIsEditModalOpen(true);
  };

  const handleEditPendingUser = (user) => {
    setEditingPendingUser({ ...user });
    setIsEditPendingModalOpen(true);
  };

  const handleSavePendingUserChanges = async () => {
    if (!editingPendingUser) return;
    setIsSaving(true);

    try {
      const { id, created_date, updated_date, created_by, ...dataToUpdate } = editingPendingUser;
      // Ensure 'phone' is not sent if it's no longer editable for pending users
      const { phone, ...filteredDataToUpdate } = dataToUpdate; // Destructure to exclude phone
      await User.update(id, filteredDataToUpdate);
      setIsEditPendingModalOpen(false);
      setEditingPendingUser(null);
      loadData();
    } catch (error) {
      console.error("Error updating pending user:", error);
    }
    setIsSaving(false);
  };

  const handleApproveClick = (user) => {
    setUserToApprove(user);
    setIsApproveModalOpen(true);
  };

  const handleConfirmApprove = async () => {
    if (!userToApprove) return;
    setIsSaving(true);
    try {
      await User.update(userToApprove.id, { status: 'active' });
      setIsApproveModalOpen(false);
      setUserToApprove(null);
      loadData();
    } catch (error) {
      console.error("Error approving user:", error);
    }
    setIsSaving(false);
  };

  const handleReject = async () => {
    if (!userToDelete) return;
    try {
      await User.delete(userToDelete.id);
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      loadData();
    } catch (error) {
      console.error("Error rejecting user:", error);
    }
  };

  const handleSaveChanges = async () => {
    if (!selectedDoctor) return;
    setIsSaving(true);

    try {
      const { id, created_date, updated_date, created_by, ...dataToUpdate } = selectedDoctor;
      await User.update(id, dataToUpdate);
      setIsEditModalOpen(false);
      setSelectedDoctor(null);
      loadData();
    } catch (error) {
      console.error("Error updating doctor:", error);
    }
    setIsSaving(false);
  };

  const handleSendInvite = async () => {
    setIsSaving(true);
    try {
      await Invitation.create(newInvite);
      setInviteStep(2);
    } catch (error) {
      console.error("Error sending invitation:", error);
    }
    setIsSaving(false);
  };

  const handleRevokeInvite = async (invitationId) => {
    try {
      await Invitation.update(invitationId, { status: 'revoked' });
      loadData();
    } catch (error) {
      console.error("Error revoking invitation:", error);
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    if (modalAction === 'reject') {
      await handleReject();
    } else {
      try {
        await User.delete(userToDelete.id);
        setIsDeleteModalOpen(false);
        setUserToDelete(null);
        loadData(); // Refresh the list
      } catch (error)
      {
        console.error("Error deleting doctor:", error);
        // Optionally, show an error message to the user
      }
    }
  };

  const resetInviteModal = () => {
    setIsInviteModalOpen(false);
    setTimeout(() => {
      setNewInvite({ email: "", specialization: "", department: "", phone: "", role: "user" });
      setInviteStep(1);
      loadData();
    }, 300);
  };

  const specializations = [
  "Cardiology", "Internal Medicine", "Emergency Medicine", "Family Medicine",
  "Pulmonology", "Nephrology", "Endocrinology", "Geriatrics"];


  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
        <div className="h-64 bg-gray-200 rounded-lg"></div>
        <div className="h-48 bg-gray-200 rounded-lg mt-6"></div>
      </div>);

  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Doctors</h1>
          <p className="text-gray-600 mt-1">Onboard new doctors and manage existing accounts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData} disabled={isLoading} className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-base font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setIsInviteModalOpen(true)} className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-base font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
            <Plus className="w-4 h-4 mr-2" />
            Invite New Doctor
          </Button>
        </div>
      </div>

      {/* REORDER: Doctor Accounts Table moved to the top */}
      <CardWithTitle title="Doctor Accounts" icon={Users}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 text-lg">Doctor Information</TableHead>
              <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground text-lg [&:has([role=checkbox])]:pr-0">Specialization</TableHead>
              <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground text-lg [&:has([role=checkbox])]:pr-0">Department</TableHead>
              <TableHead className="h-12 px-4 align-middle font-medium text-muted-foreground text-lg [&:has([role=checkbox])]:pr-0">Account Status</TableHead>
              <TableHead className="h-12 px-4 align-middle font-medium text-muted-foreground text-lg [&:has([role=checkbox])]:pr-0 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {doctors.length > 0 ? doctors.map((doctor) =>
            <TableRow key={doctor.id}>
                <TableCell>
                  <div className="font-medium text-base">{doctor.full_name}</div>
                  <div className="text-base text-gray-500">{doctor.email}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-base font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-blue-50 text-blue-700">
                    {doctor.specialization || 'Not Set'}
                  </Badge>
                </TableCell>
                <TableCell className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-base">{doctor.department || 'N/A'}</TableCell>
                <TableCell className="flex items-center gap-2">
                  <Switch
                  checked={doctor.status === 'active'}
                  onCheckedChange={() => handleToggleStatus(doctor)}
                  id={`active-switch-${doctor.id}`} />
                  
                  <Label
                  htmlFor={`active-switch-${doctor.id}`}
                  className={`${doctor.status === 'active' ? 'text-green-600' : 'text-red-600'} text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70`}>

                    {doctor.status === "active" ? "Active" : "Disabled"}
                  </Label>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleEditDoctor(doctor)} className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground h-10 w-10">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0 hover:bg-accent h-10 w-10 text-red-500 hover:text-red-700" onClick={() => {setUserToDelete(doctor);setModalAction('delete');setIsDeleteModalOpen(true);}}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ) :
            <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-500 h-24">
                  No active or disabled doctor accounts found.
                </TableCell>
              </TableRow>
            }
          </TableBody>
        </Table>
      </CardWithTitle>

      {/* Pending Registrations Table */}
      <CardWithTitle title="Pending Registrations" icon={UserCheck}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 text-lg">Applicant Information</TableHead>
              <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 text-lg">Pre-assigned Specialization</TableHead>
              <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 text-lg">Date Registered</TableHead>
              <TableHead className="h-12 px-4 align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 text-right text-lg">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingUsers.length > 0 ? pendingUsers.map((user) =>
            <TableRow key={user.id}>
                <TableCell>
                  <div className="font-medium">{user.full_name}</div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    {user.specialization || 'Not Set'}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-500">
                  {formatDistanceToNow(new Date(user.created_date), { addSuffix: true })}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => handleEditPendingUser(user)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-500 hover:text-red-700" onClick={() => {setUserToDelete(user);setModalAction('reject');setIsDeleteModalOpen(true);}}>
                    <UserX className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                  <Button size="sm" onClick={() => handleApproveClick(user)} disabled={isSaving}>
                    <UserCheck className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                </TableCell>
              </TableRow>
            ) :
            <TableRow>
                <TableCell colSpan={4} className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-center text-gray-500 h-24 text-lg">
                  No new user registrations to approve.
                </TableCell>
              </TableRow>
            }
          </TableBody>
        </Table>
      </CardWithTitle>

      {/* Pending Invitations Table */}
      <CardWithTitle title="Pending Invitations" icon={Clock}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 text-lg">Email</TableHead>
              <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 text-lg">Invited</TableHead>
              <TableHead className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 text-lg">Pre-assigned Specialization</TableHead>
              <TableHead className="h-12 px-4 align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 text-right text-lg">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitations.length > 0 ? invitations.map((invite) =>
            <TableRow key={invite.id}>
                <TableCell className="p-4 align-middle [&:has([role=checkbox])]:pr-0 font-medium text-base">{invite.email}</TableCell>
                <TableCell className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-gray-500 text-base">
                  {formatDistanceToNow(new Date(invite.created_date), { addSuffix: true })}
                </TableCell>
                <TableCell className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-base">{invite.specialization || 'Not set'}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" className="[&_svg]:size- inline-flex items-center justify-center gap-2 whitespace-nowrap text-base font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0 hover:bg-accent h-9 rounded-md px-3 text-red-500 hover:text-red-700" onClick={() => handleRevokeInvite(invite.id)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Revoke
                  </Button>
                </TableCell>
              </TableRow>
            ) :
            <TableRow>
                <TableCell colSpan={4} className="text-center text-gray-500 h-24">
                  No pending invitations.
                </TableCell>
              </TableRow>
            }
          </TableBody>
        </Table>
      </CardWithTitle>

      {/* Edit Doctor Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Doctor Profile</DialogTitle>
          </DialogHeader>
          {selectedDoctor &&
          <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="specialization">Medical Specialization</Label>
                <Select
                value={selectedDoctor.specialization || ''}
                onValueChange={(value) => setSelectedDoctor({ ...selectedDoctor, specialization: value })}>

                  <SelectTrigger><SelectValue placeholder="Select specialization" /></SelectTrigger>
                  <SelectContent>{specializations.map((spec) => <SelectItem key={spec} value={spec}>{spec}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input id="department" value={selectedDoctor.department || ''} onChange={(e) => setSelectedDoctor({ ...selectedDoctor, department: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="license_number">Medical License Number</Label>
                <Input id="license_number" value={selectedDoctor.license_number || ''} onChange={(e) => setSelectedDoctor({ ...selectedDoctor, license_number: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" value={selectedDoctor.phone || ''} onChange={(e) => setSelectedDoctor({ ...selectedDoctor, phone: e.target.value })} />
              </div>
            </div>
          }
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveChanges} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Invite Doctor Modal */}
      <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Invite New Doctor
            </DialogTitle>
            <DialogDescription>
              {inviteStep === 1 ? "Enter the new doctor's details. They will be applied when they sign up." : "Next Steps"}
            </DialogDescription>
          </DialogHeader>
          {inviteStep === 1 &&
          <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Doctor's Email</Label>
                <Input id="invite-email" type="email" placeholder="doctor@hospital.com" value={newInvite.email} onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-specialization">Specialization (Optional)</Label>
                <Select value={newInvite.specialization} onValueChange={(val) => setNewInvite({ ...newInvite, specialization: val })}>
                  <SelectTrigger><SelectValue placeholder="Select specialization" /></SelectTrigger>
                  <SelectContent>{specializations.map((spec) => <SelectItem key={spec} value={spec}>{spec}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-department">Department (Optional)</Label>
                <Input id="invite-department" placeholder="e.g., Cardiology" value={newInvite.department} onChange={(e) => setNewInvite({ ...newInvite, department: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-phone">Phone Number (Optional)</Label>
                <Input id="invite-phone" placeholder="e.g., 555-123-4567" value={newInvite.phone} onChange={(e) => setNewInvite({ ...newInvite, phone: e.target.value })} />
              </div>
            </div>
          }
          {inviteStep === 2 &&
          <div className="py-4">
               <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex flex-col items-center text-center gap-3">
                 <CheckCircle className="w-12 h-12 text-green-600" />
                 <div>
                   <h4 className="font-semibold text-green-900">Invitation Logged!</h4>
                   <p className="text-sm text-green-800 mt-1">The pre-assigned details have been saved.</p>
                 </div>
               </div>
               <div className="p-4 mt-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                 <Info className="w-10 h-10 text-blue-600 mt-1 flex-shrink-0" />
                 <div>
                   <h4 className="font-semibold text-blue-900">Important Next Step</h4>
                   <p className="text-sm text-blue-800">
                     You must now send the official platform invitation from your workspace settings.
                   </p>
                   <p className="text-sm text-blue-800 mt-2">
                     Go to: <span className="font-semibold">Workspace &gt; Users &gt; Invite User</span>
                   </p>
                 </div>
               </div>
             </div>
          }
          <DialogFooter>
            {inviteStep === 1 &&
            <>
                <Button variant="outline" onClick={() => setIsInviteModalOpen(false)}>Cancel</Button>
                <Button onClick={handleSendInvite} disabled={isSaving || !newInvite.email}>
                  <Send className="w-4 h-4 mr-2" />
                  {isSaving ? "Saving..." : "Log Invitation"}
                </Button>
              </>
            }
            {inviteStep === 2 &&
            <Button onClick={resetInviteModal}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Done
              </Button>
            }
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete / Reject Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              Confirm {modalAction === 'reject' ? 'Rejection' : 'Deletion'}
            </DialogTitle>
            <DialogDescription>
               {modalAction === 'reject' ?
              <>Are you sure you want to reject the registration for <strong>{userToDelete?.full_name}</strong>? This will permanently delete their pending account.</> :

              <>Are you sure you want to delete the account for <strong>{userToDelete?.full_name}</strong>? This action is permanent and cannot be undone.</>
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Yes, {modalAction === 'reject' ? 'Reject Registration' : 'Delete Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Pending User Modal */}
      <Dialog open={isEditPendingModalOpen} onOpenChange={setIsEditPendingModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Pre-assigned Information</DialogTitle>
            <DialogDescription>
              Set the specialization and department for this pending user. These will be applied when approved.
            </DialogDescription>
          </DialogHeader>
          {editingPendingUser &&
          <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="pending-specialization">Medical Specialization</Label>
                <Select
                value={editingPendingUser.specialization || ''}
                onValueChange={(value) => setEditingPendingUser({ ...editingPendingUser, specialization: value })}>

                  <SelectTrigger><SelectValue placeholder="Select specialization" /></SelectTrigger>
                  <SelectContent>{specializations.map((spec) => <SelectItem key={spec} value={spec}>{spec}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pending-department">Department</Label>
                <Input id="pending-department" value={editingPendingUser.department || ''} onChange={(e) => setEditingPendingUser({ ...editingPendingUser, department: e.target.value })} />
              </div>
            </div>
          }
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditPendingModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePendingUserChanges} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation Modal */}
      <Dialog open={isApproveModalOpen} onOpenChange={setIsApproveModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              Confirm Account Approval
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to approve <strong>{userToApprove?.full_name}</strong>? They will gain full access to the system immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveModalOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmApprove} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
              {isSaving ? "Approving..." : "Yes, Approve Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}

const CardWithTitle = ({ title, icon: Icon, children }) =>
<div className="bg-white p-6 rounded-xl shadow-lg border">
    <h2 className="text-2xl mb-4 font-semibold flex items-center gap-3">
      <Icon className="w-6 h-6 text-blue-600" />
      {title}
    </h2>
    {children}
  </div>;