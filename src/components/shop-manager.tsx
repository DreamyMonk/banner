
'use client';

import { useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
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
import { Users, Plus, Trash2, Edit, X } from 'lucide-react';
import type { Shop, Group } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { addShop, updateShop, deleteShop, addGroup, deleteGroup } from '@/app/actions';

interface ShopManagerProps {
  shops: Shop[];
  groups: Group[];
}

const initialShopState: Omit<Shop, 'id'> = {
  name: '',
  email: '',
  logo: '',
  groups: [],
};

export function ShopManager({ shops, groups }: ShopManagerProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<Shop | null>(null);
  const [formData, setFormData] = useState<Omit<Shop, 'id'>>(initialShopState);
  const [newGroup, setNewGroup] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing) {
      setFormData({
        name: isEditing.name,
        email: isEditing.email,
        logo: isEditing.logo,
        groups: isEditing.groups || [],
      });
      setLogoPreview(isEditing.logo);
    } else {
      setFormData(initialShopState);
      setLogoPreview(null);
    }
  }, [isEditing, open]); // Depend on `open` to reset form when sheet re-opens

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };
  
  const handleGroupChange = (value: string) => {
    // 'none' is a special value to clear the group
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
      toast({ title: 'Missing Information', description: 'Please fill out all fields.', variant: 'destructive' });
      return;
    }

    try {
      if (isEditing) {
        await updateShop({ ...isEditing, ...formData });
        toast({ title: 'Shop Updated', description: `Updated details for ${formData.name}.` });
      } else {
        await addShop(formData);
        toast({ title: 'Shop Added', description: `${formData.name} has been added.` });
      }
      resetForm();
    } catch (error) {
      console.error("Failed to save shop:", error);
      toast({ title: 'Error', description: 'Could not save shop.', variant: 'destructive' });
    }
  };

  const handleEdit = (shop: Shop) => {
    setIsEditing(shop);
  };
  
  const handleDelete = async (shopId: string) => {
    try {
      await deleteShop(shopId);
      toast({ title: 'Shop Removed', description: 'The shop has been removed.' });
    } catch (error) {
      console.error("Failed to delete shop:", error);
      toast({ title: 'Error', description: 'Could not delete shop.', variant: 'destructive' });
    }
  };
  
  const resetForm = () => {
    setIsEditing(null);
    setFormData(initialShopState);
    setLogoPreview(null);
    // This is to reset the file input visually
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
        console.error("Failed to add group:", error);
        toast({ title: 'Error', description: 'Could not add group.', variant: 'destructive' });
      }
    }
  };
  
  const handleDeleteGroup = async (groupId: string) => {
    try {
      await deleteGroup(groupId);
    } catch (error) {
        console.error("Failed to delete group:", error);
        toast({ title: 'Error', description: 'Could not delete group.', variant: 'destructive' });
    }
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        resetForm();
      }
    }}>
      <SheetTrigger asChild>
        <Button>
          <Users className="mr-2" /> Manage Shops
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-3xl flex flex-col">
        <SheetHeader>
          <SheetTitle>Shop & Group Management</SheetTitle>
        </SheetHeader>
        <div className="grid md:grid-cols-3 gap-6 py-4 flex-1 min-h-0">
          <div className="md:col-span-2 flex flex-col min-h-0">
            <h3 className="font-headline text-lg mb-2">Shops</h3>
            <ScrollArea className="border rounded-md flex-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Groups</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shops.map(shop => (
                    <TableRow key={shop.id}>
                      <TableCell className="font-medium">{shop.name}</TableCell>
                      <TableCell>{shop.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {shop.groups && shop.groups.map(groupId => (
                            <Badge key={groupId} variant="secondary">
                              {groups.find(g => g.id === groupId)?.name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(shop)}><Edit className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete {shop.name} and cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(shop.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="font-headline text-lg mb-2">{isEditing ? 'Edit Shop' : 'Add Shop'}</h3>
              <div className="space-y-4 p-4 border rounded-md">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="name">Shop Name</Label>
                  <Input id="name" value={formData.name} onChange={handleInputChange} />
                </div>
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={formData.email} onChange={handleInputChange} />
                </div>
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="logo">Logo</Label>
                  {logoPreview && <img src={logoPreview} alt="Logo preview" className="w-16 h-16 object-contain border rounded-md" />}
                  <Input id="logo" type="file" accept="image/*" onChange={handleLogoChange} />
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
                        <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveShop} className="flex-1">{isEditing ? 'Update' : 'Save'}</Button>
                  {isEditing && <Button variant="outline" onClick={resetForm}>Cancel</Button>}
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-headline text-lg mb-2">Groups</h3>
              <div className="space-y-2">
                {groups.map(group => (
                  <div key={group.id} className="flex items-center justify-between bg-muted p-2 rounded-md">
                    <span className="text-sm font-medium">{group.name}</span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                         <Button variant="ghost" size="icon" className='h-6 w-6'><X className="h-4 w-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete {group.name}?</AlertDialogTitle>
                            <AlertDialogDescription>This will remove the group but not the shops inside it.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteGroup(group.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input placeholder="New group name..." value={newGroup} onChange={e => setNewGroup(e.target.value)} />
                  <Button onClick={handleAddGroup}><Plus /></Button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button>Done</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

    