import type { Dispatch, SetStateAction } from 'react';
import type { Group, Shop } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface RecipientsPanelProps {
  groups: Group[];
  shops: Shop[];
  selectedGroups: string[];
  setSelectedGroups: Dispatch<SetStateAction<string[]>>;
}

export function RecipientsPanel({ groups, shops, selectedGroups, setSelectedGroups }: RecipientsPanelProps) {
  const handleGroupToggle = (groupId: string, checked: boolean) => {
    setSelectedGroups(prev =>
      checked ? [...prev, groupId] : prev.filter(id => id !== groupId)
    );
  };

  const recipientCount =
    selectedGroups.length === 0
      ? shops.length
      : shops.filter(shop => shop.groups && shop.groups.some(groupId => selectedGroups.includes(groupId))).length;

  return (
    <div className="space-y-4">
        <div className="space-y-2 p-3 border rounded-md">
            {groups.length > 0 ? groups.map(group => (
                <div key={group.id} className="flex items-center space-x-2">
                    <Checkbox 
                        id={`group-${group.id}`} 
                        checked={selectedGroups.includes(group.id)}
                        onCheckedChange={(checked) => handleGroupToggle(group.id, !!checked)}
                    />
                    <Label htmlFor={`group-${group.id}`} className="flex-1 cursor-pointer">
                        {group.name}
                    </Label>
                    <span className='text-sm text-muted-foreground'>
                        ({shops.filter(s => s.groups && s.groups.includes(group.id)).length} shops)
                    </span>
                </div>
            )) : (
                <p className='text-sm text-muted-foreground text-center'>No groups created yet.</p>
            )}
        </div>
        <div className="text-sm font-medium text-center p-2 bg-muted rounded-md">
            {selectedGroups.length > 0
            ? `${recipientCount} shops in selected groups will be emailed.`
            : `All ${recipientCount} shops will be emailed.`
            }
        </div>
    </div>
  );
}
