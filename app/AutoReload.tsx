'use client';
import { useEffect } from 'react';

export default function AutoReload() {
  useEffect(() => {
    // Percenként ellenőrzi, hogy éjjel 03:00 van-e, és ha igen, újratölti az oldalt
    const id = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 3 && now.getMinutes() === 0) {
        window.location.reload();
      }
    }, 60 * 1000);
    return () => clearInterval(id);
  }, []);

  return null;
}