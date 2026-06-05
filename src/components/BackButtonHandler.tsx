import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { Dialog } from '@capacitor/dialog';

export function BackButtonHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    let isDialogOpen = false;

    const backButtonListener = CapacitorApp.addListener('backButton', async (info) => {
      // With HashRouter, the path is in window.location.hash
      // e.g. '#/' or '#/login' or '#/products'
      const path = window.location.hash.replace(/^#/, '').split('?')[0] || '/';
      
      if (path === '/' || path === '/login') {
        if (isDialogOpen) return;
        
        isDialogOpen = true;
        const { value } = await Dialog.confirm({
          title: 'Exit App',
          message: 'Are you sure you want to exit the app?',
          okButtonTitle: 'Exit',
          cancelButtonTitle: 'Cancel'
        });
        isDialogOpen = false;

        if (value) {
          CapacitorApp.exitApp();
        }
      } else {
        // For other pages, go back
        if (info.canGoBack) {
          navigate(-1);
        } else {
          // Fallback if no history but not at root
          navigate('/', { replace: true });
        }
      }
    });

    return () => {
      backButtonListener.then(listener => listener.remove());
    };
  }, [navigate]);

  return null;
}
