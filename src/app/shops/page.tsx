
'use client';

import { useState, useEffect, useMemo, type ChangeEvent } from 'react';
import Link from 'next/link';
import {
  collection,
  onSnapshot,
  getFirestore,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import {
  addShop,
  updateShop,
  deleteShop,
  addGroup,
  deleteGroup,
} from './actions';
import type { Shop, Group } from '@/lib/types';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Plus, Trash2, Edit, X, ArrowLeft, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const initialShopState: Omit<Shop, 'id'> = {
  name: '',
  email: '',
  logo: '',
  groups: [],
  address: '',
  phone: '',
};

export default function ShopsPage() {
  const { toast } = useToast();
  const [shops, setShops] = useState<Shop[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isEditing, setIsEditing] = useState<Shop | null>(null);
  const [formData, setFormData] = useState<Omit<Shop, 'id'>>(initialShopState);
  const [newGroup, setNewGroup] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const db = getFirestore(app);
    const unsubShops = onSnapshot(
      collection(db, 'shops'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        setShops(
          snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Shop))
        );
      }
    );
    const unsubGroups = onSnapshot(
      collection(db, 'groups'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        setGroups(
          snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Group))
        );
      }
    );
    return () => {
      unsubShops();
      unsubGroups();
    };
  }, []);

  useEffect(() => {
    if (isEditing) {
      setFormData({
        name: isEditing.name,
        email: isEditing.email,
        logo: isEditing.logo,
        groups: isEditing.groups || [],
        address: isEditing.address || '',
        phone: isEditing.phone || '',
      });
      setLogoPreview(isEditing.logo);
    } else {
      setFormData(initialShopState);
      setLogoPreview(null);
    }
  }, [isEditing]);

  const filteredShops = useMemo(() => {
    if (!searchTerm) return shops;
    return shops.filter(shop =>
      shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shop.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (shop.phone && shop.phone.includes(searchTerm))
    );
  }, [shops, searchTerm]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleGroupChange = (value: string) => {
    if (value === 'none') {
      setFormData(prev => ({ ...prev, groups: [] }));
    } else {
      setFormData(prev => ({ ...prev, groups: [value] }));
    }
  };

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setFormData(prev => ({ ...prev, logo: result }));
        setLogoPreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveShop = async () => {
    if (!formData.name || !formData.email || !formData.logo) {
      toast({
        title: 'Missing Information',
        description: 'Please fill out all fields.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (isEditing) {
        await updateShop({ ...isEditing, ...formData });
        toast({
          title: 'Shop Updated',
          description: `Updated details for ${formData.name}.`,
        });
      } else {
        await addShop(formData);
        toast({
          title: 'Shop Added',
          description: `${formData.name} has been added.`,
        });
      }
      resetForm();
    } catch (error) {
      console.error('Failed to save shop:', error);
      toast({
        title: 'Error',
        description: 'Could not save shop.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (shop: Shop) => {
    setIsEditing(shop);
  };

  const handleDelete = async (shopId: string) => {
    try {
      await deleteShop(shopId);
      toast({
        title: 'Shop Removed',
        description: 'The shop has been removed.',
      });
    } catch (error) {
      console.error('Failed to delete shop:', error);
      toast({
        title: 'Error',
        description: 'Could not delete shop.',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setIsEditing(null);
    setFormData(initialShopState);
    setLogoPreview(null);
    const fileInput = document.getElementById('logo') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleAddGroup = async () => {
    if (newGroup && !groups.find(g => g.name === newGroup)) {
      try {
        await addGroup(newGroup);
        setNewGroup('');
        toast({ title: 'Group Added', description: `Added group: ${newGroup}` });
      } catch (error) {
        console.error('Failed to add group:', error);
        toast({
          title: 'Error',
          description: 'Could not add group.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await deleteGroup(groupId);
    } catch (error) {
      console.error('Failed to delete group:', error);
      toast({
        title: 'Error',
        description: 'Could not delete group.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="w-8 h-8" />
          Shop & Group Management
        </h1>
        <Button asChild variant="outline">
          <Link href="/editor">
            <ArrowLeft />
            Back to Editor
          </Link>
        </Button>
      </header>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Shops</CardTitle>
             <CardDescription>
                A list of all shops. You can search by name, email, or phone.
            </CardDescription>
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search shops..."
                    className="w-full pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[60vh] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Groups</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredShops.map(shop => (
                    <TableRow key={shop.id}>
                      <TableCell className="font-medium">{shop.name}</TableCell>
                      <TableCell>{shop.email}</TableCell>
                      <TableCell>{shop.phone}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {shop.groups &&
                            shop.groups.map(groupId => (
                              <Badge key={groupId} variant="secondary">
                                {groups.find(g => g.id === groupId)?.name}
                              </Badge>
                            ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(shop)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete {shop.name} and
                                cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(shop.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{isEditing ? 'Edit Shop' : 'Add Shop'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="name">Shop Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone ?? ''}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address ?? ''}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="logo">Logo</Label>
                {logoPreview && (
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-16 h-16 object-contain border rounded-md"
                  />
                )}
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                />
              </div>
              <div className="grid w-full items-center gap-1.5">
                <Label>Groups</Label>
                <Select
                  value={(formData.groups && formData.groups[0]) || 'none'}
                  onValueChange={handleGroupChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Assign to a group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <em>None</em>
                    </SelectItem>
                    {groups.map(group => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveShop} className="flex-1">
                  {isEditing ? 'Update' : 'Save'}
                </Button>
                {isEditing && (
                  <Button variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Groups</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {groups.map(group => (
                <div
                  key={group.id}
                  className="flex items-center justify-between bg-muted p-2 rounded-md"
                >
                  <span className="text-sm font-medium">{group.name}</span>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <X className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Delete {group.name}?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove the group but not the shops inside
                          it.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteGroup(group.id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <Input
                  placeholder="New group name..."
                  value={newGroup}
                  onChange={e => setNewGroup(e.target.value)}
                />
                <Button onClick={handleAddGroup}>
                  <Plus />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

    