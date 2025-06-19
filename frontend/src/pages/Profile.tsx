import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X, User, Mail, Phone, MapPin, Calendar, Save, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [newSkill, setNewSkill] = useState('');

  const [profile, setProfile] = useState({
    name: 'John Doe',
    email: 'john.doe@university.edu',
    phone: '+1 (555) 123-4567',
    location: 'San Francisco, CA',
    major: 'Computer Science',
    graduationYear: '2024',
    bio: 'Passionate computer science student with experience in web development and machine learning. Always eager to learn new technologies and solve complex problems.',
    skills: ['Programming', 'JavaScript', 'React', 'Python', 'Machine Learning', 'Git', 'SQL']
  });

  const addSkill = () => {
    if (newSkill.trim() && !profile.skills.includes(newSkill.trim())) {
      setProfile({
        ...profile,
        skills: [...profile.skills, newSkill.trim()]
      });
      setNewSkill('');
      toast({
        title: "Skill Added",
        description: `${newSkill.trim()} has been added to your profile.`,
      });
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setProfile({
      ...profile,
      skills: profile.skills.filter(skill => skill !== skillToRemove)
    });
    toast({
      title: "Skill Removed",
      description: `${skillToRemove} has been removed from your profile.`,
    });
  };

  const handleSave = () => {
    setEditing(false);
    toast({
      title: "Profile Updated",
      description: "Your profile changes have been saved successfully.",
    });
    // Here you would save to your backend
    console.log('Saving profile:', profile);
  };

  const handleInputChange = (field: string, value: string) => {
    setProfile({
      ...profile,
      [field]: value
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => navigate('/student-dashboard')}>
                Back to Dashboard
              </Button>
              <Button variant="outline" onClick={() => navigate('/')}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Profile Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{profile.name}</CardTitle>
                  <CardDescription className="text-lg">
                    {profile.major} • Class of {profile.graduationYear}
                  </CardDescription>
                </div>
              </div>
              <Button
                onClick={() => editing ? handleSave() : setEditing(true)}
                variant={editing ? "default" : "outline"}
              >
                {editing ? (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>
              Update your personal details and contact information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={profile.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  disabled={!editing}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    disabled={!editing}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    value={profile.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    disabled={!editing}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <Input
                    id="location"
                    value={profile.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    disabled={!editing}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="major">Major</Label>
                <Input
                  id="major"
                  value={profile.major}
                  onChange={(e) => handleInputChange('major', e.target.value)}
                  disabled={!editing}
                />
              </div>
              <div>
                <Label htmlFor="graduation">Graduation Year</Label>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <Input
                    id="graduation"
                    value={profile.graduationYear}
                    onChange={(e) => handleInputChange('graduationYear', e.target.value)}
                    disabled={!editing}
                  />
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell us about yourself..."
                value={profile.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                disabled={!editing}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Skills Management */}
        <Card>
          <CardHeader>
            <CardTitle>My Skills</CardTitle>
            <CardDescription>
              Manage your skills to get better job recommendations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add New Skill */}
            <div className="flex space-x-2">
              <Input
                placeholder="Add a new skill..."
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addSkill()}
              />
              <Button onClick={addSkill}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Skills List */}
            <div className="space-y-4">
              <p className="text-sm font-medium">Current Skills ({profile.skills.length})</p>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-sm px-3 py-1">
                    {skill}
                    <button
                      onClick={() => removeSkill(skill)}
                      className="ml-2 hover:text-red-600 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              {profile.skills.length === 0 && (
                <p className="text-gray-500 text-sm">No skills added yet. Add some skills to get started!</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Career Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Career Progress</CardTitle>
            <CardDescription>
              Track your career development journey
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{profile.skills.length}</div>
                  <p className="text-sm text-blue-800">Skills Acquired</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">3</div>
                  <p className="text-sm text-green-800">Jobs Applied</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">2</div>
                  <p className="text-sm text-purple-800">Certifications</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Recent Activity</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span>Added skill: Machine Learning</span>
                    <span className="text-gray-500">2 days ago</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span>Applied for Software Developer position</span>
                    <span className="text-gray-500">1 week ago</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span>Completed React certification</span>
                    <span className="text-gray-500">2 weeks ago</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;