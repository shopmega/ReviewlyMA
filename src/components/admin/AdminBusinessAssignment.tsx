'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Search, User, Building2, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react'
import { assignBusinessToUser, removeBusinessFromUser, getUserBusinessAssignments } from '@/app/actions/admin-business-assignment'
import { toast } from '@/hooks/use-toast'

interface UserSearchResult {
  id: string
  email: string
  full_name: string
  role: string
  business_id: string | null
}

interface BusinessSearchResult {
  id: string
  name: string
  category: string
  city: string
  overall_rating: number
}

interface Assignment {
  business_id: string
  role: string
  is_primary: boolean
  created_at: string
  business: {
    name: string
    category: string
    city: string
    overall_rating: number
  }
}

export default function AdminBusinessAssignment() {
  const [userEmail, setUserEmail] = useState('')
  const [businessId, setBusinessId] = useState('')
  const [role, setRole] = useState('owner')
  const [isPrimary, setIsPrimary] = useState(false)
  const [user, setUser] = useState<UserSearchResult | null>(null)
  const [business, setBusiness] = useState<BusinessSearchResult | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSearchingUser, setIsSearchingUser] = useState(false)
  const [isSearchingBusiness, setIsSearchingBusiness] = useState(false)
  const [searchError, setSearchError] = useState('')

  // Search for user by email
  const searchUser = async () => {
    if (!userEmail) {
      setSearchError('Please enter a user email')
      return
    }

    setIsSearchingUser(true)
    setSearchError('')

    try {
      const response = await fetch(`/api/admin/users/search?email=${encodeURIComponent(userEmail)}`)
      const data = await response.json()

      if (data.success && data.user) {
        setUser(data.user)
        // Load current assignments
        loadUserAssignments(data.user.id)
        toast({
          title: 'User Found',
          description: `Found user: ${data.user.full_name}`,
        })
      } else {
        setSearchError(data.error || 'User not found')
        setUser(null)
        setAssignments([])
      }
    } catch (error) {
      setSearchError('Error searching for user')
      console.error('User search error:', error)
    } finally {
      setIsSearchingUser(false)
    }
  }

  // Search for business by ID
  const searchBusiness = async () => {
    if (!businessId) {
      setSearchError('Please enter a business ID')
      return
    }

    setIsSearchingBusiness(true)
    setSearchError('')

    try {
      const response = await fetch(`/api/admin/businesses/search?id=${encodeURIComponent(businessId)}`)
      const data = await response.json()

      if (data.success && data.business) {
        setBusiness(data.business)
        toast({
          title: 'Business Found',
          description: `Found business: ${data.business.name}`,
        })
      } else {
        setSearchError(data.error || 'Business not found')
        setBusiness(null)
      }
    } catch (error) {
      setSearchError('Error searching for business')
      console.error('Business search error:', error)
    } finally {
      setIsSearchingBusiness(false)
    }
  }

  // Load user's current business assignments
  const loadUserAssignments = async (userId: string) => {
    try {
      const result = await getUserBusinessAssignments(userId)
      if (result.success) {
        setAssignments(result.data || [])
      } else {
        setSearchError(result.error || 'Failed to load business assignments')
      }
    } catch (error) {
      console.error('Error loading assignments:', error)
      setSearchError('Failed to load business assignments')
    }
  }

  // Assign business to user
  const handleAssign = async () => {
    if (!user || !business) {
      toast({
        title: 'Error',
        description: 'Please select both user and business',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      const result = await assignBusinessToUser(user.id, business.id, role, isPrimary)

      if (result.status === 'success') {
        toast({
          title: 'Success',
          description: result.message,
        })
        // Refresh assignments
        loadUserAssignments(user.id)
        // Clear form
        setBusinessId('')
        setBusiness(null)
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to assign business',
        variant: 'destructive',
      })
      console.error('Assignment error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Remove business assignment
  const handleRemoveAssignment = async (businessIdToRemove: string) => {
    if (!user) return

    setIsLoading(true)

    try {
      const result = await removeBusinessFromUser(user.id, businessIdToRemove)

      if (result.status === 'success') {
        toast({
          title: 'Success',
          description: result.message,
        })
        // Refresh assignments
        loadUserAssignments(user.id)
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove assignment',
        variant: 'destructive',
      })
      console.error('Removal error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent, action: 'user' | 'business') => {
    if (e.key === 'Enter') {
      if (action === 'user') searchUser()
      else searchBusiness()
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Business Assignment</h1>
          <p className="text-muted-foreground">
            Assign businesses to users and manage ownership relationships
          </p>
        </div>
      </div>

      {/* Search Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Find User
            </CardTitle>
            <CardDescription>
              Search for a user by their email address
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="user@example.com"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, 'user')}
                disabled={isSearchingUser}
              />
              <Button
                onClick={searchUser}
                disabled={isSearchingUser || !userEmail}
              >
                {isSearchingUser ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Search
              </Button>
            </div>

            {user && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">{user.full_name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant={user.role === 'admin' ? 'default' : user.role === 'pro' ? 'secondary' : 'outline'}>
                        {user.role}
                      </Badge>
                      {user.business_id && (
                        <Badge variant="outline">
                          Has business: {user.business_id}
                        </Badge>
                      )}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Business Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Find Business
            </CardTitle>
            <CardDescription>
              Search for a business by its ID
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="business-id-here"
                value={businessId}
                onChange={(e) => setBusinessId(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, 'business')}
                disabled={isSearchingBusiness}
              />
              <Button
                onClick={searchBusiness}
                disabled={isSearchingBusiness || !businessId}
              >
                {isSearchingBusiness ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Search
              </Button>
            </div>

            {business && (
              <Alert className="border-blue-200 bg-blue-50">
                <Building2 className="h-4 w-4 text-blue-600" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">{business.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {business.category} • {business.city}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        Rating: {business.overall_rating}
                      </Badge>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Error Display */}
      {searchError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{searchError}</AlertDescription>
        </Alert>
      )}

      {/* Assignment Form */}
      {user && business && (
        <Card>
          <CardHeader>
            <CardTitle>Assign Business</CardTitle>
            <CardDescription>
              Configure the assignment details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="primary">Primary Business</Label>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="primary"
                    checked={isPrimary}
                    onChange={(e) => setIsPrimary(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="primary" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Set as primary business
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Primary businesses appear first in user dashboards
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleAssign}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Assign Business to {user.full_name}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Assignments */}
      {user && assignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Current Assignments</CardTitle>
            <CardDescription>
              Businesses currently assigned to {user.full_name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {assignments.map((assignment) => (
                <div
                  key={`${assignment.business_id}-${assignment.role}`}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{assignment.business.name}</h3>
                      <Badge variant={assignment.role === 'owner' ? 'default' : 'secondary'}>
                        {assignment.role}
                      </Badge>
                      {assignment.is_primary && (
                        <Badge variant="outline">Primary</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {assignment.business.category} • {assignment.business.city}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Assigned: {new Date(assignment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveAssignment(assignment.business_id)}
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>Help & Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Roles</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li><strong>Owner:</strong> Full control and management</li>
                <li><strong>Manager:</strong> Management permissions</li>
                <li><strong>Employee:</strong> Limited access</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Primary Business</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Appears first in dashboards</li>
                <li>Growth/Gold users: 1 business max</li>
                <li>Admins can assign multiple businesses</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Common Actions</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Fix dashboard access issues</li>
                <li>Add team members to businesses</li>
                <li>Transfer business ownership</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
