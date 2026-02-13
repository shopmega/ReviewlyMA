'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, MoreHorizontal, Mail, Calendar, Shield, Ban, UserCog } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Zap } from "lucide-react";
import { useActionState, useState, useEffect } from "react";
import { changeUserRole, toggleUserSuspension, toggleUserPremium } from "@/app/actions/admin";
import { useToast } from "@/hooks/use-toast";

interface UserWithClaimData {
  userId: string;
  email: string;
  fullName: string;
  role: 'admin' | 'pro' | 'user';
  businessId: string | null;
  businessName: string | null;
  claimStatus: string | null;
  isPremium: boolean;
  createdAt: string;
}

interface UsersTableProps {
  users: UserWithClaimData[];
  searchQuery?: string;
}

export function UsersTable({ users, searchQuery = '' }: UsersTableProps) {
  const { toast } = useToast();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filter users based on search query
  const filteredUsers = users.filter(user =>
    (user.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">Admin</Badge>;
      case 'pro':
        return <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0">Pro</Badge>;
      default:
        return <Badge variant="secondary">Utilisateur</Badge>;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrateur';
      case 'pro': return 'Professionnel';
      default: return 'Utilisateur';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Tous les utilisateurs</CardTitle>
            <CardDescription>Gérez les comptes utilisateurs et leurs rôles</CardDescription>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Rechercher par nom ou email..."
              value={searchQuery}
              onChange={(e) => { }}
              className="pl-9 w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Utilisateur</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Premium</TableHead>
                <TableHead className="hidden md:table-cell">Inscrit le</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    Aucun utilisateur trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.userId} className="hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white">
                            {user.fullName.substring(0, 2).toUpperCase() || user.email.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.fullName || 'Sans nom'}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>
                      {user.isPremium ? (
                        <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-0">
                          <Zap className="mr-1 h-3 w-3 fill-white" /> Premium
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span className="text-sm">
                          {format(new Date(user.createdAt), 'dd MMM yyyy', { locale: fr })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <UserCog className="mr-2 h-4 w-4" />
                              Changer le rôle
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              {(['admin', 'pro', 'user'] as const).map((r) => (
                                <DropdownMenuItem
                                  key={r}
                                  onClick={async () => {
                                    setActionLoading(user.userId);
                                    await changeUserRole(user.userId, r);
                                    setActionLoading(null);
                                    toast({ title: 'Succès', description: `Rôle changé en ${getRoleLabel(r)}` });
                                  }}
                                  disabled={actionLoading === user.userId}
                                >
                                  {user.role === r && <Shield className="mr-2 h-4 w-4" />}
                                  {getRoleLabel(r)}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuItem
                                onClick={async () => {
                                  setActionLoading(user.userId);
                                  await toggleUserPremium(user.userId, !user.isPremium ? 'gold' : 'none');
                                  setActionLoading(null);
                                  toast({ title: 'Succès', description: `Premium ${!user.isPremium ? 'activé' : 'désactivé'}` });
                                }}
                                disabled={actionLoading === user.userId}
                              >
                                <Zap className="mr-2 h-4 w-4" />
                                {user.isPremium ? 'Retirer Premium' : 'Passer Premium'}
                              </DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={async () => {
                              setActionLoading(user.userId);
                              await toggleUserSuspension(user.userId, true);
                              setActionLoading(null);
                              toast({ title: 'Succès', description: 'Compte suspendu' });
                            }}
                            className="text-destructive"
                            disabled={actionLoading === user.userId}
                          >
                            <Ban className="mr-2 h-4 w-4" />
                            Suspendre le compte
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
