'use client';

import { useState } from 'react';
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

export function ShopManager({ shops, groups }: ShopManagerProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<Shop | null>(null);
  const [newShop, setNewShop] = useState<Omit<Shop, 'id'>>({ name: '', email: '', logo: '', groups: [] as string[] });
  const [newGroup, setNewGroup] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setNewShop(prev => ({ ...prev, logo: result }));
        setLogoPreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveShop = async () => {
    if (!newShop.name || !newShop.email || !newShop.logo) {
      toast({ title: 'Missing Information', description: 'Please fill out all fields.', variant: 'destructive' });
      return;
    }

    try {
      if (isEditing) {
        await updateShop({ ...isEditing, ...newShop });
        toast({ title: 'Shop Updated', description: `Updated details for ${newShop.name}.` });
      } else {
        await addShop(newShop);
        toast({ title: 'Shop Added', description: `${newShop.name} has been added.` });
      }
      resetForm();
    } catch (error) {
      console.error("Failed to save shop:", error);
      toast({ title: 'Error', description: 'Could not save shop.', variant: 'destructive' });
    }
  };

  const handleEdit = (shop: Shop) => {
    setIsEditing(shop);
    setNewShop({ name: shop.name, email: shop.email, logo: shop.logo, groups: shop.groups });
    setLogoPreview(shop.logo);
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
    setNewShop({ name: '', email: '', logo: '', groups: [] });
    setLogoPreview(null);
  };

  const handleAddGroup = async () => {
    if (newGroup && !groups.find(g => g.name === newGroup)) {
      try {
        await addGroup(newGroup);
        setNewGroup('');
      } catch (error) {
        console.error("Failed to add group:", error);
        toast({ title: 'Error', description: 'Could not add group.', variant: 'destructive' });
      }
    }
  };
  
  const handleDeleteGroup = async (groupId: string) => {
    try {
      await deleteGroup(groupId);
      // Firestore listeners will handle updating the UI
    } catch (error) {
        console.error("Failed to delete group:", error);
        toast({ title: 'Error', description: 'Could not delete group.', variant: 'destructive' });
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
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
                          {shop.groups.map(groupId => (
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
                  <Input id="name" value={newShop.name} onChange={e => setNewShop({ ...newShop, name: e.target.value })} />
                </div>
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={newShop.email} onChange={e => setNewShop({ ...newShop, email: e.target.value })} />
                </div>
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="logo">Logo</Label>
                  {logoPreview && <img src={logoPreview} alt="Logo preview" className="w-16 h-16 object-contain border rounded-md" />}
                  <Input id="logo" type="file" accept="image/*" onChange={handleLogoChange} />
                </div>
                <div className="grid w-full items-center gap-1.5">
                  <Label>Groups</Label>
                  <Select value={newShop.groups[0]} onValueChange={val => setNewShop({ ...newShop, groups: val ? [val] : [] })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Assign to a group" />
                    </SelectTrigger>
                    <SelectContent>
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
                    <Button variant="ghost" size="icon" className='h-6 w-6' onClick={() => handleDeleteGroup(group.id)}><X className="h-4 w-4" /></Button>
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
