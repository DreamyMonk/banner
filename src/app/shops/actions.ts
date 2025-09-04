'use server';

import type { Shop } from '@/lib/types';
import { app } from '@/lib/firebase';
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';

const db = getFirestore(app);

export async function addShop(shop: Omit<Shop, 'id'>) {
  await addDoc(collection(db, 'shops'), shop);
}

export async function updateShop(shop: Shop) {
  const shopRef = doc(db, 'shops', shop.id);
  // Create a plain object without the 'id' property for updating
  const { id, ...shopData } = shop;
  await updateDoc(shopRef, shopData);
}

export async function deleteShop(shopId: string) {
  await deleteDoc(doc(db, 'shops', shopId));
}

export async function addGroup(groupName: string) {
  await addDoc(collection(db, 'groups'), { name: groupName });
}

export async function deleteGroup(groupId: string) {
  await deleteDoc(doc(db, 'groups', groupId));
}
