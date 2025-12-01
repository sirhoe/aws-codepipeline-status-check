import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPipelineStatus } from '../storage';
import { PipelineStatusState } from '../types';

export const usePipelineStatus = () => {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['pipelineStatus'],
    queryFn: getPipelineStatus
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      return new Promise<void>((resolve, reject) => {
        chrome.runtime.sendMessage({ type: 'refreshNow' }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelineStatus'] });
    }
  });

  useEffect(() => {
    const handleStorageChange = (changes: any, area: string) => {
      if (area === 'local') {
        if (changes.pipelineStatus) {
          queryClient.setQueryData(['pipelineStatus'], changes.pipelineStatus.newValue);
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, [queryClient]);

  return {
    statusState: data as PipelineStatusState | null | undefined,
    isLoading,
    error,
    refresh: refreshMutation.mutate,
    isRefreshing: refreshMutation.isPending
  };
};

