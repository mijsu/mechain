
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Users, Brain, Upload, UserCheck, UserX } from "lucide-react";

export default function RecentActivity({ diagnoses, doctors = [] }) {
  const userActivities = doctors.slice(0, 6).map((doctor) => {
    const status = doctor.status || 'pending_approval'; // Default to 'pending_approval' if status is undefined
    if (status === 'active') {
      return {
        type: 'user',
        title: 'Doctor account enabled',
        description: `Dr. ${doctor.full_name} was enabled`,
        time: doctor.updated_date,
        icon: UserCheck,
        color: 'text-green-600'
      };
    } else if (status === 'disabled' || status === 'rejected') {
      return {
        type: 'user',
        title: 'Doctor account disabled',
        description: `Dr. ${doctor.full_name} was disabled`,
        time: doctor.updated_date,
        icon: UserX,
        color: 'text-red-600'
      };
    } else {// Covers 'pending_approval' or any other unhandled status
      return {
        type: 'user',
        title: 'Doctor account pending',
        description: `Dr. ${doctor.full_name} is awaiting approval`,
        time: doctor.updated_date,
        icon: Users, // Using Users for pending/general status
        color: 'text-blue-500'
      };
    }
  });

  const diagnosisActivities = diagnoses.slice(0, 6).map((diagnosis) => ({
    type: 'diagnosis',
    title: 'New diagnosis completed',
    description: `Patient analysis with ${diagnosis.ai_prediction?.risk_level || 'unknown'} risk level`,
    time: diagnosis.created_date,
    icon: Heart,
    color: 'text-red-500'
  }));

  const activities = [...diagnosisActivities, ...userActivities].
  sort((a, b) => new Date(b.time) - new Date(a.time)).
  slice(0, 8);

  const formatTimeForPhilippines = (timestamp) => {
    try {
      // Create a date object, assuming the timestamp from DB is UTC.
      // Appending 'Z' tells the Date constructor to parse it as UTC.
      const eventTime = new Date(timestamp + 'Z');
      const now = new Date(); // This is in user's local time

      // getTime() returns UTC milliseconds since epoch for both, so the difference is timezone-agnostic.
      const diffInMs = now.getTime() - eventTime.getTime();
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

      if (diffInMinutes < 2) {
        return 'just now';
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes} minutes ago`;
      } else if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
      } else {
        return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
      }
    } catch (error) {
      return 'recently';
    }
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-[520px] overflow-y-auto pr-3">
          {activities.length === 0 ?
          <div className="text-center py-8">
              <Brain className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No recent activity</p>
            </div> :

          activities.map((activity, index) =>
          <div key={index} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <div className={`p-3 rounded-full bg-gray-100 ${activity.color}`}>
                  <activity.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 text-lg font-medium">{activity.title}</p>
                  <p className="text-gray-500 text-base truncate">{activity.description}</p>
                  <p className="text-gray-400 mt-1 text-sm">
                    {formatTimeForPhilippines(activity.time)}
                  </p>
                </div>
              </div>
          )
          }
        </div>
      </CardContent>
    </Card>);
}
