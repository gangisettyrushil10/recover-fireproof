'use client';

import { useEffect, useState, useCallback } from 'react';
import { listOutbox, onOutboxChange, type OutboxItem } from '@/lib/outbox';

export function useOutboxList(): {
  items: OutboxItem[];
  count: number;
  open: () => void;
  isOpen: boolean;
  close: () => void;
} {
  const [items, setItems] = useState<OutboxItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    void listOutbox().then(setItems);
    const unsub = onOutboxChange(() => {
      void listOutbox().then(setItems);
    });
    return unsub;
  }, []);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return { items, count: items.length, open, isOpen, close };
}
