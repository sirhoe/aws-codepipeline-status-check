import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSettings, saveSettings as saveSettingsToStorage } from '../storage';
import { Settings } from '../types';

export const useSettings = () => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings
  });

  const saveMutation = useMutation({
    mutationFn: saveSettingsToStorage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    }
  });

  useEffect(() => {
    const handleStorageChange = (changes: any, area: string) => {
      if (area === 'local') {
        if (changes.settings) {
          queryClient.invalidateQueries({ queryKey: ['settings'] });
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, [queryClient]);

  return {
    settings: settings as Partial<Settings> | undefined,
    isLoading,
    saveSettings: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    saveError: saveMutation.error
  };
};

