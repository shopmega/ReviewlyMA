'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Search, User, Building2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { assignBusinessToUser } from '@/app/actions/admin-business-assignment'
import { toast } from '@/hooks/use-toast'

interface QuickAssignmentProps {
  onSuccess?: () => void
}

export function QuickBusinessAssignment({ onSuccess }: QuickAssignmentProps) {
  const [userEmail, setUserEmail] = useState('')
  const [businessId, setBusinessId] = useState('')
  const [role, setRole] = useState('owner')
  const [isPrimary, setIsPrimary] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleAssign = async () => {
    if (!userEmail || !businessId) {
      setResult({ type: 'error', message: 'Please fill in both email and business ID' })
      return
    }

    setIsLoading(true)
    setResult(null)
    
    try {
      const result = await assignBusinessToUser(userEmail, businessId, role, isPrimary)
      
      if (result.status === 'success') {
        setResult({ type: 'success', message: result.message })
        toast({
          title: 'Success',
          description: result.message,
        })
        // Clear form
        setUserEmail('')
        setBusinessId('')
        setIsPrimary(false)
        onSuccess?.()
      } else {
        setResult({ type: 'error', message: result.message })
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        })
      }
    } catch (error) {
      const errorMessage = 'Failed to assign business'
      setResult({ type: 'error', message: errorMessage })
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Quick Business Assignment
        </CardTitle>
        <CardDescription>
          Quickly assign a business to a user by email
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="userEmail">User Email</Label>
            <Input
              id="userEmail"
              placeholder="user@example.com"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="businessId">Business ID</Label>
            <Input
              id="businessId"
              placeholder="business-id-here"
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={setRole} disabled={isLoading}>
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
                disabled={isLoading}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="primary" className="text-sm font-medium">
                Set as primary
              </Label>
            </div>
          </div>
        </div>

        {result && (
          <Alert variant={result.type === 'success' ? 'default' : 'destructive'}>
            {result.type === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
        )}

        <Button 
          onClick={handleAssign} 
          disabled={isLoading || !userEmail || !businessId}
          className="w-full"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          Assign Business
        </Button>
      </CardContent>
    </Card>
  )
}